import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Send, CheckCircle2, Package } from "lucide-react";
import { SimpleCrud, updateStatus } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { purchaseOrderLines } from "@/lib/posting-lines";

const COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  partially_received: "bg-amber-100 text-amber-700",
  received: "bg-teal-100 text-teal-700",
  closed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      module="purchases"
      description="Create, submit, approve and track supplier purchase orders."
      title="Purchase Orders"
      icon={ShoppingCart}
      table="purchase_orders"
      orderBy={{ column: "order_date", ascending: false }}
      searchKeys={["po_number", "notes"]}
      statusField="status"
      dateField="order_date"
      columns={[
        { key: "po_number", header: "PO #", className: "font-mono text-xs" },
        { key: "order_date", header: "Order Date" },
        { key: "expected_date", header: "Expected" },
        { key: "status", header: "Status", render: r => <Badge className={COLOR[r.status] ?? ""} variant="secondary">{String(r.status ?? "draft").replaceAll("_", " ")}</Badge> },
        { key: "subtotal", header: "Subtotal", align: "right", render: r => fmtMoney(r.subtotal ?? 0, r.currency) },
        { key: "tax_amount", header: "Tax", align: "right", render: r => fmtMoney(r.tax_amount ?? 0, r.currency) },
        { key: "total", header: "Total", align: "right", render: r => fmtMoney(r.total ?? 0, r.currency) },
      ]}
      rowActions={[
        { label: "Submit", icon: Send, show: r => r.status === "draft", run: async (r, reload) => { if (await updateStatus("purchase_orders", r.id, "sent")) reload(); } },
        { label: "Approve", icon: CheckCircle2, variant: "outline", className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50", show: r => r.status === "sent", run: async (r, reload) => { if (await updateStatus("purchase_orders", r.id, "approved")) reload(); } },
        { label: "Receive", icon: Package, variant: "outline", className: "border-teal-300 text-teal-700 hover:bg-teal-50", show: r => ["approved", "partially_received"].includes(r.status), run: async (r, reload) => { if (await updateStatus("purchase_orders", r.id, "received")) reload(); } },
      ]}
      fields={[
        { name: "po_number", label: "PO Number", required: true, group: "Document Details" },
        { name: "order_date", label: "Order Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10), group: "Document Details" },
        { name: "expected_date", label: "Expected Date", type: "date", group: "Document Details" },
        { name: "status", label: "Status", type: "select", defaultValue: "draft", options: STATUS, group: "Workflow" },
        { name: "currency", label: "Currency", defaultValue: "ZMW", group: "Document Details" },
        { name: "subtotal", label: "Subtotal", type: "number", group: "Totals" },
        { name: "tax_amount", label: "Tax", type: "number", group: "Totals" },
        { name: "total", label: "Total", type: "number", required: true, group: "Totals" },
        { name: "notes", label: "Notes / Supplier Instructions", type: "textarea", colSpan: 2, group: "Supporting Information" },
      ]}
    />
  ),
});
