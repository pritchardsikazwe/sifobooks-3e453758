import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Scale, Link2, Unlink, CheckCircle2, Loader2, Search, Upload, AlertTriangle } from "lucide-react";
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

function Reconciliation() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [status, setStatus] = useState<"all" | "unreconciled" | "reconciled">("unreconciled");
  const [search, setSearch] = useState("");
  const [amountTol, setAmountTol] = useState(0.5); // absolute currency units
  const [dateTol, setDateTol] = useState(3);       // days
  const [txns, setTxns] = useState<Txn[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [matchTxn, setMatchTxn] = useState<Txn | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

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

  // ---- CSV import ----
  const parseCsv = (text: string): { rows: any[]; errors: string[] } => {
    const errors: string[] = [];
    const rows: any[] = [];
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { rows, errors: ["CSV is empty"] };
    const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const need = ["date", "description", "amount"];
    for (const n of need) if (!header.includes(n)) errors.push(`Missing required column: ${n}`);
    if (errors.length) return { rows, errors };
    const iDate = header.indexOf("date");
    const iDesc = header.indexOf("description");
    const iAmt = header.indexOf("amount");
    const iRef = header.indexOf("reference");
    const iBal = header.indexOf("balance");
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      const rawDate = (cols[iDate] ?? "").trim();
      const date = normalizeDate(rawDate);
      if (!date) { errors.push(`Line ${i + 1}: invalid date "${rawDate}"`); continue; }
      const amt = Number((cols[iAmt] ?? "").replace(/,/g, "").replace(/[^\d.\-]/g, ""));
      if (!isFinite(amt)) { errors.push(`Line ${i + 1}: invalid amount`); continue; }
      rows.push({
        txn_date: date,
        description: cols[iDesc]?.trim() ?? "",
        amount: amt,
        reference: iRef >= 0 ? (cols[iRef]?.trim() || null) : null,
        balance: iBal >= 0 && cols[iBal] ? Number((cols[iBal] ?? "").replace(/,/g, "").replace(/[^\d.\-]/g, "")) : null,
        source_file: "csv-import",
      });
    }
    return { rows, errors };
  };

  const importCsv = async () => {
    const { rows, errors } = parseCsv(csvText);
    if (errors.length) return toast.error(errors.slice(0, 3).join("\n"));
    if (!rows.length) return toast.error("No rows parsed");
    setImporting(true);
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) { setImporting(false); return toast.error("Not signed in"); }
    const payload = rows.map(r => ({ ...r, user_id: userId }));
    const { error } = await supabase.from("bank_transactions").insert(payload);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${rows.length} transactions`);
    setImportOpen(false);
    setCsvText("");
    // Expand range if imported rows fall outside current view
    const dates = rows.map(r => r.txn_date).sort();
    if (dates[0] < from) setFrom(dates[0]);
    if (dates[dates.length - 1] > to) setTo(dates[dates.length - 1]);
    load();
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Bank &amp; Cash Reconciliation</h1>
            <p className="text-sm text-muted-foreground">Match bank/cash transactions to receipts, bills, and journal entries.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />Import CSV
        </Button>
      </div>

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
          {loading ? <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions in range.</TableCell></TableRow>
                ) : filtered.map(t => {
                  const amt = Number(t.amount);
                  const top = !t.reconciled ? suggest(t)[0] : null;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{t.txn_date}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{t.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reference}</TableCell>
                      <TableCell className={`text-right font-mono ${amt < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(amt)}</TableCell>
                      <TableCell>
                        {t.reconciled ? (
                          <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />{t.matched_type ?? "manual"}</Badge>
                        ) : top?.exact ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Exact match ready</Badge>
                          : top?.near ? <Badge variant="outline" className="border-amber-500 text-amber-700 gap-1"><AlertTriangle className="h-3 w-3" />Near-match — review</Badge>
                          : <Badge variant="outline">Open</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => setMatchTxn(t)}>
                          <Link2 className="h-3 w-3 mr-1" />Match
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy === t.id} onClick={() => toggle(t)}>
                          {t.reconciled ? <><Unlink className="h-3 w-3 mr-1" />Unreconcile</> : <><CheckCircle2 className="h-3 w-3 mr-1" />Mark</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import bank statement (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Required columns (case-insensitive): <code>date</code>, <code>description</code>, <code>amount</code>.
              Optional: <code>reference</code>, <code>balance</code>. Positive = money in, negative = money out.
              Dates accepted: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY.
            </div>
            <Input type="file" accept=".csv,text/csv" onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setCsvText(await f.text());
            }} />
            <Textarea
              rows={10}
              placeholder="Or paste CSV content here…&#10;date,description,amount,reference&#10;2026-01-05,Standard Chartered POS,-450.00,POS12345"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="font-mono text-xs"
            />
            {csvText && (() => {
              const { rows, errors } = parseCsv(csvText);
              return (
                <div className="text-xs">
                  <div>Parsed: <b>{rows.length}</b> row(s)</div>
                  {errors.length > 0 && <div className="text-amber-700">Issues: {errors.slice(0, 3).join(" · ")}{errors.length > 3 ? "…" : ""}</div>}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={importCsv} disabled={importing || !csvText.trim()}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Import
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

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/;
  if (iso.test(s)) return s.slice(0, 10);
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slash) {
    let [, a, b, c] = slash;
    if (c.length === 2) c = "20" + c;
    // Assume DD/MM/YYYY if first part > 12
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
