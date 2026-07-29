import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Upload, Landmark, TrendingUp, TrendingDown, Wallet, Trash2, LogOut, FileUp, Search, BookOpen, Loader2, Scale, CheckCircle2, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
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
import { postBankAllocation, reverseBankAllocation } from "@/lib/bank-posting";
import { formatMoney } from "@/lib/currency";
import { SpendMoneyDialog } from "@/components/SpendMoneyDialog";
import { ReconcileDialog } from "@/components/ReconcileDialog";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/banking")({
  head: () => ({ meta: [{ title: "Banking — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BankingPage,
});

type Txn = {
  id: string; txn_date: string; description: string; amount: number;
  balance: number | null; reference: string | null; category: string | null;
  source_file: string | null;
  reconciled?: boolean; matched_type?: string | null; matched_id?: string | null;
  currency?: string;
  allocated_amount?: number;
  status?: "unallocated" | "partial" | "allocated" | "posted" | "reconciled" | "cleared" | "reversed" | "draft" | "voided" | "failed";
  is_allocated?: boolean; is_posted?: boolean; is_cleared?: boolean;
  allocated_at?: string | null; posted_at?: string | null;
  reconciled_at?: string | null; cleared_at?: string | null;
  cleared_reference?: string | null;
  content_hash?: string | null;
};
type Account = { id: string; account_code: string; account_name: string; account_type: string };
type Allocation = {
  id: string; bank_txn_id: string; amount: number; memo: string | null;
  target_type: string; target_ref: string | null;
  allocated_at: string; is_reversed: boolean;
  reversed_at: string | null; reverse_reason: string | null;
};

type StatusTab = "all" | "unallocated" | "partial" | "allocated" | "reconciled" | "cleared" | "reversed";

async function sha1Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function BankingPage() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [allocs, setAllocs] = useState<Record<string, Allocation[]>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currency, setCurrency] = useState("ZMW");
  const [businessName, setBusinessName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("unallocated");
  const [dirFilter, setDirFilter] = useState<"all" | "in" | "out">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocTxn, setAllocTxn] = useState<Txn | null>(null);
  const [allocAccountId, setAllocAccountId] = useState("");
  const [allocMemo, setAllocMemo] = useState("");
  const [allocAmount, setAllocAmount] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const [reverseAlloc, setReverseAlloc] = useState<Allocation | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [clearTxn, setClearTxn] = useState<Txn | null>(null);
  const [clearRef, setClearRef] = useState("");

  const money = (n: number) => formatMoney(n, currency);

  const [spendOpen, setSpendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);


  const load = async () => {
    const { data, error } = await supabase.from("bank_transactions").select("*").order("txn_date", { ascending: false });
    if (error) return toast.error(error.message);
    const rows = (data as Txn[]) ?? [];
    setTxns(rows);
    if (rows.length) {
      const { data: al } = await supabase.from("bank_allocations").select("*")
        .in("bank_txn_id", rows.map(r => r.id)).order("allocated_at", { ascending: false });
      const grouped: Record<string, Allocation[]> = {};
      (al ?? []).forEach((a: any) => {
        (grouped[a.bank_txn_id] = grouped[a.bank_txn_id] || []).push(a);
      });
      setAllocs(grouped);
    } else setAllocs({});
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
    const remaining = Math.abs(Number(t.amount)) - Number(t.allocated_amount ?? 0);
    setAllocAmount(remaining.toFixed(2));
    const wantType = Number(t.amount) > 0 ? "revenue" : "expense";
    const pick = accounts.find(a => a.account_type === wantType && a.account_code !== "1000");
    setAllocAccountId(pick?.id ?? "");
  };

  const runAllocate = async () => {
    if (!allocTxn || !allocAccountId) return toast.error("Pick an account");
    const amt = Number(allocAmount);
    if (!amt || amt <= 0) return toast.error("Enter a positive amount");
    setBusy(allocTxn.id);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(null); return; }
    const res = await postBankAllocation({
      userId: u.user.id, txn: allocTxn, accountId: allocAccountId,
      amount: amt, memo: allocMemo, targetType: "account", targetId: allocAccountId,
    });
    setBusy(null);
    if (!res.ok) return toast.error(res.error ?? "Failed");
    const rem = (res as any).remaining ?? 0;
    toast.success(rem > 0.005 ? `Allocated. Remaining ${money(rem)}` : "Fully allocated ✓");
    setAllocTxn(null);
    await load();
  };

  const runReverse = async () => {
    if (!reverseAlloc) return;
    if (!reverseReason.trim()) return toast.error("Reason required");
    setBusy(reverseAlloc.id);
    const res = await reverseBankAllocation(reverseAlloc.id, reverseReason.trim());
    setBusy(null);
    if (!res.ok) return toast.error(res.error ?? "Reversal failed");
    toast.success("Allocation reversed");
    setReverseAlloc(null); setReverseReason("");
    await load();
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return txns.filter(t => {
      const st = t.status ?? "unallocated";
      if (tab === "unallocated" && !(st === "unallocated" || st === "partial")) return false;
      if (tab !== "all" && tab !== "unallocated" && st !== tab) return false;
      if (dirFilter === "in" && !(Number(t.amount) > 0)) return false;
      if (dirFilter === "out" && !(Number(t.amount) < 0)) return false;
      if (dateFrom && t.txn_date < dateFrom) return false;
      if (dateTo && t.txn_date > dateTo) return false;
      if (!s) return true;
      return (t.description ?? "").toLowerCase().includes(s) ||
        (t.reference ?? "").toLowerCase().includes(s) ||
        (t.category ?? "").toLowerCase().includes(s);
    });
  }, [txns, search, tab, dirFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c = { all: txns.length, unallocated: 0, partial: 0, allocated: 0, reconciled: 0, cleared: 0, reversed: 0 };
    txns.forEach(t => {
      const st = t.status ?? "unallocated";
      if (st === "unallocated" || st === "partial") c.unallocated++;
      if (st === "partial") c.partial++;
      if (st === "allocated" || st === "posted") c.allocated++;
      if (st === "reconciled") c.reconciled++;
      if (st === "cleared") c.cleared++;
      if (st === "reversed") c.reversed++;
    });
    return c;
  }, [txns]);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () =>
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id)));

  const runClear = async (txn: Txn, ref: string) => {
    const { error } = await supabase.rpc("clear_bank_transaction" as any, { _txn_id: txn.id, _reference: ref || undefined });
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const bulkClear = async () => {
    if (!selected.size) return;
    let ok = 0, skip = 0, fail = 0;
    for (const id of selected) {
      const t = txns.find(x => x.id === id); if (!t) continue;
      if (t.is_cleared) { skip++; continue; }
      const good = await runClear(t, "");
      good ? ok++ : fail++;
    }
    toast.success(`${selected.size} selected · ${ok} cleared · ${skip} already · ${fail} failed`);
    setSelected(new Set());
    await load();
  };

  const rebuildStatus = async () => {
    const { error } = await supabase.rpc("rebuild_bank_status" as any);
    if (error) return toast.error(error.message);
    toast.success("Status index rebuilt");
    await load();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large (max 5MB)");
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseStatement(file.name, text);
      if (!parsed.length) return toast.error("No transactions found in file");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const batchId = crypto.randomUUID();
      const rows = await Promise.all(parsed.map(async (p: ParsedTxn) => {
        const hash = await sha1Hex(`${p.txn_date}|${p.amount}|${(p.description ?? "").trim().toLowerCase()}|${p.reference ?? ""}`);
        return {
          user_id: u.user!.id, txn_date: p.txn_date,
          description: p.description.slice(0, 500), amount: p.amount, balance: p.balance,
          reference: p.reference?.slice(0, 100) ?? null,
          category: p.amount >= 0 ? "Income" : "Expense",
          source_file: file.name.slice(0, 200),
          source: "import",
          import_batch_id: batchId,
          content_hash: hash,
        };
      }));
      // Dedupe against existing content_hash for this user
      const { data: existing } = await supabase.from("bank_transactions")
        .select("content_hash").eq("user_id", u.user.id).not("content_hash", "is", null);
      const have = new Set((existing ?? []).map((r: any) => r.content_hash));
      const fresh = rows.filter(r => !have.has(r.content_hash));
      const dupes = rows.length - fresh.length;
      if (!fresh.length) { toast.info(`No new transactions · ${dupes} duplicates skipped`); return; }
      const { error } = await supabase.from("bank_transactions").insert(fresh as any);
      if (error) throw error;
      toast.success(`Imported ${fresh.length} new · ${dupes} duplicates skipped`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally { setImporting(false); }
  };

  const remove = async (id: string) => {
    const t = txns.find(x => x.id === id);
    if (t && (t.is_allocated || t.is_cleared || t.reconciled)) {
      toast.error("Cannot delete: transaction is allocated, cleared or reconciled. Reverse it first.");
      return;
    }
    const { error } = await supabase.from("bank_transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTxns(prev => prev.filter(t => t.id !== id));
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };

  const inflow = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outflow = txns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const net = inflow + outflow;
  const latestBalance = txns.find(t => t.balance != null)?.balance ?? null;

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const statusBadge = (t: Txn) => {
    const st = t.status ?? "unallocated";
    const map: Record<string, string> = {
      allocated: "bg-emerald-100 text-emerald-700",
      posted: "bg-emerald-100 text-emerald-700",
      reconciled: "bg-sky-100 text-sky-700",
      cleared: "bg-indigo-100 text-indigo-700",
      partial: "bg-amber-100 text-amber-700",
      reversed: "bg-slate-100 text-slate-500",
      voided: "bg-slate-100 text-slate-500",
      failed: "bg-red-100 text-red-700",
      draft: "bg-slate-100 text-slate-600",
      unallocated: "",
    };
    const cls = map[st] ?? "";
    return <Badge variant={cls ? "secondary" : "outline"} className={cls}>{st.charAt(0).toUpperCase() + st.slice(1)}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{businessName || "Banking"}</h1>
              <p className="text-xs text-muted-foreground">Import, allocate & reconcile bank statements</p>
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
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="Money in" value={money(inflow)} tint="bg-emerald-100 text-emerald-700" />
          <Stat icon={<TrendingDown className="h-4 w-4" />} label="Money out" value={money(Math.abs(outflow))} tint="bg-red-100 text-red-700" />
          <Stat icon={<Landmark className="h-4 w-4" />} label="Net" value={money(net)} tint="bg-primary/10 text-primary" />
          <Stat icon={<Wallet className="h-4 w-4" />} label="Latest balance" value={latestBalance != null ? money(latestBalance) : "—"} tint="bg-amber-100 text-amber-700" />
        </div>

        <Card className="mt-8">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> Bank transactions</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Allocate transactions to accounts. Partial allocations stay Partial until fully cleared. Reverse any allocation with a reason — nothing is deleted.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setSpendOpen(true)}><TrendingDown className="h-4 w-4 mr-2 text-red-600" />Spend Money</Button>
              <Button variant="outline" onClick={() => setReceiveOpen(true)}><TrendingUp className="h-4 w-4 mr-2 text-emerald-600" />Receive Money</Button>
              <Button variant="outline" onClick={() => setReconcileOpen(true)}><Scale className="h-4 w-4 mr-2" />Reconcile</Button>
              <Link to="/bank-accounts"><Button variant="outline"><Landmark className="h-4 w-4 mr-2" />Accounts</Button></Link>
              <Link to="/bank-rules"><Button variant="outline"><CheckCircle2 className="h-4 w-4 mr-2" />Rules</Button></Link>
              <Link to="/reconciliation-sessions"><Button variant="outline"><BookOpen className="h-4 w-4 mr-2" />Sessions</Button></Link>
              <input ref={fileRef} type="file" accept=".csv,.ofx,.qfx,text/csv" hidden onChange={onFile} />
              <Button onClick={() => fileRef.current?.click()} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700">
                {importing ? <><FileUp className="h-4 w-4 animate-pulse mr-2" /> Importing…</> : <><Upload className="h-4 w-4 mr-2" /> Import statement</>}
              </Button>
              <Button variant="outline" onClick={rebuildStatus} title="Recalculate status flags for all bank transactions">Rebuild status</Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Status tabs */}
            <div className="flex flex-wrap items-center gap-1 border-b">
              {([
                ["all", "All", counts.all],
                ["unallocated", "To Allocate", counts.unallocated],
                ["partial", "Partial", counts.partial],
                ["allocated", "Posted", counts.allocated],
                ["reconciled", "Reconciled", counts.reconciled],
                ["cleared", "Cleared", counts.cleared],
                ["reversed", "Reversed", counts.reversed],
              ] as [StatusTab, string, number][]).map(([k, label, n]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                    tab === k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  {label} <span className="ml-1 text-xs text-muted-foreground">({n})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2 pb-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search description, reference…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div><Label className="text-xs">Direction</Label>
                <Select value={dirFilter} onValueChange={v => setDirFilter(v as any)}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="in">Money in</SelectItem>
                    <SelectItem value="out">Money out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" /></div>
              <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" /></div>
              <div className="text-xs text-muted-foreground ml-auto">{filtered.length} shown</div>
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                <span className="font-medium">{selected.size} selected</span>
                <Button size="sm" variant="outline" onClick={bulkClear}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Clear selected</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Deselect</Button>
              </div>
            )}

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className="w-6"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No transactions match.</TableCell></TableRow>
                  ) : filtered.map(t => {
                    const abs = Math.abs(Number(t.amount));
                    const allocated = Number(t.allocated_amount ?? 0);
                    const remaining = Math.max(0, abs - allocated);
                    const list = allocs[t.id] ?? [];
                    const isOpen = expanded.has(t.id);
                    return (
                      <>
                        <TableRow key={t.id}>
                          <TableCell className="pr-0">
                            <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                          </TableCell>
                          <TableCell className="pr-0">
                            {list.length > 0 && (
                              <button onClick={() => toggleExpand(t.id)} className="text-muted-foreground hover:text-foreground">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{t.txn_date}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {t.description}
                            {t.reference && <span className="ml-2 text-xs text-muted-foreground">{t.reference}</span>}
                          </TableCell>
                          <TableCell>{statusBadge(t)}</TableCell>
                          <TableCell className={`text-right font-medium whitespace-nowrap ${t.amount >= 0 ? "text-emerald-700" : "text-red-700"}`}>{t.amount >= 0 ? "+" : ""}{money(Number(t.amount))}</TableCell>
                          <TableCell className="text-right whitespace-nowrap text-muted-foreground">{allocated > 0 ? money(allocated) : "—"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap font-medium">{remaining > 0.005 ? money(remaining) : <span className="text-emerald-700">✓</span>}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {remaining > 0.005 && (
                              <Button size="sm" variant="outline" className="mr-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => openAllocate(t)}>
                                <BookOpen className="h-3.5 w-3.5 mr-1" />Allocate
                              </Button>
                            )}
                            {t.is_allocated && !t.is_cleared && (
                              <Button size="sm" variant="outline" className="mr-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50" onClick={() => { setClearTxn(t); setClearRef(""); }}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Clear
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow key={t.id + "-exp"} className="bg-muted/40">
                            <TableCell colSpan={9} className="py-2">
                              <div className="pl-6 pb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                                {t.allocated_at && <span>✓ Allocated · {t.allocated_at.slice(0,16).replace("T"," ")}</span>}
                                {t.posted_at && <span>✓ Posted · {t.posted_at.slice(0,16).replace("T"," ")}</span>}
                                {t.reconciled_at && <span>✓ Reconciled · {t.reconciled_at.slice(0,16).replace("T"," ")}</span>}
                                {t.cleared_at && <span>✓ Cleared · {t.cleared_at.slice(0,16).replace("T"," ")}{t.cleared_reference ? ` (${t.cleared_reference})` : ""}</span>}
                              </div>
                              {list.length > 0 && (
                                <>
                                  <div className="text-xs font-medium text-muted-foreground mb-2 pl-6">Allocations</div>
                                  <table className="w-full text-xs">
                                    <thead className="text-muted-foreground">
                                      <tr><th className="text-left pl-6 py-1">Date</th><th className="text-left">Memo</th><th className="text-left">Ref</th><th className="text-right">Amount</th><th className="text-left pl-4">Status</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                      {list.map(a => (
                                        <tr key={a.id} className="border-t border-border/50">
                                          <td className="pl-6 py-1.5">{a.allocated_at.slice(0, 10)}</td>
                                          <td>{a.memo ?? "—"}</td>
                                          <td className="text-muted-foreground">{a.target_ref ?? a.target_type}</td>
                                          <td className="text-right font-medium">{money(Number(a.amount))}</td>
                                          <td className="pl-4">
                                            {a.is_reversed
                                              ? <Badge variant="outline" className="text-slate-500">Reversed{a.reverse_reason ? ` — ${a.reverse_reason}` : ""}</Badge>
                                              : <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Live</Badge>}
                                          </td>
                                          <td className="text-right">
                                            {!a.is_reversed && (
                                              <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={() => { setReverseAlloc(a); setReverseReason(""); }}>
                                                <RotateCcw className="h-3 w-3 mr-1" />Reverse
                                              </Button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Allocate dialog */}
      <Dialog open={!!allocTxn} onOpenChange={o => !o && setAllocTxn(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Allocate to ledger</DialogTitle></DialogHeader>
          {allocTxn && (() => {
            const abs = Math.abs(Number(allocTxn.amount));
            const already = Number(allocTxn.allocated_amount ?? 0);
            const remaining = Math.max(0, abs - already);
            return (
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-md bg-muted">
                  <div className="font-medium">{allocTxn.description}</div>
                  <div className="text-xs text-muted-foreground">{allocTxn.txn_date} · {allocTxn.reference} · <span className="font-mono">{money(Number(allocTxn.amount))}</span></div>
                  <div className="mt-1 text-xs">Already allocated: <span className="font-medium">{money(already)}</span> · Remaining: <span className="font-medium text-emerald-700">{money(remaining)}</span></div>
                </div>
                <div>
                  <Label>Counter account</Label>
                  <Select value={allocAccountId} onValueChange={setAllocAccountId}>
                    <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {accounts.filter(a => a.account_code !== "1000").map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name} <span className="text-xs text-muted-foreground">({a.account_type})</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount to allocate</Label>
                    <Input type="number" step="0.01" min="0.01" max={remaining} value={allocAmount} onChange={e => setAllocAmount(e.target.value)} />
                    <div className="mt-1 flex gap-1">
                      <button type="button" className="text-xs text-emerald-700 hover:underline" onClick={() => setAllocAmount(remaining.toFixed(2))}>Full remaining</button>
                    </div>
                  </div>
                  <div>
                    <Label>Memo</Label>
                    <Input value={allocMemo} onChange={e => setAllocMemo(e.target.value)} placeholder="Journal description" />
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAllocTxn(null)}>Cancel</Button>
            <Button onClick={runAllocate} disabled={!allocAccountId || busy === allocTxn?.id} className="bg-emerald-700 hover:bg-emerald-800">
              {busy === allocTxn?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Post allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse dialog */}
      <Dialog open={!!reverseAlloc} onOpenChange={o => !o && setReverseAlloc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reverse allocation</DialogTitle></DialogHeader>
          {reverseAlloc && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-md bg-muted text-xs">
                <div>Amount: <span className="font-medium">{money(Number(reverseAlloc.amount))}</span></div>
                <div>Date: {reverseAlloc.allocated_at.slice(0, 10)}</div>
                <div>Memo: {reverseAlloc.memo ?? "—"}</div>
              </div>
              <p className="text-xs text-muted-foreground">Creates a mirror journal entry and restores the bank transaction. Nothing is deleted; the reversal appears in the audit trail.</p>
              <div>
                <Label>Reason <span className="text-red-500">*</span></Label>
                <Input value={reverseReason} onChange={e => setReverseReason(e.target.value)} placeholder="Why reverse this allocation?" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReverseAlloc(null)}>Cancel</Button>
            <Button onClick={runReverse} disabled={busy === reverseAlloc?.id || !reverseReason.trim()} className="bg-red-600 hover:bg-red-700">
              {busy === reverseAlloc?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SpendMoneyDialog open={spendOpen} onOpenChange={setSpendOpen} onRecorded={load} mode="spend" />
      <SpendMoneyDialog open={receiveOpen} onOpenChange={setReceiveOpen} onRecorded={load} mode="receive" />
      <ReconcileDialog open={reconcileOpen} onOpenChange={setReconcileOpen} onLocked={load} />
    </div>
  );
}


function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${tint}`}>{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}
