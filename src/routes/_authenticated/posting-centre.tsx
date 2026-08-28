import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmtMoney } from "@/lib/format";
import { reverseJournalEntry } from "@/lib/reversal";
import { toast } from "sonner";
import { RefreshCw, Undo2, ScrollText, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/posting-centre")({
  head: () => ({
    meta: [
      { title: "Posting Centre — SifoBooks" },
      { name: "description", content: "Every general ledger posting from every SifoBooks module in one audited place, with balance checks and controlled reversals." },
      { property: "og:title", content: "Posting Centre — SifoBooks" },
      { property: "og:description", content: "Audit every GL posting by source module and reverse safely with a reason." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PostingCentre,
});

type Line = { id: string; account_id: string | null; description: string | null; debit: number | null; credit: number | null };
type Entry = {
  id: string;
  entry_number: string;
  entry_date: string;
  reference: string | null;
  description: string | null;
  status: string;
  total_debit: number | null;
  total_credit: number | null;
  reversal_of: string | null;
  reversed_by: string | null;
  reversal_reason: string | null;
  journal_lines: Line[];
};

const SOURCES: { key: string; label: string; prefixes: string[] }[] = [
  { key: "invoice", label: "Sales Invoice", prefixes: ["INV:"] },
  { key: "receipt", label: "Receipt", prefixes: ["RCT:"] },
  { key: "bill", label: "Supplier Bill", prefixes: ["BILL:"] },
  { key: "payment", label: "Bill Payment", prefixes: ["PAY:", "BPY:"] },
  { key: "expense", label: "Expense", prefixes: ["EXP:"] },
  { key: "pos", label: "Retail POS", prefixes: ["POS:"] },
  { key: "restaurant", label: "Restaurant", prefixes: ["RST:", "ORD:"] },
  { key: "payroll", label: "Payroll", prefixes: ["PAYROLL:", "PR:"] },
  { key: "stock", label: "Inventory", prefixes: ["STK:", "COUNT:"] },
  { key: "asset", label: "Fixed Assets", prefixes: ["DEP:", "DISP:"] },
  { key: "grant", label: "Grants / Funds", prefixes: ["GRANT:", "TUCK:", "IMP:", "ALLOW:"] },
];

function sourceOf(e: Entry) {
  const ref = (e.reference ?? "").replace(/^REV:/, "").toUpperCase();
  const hit = SOURCES.find(s => s.prefixes.some(p => ref.startsWith(p)));
  return hit?.label ?? "Manual Journal";
}

function PostingCentre() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Entry | null>(null);
  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<Entry | null>(null);
  const [reason, setReason] = useState("");
  const [revDate, setRevDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [{ data, error: e1 }, { data: coa }] = await Promise.all([
      supabase.from("journal_entries")
        .select("id, entry_number, entry_date, reference, description, status, total_debit, total_credit, reversal_of, reversed_by, reversal_reason, journal_lines(id, account_id, description, debit, credit)")
        .order("entry_date", { ascending: false })
        .limit(1000),
      supabase.from("chart_of_accounts").select("id, account_code, account_name"),
    ]);
    if (e1) setError(e1.message);
    setRows(((data ?? []) as any[]).map(r => ({ ...r, journal_lines: r.journal_lines ?? [] })) as Entry[]);
    const map: Record<string, string> = {};
    (coa ?? []).forEach((a: any) => { map[a.id] = `${a.account_code} · ${a.account_name}`; });
    setAccounts(map);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    let unbalanced = 0, drafts = 0, reversals = 0;
    for (const r of rows) {
      const dr = r.journal_lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
      const cr = r.journal_lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
      if (r.status === "posted" && (Math.abs(dr - cr) > 0.01 || r.journal_lines.length === 0)) unbalanced++;
      if (r.status === "draft") drafts++;
      if (r.reversal_of) reversals++;
    }
    return { total: rows.length, unbalanced, drafts, reversals };
  }, [rows]);

  const doReverse = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await reverseJournalEntry(target.id, reason, revDate);
      toast.success(`Reversed ${target.entry_number}`);
      setTarget(null); setReason(""); setDetail(null);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<Entry>[] = [
    { key: "entry_number", header: "Entry #", sortable: true, sticky: true, width: 150 },
    { key: "entry_date", header: "Date", sortable: true, width: 110 },
    { key: "source", header: "Source", sortable: true, accessor: sourceOf,
      cell: r => <Badge variant="secondary" className="font-normal">{sourceOf(r)}</Badge> },
    { key: "reference", header: "Reference", sortable: true },
    { key: "description", header: "Narration", cell: r => <span className="line-clamp-1">{r.description ?? "—"}</span> },
    { key: "total_debit", header: "Debit", align: "right", sortable: true, accessor: r => Number(r.total_debit ?? 0), cell: r => fmtMoney(r.total_debit ?? 0) },
    { key: "total_credit", header: "Credit", align: "right", sortable: true, accessor: r => Number(r.total_credit ?? 0), cell: r => fmtMoney(r.total_credit ?? 0) },
    {
      key: "integrity", header: "Integrity", align: "center",
      accessor: r => {
        const dr = r.journal_lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
        const cr = r.journal_lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
        return Math.abs(dr - cr) > 0.01 || r.journal_lines.length === 0 ? "unbalanced" : "balanced";
      },
      cell: r => {
        const dr = r.journal_lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
        const cr = r.journal_lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
        const bad = Math.abs(dr - cr) > 0.01 || r.journal_lines.length === 0;
        return bad
          ? <Badge className="bg-red-100 text-red-700" variant="secondary"><AlertTriangle className="mr-1 h-3 w-3" />Unbalanced</Badge>
          : <Badge className="bg-emerald-100 text-emerald-700" variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3" />Balanced</Badge>;
      },
    },
    {
      key: "state", header: "State", accessor: r => r.reversed_by ? "reversed" : r.reversal_of ? "reversal" : r.status,
      cell: r => r.reversed_by
        ? <Badge className="bg-amber-100 text-amber-700" variant="secondary">Reversed</Badge>
        : r.reversal_of
          ? <Badge className="bg-sky-100 text-sky-700" variant="secondary">Reversal entry</Badge>
          : <Badge variant="secondary">{r.status}</Badge>,
    },
    {
      key: "actions", header: "", align: "right", width: 130,
      cell: r => (
        <Button
          size="sm" variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
          disabled={r.status !== "posted" || !!r.reversed_by || !!r.reversal_of}
          onClick={e => { e.stopPropagation(); setTarget(r); setReason(""); setRevDate(new Date().toISOString().slice(0, 10)); }}
        >
          <Undo2 className="mr-1 h-3.5 w-3.5" />Reverse
        </Button>
      ),
    },
  ];

  const cards = [
    { label: "Postings", value: stats.total, tone: "text-foreground" },
    { label: "Unbalanced", value: stats.unbalanced, tone: stats.unbalanced ? "text-red-600" : "text-emerald-600" },
    { label: "Drafts (not in ledger)", value: stats.drafts, tone: stats.drafts ? "text-amber-600" : "text-emerald-600" },
    { label: "Reversal entries", value: stats.reversals, tone: "text-sky-600" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ScrollText className="h-6 w-6 text-primary" /> Posting Centre
          </h1>
          <p className="text-sm text-muted-foreground">
            Every general ledger posting from every module, with balance checks, source drill-down and controlled reversals.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className={`mt-1 text-2xl font-semibold ${c.tone}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable
        data={rows}
        columns={columns}
        tableId="posting-centre"
        loading={loading}
        error={error}
        onRetry={() => void load()}
        onRowClick={r => setDetail(r)}
        searchPlaceholder="Search entry #, reference or narration…"
        pageSize={25}
        totals={rs => ({
          total_debit: fmtMoney(rs.reduce((s, r) => s + Number(r.total_debit ?? 0), 0)),
          total_credit: fmtMoney(rs.reduce((s, r) => s + Number(r.total_credit ?? 0), 0)),
        })}
        empty="No journal postings yet."
      />

      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail?.entry_number}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-muted-foreground">Date</div>{detail.entry_date}</div>
                <div><div className="text-muted-foreground">Source</div>{sourceOf(detail)}</div>
                <div><div className="text-muted-foreground">Reference</div>{detail.reference ?? "—"}</div>
                <div><div className="text-muted-foreground">Status</div>{detail.reversed_by ? "Reversed" : detail.status}</div>
              </div>
              <div><div className="text-muted-foreground">Narration</div>{detail.description ?? "—"}</div>
              {detail.reversal_reason && (
                <div className="rounded-lg bg-amber-50 p-3 text-amber-800">
                  <div className="font-medium">Reversal reason</div>{detail.reversal_reason}
                </div>
              )}
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="p-2 text-left">Account</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th></tr>
                  </thead>
                  <tbody>
                    {detail.journal_lines.map(l => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2">
                          <div>{accounts[l.account_id ?? ""] ?? "Unmapped account"}</div>
                          {l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}
                        </td>
                        <td className="p-2 text-right">{Number(l.debit ?? 0) ? fmtMoney(l.debit ?? 0) : ""}</td>
                        <td className="p-2 text-right">{Number(l.credit ?? 0) ? fmtMoney(l.credit ?? 0) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/30 font-medium">
                    <tr>
                      <td className="p-2">Total</td>
                      <td className="p-2 text-right">{fmtMoney(detail.journal_lines.reduce((s, l) => s + Number(l.debit ?? 0), 0))}</td>
                      <td className="p-2 text-right">{fmtMoney(detail.journal_lines.reduce((s, l) => s + Number(l.credit ?? 0), 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                disabled={detail.status !== "posted" || !!detail.reversed_by || !!detail.reversal_of}
                onClick={() => { setTarget(detail); setReason(""); }}
              >
                <Undo2 className="mr-2 h-4 w-4" /> Reverse this posting
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!target} onOpenChange={o => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse {target?.entry_number}</DialogTitle>
            <DialogDescription>
              This creates a mirror journal entry cancelling every line. The original posting is kept for audit and
              cannot be reversed twice or into a closed period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rev-date">Reversal date</Label>
              <Input id="rev-date" type="date" value={revDate} onChange={e => setRevDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rev-reason">Reason (required)</Label>
              <Textarea id="rev-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)}
                placeholder="e.g. Posted to the wrong expense account" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={() => void doReverse()} disabled={busy || reason.trim().length < 4}>
              {busy ? "Reversing…" : "Confirm reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
