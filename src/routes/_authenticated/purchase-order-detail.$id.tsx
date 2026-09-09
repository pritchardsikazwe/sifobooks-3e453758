import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Loader2, PackageCheck, Send, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SifoDocumentLayout, BackToDocumentList, type SifoDocumentLine } from "@/components/sifo/SifoDocumentLayout";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { SifoCompletionPanel } from "@/components/sifo/SifoNextActionPanel";
import { DOCUMENT_GUIDANCE } from "@/lib/document-guidance";

const STATUS: Record<string, { label: string; icon: typeof Clock3 }> = {
  draft: { label: "Draft", icon: Clock3 },
  sent: { label: "Submitted", icon: Send },
  approved: { label: "Approved", icon: CheckCircle2 },
  partially_received: { label: "Partially Received", icon: PackageCheck },
  received: { label: "Received", icon: PackageCheck },
  closed: { label: "Closed", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", icon: ShieldAlert },
};

export const Route = createFileRoute("/_authenticated/purchase-order-detail/$id")({
  head: () => ({ meta: [{ title: "Purchase Order Detail — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PurchaseOrderDetailPage,
});

function PurchaseOrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("purchase_orders").select("*").eq("id", id).maybeSingle();
      if (error) toast.error(error.message);
      setOrder(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!order) return <div className="p-8 space-y-4"><Button variant="ghost" onClick={() => navigate({ to: "/purchase-orders" })}><ArrowLeft className="mr-2 h-4 w-4" />Back to purchase orders</Button><p>Purchase order not found.</p></div>;

  const status = String(order.status ?? "draft");
  const statusMeta = STATUS[status] ?? STATUS.draft;
  const StatusIcon = statusMeta.icon;
  const line: SifoDocumentLine = {
    id: order.id,
    cells: [
      <span className="font-medium">Purchase order {order.po_number}</span>,
      <span>{fmtMoney(order.subtotal ?? 0, order.currency)}</span>,
      <span>{fmtMoney(order.tax_amount ?? 0, order.currency)}</span>,
      <span className="font-semibold">{fmtMoney(order.total ?? 0, order.currency)}</span>,
    ],
  };

  return <SifoDocumentLayout
    title="Purchase Order"
    number={order.po_number}
    status={status}
    description="Supplier commitment and purchasing control document. Receiving and supplier billing must be created from verified receiving transactions; changing PO status alone must not create stock movements."
    back={<BackToDocumentList onClick={() => navigate({ to: "/purchase-orders" })} label="Purchase Orders" />}
    actions={<Button asChild size="sm" variant="outline"><a href="/purchase-orders"><ArrowLeft className="mr-1.5 h-4 w-4" />PO list</a></Button>}
    party={<div><div className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</div><div className="font-semibold">{order.supplier_name ?? order.vendor_name ?? "Supplier not recorded"}</div></div>}
    metadata={<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm"><div><span className="text-muted-foreground">Order date:</span> {order.order_date ?? "—"}</div><div><span className="text-muted-foreground">Expected:</span> {order.expected_date ?? "—"}</div><div><span className="text-muted-foreground">Currency:</span> {order.currency ?? "ZMW"}</div><div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className="capitalize"><StatusIcon className="mr-1 h-3.5 w-3.5" />{statusMeta.label}</Badge></div></div>}
    lines={[line]}
    lineHeaders={["Transaction", "Subtotal", "Tax", "Total"]}
    totals={<div className="space-y-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(order.subtotal ?? 0, order.currency)}</span></div><div className="flex justify-between"><span>Tax</span><span>{fmtMoney(order.tax_amount ?? 0, order.currency)}</span></div><div className="border-t pt-3 flex justify-between text-base font-bold"><span>Order total</span><span>{fmtMoney(order.total ?? 0, order.currency)}</span></div></div>}
    impact={<div className="space-y-3"><SifoCompletionPanel
      title={`Purchase order ${order.po_number ?? ""}`.trim()}
      statusLabel={statusMeta.label}
      lifecycle={DOCUMENT_GUIDANCE.purchase_order.lifecycle}
      currentStage={status === "approved" ? 2 : status === "received" ? 3 : status === "submitted" ? 1 : 0}
      impact={DOCUMENT_GUIDANCE.purchase_order.impact({ amount: fmtMoney(order.total ?? 0, order.currency) })}
      steps={DOCUMENT_GUIDANCE.purchase_order.steps({ id: order.id, reference: order.po_number })}
    /><div className="rounded-md border p-3"><div className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Accounting & inventory control</div><p className="mt-1 text-sm text-muted-foreground">A purchase order is a commitment. It does not by itself post supplier liability, create inventory, or create a GL transaction.</p></div><div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Receiving safeguard</div><p className="mt-1">The current repository does not expose a verified goods-receipt transaction schema. Do not use the PO status button as a substitute for an actual stock receipt.</p></div></div>}
    footer={<div className="space-y-4"><div><div className="text-sm font-semibold mb-1">Supplier instructions / notes</div><div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">{order.notes ?? "No notes recorded."}</div></div><div className="grid gap-2 sm:grid-cols-3 text-sm"><div><span className="text-muted-foreground">Created:</span> {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">Updated:</span> {order.updated_at ? new Date(order.updated_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">PO ID:</span> <span className="font-mono text-xs">{order.id}</span></div></div></div>}
  />;
}
