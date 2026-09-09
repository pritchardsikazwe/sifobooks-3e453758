import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SifoHubTabs } from "@/components/sifo/SifoHubTabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Upload, Landmark, TrendingUp, TrendingDown, Wallet, Trash2, LogOut, FileUp, Search, BookOpen, Loader2, Scale, CheckCircle2, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppNav } from "@/components/AppNav";
import { parseStatement, type ParsedTxn } from "@/lib/statement-parser";
import { postBankAllocation, reverseBankAllocation } from "@/lib/bank-posting";
import { formatMoney } from "@/lib/currency";
import { SpendMoneyForm } from "@/components/SpendMoneyDialog";
import { ReconcileDialog } from "@/components/ReconcileDialog";
import { AccountSelector } from "@/components/selectors/AccountSelector";
import { PostingPreview, isBalanced } from "@/components/PostingPreview";
import { bankAllocationLines } from "@/lib/posting-lines";
import { toast } from "sonner";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";


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

  const allocPreviewLines = useMemo(() => allocTxn ? bankAllocationLines({
    amount: Number(allocAmount) || 0,
    signedAmount: Number(allocTxn.amount),
    bank: accounts.find(a => a.account_code === "1000") ?? { account_code: "1000", account_name: "Cash & Bank" },
    account: accounts.find(a => a.id === allocAccountId),
    memo: allocMemo || undefined,
  }) : [], [allocTxn, allocAmount, allocAccountId, allocMemo, accounts]);
  const allocBalanced = isBalanced(allocPreviewLines) && !!allocAccountId;


  const [reverseAlloc, setReverseAlloc] = useState<Allocation | null>(null);
  const [reverseReason, setReverseReason] = useState("");
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
    if (!allocBalanced) return toast.error("Posting blocked — the allocation journal does not balance.");
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

  const runClear = async (txn: Txn, ref: string) => {
    const { error } = await supabase.rpc("clear_bank_transaction" as any, { _txn_id: txn.id, _reference: ref || undefined });
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const bulkClear = async (rows: Txn[], clear: () => void) => {
    if (!rows.length) return;
    let ok = 0, skip = 0, fail = 0;
    for (const t of rows) {
      if (t.is_cleared) { skip++; continue; }
      const good = await runClear(t, "");
      good ? ok++ : fail++;
    }
    toast.success(`${rows.length} selected · ${ok} cleared · ${skip} already · ${fail} failed`);
    clear();
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

  if (spendOpen || receiveOpen) {
    const isSpend = spendOpen;
    return (
      <div className="p-4 sm:p-6">
        <SpendMoneyForm
          mode={isSpend ? "spend" : "receive"}
          onCancel={() => { setSpendOpen(false); setReceiveOpen(false); }}
          onRecorded={() => { setSpendOpen(false); setReceiveOpen(false); load(); }}
        />
      </div>
    );
  }

  if (allocTxn) {
    const abs = Math.abs(Number(allocTxn.amount));
    const already = Number(allocTxn.allocated_amount ?? 0);
    const remaining = Math.max(0, abs - already);
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="banking"
          icon={Landmark}
          title="Allocate to ledger"
          subtitle={`${allocTxn.txn_date} · ${allocTxn.reference ?? ""} · ${money(Number(allocTxn.amount))}`}
          onCancel={() => setAllocTxn(null)}
          onSave={runAllocate}
          saving={busy === allocTxn.id}
          saveDisabled={!allocBalanced}
          saveLabel="Post allocation"
        >
          <SifoFormSection title="Transaction">
            <SifoField label="Description" wide>
              <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                {allocTxn.description}
                <div className="mt-1 text-xs text-muted-foreground">Already allocated: <span className="font-medium">{money(already)}</span> · Remaining: <span className="font-medium text-emerald-700">{money(remaining)}</span></div>
              </div>
            </SifoField>
            <SifoField label="Counter account" wide required
              help={Number(allocTxn.amount) >= 0
                ? "Income, receivable or liability account credited by this deposit."
                : "Expense, payable or asset account debited by this payment."}
            >
              <AccountSelector
                label="" recentKey="bank-alloc"
                accounts={accounts.filter(a => a.account_code !== "1000")}
                value={allocAccountId || null}
                onChange={v => setAllocAccountId(v ?? "")}
              />
            </SifoField>
            <SifoField label="Amount to allocate">
              <Input type="number" step="0.01" min="0.01" max={remaining} value={allocAmount} onChange={e => setAllocAmount(e.target.value)} />
              <button type="button" className="mt-1 text-xs text-emerald-700 hover:underline" onClick={() => setAllocAmount(remaining.toFixed(2))}>Full remaining</button>
            </SifoField>
            <SifoField label="Memo"><Input value={allocMemo} onChange={e => setAllocMemo(e.target.value)} placeholder="Journal description" /></SifoField>
            <SifoField label="Journal preview" wide>
              <PostingPreview lines={allocPreviewLines} title="Journal that will clear this line" />
              {!allocBalanced && <p className="mt-1 text-xs text-destructive">Pick a counter account and an amount greater than zero before posting.</p>}
              {allocBalanced && remaining - Number(allocAmount || 0) > 0.005 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  This is a partial allocation — {money(remaining - Number(allocAmount || 0))} will stay unallocated and the line remains in the Partial tab.
                </p>
              )}
            </SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

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

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <SifoHubTabs hub="finance" active="/banking" />
      </div>

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

            <DataTable
              tableId="banking.transactions"
              data={filtered}
              rowKey={t => t.id}
              selectable
              loading={loading}
              searchPlaceholder={null}
              empty="No transactions match."
              bulkActions={(rows, clear) => (
                <Button size="sm" variant="outline" onClick={() => bulkClear(rows, clear)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Clear selected</Button>
              )}
              totals={rows => ({
                amount: money(rows.reduce((s, t) => s + Number(t.amount), 0)),
                allocated: money(rows.reduce((s, t) => s + Number(t.allocated_amount ?? 0), 0)),
              })}
              columns={[
                {
                  key: "expand", header: "", sortable: false, width: 32,
                  cell: t => (allocs[t.id] ?? []).length > 0 && (
                    <button onClick={() => toggleExpand(t.id)} className="text-muted-foreground hover:text-foreground">
                      {expanded.has(t.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  ),
                },
                {
                  key: "txn_date", header: "Date", accessor: t => t.txn_date,
                  cell: t => <span className="text-muted-foreground whitespace-nowrap">{t.txn_date}</span>,
                },
                {
                  key: "description", header: "Description",
                  cell: t => {
                    const list = allocs[t.id] ?? [];
                    const isOpen = expanded.has(t.id);
                    return (
                      <div>
                        <div className="max-w-xs truncate">
                          {t.description}
                          {t.reference && <span className="ml-2 text-xs text-muted-foreground">{t.reference}</span>}
                        </div>
                        {isOpen && (
                          <div className="mt-2 -mx-1 rounded-md bg-muted/40 p-2">
                            <div className="pb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                              {t.allocated_at && <span>✓ Allocated · {t.allocated_at.slice(0,16).replace("T"," ")}</span>}
                              {t.posted_at && <span>✓ Posted · {t.posted_at.slice(0,16).replace("T"," ")}</span>}
                              {t.reconciled_at && <span>✓ Reconciled · {t.reconciled_at.slice(0,16).replace("T"," ")}</span>}
                              {t.cleared_at && <span>✓ Cleared · {t.cleared_at.slice(0,16).replace("T"," ")}{t.cleared_reference ? ` (${t.cleared_reference})` : ""}</span>}
                            </div>
                            {list.length > 0 && (
                              <>
                                <div className="text-xs font-medium text-muted-foreground mb-2">Allocations</div>
                                <table className="w-full text-xs">
                                  <thead className="text-muted-foreground">
                                    <tr><th className="text-left py-1">Date</th><th className="text-left">Memo</th><th className="text-left">Ref</th><th className="text-right">Amount</th><th className="text-left pl-4">Status</th><th></th></tr>
                                  </thead>
                                  <tbody>
                                    {list.map(a => (
                                      <tr key={a.id} className="border-t border-border/50">
                                        <td className="py-1.5">{a.allocated_at.slice(0, 10)}</td>
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
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                { key: "status", header: "Status", accessor: t => t.status ?? "unallocated", cell: t => statusBadge(t) },
                {
                  key: "amount", header: "Amount", align: "right", accessor: t => Number(t.amount),
                  cell: t => <span className={`font-medium whitespace-nowrap ${t.amount >= 0 ? "text-emerald-700" : "text-red-700"}`}>{t.amount >= 0 ? "+" : ""}{money(Number(t.amount))}</span>,
                },
                {
                  key: "allocated", header: "Allocated", align: "right", accessor: t => Number(t.allocated_amount ?? 0),
                  cell: t => { const allocated = Number(t.allocated_amount ?? 0); return <span className="whitespace-nowrap text-muted-foreground">{allocated > 0 ? money(allocated) : "—"}</span>; },
                },
                {
                  key: "remaining", header: "Remaining", align: "right",
                  accessor: t => Math.max(0, Math.abs(Number(t.amount)) - Number(t.allocated_amount ?? 0)),
                  cell: t => {
                    const remaining = Math.max(0, Math.abs(Number(t.amount)) - Number(t.allocated_amount ?? 0));
                    return <span className="whitespace-nowrap font-medium">{remaining > 0.005 ? money(remaining) : <span className="text-emerald-700">✓</span>}</span>;
                  },
                },
                {
                  key: "actions", header: "Actions", align: "right", sortable: false,
                  cell: t => {
                    const remaining = Math.max(0, Math.abs(Number(t.amount)) - Number(t.allocated_amount ?? 0));
                    return (
                      <div className="whitespace-nowrap">
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
                      </div>
                    );
                  },
                },
              ]}
            />
          </CardContent>
        </Card>
      </main>

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
            <Button variant="delete" onClick={runReverse} disabled={busy === reverseAlloc?.id || !reverseReason.trim()} >
              {busy === reverseAlloc?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReconcileDialog open={reconcileOpen} onOpenChange={setReconcileOpen} onLocked={load} />

      <Dialog open={!!clearTxn} onOpenChange={o => !o && setClearTxn(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Clear transaction</DialogTitle></DialogHeader>
          {clearTxn && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-md bg-muted">
                <div className="font-medium">{clearTxn.description}</div>
                <div className="text-xs text-muted-foreground">{clearTxn.txn_date} · <span className="font-mono">{money(Number(clearTxn.amount))}</span></div>
              </div>
              <div>
                <Label>Clearing reference (optional)</Label>
                <Input value={clearRef} onChange={e => setClearRef(e.target.value)} placeholder="e.g. Bank statement 15-May" />
              </div>
              <p className="text-xs text-muted-foreground">Marks the transaction as fully cleared. It moves to the Cleared tab and cannot be deleted.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClearTxn(null)}>Cancel</Button>
            <Button variant="update"  disabled={busy === clearTxn?.id} onClick={async () => {
              if (!clearTxn) return;
              const ok = await runClear(clearTxn, clearRef);
              if (ok) setClearTxn(null);
            }}>
              {busy === clearTxn?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Clear
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
