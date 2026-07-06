import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Upload, Landmark, TrendingUp, TrendingDown, Wallet, Trash2, LogOut, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AppNav } from "@/components/AppNav";
import { parseStatement, type ParsedTxn } from "@/lib/statement-parser";
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
};

function BankingPage() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [businessName, setBusinessName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
      await load();
      setLoading(false);
    })();
  }, [navigate]);

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
              <p className="mt-1 text-xs text-muted-foreground">Upload CSV or OFX/QFX from Zanaco, FNB, Stanbic, Absa, or any bank export.</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,.ofx,.qfx,text/csv" hidden onChange={onFile} />
              <Button onClick={() => fileRef.current?.click()} disabled={importing}>
                {importing ? <><FileUp className="h-4 w-4 animate-pulse" /> Importing…</> : <><Upload className="h-4 w-4" /> Import statement</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : txns.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No transactions yet. Import your first statement to get started.</TableCell></TableRow>
                ) : txns.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-6 text-muted-foreground">{t.txn_date}</TableCell>
                    <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.reference ?? "—"}</TableCell>
                    <TableCell>{t.category && <Badge variant="outline" className={t.amount >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>{t.category}</Badge>}</TableCell>
                    <TableCell className={`text-right font-medium ${t.amount >= 0 ? "text-emerald-700" : "text-red-700"}`}>{t.amount >= 0 ? "+" : ""}{money(t.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{t.balance != null ? money(t.balance) : "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
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
