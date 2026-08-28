import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DTColumn } from "@/components/data-table";
import { ExportMenu } from "@/lib/exports";
import { fmtMoney } from "@/lib/format";
import { LedgerImpactSheet, type LedgerTarget } from "@/components/accounting/LedgerImpactSheet";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pos-sales")({
  head: () => ({
    meta: [
      { title: "POS Sales History — SifoBooks" },
      { name: "description", content: "Every retail till sale with tender, tax, cost of sale and the general ledger entry it posted." },
      { property: "og:title", content: "POS Sales History — SifoBooks" },
      { property: "og:description", content: "Review, filter and export retail POS sales and check their ledger impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PosSales,
});

type Sale = {
  id: string; sale_no: string | null; sold_at: string; customer_name: string;
  status: string; subtotal: number; tax: number; discount: number; total: number;
  cost_total: number; journal_entry_id: string | null; void_reason: string | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

function PosSales() {
  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [onlyUnposted, setOnlyUnposted] = useState(false);
  const [target, setTarget] = useState<LedgerTarget | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("pos_sales")
      .select("id, sale_no, sold_at, customer_name, status, subtotal, tax, discount, total, cost_total, journal_entry_id, void_reason")
      .eq("user_id", u.user.id)
      .gte("sold_at", `${from}T00:00:00`)
      .lte("sold_at", `${to}T23:59:59`)
      .order("sold_at", { ascending: false });
    setRows((data ?? []) as Sale[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [from, to]);

  const shown = useMemo(
    () => (onlyUnposted ? rows.filter(r => !r.journal_entry_id && r.status !== "void") : rows),
    [rows, onlyUnposted],
  );
  const unpostedCount = rows.filter(r => !r.journal_entry_id && r.status !== "void").length;

  const columns: DTColumn<Sale>[] = [
    { key: "sale_no", header: "Sale", cell: r => <span className="font-mono text-xs">{r.sale_no ?? r.id.slice(0, 8)}</span> },
    { key: "sold_at", header: "Date", accessor: r => r.sold_at, cell: r => new Date(r.sold_at).toLocaleString() },
    { key: "customer_name", header: "Customer" },
    { key: "status", header: "Status", cell: r => <Badge variant={r.status === "void" ? "destructive" : "secondary"}>{r.status}</Badge> },
    { key: "subtotal", header: "Subtotal", align: "right", accessor: r => Number(r.subtotal), cell: r => fmtMoney(Number(r.subtotal)) },
    { key: "tax", header: "VAT", align: "right", accessor: r => Number(r.tax), cell: r => fmtMoney(Number(r.tax)) },
    { key: "total", header: "Total", align: "right", accessor: r => Number(r.total), cell: r => <span className="font-semibold">{fmtMoney(Number(r.total))}</span> },
    { key: "cost_total", header: "Cost of sale", align: "right", defaultHidden: true, accessor: r => Number(r.cost_total), cell: r => fmtMoney(Number(r.cost_total)) },
    {
      key: "posted", header: "Ledger", cell: r => r.journal_entry_id
        ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Posted</Badge>
        : r.status === "void" ? <span className="text-xs text-muted-foreground">Voided</span>
        : <Badge variant="outline" className="text-amber-700">Not posted</Badge>,
    },
    {
      key: "actions", header: "", cell: r => (
        <Button size="sm" variant="ghost" onClick={e => {
          e.stopPropagation();
          setTarget({
            kind: "pos",
            reference: `POS:${r.id}`,
            entryId: r.journal_entry_id,
            title: `POS sale ${r.sale_no ?? r.id.slice(0, 8)}`,
            subtitle: `${fmtMoney(Number(r.total))} · ${new Date(r.sold_at).toLocaleString()}`,
          });
        }}>
          <BookOpen className="mr-1 h-3.5 w-3.5" /> Ledger
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">POS sales history</h1>
          <p className="text-sm text-muted-foreground">
            {shown.length} sales · {fmtMoney(shown.filter(r => r.status !== "void").reduce((s, r) => s + Number(r.total || 0), 0))}
            {unpostedCount > 0 && <span className="text-amber-700"> · {unpostedCount} not posted</span>}
          </p>
        </div>
        <Input type="date" className="w-40" value={from} onChange={e => setFrom(e.target.value)} />
        <Input type="date" className="w-40" value={to} onChange={e => setTo(e.target.value)} />
        <Button variant={onlyUnposted ? "default" : "outline"} onClick={() => setOnlyUnposted(v => !v)}>
          Not posted{unpostedCount > 0 ? ` (${unpostedCount})` : ""}
        </Button>
        <ExportMenu
          filename={`pos-sales-${from}_${to}`}
          title="POS sales"
          rows={shown.map(r => ({
            Sale: r.sale_no ?? r.id, Date: r.sold_at, Customer: r.customer_name, Status: r.status,
            Subtotal: Number(r.subtotal), VAT: Number(r.tax), Discount: Number(r.discount),
            Total: Number(r.total), Cost: Number(r.cost_total), Posted: r.journal_entry_id ? "Yes" : "No",
          }))}
        />
      </div>

      <Card className="rounded-2xl p-2">
        <DataTable
          tableId="pos-sales-history"
          columns={columns}
          data={shown}
          loading={loading}
          searchPlaceholder="Search sale, customer…"
          empty="No POS sales in this range."
          totals={rs => ({
            subtotal: fmtMoney(rs.reduce((s, r) => s + Number(r.subtotal ?? 0), 0)),
            tax: fmtMoney(rs.reduce((s, r) => s + Number(r.tax ?? 0), 0)),
            total: fmtMoney(rs.reduce((s, r) => s + Number(r.total ?? 0), 0)),
          })}
        />
      </Card>

      <LedgerImpactSheet target={target} onOpenChange={open => { if (!open) setTarget(null); }} />
    </div>
  );
}
