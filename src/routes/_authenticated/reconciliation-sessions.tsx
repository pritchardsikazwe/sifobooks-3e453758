import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Lock, Plus, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DataTable, type DTColumn } from "@/components/data-table";
import { ExportMenu } from "@/lib/exports";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

export const Route = createFileRoute("/_authenticated/reconciliation-sessions")({
  head: () => ({
    meta: [
      { title: "Reconciliation Sessions" },
      { name: "description", content: "Formal bank reconciliation sessions with statement balance, book balance, and audit locking." },
    ],
  }),
  component: ReconciliationSessions,
});

type Session = {
  id: string;
  bank_account_id: string | null;
  statement_date: string;
  statement_start_date: string | null;
  statement_balance: number;
  opening_balance: number;
  book_balance: number;
  cleared_deposits: number;
  cleared_payments: number;
  difference: number;
  status: "draft" | "completed" | "locked";
  notes: string | null;
  locked_at: string | null;
};

type BankAccount = { id: string; name: string; account_number: string | null; currency: string | null };

type Txn = {
  id: string;
  txn_date: string;
  description: string | null;
  amount: number;
  reference: string | null;
  reconciled: boolean;
  bank_account_id: string | null;
  cleared_in_session?: boolean;
};

const fmt = (n: number) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ReconciliationSessions() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // New session form
  const [nBank, setNBank] = useState<string>("");
  const [nStart, setNStart] = useState("");
  const [nEnd, setNEnd] = useState(new Date().toISOString().slice(0, 10));
  const [nOpening, setNOpening] = useState("0");
  const [nStatement, setNStatement] = useState("0");
  const [nNotes, setNNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: acc }, { data: ss }] = await Promise.all([
      supabase.from("bank_accounts").select("id, name, account_number, currency").order("name"),
      supabase.from("reconciliation_sessions").select("*").order("statement_date", { ascending: false }),
    ]);
    setAccounts((acc as BankAccount[]) || []);
    setSessions((ss as Session[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSession = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); return; }
    if (!nEnd) { toast.error("Statement date required"); return; }
    const { data, error } = await supabase.from("reconciliation_sessions").insert({
      user_id: u.user.id,
      bank_account_id: nBank || null,
      statement_date: nEnd,
      statement_start_date: nStart || null,
      opening_balance: Number(nOpening) || 0,
      statement_balance: Number(nStatement) || 0,
      notes: nNotes || null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Session created");
    setOpenNew(false);
    await load();
    setActiveId(data!.id);
  };

  if (activeId) {
    return <SessionDetail id={activeId} onBack={() => { setActiveId(null); load(); }} />;
  }

  if (openNew) {
    return (
      <div className="p-4 sm:p-6">
        <NewSessionForm
          accounts={accounts}
          nBank={nBank} setNBank={setNBank}
          nStart={nStart} setNStart={setNStart}
          nEnd={nEnd} setNEnd={setNEnd}
          nOpening={nOpening} setNOpening={setNOpening}
          nStatement={nStatement} setNStatement={setNStatement}
          nNotes={nNotes} setNNotes={setNNotes}
          onCancel={() => setOpenNew(false)}
          onSave={createSession}
        />
      </div>
    );
  }

  const columns: DTColumn<Session>[] = useMemo(() => [
    { key: "statement_date", header: "Statement Date" },
    { key: "bank", header: "Bank Account",
      accessor: (s) => accounts.find(a => a.id === s.bank_account_id)?.name ?? "—",
      cell: (s) => accounts.find(a => a.id === s.bank_account_id)?.name ?? <span className="text-muted-foreground">—</span> },
    { key: "opening_balance", header: "Opening", align: "right",
      accessor: (s) => Number(s.opening_balance),
      cell: (s) => fmt(s.opening_balance) },
    { key: "statement_balance", header: "Statement", align: "right",
      accessor: (s) => Number(s.statement_balance),
      cell: (s) => fmt(s.statement_balance) },
    { key: "book_balance", header: "Book", align: "right",
      accessor: (s) => Number(s.book_balance),
      cell: (s) => fmt(s.book_balance) },
    { key: "difference", header: "Difference", align: "right",
      accessor: (s) => Number(s.difference),
      cell: (s) => (
        <span className={Math.abs(s.difference) < 0.01 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
          {fmt(s.difference)}
        </span>
      ) },
    { key: "status", header: "Status",
      accessor: (s) => s.status,
      cell: (s) => s.status === "locked"
        ? <Badge className="bg-emerald-600"><Lock className="h-3 w-3 mr-1" /> Locked</Badge>
        : s.status === "completed" ? <Badge variant="secondary">Completed</Badge>
        : <Badge variant="outline">Draft</Badge> },
  ], [accounts]);

  const exportRows = sessions.map(s => ({
    StatementDate: s.statement_date,
    BankAccount: accounts.find(a => a.id === s.bank_account_id)?.name ?? "",
    Opening: s.opening_balance,
    Statement: s.statement_balance,
    Book: s.book_balance,
    Difference: s.difference,
    Status: s.status,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6 text-emerald-700" /> Reconciliation Sessions</h1>
          <p className="text-sm text-muted-foreground">Formal statement-vs-book reconciliation with audit locking.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="reconciliation-sessions" title="Reconciliation Sessions" />
          <Button variant="outline" asChild><Link to="/reconciliation">Quick Match</Link></Button>
          <Button onClick={() => setOpenNew(true)} className="bg-emerald-700 hover:bg-emerald-800"><Plus className="h-4 w-4 mr-1" /> New Session</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <DataTable
          data={sessions}
          columns={columns}
          onRowClick={(s) => setActiveId(s.id)}
          empty="No sessions yet. Create one to start a formal reconciliation."
        />
      )}


    </div>
  );
}

function NewSessionForm({
  accounts, nBank, setNBank, nStart, setNStart, nEnd, setNEnd,
  nOpening, setNOpening, nStatement, setNStatement, nNotes, setNNotes,
  onCancel, onSave,
}: {
  accounts: BankAccount[];
  nBank: string; setNBank: (v: string) => void;
  nStart: string; setNStart: (v: string) => void;
  nEnd: string; setNEnd: (v: string) => void;
  nOpening: string; setNOpening: (v: string) => void;
  nStatement: string; setNStatement: (v: string) => void;
  nNotes: string; setNNotes: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <SifoFormPage
      module="banking"
      icon={Scale}
      title="New Reconciliation Session"
      subtitle="Formal statement-vs-book reconciliation"
      onCancel={onCancel}
      onSave={onSave}
      saveLabel="Create"
    >
      <SifoFormSection title="Session details">
        <SifoField label="Bank account" wide>
          <Select value={nBank} onValueChange={setNBank}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} {a.account_number ? `(${a.account_number})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </SifoField>
        <SifoField label="Period start"><Input type="date" value={nStart} onChange={e => setNStart(e.target.value)} /></SifoField>
        <SifoField label="Statement date" required><Input type="date" value={nEnd} onChange={e => setNEnd(e.target.value)} /></SifoField>
        <SifoField label="Opening balance"><Input type="number" step="0.01" value={nOpening} onChange={e => setNOpening(e.target.value)} /></SifoField>
        <SifoField label="Closing statement balance" required><Input type="number" step="0.01" value={nStatement} onChange={e => setNStatement(e.target.value)} /></SifoField>
        <SifoField label="Notes" wide><Textarea value={nNotes} onChange={e => setNNotes(e.target.value)} rows={2} /></SifoField>
      </SifoFormSection>
    </SifoFormPage>
  );
}

function SessionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: s } = await supabase.from("reconciliation_sessions").select("*").eq("id", id).single();
    if (!s) { setLoading(false); return; }
    setSession(s as Session);

    let q = supabase.from("bank_transactions").select("id, txn_date, description, amount, reference, reconciled, bank_account_id")
      .lte("txn_date", s.statement_date).order("txn_date");
    if (s.bank_account_id) q = q.eq("bank_account_id", s.bank_account_id);
    if (s.statement_start_date) q = q.gte("txn_date", s.statement_start_date);
    const { data: t } = await q;
    setTxns((t as Txn[]) || []);

    const { data: lines } = await supabase.from("reconciliation_lines").select("bank_txn_id, cleared").eq("session_id", id);
    setClearedIds(new Set((lines || []).filter((l: { cleared: boolean }) => l.cleared).map((l: { bank_txn_id: string }) => l.bank_txn_id)));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggle = (txnId: string) => {
    if (session?.status === "locked") return;
    setClearedIds(prev => {
      const next = new Set(prev);
      if (next.has(txnId)) next.delete(txnId); else next.add(txnId);
      return next;
    });
  };

  const summary = useMemo(() => {
    const opening = Number(session?.opening_balance || 0);
    const stmt = Number(session?.statement_balance || 0);
    let dep = 0, pay = 0;
    for (const t of txns) {
      if (!clearedIds.has(t.id)) continue;
      const a = Number(t.amount) || 0;
      if (a > 0) dep += a; else pay += -a;
    }
    const book = opening + dep - pay;
    const diff = stmt - book;
    return { opening, stmt, dep, pay, book, diff, balanced: Math.abs(diff) < 0.01 };
  }, [txns, clearedIds, session]);

  const saveLines = async () => {
    if (!session) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    // Wipe and re-insert current selection
    await supabase.from("reconciliation_lines").delete().eq("session_id", id);
    if (clearedIds.size > 0) {
      const rows = Array.from(clearedIds).map(txnId => ({
        user_id: u.user!.id, session_id: id, bank_txn_id: txnId, cleared: true,
      }));
      const { error } = await supabase.from("reconciliation_lines").insert(rows);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    const { error: rerr } = await supabase.rpc("compute_reconciliation", { _session_id: id });
    if (rerr) toast.error(rerr.message); else toast.success("Saved");
    setSaving(false);
    load();
  };

  const lock = async () => {
    await saveLines();
    const { error } = await supabase.rpc("lock_reconciliation", { _session_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Reconciliation locked");
    load();
  };

  const del = async () => {
    if (!confirm("Delete this session? Linked transactions will be un-cleared.")) return;
    const { error } = await supabase.from("reconciliation_sessions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    onBack();
  };

  if (loading || !session) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const locked = session.status === "locked";

  const txnColumns: DTColumn<Txn>[] = useMemo(() => [
    {
      key: "clear", header: "Clear", sortable: false, width: 60,
      cell: t => <Checkbox checked={clearedIds.has(t.id)} disabled={locked} onCheckedChange={() => toggle(t.id)} />,
    },
    { key: "txn_date", header: "Date" },
    { key: "description", header: "Description", cell: t => <span className="max-w-md truncate block">{t.description}</span> },
    { key: "reference", header: "Reference", cell: t => <span className="text-xs text-muted-foreground">{t.reference}</span> },
    {
      key: "deposit", header: "Deposit", align: "right",
      accessor: t => Number(t.amount) > 0 ? Number(t.amount) : null,
      cell: t => { const a = Number(t.amount) || 0; return <span className="text-emerald-600">{a > 0 ? fmt(a) : ""}</span>; },
    },
    {
      key: "payment", header: "Payment", align: "right",
      accessor: t => Number(t.amount) < 0 ? -Number(t.amount) : null,
      cell: t => { const a = Number(t.amount) || 0; return <span className="text-rose-600">{a < 0 ? fmt(-a) : ""}</span>; },
    },
  ], [clearedIds, locked, toggle]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div>
            <h1 className="text-2xl font-bold">Reconciliation — {session.statement_date}</h1>
            <p className="text-sm text-muted-foreground">Tick each transaction that appears on the bank statement.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!locked && <Button variant="outline" onClick={saveLines} disabled={saving}><RefreshCw className="h-4 w-4 mr-1" /> Save</Button>}
          {!locked && <Button variant="save" onClick={lock} disabled={!summary.balanced || saving} ><Lock className="h-4 w-4 mr-1" /> Lock</Button>}
          {!locked && <Button variant="destructive" onClick={del}>Delete</Button>}
          {locked && <Badge className="bg-emerald-600"><Lock className="h-3 w-3 mr-1" /> Locked {session.locked_at?.slice(0,10)}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Opening</div><div className="text-lg font-semibold">{fmt(summary.opening)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Cleared Deposits</div><div className="text-lg font-semibold text-emerald-600">+{fmt(summary.dep)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Cleared Payments</div><div className="text-lg font-semibold text-rose-600">−{fmt(summary.pay)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Book Balance</div><div className="text-lg font-semibold">{fmt(summary.book)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Statement</div><div className="text-lg font-semibold">{fmt(summary.stmt)}</div></CardContent></Card>
        <Card className={summary.balanced ? "border-emerald-500" : "border-amber-500"}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {summary.balanced ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <AlertTriangle className="h-3 w-3 text-amber-600" />} Difference
            </div>
            <div className={`text-lg font-semibold ${summary.balanced ? "text-emerald-600" : "text-amber-600"}`}>{fmt(summary.diff)}</div>
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Transactions up to {session.statement_date}</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            tableId="reconciliation-session-detail"
            data={txns}
            columns={txnColumns}
            searchPlaceholder="Search description or reference"
            empty="No transactions in this period."
          />
        </CardContent>
      </Card>

      {session.notes && <Card><CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-wrap">{session.notes}</CardContent></Card>}
    </div>
  );
}
