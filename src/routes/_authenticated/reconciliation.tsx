import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Scale, Link2, Unlink, CheckCircle2, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reconciliation")({
  head: () => ({
    meta: [
      { title: "Bank & Cash Reconciliation" },
      { name: "description", content: "Match bank and cash transactions against receipts, bills, and journal entries." },
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

function Reconciliation() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [status, setStatus] = useState<"all" | "unreconciled" | "reconciled">("unreconciled");
  const [search, setSearch] = useState("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [matchTxn, setMatchTxn] = useState<Txn | null>(null);

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

  const suggest = (t: Txn): Candidate[] => {
    const amt = Math.abs(Number(t.amount));
    const ref = (t.reference ?? "").toLowerCase();
    return candidates
      .filter(c => !txns.some(x => x.matched_id === c.id && x.matched_type === c.kind && x.id !== t.id))
      .map(c => {
        let score = 0;
        if (Math.abs(Math.abs(c.amount) - amt) < 0.01) score += 50;
        if (c.date === t.txn_date) score += 20;
        else if (Math.abs(new Date(c.date).getTime() - new Date(t.txn_date).getTime()) <= 3 * 86400000) score += 10;
        if (ref && c.reference && ref === c.reference.toLowerCase()) score += 20;
        return { c, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(x => x.c);
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
    let matched = 0;
    for (const t of txns.filter(x => !x.reconciled)) {
      const s = suggest(t);
      const top = s[0];
      if (!top) continue;
      // Only auto-match confident (amount + date/ref) — score effectively >= 60
      const amtOk = Math.abs(Math.abs(top.amount) - Math.abs(Number(t.amount))) < 0.01;
      const dateOk = top.date === t.txn_date;
      if (!amtOk || !dateOk) continue;
      const { error } = await supabase.from("bank_transactions").update({
        reconciled: true, matched_type: top.kind, matched_id: top.id, reconciled_at: new Date().toISOString(),
      }).eq("id", t.id);
      if (!error) matched++;
    }
    setBusy(null);
    toast.success(`Auto-matched ${matched} transaction(s)`);
    load();
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Bank &amp; Cash Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Match bank/cash transactions to receipts, bills, and journal entries.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
          <div className="md:col-span-1">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Description / reference" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={autoMatch} disabled={busy === "auto"} className="w-full">
              {busy === "auto" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Auto-match
            </Button>
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
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{t.txn_date}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{t.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reference}</TableCell>
                      <TableCell className={`text-right font-mono ${amt < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(amt)}</TableCell>
                      <TableCell>
                        {t.reconciled ? (
                          <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />{t.matched_type ?? "manual"}</Badge>
                        ) : <Badge variant="outline">Open</Badge>}
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
          <DialogHeader>
            <DialogTitle>Match transaction</DialogTitle>
          </DialogHeader>
          {matchTxn && (
            <div className="space-y-3">
              <div className="text-sm p-3 rounded-md bg-muted">
                <div className="font-medium">{matchTxn.description}</div>
                <div className="text-xs text-muted-foreground">{matchTxn.txn_date} · {matchTxn.reference} · <span className="font-mono">{fmt(Number(matchTxn.amount))}</span></div>
              </div>
              <div className="text-xs text-muted-foreground">Suggested matches (by amount, date, reference):</div>
              <div className="max-h-96 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggest(matchTxn).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No candidates found.</TableCell></TableRow>
                    ) : suggest(matchTxn).map(c => (
                      <TableRow key={`${c.kind}-${c.id}`}>
                        <TableCell><Badge variant="outline">{c.kind.replace("_", " ")}</Badge></TableCell>
                        <TableCell>{c.date}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{c.label}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(c.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => match(matchTxn, c)} disabled={busy === matchTxn.id}>
                            Match
                          </Button>
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
    </div>
  );
}
