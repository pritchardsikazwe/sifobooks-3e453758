import { SifoHubTabs } from "@/components/sifo/SifoHubTabs";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Scale, Link2, Unlink, CheckCircle2, Loader2, Search, Upload, AlertTriangle, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { postBankAllocation } from "@/lib/bank-posting";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";


export const Route = createFileRoute("/_authenticated/reconciliation")({
  head: () => ({
    meta: [
      { title: "Bank & Cash Reconciliation" },
      { name: "description", content: "Match bank and cash transactions with configurable tolerances and CSV import." },
    ],
  }),
  component: Reconciliation,
});

type Txn = {
  id: string;
  txn_date: string;
  description: string | null;
  amount: number;
  reference: string | null;
  reconciled: boolean;
  matched_type: string | null;
  matched_id: string | null;
};

type Candidate = {
  id: string;
  kind: "receipt" | "bill_payment" | "journal_entry";
  date: string;
  amount: number;
  label: string;
  reference: string | null;
};

type Scored = { c: Candidate; score: number; exact: boolean; near: boolean };

type ParsedRow = {
  txn_date: string;
  description: string;
  amount: number;
  reference: string | null;
  balance: number | null;
};

type MapField = "date" | "description" | "amount" | "amount_in" | "amount_out" | "reference" | "balance" | "ignore";

const FIELD_LABELS: Record<MapField, string> = {
  date: "Date",
  description: "Description",
  amount: "Amount (signed)",
  amount_in: "Amount In / Credit",
  amount_out: "Amount Out / Debit",
  reference: "Reference",
  balance: "Balance",
  ignore: "— Ignore —",
};

function dedupKey(r: { txn_date: string; amount: number; description: string; reference: string | null }): string {
  return [
    r.txn_date,
    Number(r.amount).toFixed(2),
    (r.description || "").toLowerCase().trim().replace(/\s+/g, " "),
    (r.reference || "").toLowerCase().trim(),
  ].join("|");
}

