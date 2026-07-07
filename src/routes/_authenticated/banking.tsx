import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Upload, Landmark, TrendingUp, TrendingDown, Wallet, Trash2, LogOut, FileUp, Search, BookOpen, Loader2, Scale, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppNav } from "@/components/AppNav";
import { parseStatement, type ParsedTxn } from "@/lib/statement-parser";
import { postBankAllocation } from "@/lib/bank-posting";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banking")({
  head: () => ({
    meta: [
      { title: "Banking — SifoBooks" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BankingPage,
});

type Txn = {
  id: string; txn_date: string; description: string; amount: number;
  balance: number | null; reference: string | null; category: string | null;
  matched_invoice: string | null; source_file: string | null;
  reconciled?: boolean; matched_type?: string | null; matched_id?: string | null;
};
type Account = { id: string; account_code: string; account_name: string; account_type: string };

function BankingPage() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [businessName, setBusinessName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unreconciled" | "reconciled">("all");
  const [dirFilter, setDirFilter] = useState<"all" | "in" | "out">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Allocate & Post
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocTxn, setAllocTxn] = useState<Txn | null>(null);
  const [allocAccountId, setAllocAccountId] = useState("");
  const [allocMemo, setAllocMemo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const money = (n: number) => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = async () => {
    const { data, error } = await supabase.from("bank_transactions").select("*").order("txn_date", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setTxns((data as Txn[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("onboarded, currency, business_name").eq("id", u.user.id).maybeSingle();
      if (!prof?.onboarded) { navigate({ to: "/onboarding" }); return; }
      if (prof.currency) setCurrency(prof.currency);
      if (prof.business_name) setBusinessName(prof.business_name);
      const { data: acc } = await supabase.from("chart_of_accounts").select("id, account_code, account_name, account_type").eq("is_active", true).order("account_code");
      setAccounts((acc ?? []) as Account[]);
      await load();
      setLoading(false);
    })();
  }, [navigate]);

  const openAllocate = (t: Txn) => {
    setAllocTxn(t);
    setAllocMemo(t.description ?? "");
    const wantType = Number(t.amount) > 0 ? "revenue" : "expense";
    const pick = accounts.find(a => a.account_type === wantType && a.account_code !== "1000");
    setAllocAccountId(pick?.id ?? "");
  };

  const runAllocate = async () => {
    if (!allocTxn || !allocAccountId) return toast.error("Pick an account");
    setBusy(allocTxn.id);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(null); return; }
    const res = await postBankAllocation({ userId: u.user.id, txn: allocTxn, accountId: allocAccountId, memo: allocMemo });
    setBusy(null);
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success(res.alreadyPosted ? "Already posted" : "Posted to ledger & reconciled");
    setAllocTxn(null);
    await load();
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return txns.filter(t => {
      if (statusFilter === "unreconciled" && t.reconciled) return false;
      if (statusFilter === "reconciled" && !t.reconciled) return false;
      if (dirFilter === "in" && !(Number(t.amount) > 0)) return false;
      if (dirFilter === "out" && !(Number(t.amount) < 0)) return false;
      if (dateFrom && t.txn_date < dateFrom) return false;
      if (dateTo && t.txn_date > dateTo) return false;
      if (!s) return true;
      return (t.description ?? "").toLowerCase().includes(s) ||
        (t.reference ?? "").toLowerCase().includes(s) ||
        (t.category ?? "").toLowerCase().includes(s);
    });
  }, [txns, search, statusFilter, dirFilter, dateFrom, dateTo]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseStatement(file.name, text);
      if (parsed.length === 0) {
        toast.error("No transactions found. Expected CSV headers like Date, Description, Amount (or Debit/Credit), Balance.");
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const rows = parsed.map((p: ParsedTxn) => ({
        user_id: u.user!.id,
        txn_date: p.txn_date,
        description: p.description.slice(0, 500),
        amount: p.amount,
        balance: p.balance,
        reference: p.reference?.slice(0, 100) ?? null,
        category: p.amount >= 0 ? "Income" : "Expense",
        source_file: file.name.slice(0, 200),
      }));
      const { error } = await supabase.from("bank_transactions").insert(rows);
      if (error) throw error;
      toast.success(`Imported ${rows.length} transactions from ${file.name}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("bank_transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTxns(prev => prev.filter(t => t.id !== id));
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };

  const inflow  = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outflow = txns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const net = inflow + outflow;
  const latestBalance = txns.find(t => t.balance != null)?.balance ?? null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{businessName || "Banking"}</h1>
              <p className="text-xs text-muted-foreground">Import & reconcile bank statements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppNav />
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="Money in" value={money(inflow)}  tint="bg-emerald-100 text-emerald-700" />
          <Stat icon={<TrendingDown className="h-4 w-4" />} label="Money out" value={money(Math.abs(outflow))} tint="bg-red-100 text-red-700" />
          <Stat icon={<Landmark className="h-4 w-4" />} label="Net movement" value={money(net)} tint="bg-primary/10 text-primary" />
          <Stat icon={<Wallet className="h-4 w-4" />} label="Latest balance" value={latestBalance != null ? money(latestBalance) : "—"} tint="bg-amber-100 text-amber-700" />
        </div>

        <Card className="mt-8">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> Bank transactions</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Upload CSV or OFX/QFX from Zanaco, FNB, Stanbic, Absa, or any bank export. Then allocate each txn to a ledger account.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/reconciliation"><Button variant="outline"><Scale className="h-4 w-4 mr-2" />Reconciliation</Button></Link>
              <input ref={fileRef} type="file" accept=".csv,.ofx,.qfx,text/csv" hidden onChange={onFile} />
              <Button onClick={() => fileRef.current?.click()} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700">
                {importing ? <><FileUp className="h-4 w-4 animate-pulse mr-2" /> Importing…</> : <><Upload className="h-4 w-4 mr-2" /> Import statement</>}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2 border-b pb-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search description, reference, category…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Direction</Label>
                <Select value={dirFilter} onValueChange={v => setDirFilter(v as any)}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="in">Money in</SelectItem>
                    <SelectItem value="out">Money out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
              </div>
              <div className="text-xs text-muted-foreground ml-auto">{filtered.length} of {txns.length}</div>
            </div>

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-2">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">{txns.length === 0 ? "No transactions yet. Import your first statement to get started." : "No transactions match your filters."}</TableCell></TableRow>
                  ) : filtered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-2 text-muted-foreground whitespace-nowrap">{t.txn_date}</TableCell>
                      <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reference ?? "—"}</TableCell>
                      <TableCell>
                        {t.reconciled
                          ? <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" />Posted</Badge>
                          : <Badge variant="outline">Open</Badge>}
                      </TableCell>
                      <TableCell className={`text-right font-medium whitespace-nowrap ${t.amount >= 0 ? "text-emerald-700" : "text-red-700"}`}>{t.amount >= 0 ? "+" : ""}{money(t.amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">{t.balance != null ? money(t.balance) : "—"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {!t.reconciled && (
                          <Button size="sm" variant="outline" className="mr-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openAllocate(t)}>
                            <BookOpen className="h-3.5 w-3.5 mr-1" />Allocate
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!allocTxn} onOpenChange={o => !o && setAllocTxn(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Allocate &amp; post to ledger</DialogTitle></DialogHeader>
          {allocTxn && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-md bg-muted">
                <div className="font-medium">{allocTxn.description}</div>
                <div className="text-xs text-muted-foreground">{allocTxn.txn_date} · {allocTxn.reference} · <span className="font-mono">{money(Number(allocTxn.amount))}</span></div>
              </div>
              <div>
                <Label>Counter account ({Number(allocTxn.amount) > 0 ? "credit — revenue/income" : "debit — expense/asset"})</Label>
                <Select value={allocAccountId} onValueChange={setAllocAccountId}>
                  <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {accounts.filter(a => a.account_code !== "1000").map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name} <span className="text-xs text-muted-foreground">({a.account_type})</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Memo</Label>
                <Input value={allocMemo} onChange={e => setAllocMemo(e.target.value)} placeholder="Description on the journal entry" />
              </div>
              <div className="text-xs text-muted-foreground rounded border border-emerald-200 bg-emerald-50 p-2">
                Posts a journal entry against Cash &amp; Bank (1000) and marks this transaction reconciled. Reports (P&amp;L, Trial Balance, Balance Sheet) update instantly.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAllocTxn(null)}>Cancel</Button>
            <Button onClick={runAllocate} disabled={!allocAccountId || busy === allocTxn?.id} className="bg-emerald-700 hover:bg-emerald-800">
              {busy === allocTxn?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Post to Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${tint}`}>{icon}</span>
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{value}</div>
      </CardContent>
    </Card>
  );
}
