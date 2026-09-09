import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { SifoDocumentLayout, BackToDocumentList, type SifoDocumentLine } from "@/components/sifo/SifoDocumentLayout";
import { DocumentImpact } from "@/components/accounting/LedgerImpactSheet";
import { toast } from "sonner";
import { SifoCompletionPanel } from "@/components/sifo/SifoNextActionPanel";
import { DOCUMENT_GUIDANCE } from "@/lib/document-guidance";

const INVOICE_GUIDANCE = DOCUMENT_GUIDANCE.invoice;

export const Route = createFileRoute("/_authenticated/invoice-detail/$id")({
  head: () => ({ meta: [{ title: "Invoice Detail — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: inv, error }, { data: lines }, { data: pays }, { data: moves }] = await Promise.all([
        supabase.from("invoices").select("*, customers(*)").eq("id", id).maybeSingle(),
        supabase.from("invoice_items").select("*, stock_items(name, sku)").eq("invoice_id", id),
        supabase.from("receipts").select("id, receipt_number, receipt_date, amount, payment_method, invoice_id, status").eq("invoice_id", id).order("receipt_date", { ascending: false }),
        supabase.from("stock_movements").select("id, movement_type, quantity, reference, note, created_at, item_id, stock_items(name, sku)").eq("reference", id).order("created_at", { ascending: false }),
      ]);
      if (error) toast.error(error.message);
      setInvoice(inv); setItems(lines ?? []); setPayments(pays ?? []); setMovements(moves ?? []); setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!invoice) return <div className="p-8 space-y-4"><Button variant="ghost" onClick={() => navigate({ to: "/invoices" })}><ArrowLeft className="mr-2 h-4 w-4" />Back to invoices</Button><p>Invoice not found.</p></div>;

  const lines: SifoDocumentLine[] = items.map((it, i) => ({
    id: it.id ?? String(i),
    cells: [
      <div className="font-medium">{it.stock_items?.name ?? it.description ?? "—"}<div className="text-xs text-muted-foreground">{it.stock_items?.sku ?? ""}</div></div>,
      <span>{Number(it.quantity ?? 0).toLocaleString()}</span>,
      <span>{fmtMoney(it.unit_price ?? 0, invoice.currency)}</span>,
      <span>{Number(it.vat_rate ?? 0)}%</span>,
      <span className="font-medium">{fmtMoney(it.line_total ?? 0, invoice.currency)}</span>,
    ],
  }));

  const paid = Number(invoice.amount_paid ?? 0);
  const balance = Number(invoice.balance_due ?? Math.max(Number(invoice.total ?? 0) - paid, 0));
  const status = invoice.status === "voided" ? "Voided" : invoice.status ?? "Draft";

  return <SifoDocumentLayout
    title="Sales Invoice"
    number={invoice.number}
    status={status}
    description="Complete sales transaction, payment, inventory and accounting audit trail."
    back={<BackToDocumentList onClick={() => navigate({ to: "/invoices" })} label="Invoices" />}
    actions={<>
      {invoice.quote_id && <Button asChild size="sm" variant="outline"><Link to="/quotes"><FileText className="mr-1.5 h-4 w-4" />Originating quote</Link></Button>}
      <Button asChild size="sm" variant="outline"><Link to="/invoices"><ArrowLeft className="mr-1.5 h-4 w-4" />Invoice list</Link></Button>
    </>}
    party={<div><div className="text-xs uppercase tracking-wide text-muted-foreground">Customer</div><div className="font-semibold">{invoice.customers?.name ?? "—"}</div><div className="text-sm text-muted-foreground">TPIN: {invoice.buyer_tpin ?? invoice.customers?.tpin ?? "—"}</div></div>}
    metadata={<div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm"><div><span className="text-muted-foreground">Issue:</span> {invoice.issue_date}</div><div><span className="text-muted-foreground">Due:</span> {invoice.due_date ?? "—"}</div><div><span className="text-muted-foreground">Currency:</span> {invoice.currency ?? "ZMW"}</div><div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className="capitalize">{status}</Badge></div></div>}
    lines={lines}
    lineHeaders={["Item / SKU", "Qty", "Unit price", "VAT", "Line total"]}
    totals={<div className="space-y-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(invoice.subtotal ?? 0, invoice.currency)}</span></div><div className="flex justify-between"><span>VAT</span><span>{fmtMoney(invoice.vat_amount ?? 0, invoice.currency)}</span></div><div className="border-t pt-3 flex justify-between text-base font-bold"><span>Total</span><span>{fmtMoney(invoice.total ?? 0, invoice.currency)}</span></div><div className="flex justify-between text-emerald-700"><span>Paid</span><span>{fmtMoney(paid, invoice.currency)}</span></div><div className={`flex justify-between font-semibold ${balance > 0 ? "text-red-600" : "text-emerald-700"}`}><span>Balance due</span><span>{fmtMoney(balance, invoice.currency)}</span></div></div>}
    impact={<div className="space-y-5"><SifoCompletionPanel
      title={`Invoice ${invoice.number ?? ""} ${balance > 0 ? "is posted and unpaid" : "is settled"}`.trim()}
      statusLabel={status}
      lifecycle={INVOICE_GUIDANCE.lifecycle}
      currentStage={balance > 0 ? (paid > 0 ? 2 : 1) : 3}
      impact={INVOICE_GUIDANCE.impact({
        amount: fmtMoney(invoice.total ?? 0, invoice.currency),
        net: fmtMoney(invoice.subtotal ?? 0, invoice.currency),
        tax: Number(invoice.vat_amount ?? 0) > 0 ? fmtMoney(invoice.vat_amount ?? 0, invoice.currency) : undefined,
        party: invoice.customers?.name ?? "the customer",
        hasStock: movements.length > 0,
      })}
      steps={INVOICE_GUIDANCE.steps({ id, reference: invoice.number })}
    /><DocumentImpact kind="invoice" reference={invoice.number ? `INV:${invoice.number}` : null} /><div><div className="text-sm font-semibold mb-2">Inventory depletion</div>{movements.length ? <div className="space-y-2">{movements.map(m => <div key={m.id} className="rounded-md border p-3 text-sm flex justify-between gap-3"><div><div className="font-medium">{m.stock_items?.name ?? "Stock item"}</div><div className="text-xs text-muted-foreground">{m.note ?? m.reference ?? "—"} · {m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</div></div><span className="font-semibold">-{Number(m.quantity ?? 0).toLocaleString()}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No stock movement linked by invoice reference.</p>}</div></div>}
    footer={<div className="space-y-5"><div><div className="text-sm font-semibold mb-2">Payment allocation</div>{payments.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Receipt</th><th className="py-2">Date</th><th className="py-2">Method</th><th className="py-2 text-right">Amount</th><th className="py-2">Status</th></tr></thead><tbody>{payments.map(p => <tr key={p.id} className="border-b"><td className="py-2 font-mono text-xs">{p.receipt_number ?? "—"}</td><td className="py-2">{p.receipt_date ?? "—"}</td><td className="py-2 capitalize">{p.payment_method ?? "—"}</td><td className="py-2 text-right">{fmtMoney(p.amount ?? 0, invoice.currency)}</td><td className="py-2 capitalize">{p.status ?? "—"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No payments allocated to this invoice.</p>}</div><div><div className="text-sm font-semibold">Audit metadata</div><div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm"><div><span className="text-muted-foreground">Created:</span> {invoice.created_at ? new Date(invoice.created_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">Updated:</span> {invoice.updated_at ? new Date(invoice.updated_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">Quote ID:</span> {invoice.quote_id ?? "—"}</div></div></div></div>}
  />;
}
