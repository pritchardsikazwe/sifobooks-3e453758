import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DTColumn } from "@/components/data-table";
import { ExportMenu } from "@/lib/exports";
import { fmtMoney } from "@/lib/format";
import { LedgerImpactSheet, type LedgerTarget } from "@/components/accounting/LedgerImpactSheet";
import { BookOpen, Eye, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printReceipt } from "@/services/universalPrintService";
import { toast } from "sonner";
import { SifoModuleHeader, SifoPage, SifoStatusBadge } from "@/components/sifo";

export const Route = createFileRoute("/_authenticated/pos-sales")({
  head: () => ({
    meta: [
      { title: "POS Sales History — SifoBooks" },
      { name: "description", content: "Every retail till sale with tender, tax, cost of sale and the general ledger entry it posted." },
      { property: "og:title", content: "POS Sales History — SifoBooks" },
      { property: "og:description", content: "Review, filter and export retail POS sales and check their ledger impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
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
  const [view, setView] = useState<{ sale: Sale; items: any[]; payments: any[] } | null>(null);

  const openReceipt = async (sale: Sale) => {
    const [{ data: items }, { data: payments }] = await Promise.all([
      supabase.from("pos_sale_items").select("*").eq("sale_id", sale.id),
      supabase.from("pos_payments").select("*").eq("sale_id", sale.id),
    ]);
    setView({ sale, items: items ?? [], payments: payments ?? [] });
  };

  const reprint = async () => {
    if (!view) return;
    const { sale, items, payments } = view;
    const paid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const no = sale.sale_no ?? sale.id.slice(0, 8);
    try {
      const res = await printReceipt({
        businessName: "SifoBooks",
        receiptNumber: no,
        date: sale.sold_at,
        items: items.map(i => ({ name: i.name, quantity: Number(i.qty), price: Number(i.price), total: Number(i.line_total ?? Number(i.qty) * Number(i.price)) })),
        subtotal: Number(sale.subtotal), discount: Number(sale.discount), tax: Number(sale.tax), total: Number(sale.total),
        paymentMethod: payments.map(p => p.method).filter(Boolean).join(", ") || undefined,
        amountPaid: paid || undefined,
        change: paid ? Math.max(0, paid - Number(sale.total)) : undefined,
        footer: "*** COPY — REPRINT ***",
      }, undefined, 1, { jobId: `receipt-copy:${no}:${Date.now()}`, reference: no, openCashDrawer: false });
      if (res?.ok === false) toast.warning(res.error ?? "Printer not reachable — saved to the print queue.");
      else toast.success("Receipt copy sent to printer");
    } catch (e: any) { toast.error(e?.message ?? "Reprint failed"); }
  };

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
    { key: "status", header: "Status", cell: r => <SifoStatusBadge status={r.status} /> },
    { key: "subtotal", header: "Subtotal", align: "right", accessor: r => Number(r.subtotal), cell: r => fmtMoney(Number(r.subtotal)) },
    { key: "tax", header: "VAT", align: "right", accessor: r => Number(r.tax), cell: r => fmtMoney(Number(r.tax)) },
    { key: "total", header: "Total", align: "right", accessor: r => Number(r.total), cell: r => <span className="font-semibold">{fmtMoney(Number(r.total))}</span> },
    { key: "cost_total", header: "Cost of sale", align: "right", defaultHidden: true, accessor: r => Number(r.cost_total), cell: r => fmtMoney(Number(r.cost_total)) },
    {
      key: "posted", header: "Ledger", cell: r => r.journal_entry_id
        ? <SifoStatusBadge status="Posted" tone="paid" />
        : r.status === "void" ? <span className="text-xs text-muted-foreground">Voided</span>
        : <SifoStatusBadge status="Not posted" tone="pending" />,
    },
    {
      key: "actions", header: "", cell: r => (
        <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openReceipt(r); }}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Receipt
        </Button>
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
        </div>
      ),
    },
  ];

  return (
    <SifoPage className="space-y-4">
      <SifoModuleHeader
        module="sales"
        icon={BookOpen}
        title="POS sales history"
        description={`${shown.length} sales · ${fmtMoney(shown.filter(r => r.status !== "void").reduce((s, r) => s + Number(r.total || 0), 0))}${unpostedCount > 0 ? ` · ${unpostedCount} not posted` : ""}`}
        breadcrumbs={[{ label: "Sales", to: "/invoices" }, { label: "POS sales" }]}
        actions={<>
          <Input type="date" className="w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <Input type="date" className="w-36" value={to} onChange={e => setTo(e.target.value)} />
          <Button variant={onlyUnposted ? "default" : "outline"} onClick={() => setOnlyUnposted(v => !v)}>Not posted{unpostedCount > 0 ? ` (${unpostedCount})` : ""}</Button>
          <ExportMenu
          filename={`pos-sales-${from}_${to}`}
          title="POS sales"
          rows={shown.map(r => ({
            Sale: r.sale_no ?? r.id, Date: r.sold_at, Customer: r.customer_name, Status: r.status,
            Subtotal: Number(r.subtotal), VAT: Number(r.tax), Discount: Number(r.discount),
            Total: Number(r.total), Cost: Number(r.cost_total), Posted: r.journal_entry_id ? "Yes" : "No",
          }))}
          />
        </>}
      />

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

      <Dialog open={!!view} onOpenChange={o => { if (!o) setView(null); }}>
        <DialogContent className="max-w-sm">
          {view && <>
            <DialogHeader><DialogTitle>Receipt {view.sale.sale_no ?? view.sale.id.slice(0, 8)}</DialogTitle></DialogHeader>
            <div className="space-y-3 font-mono text-xs">
              <div className="text-muted-foreground">{new Date(view.sale.sold_at).toLocaleString()} · {view.sale.customer_name || "Walk-in"}</div>
              <div className="divide-y divide-border border-y border-border">
                {view.items.map((i, k) => (
                  <div key={k} className="flex justify-between py-1.5">
                    <span>{Number(i.qty)} × {i.name}</span>
                    <span>{fmtMoney(Number(i.line_total ?? Number(i.qty) * Number(i.price)))}</span>
                  </div>
                ))}
                {view.items.length === 0 && <div className="py-2 text-muted-foreground">No lines recorded.</div>}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(Number(view.sale.subtotal))}</span></div>
                {Number(view.sale.discount) > 0 && <div className="flex justify-between"><span>Discount</span><span>-{fmtMoney(Number(view.sale.discount))}</span></div>}
                <div className="flex justify-between"><span>VAT</span><span>{fmtMoney(Number(view.sale.tax))}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>{fmtMoney(Number(view.sale.total))}</span></div>
                {view.payments.map((p, k) => (
                  <div key={k} className="flex justify-between text-muted-foreground"><span>{p.method ?? "Payment"}</span><span>{fmtMoney(Number(p.amount ?? 0))}</span></div>
                ))}
              </div>
              {view.sale.status === "void" && <div className="text-destructive">VOID{view.sale.void_reason ? ` — ${view.sale.void_reason}` : ""}</div>}
            </div>
            <Button className="w-full" onClick={reprint}><Printer className="mr-2 h-4 w-4" /> Reprint (copy)</Button>
          </>}
        </DialogContent>
      </Dialog>

      <LedgerImpactSheet target={target} onOpenChange={open => { if (!open) setTarget(null); }} />
    </SifoPage>
  );
}