function Reconciliation() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [status, setStatus] = useState<"all" | "unreconciled" | "reconciled">("unreconciled");
  const [search, setSearch] = useState("");
  const [amountTol, setAmountTol] = useState(0.5);
  const [dateTol, setDateTol] = useState(3);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [matchTxn, setMatchTxn] = useState<Txn | null>(null);

  // Allocate & post to ledger
  const [allocTxn, setAllocTxn] = useState<Txn | null>(null);
  const [allocAccountId, setAllocAccountId] = useState<string>("");
  const [allocMemo, setAllocMemo] = useState<string>("");
  const [accounts, setAccounts] = useState<{ id: string; account_code: string; account_name: string; account_type: string }[]>([]);
  const [rules, setRules] = useState<{ id: string; pattern: string; account_id: string }[]>([]);

  // CSV import state
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvBody, setCsvBody] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<MapField[]>([]);
  const [hasHeader, setHasHeader] = useState(true);


  const load = async () => {
    setLoading(true);
    const [txnRes, recRes, bpRes, jeRes] = await Promise.all([
      supabase.from("bank_transactions").select("*").gte("txn_date", from).lte("txn_date", to).order("txn_date", { ascending: false }),
      supabase.from("receipts").select("id, number, receipt_date, amount, reference").gte("receipt_date", from).lte("receipt_date", to),
      supabase.from("bill_payments").select("id, payment_number, payment_date, amount, reference").gte("payment_date", from).lte("payment_date", to),
      supabase.from("journal_entries").select("id, entry_number, entry_date, total_debit, reference, description").gte("entry_date", from).lte("entry_date", to),
    ]);
    if (txnRes.error) toast.error(txnRes.error.message);
    setTxns((txnRes.data as Txn[]) ?? []);
    const cands: Candidate[] = [];
    (recRes.data ?? []).forEach((r: any) => cands.push({
      id: r.id, kind: "receipt", date: r.receipt_date, amount: Number(r.amount ?? 0),
      label: `Receipt ${r.number ?? ""}`.trim(), reference: r.reference,
    }));
    (bpRes.data ?? []).forEach((b: any) => cands.push({
      id: b.id, kind: "bill_payment", date: b.payment_date, amount: Number(b.amount ?? 0),
      label: `Bill Pmt ${b.payment_number ?? ""}`.trim(), reference: b.reference,
    }));
    (jeRes.data ?? []).forEach((j: any) => cands.push({
      id: j.id, kind: "journal_entry", date: j.entry_date, amount: Number(j.total_debit ?? 0),
      label: `JE ${j.entry_number ?? ""} — ${j.description ?? ""}`.trim(), reference: j.reference,
    }));
    setCandidates(cands);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  useEffect(() => {
    (async () => {
      const [{ data: acc }, { data: rl }] = await Promise.all([
        supabase.from("chart_of_accounts").select("id, account_code, account_name, account_type").eq("is_active", true).order("account_code"),
        supabase.from("expense_category_rules").select("id, pattern, account_id"),
      ]);
      setAccounts(acc ?? []);
      setRules((rl as any) ?? []);
    })();
  }, []);

  const openAllocate = (t: Txn) => {
    setAllocTxn(t);
    setAllocMemo(t.description ?? "");
    // suggest via rules
    const desc = (t.description ?? "").toLowerCase();
    const hit = rules.find(r => r.pattern && desc.includes(r.pattern.toLowerCase()));
    if (hit) { setAllocAccountId(hit.account_id); return; }
    // fallback: revenue for inflow, expense for outflow
    const wantType = Number(t.amount) > 0 ? "revenue" : "expense";
    const pick = accounts.find(a => a.account_type === wantType);
    setAllocAccountId(pick?.id ?? "");
  };

  const runAllocate = async () => {
    if (!allocTxn || !allocAccountId) return toast.error("Pick an account");
    setBusy(allocTxn.id);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(null); return; }
    const res = await postBankAllocation({
      userId: u.user.id, txn: allocTxn, accountId: allocAccountId, memo: allocMemo,
    });
    setBusy(null);
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success("Posted to ledger & reconciled");
    setAllocTxn(null);
    load();
  };



  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return txns.filter(t => {
      if (status === "unreconciled" && t.reconciled) return false;
      if (status === "reconciled" && !t.reconciled) return false;
      if (!s) return true;
      return (t.description ?? "").toLowerCase().includes(s) || (t.reference ?? "").toLowerCase().includes(s);
    });
  }, [txns, status, search]);

  const totals = useMemo(() => {
    const inflow = filtered.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const outflow = filtered.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0);
    const rec = filtered.filter(t => t.reconciled).length;
    return { inflow, outflow, rec, total: filtered.length };
  }, [filtered]);

  const scoreCandidate = (t: Txn, c: Candidate): Scored | null => {
    const amt = Math.abs(Number(t.amount));
    const cAmt = Math.abs(c.amount);
    const amtDiff = Math.abs(cAmt - amt);
    const dayDiff = Math.abs(new Date(c.date).getTime() - new Date(t.txn_date).getTime()) / 86400000;
    if (amtDiff > amountTol || dayDiff > dateTol) return null;
    let score = 0;
    const exactAmt = amtDiff < 0.01;
    const exactDate = dayDiff === 0;
    score += exactAmt ? 50 : Math.max(0, 40 - (amtDiff / Math.max(amt, 1)) * 100);
    score += exactDate ? 20 : Math.max(0, 15 - dayDiff * 3);
    const ref = (t.reference ?? "").toLowerCase();
    if (ref && c.reference && ref === c.reference.toLowerCase()) score += 20;
    return { c, score, exact: exactAmt && exactDate, near: !(exactAmt && exactDate) };
  };

  const suggest = (t: Txn): Scored[] => {
    const usedIds = new Set(txns.filter(x => x.id !== t.id).map(x => x.matched_type + ":" + x.matched_id));
    return candidates
      .filter(c => !usedIds.has(c.kind + ":" + c.id))
      .map(c => scoreCandidate(t, c))
      .filter((x): x is Scored => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  };

  const match = async (t: Txn, c: Candidate) => {
    setBusy(t.id);
    const { error } = await supabase.from("bank_transactions").update({
      reconciled: true, matched_type: c.kind, matched_id: c.id, reconciled_at: new Date().toISOString(),
    }).eq("id", t.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Matched to ${c.label}`);
    setMatchTxn(null);
    load();
  };

  const toggle = async (t: Txn) => {
    setBusy(t.id);
    const { error } = await supabase.from("bank_transactions").update(
      t.reconciled
        ? { reconciled: false, matched_type: null, matched_id: null, reconciled_at: null }
        : { reconciled: true, reconciled_at: new Date().toISOString() }
    ).eq("id", t.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    load();
  };

  const autoMatch = async () => {
    setBusy("auto");
    let exactMatched = 0;
    let flagged = 0;
    for (const t of txns.filter(x => !x.reconciled)) {
      const s = suggest(t);
      const top = s[0];
      if (!top) continue;
      if (top.exact) {
        const { error } = await supabase.from("bank_transactions").update({
          reconciled: true, matched_type: top.c.kind, matched_id: top.c.id, reconciled_at: new Date().toISOString(),
        }).eq("id", t.id);
        if (!error) exactMatched++;
      } else {
        flagged++;
      }
    }
    setBusy(null);
    toast.success(`Auto-matched ${exactMatched} exact · ${flagged} near-matches flagged for review`);
    load();
  };

  // ---- CSV parsing + column mapping ----
  const openImport = () => {
    setCsvText("");
    setCsvHeaders([]);
    setCsvBody([]);
    setMapping([]);
    setHasHeader(true);
    setImportOpen(true);
  };

  const guessMapping = (headers: string[]): MapField[] => {
    return headers.map(h => {
      const k = h.toLowerCase().trim();
      if (/(^|\b)(date|txn.?date|posting.?date|value.?date|transaction.?date)/.test(k)) return "date";
      if (/(desc|narration|details|particulars|memo|payee)/.test(k)) return "description";
      if (/(ref|reference|check|cheque|txn.?id|transaction.?id)/.test(k)) return "reference";
      if (/(balance|running)/.test(k)) return "balance";
      if (/(credit|deposit|money.?in|paid.?in|cr\b|amount.?in|inflow)/.test(k)) return "amount_in";
      if (/(debit|withdrawal|money.?out|paid.?out|dr\b|amount.?out|outflow)/.test(k)) return "amount_out";
      if (/^(amount|amt|value)$/.test(k) || /amount/.test(k)) return "amount";
      return "ignore";
    });
  };

  const parseRaw = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) { setCsvHeaders([]); setCsvBody([]); setMapping([]); return; }
    const rows = lines.map(splitCsvLine);
    const width = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => { while (r.length < width) r.push(""); return r; });
    if (hasHeader) {
      const headers = padded[0].map(h => h.trim());
      setCsvHeaders(headers);
      setCsvBody(padded.slice(1));
      setMapping(prev => prev.length === headers.length ? prev : guessMapping(headers));
    } else {
      const headers = Array.from({ length: width }, (_, i) => `Column ${i + 1}`);
      setCsvHeaders(headers);
      setCsvBody(padded);
      setMapping(prev => prev.length === headers.length ? prev : Array(width).fill("ignore"));
    }
  };

  useEffect(() => { if (csvText) parseRaw(csvText); /* eslint-disable-next-line */ }, [csvText, hasHeader]);

  const preview = useMemo(() => {
    const rows: ParsedRow[] = [];
    const errors: string[] = [];
    const dupInFile: number[] = [];
    if (!mapping.length || !csvBody.length) return { rows, errors, dupInFile };
    const idx = (f: MapField) => mapping.indexOf(f);
    const iDate = idx("date");
    const iDesc = idx("description");
    const iAmt = idx("amount");
    const iIn = idx("amount_in");
    const iOut = idx("amount_out");
    const iRef = idx("reference");
    const iBal = idx("balance");
    if (iDate < 0) errors.push("Map a Date column");
    if (iAmt < 0 && (iIn < 0 && iOut < 0)) errors.push("Map an Amount column (or both In and Out)");
    if (errors.length) return { rows, errors, dupInFile };
    const seen = new Set<string>();
    csvBody.forEach((cols, i) => {
      const rawDate = (cols[iDate] ?? "").trim();
      const date = normalizeDate(rawDate);
      if (!date) { errors.push(`Row ${i + 1}: invalid date "${rawDate}"`); return; }
      let amt = 0;
      if (iAmt >= 0) {
        amt = parseNum(cols[iAmt]);
      } else {
        const inn = iIn >= 0 ? parseNum(cols[iIn]) : 0;
        const out = iOut >= 0 ? parseNum(cols[iOut]) : 0;
        amt = inn - out;
      }
      if (!isFinite(amt)) { errors.push(`Row ${i + 1}: invalid amount`); return; }
      const row: ParsedRow = {
        txn_date: date,
        description: iDesc >= 0 ? (cols[iDesc] ?? "").trim() : "",
        amount: amt,
        reference: iRef >= 0 ? ((cols[iRef] ?? "").trim() || null) : null,
        balance: iBal >= 0 && cols[iBal] ? parseNum(cols[iBal]) : null,
      };
      const k = dedupKey(row);
      if (seen.has(k)) { dupInFile.push(i); return; }
      seen.add(k);
      rows.push(row);
    });
    return { rows, errors, dupInFile };
  }, [csvBody, mapping]);

  const [existingKeys, setExistingKeys] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!preview.rows.length) { setExistingKeys(null); return; }
    const dates = preview.rows.map(r => r.txn_date).sort();
    const minD = dates[0];
    const maxD = dates[dates.length - 1];
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("bank_transactions")
        .select("txn_date, amount, description, reference")
        .gte("txn_date", minD).lte("txn_date", maxD);
      if (cancelled) return;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => set.add(dedupKey({
        txn_date: r.txn_date, amount: Number(r.amount ?? 0),
        description: r.description ?? "", reference: r.reference ?? null,
      })));
      setExistingKeys(set);
    })();
    return () => { cancelled = true; };
  }, [preview.rows]);

  const previewStats = useMemo(() => {
    const rows = preview.rows;
    if (!existingKeys) return { newRows: rows, dupExisting: 0 };
    const newRows: ParsedRow[] = [];
    let dup = 0;
    for (const r of rows) {
      if (existingKeys.has(dedupKey(r))) dup++;
      else newRows.push(r);
    }
    return { newRows, dupExisting: dup };
  }, [preview.rows, existingKeys]);

  const importCsv = async () => {
    if (preview.errors.length) return toast.error(preview.errors.slice(0, 3).join(" · "));
    const rows = previewStats.newRows;
    if (!rows.length) return toast.error("Nothing new to import — all rows are duplicates.");
    setImporting(true);
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) { setImporting(false); return toast.error("Not signed in"); }
    const payload = rows.map(r => ({ ...r, user_id: userId, source_file: "csv-import" }));
    const { error } = await supabase.from("bank_transactions").insert(payload);
    setImporting(false);
    if (error) return toast.error(error.message);
    const skipped = preview.rows.length - rows.length + preview.dupInFile.length;
    toast.success(`Imported ${rows.length} · Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}`);
    setImportOpen(false);
    setCsvText("");
    const dates = rows.map(r => r.txn_date).sort();
    if (dates[0] < from) setFrom(dates[0]);
    if (dates[dates.length - 1] > to) setTo(dates[dates.length - 1]);
    load();
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const txnColumns: DTColumn<Txn>[] = useMemo(() => [
    { key: "txn_date", header: "Date" },
    { key: "description", header: "Description", cell: t => <span className="max-w-[320px] truncate block">{t.description}</span> },
    { key: "reference", header: "Ref", cell: t => <span className="text-xs text-muted-foreground">{t.reference}</span> },
    {
      key: "amount", header: "Amount", align: "right",
      accessor: t => Number(t.amount),
      cell: t => <span className={`font-mono ${Number(t.amount) < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(Number(t.amount))}</span>,
    },
    {
      key: "status", header: "Status",
      accessor: t => t.reconciled ? "reconciled" : "open",
      cell: t => {
        const top = !t.reconciled ? suggest(t)[0] : null;
        return t.reconciled ? (
          <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />{t.matched_type ?? "manual"}</Badge>
        ) : top?.exact ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Exact match ready</Badge>
          : top?.near ? <Badge variant="outline" className="border-amber-500 text-amber-700 gap-1"><AlertTriangle className="h-3 w-3" />Near-match — review</Badge>
          : <Badge variant="outline">Open</Badge>;
      },
    },
    {
      key: "actions", header: "Actions", align: "right", sortable: false,
      cell: t => (
        <div className="space-x-1">
          {!t.reconciled && (
            <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => openAllocate(t)} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <BookOpen className="h-3 w-3 mr-1" />Post
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => setMatchTxn(t)}>
            <Link2 className="h-3 w-3 mr-1" />Match
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === t.id} onClick={() => toggle(t)}>
            {t.reconciled ? <><Unlink className="h-3 w-3 mr-1" />Unreconcile</> : <><CheckCircle2 className="h-3 w-3 mr-1" />Mark</>}
          </Button>
        </div>
      ),
    },
  ], [busy, suggest, toggle, openAllocate, fmt]);

  if (allocTxn) {
    return (
      <div className="p-4 sm:p-6">
        <AllocateForm
          txn={allocTxn}
          accounts={accounts}
          accountId={allocAccountId} setAccountId={setAllocAccountId}
          memo={allocMemo} setMemo={setAllocMemo}
          fmt={fmt}
          busy={busy === allocTxn.id}
          onCancel={() => setAllocTxn(null)}
          onSave={runAllocate}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <SifoHubTabs hub="finance" active="/reconciliation" />
      <SifoModuleHeader
        module="accounting"
        icon={Scale}
        title="Bank & Cash Reconciliation"
        description="Match bank/cash transactions to receipts, bills, and journal entries."
        breadcrumbs={[{ label: "Finance", to: "/banking" }, { label: "Reconciliation" }]}
        showTabs={false}
        actions={<Button variant="outline" size="sm" className="h-9" onClick={openImport}><Upload className="h-4 w-4 mr-2" />Import CSV</Button>}
      />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters &amp; matching tolerance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unreconciled">Unreconciled</SelectItem>
                <SelectItem value="reconciled">Reconciled</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label title="Absolute amount difference allowed">± Amount</Label>
            <Input type="number" step="0.01" min="0" value={amountTol}
              onChange={e => setAmountTol(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <Label title="Days difference allowed">± Days</Label>
            <Input type="number" step="1" min="0" value={dateTol}
              onChange={e => setDateTol(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div className="flex items-end">
            <Button onClick={autoMatch} disabled={busy === "auto"} className="w-full">
              {busy === "auto" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Auto-match
            </Button>
          </div>
          <div className="col-span-2 md:col-span-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search description or reference" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Transactions</div><div className="text-xl font-bold">{totals.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Reconciled</div><div className="text-xl font-bold">{totals.rec}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Inflow</div><div className="text-xl font-bold text-green-600">{fmt(totals.inflow)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Outflow</div><div className="text-xl font-bold text-red-600">{fmt(totals.outflow)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Transactions</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            tableId="reconciliation-transactions"
            data={filtered}
            columns={txnColumns}
            loading={loading}
            searchPlaceholder={null}
            empty="No transactions in range."
          />
        </CardContent>
      </Card>

      <Dialog open={!!matchTxn} onOpenChange={o => !o && setMatchTxn(null)}>

        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Match transaction</DialogTitle></DialogHeader>
          {matchTxn && (
            <div className="space-y-3">
              <div className="text-sm p-3 rounded-md bg-muted">
                <div className="font-medium">{matchTxn.description}</div>
                <div className="text-xs text-muted-foreground">{matchTxn.txn_date} · {matchTxn.reference} · <span className="font-mono">{fmt(Number(matchTxn.amount))}</span></div>
              </div>
              <div className="text-xs text-muted-foreground">
                Candidates within ± {amountTol.toFixed(2)} amount and ± {dateTol} days. Exact matches shown in green, near-matches flagged for review.
              </div>
              <div className="max-h-96 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Fit</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggest(matchTxn).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No candidates within tolerance.</TableCell></TableRow>
                    ) : suggest(matchTxn).map(s => (
                      <TableRow key={`${s.c.kind}-${s.c.id}`}>
                        <TableCell><Badge variant="outline">{s.c.kind.replace("_", " ")}</Badge></TableCell>
                        <TableCell>{s.c.date}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{s.c.label}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(s.c.amount)}</TableCell>
                        <TableCell>
                          {s.exact
                            ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Exact</Badge>
                            : <Badge variant="outline" className="border-amber-500 text-amber-700">Near</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => match(matchTxn, s.c)} disabled={busy === matchTxn.id}>Match</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Import bank statement (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Upload or paste your bank CSV. Any column layout works — map fields in step 2.
              Duplicates (same date, amount, description &amp; reference) are automatically skipped so re-imports are safe.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input type="file" accept=".csv,text/csv" onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setCsvText(await f.text());
              }} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} />
                First row is header
              </label>
            </div>
            <Textarea
              rows={6}
              placeholder="Or paste CSV content here…"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="font-mono text-xs"
            />

            {csvHeaders.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium">Column mapping</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {csvHeaders.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-40 truncate font-mono px-2 py-1 rounded bg-muted" title={h}>{h || `Column ${i + 1}`}</div>
                      <span className="text-muted-foreground">→</span>
                      <Select value={mapping[i] ?? "ignore"} onValueChange={v => {
                        setMapping(m => { const n = [...m]; n[i] = v as MapField; return n; });
                      }}>
                        <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(FIELD_LABELS) as MapField[]).map(f => (
                            <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border p-3 bg-muted/40 space-y-1 text-xs">
                  <div className="flex flex-wrap gap-3">
                    <span>Parsed: <b>{preview.rows.length}</b></span>
                    <span>New to import: <b className="text-emerald-700">{previewStats.newRows.length}</b></span>
                    <span>Duplicates in file: <b className="text-amber-700">{preview.dupInFile.length}</b></span>
                    <span>Already in database: <b className="text-amber-700">{previewStats.dupExisting}</b></span>
                  </div>
                  {preview.errors.length > 0 && (
                    <div className="text-red-700">Issues: {preview.errors.slice(0, 3).join(" · ")}{preview.errors.length > 3 ? "…" : ""}</div>
                  )}
                </div>

                {previewStats.newRows.length > 0 && (
                  <div className="max-h-56 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Date</TableHead><TableHead>Description</TableHead>
                        <TableHead>Ref</TableHead><TableHead className="text-right">Amount</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {previewStats.newRows.slice(0, 10).map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{r.txn_date}</TableCell>
                            <TableCell className="max-w-[280px] truncate">{r.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.reference}</TableCell>
                            <TableCell className={`text-right font-mono ${r.amount < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(r.amount)}</TableCell>
                          </TableRow>
                        ))}
                        {previewStats.newRows.length > 10 && (
                          <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">…and {previewStats.newRows.length - 10} more</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={importCsv} disabled={importing || !previewStats.newRows.length || preview.errors.length > 0}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Import {previewStats.newRows.length || ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseNum(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/,/g, "").replace(/[()]/g, m => m === "(" ? "-" : "").replace(/[^\d.\-]/g, "");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/;
  if (iso.test(s)) return s.slice(0, 10);
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slash) {
    let [, a, b, c] = slash;
    if (c.length === 2) c = "20" + c;
    const first = Number(a), second = Number(b);
    const dd = first > 12 ? first : second > 12 ? second : first;
    const mm = first > 12 ? second : second > 12 ? first : second;
    const day = String(dd).padStart(2, "0");
    const month = String(mm).padStart(2, "0");
    return `${c}-${month}-${day}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function AllocateForm({
  txn, accounts, accountId, setAccountId, memo, setMemo, fmt, busy, onCancel, onSave,
}: {
  txn: Txn;
  accounts: { id: string; account_code: string; account_name: string; account_type: string }[];
  accountId: string; setAccountId: (v: string) => void;
  memo: string; setMemo: (v: string) => void;
  fmt: (n: number) => string;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <SifoFormPage
      module="banking"
      icon={BookOpen}
      title="Allocate & post to ledger"
      subtitle={`${txn.txn_date} · ${txn.reference ?? ""} · ${fmt(Number(txn.amount))}`}
      onCancel={onCancel}
      onSave={onSave}
      saving={busy}
      saveDisabled={!accountId}
      saveLabel="Post to ledger"
    >
      <SifoFormSection title="Transaction">
        <SifoField label="Description" wide>
          <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{txn.description}</div>
        </SifoField>
        <SifoField
          label={`Counter account (${Number(txn.amount) > 0 ? "credit — revenue/other income" : "debit — expense/asset"})`}
          wide required
        >
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {accounts
                .filter(a => a.account_code !== "1000")
                .map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_code} — {a.account_name} <span className="text-xs text-muted-foreground">({a.account_type})</span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </SifoField>
        <SifoField label="Memo" wide>
          <Input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Description on the journal entry" />
        </SifoField>
        <SifoField label=" " wide>
          <div className="text-xs text-muted-foreground rounded border border-emerald-200 bg-emerald-50 p-2">
            Posts a journal entry against Cash &amp; Bank (1000) and marks this transaction reconciled. Reports (P&amp;L, Trial Balance, Balance Sheet) update instantly.
          </div>
        </SifoField>
      </SifoFormSection>
    </SifoFormPage>
  );
}
