import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Send, CheckCircle2, Package } from "lucide-react";
import { SimpleCrud, updateStatus } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  received: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-700",
};

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Purchase Orders"
      icon={ShoppingCart}
      table="purchase_orders"
      orderBy={{ column: "order_date", ascending: false }}
      searchKeys={["po_number", "notes"]}
      statusField="status"
      columns={[
        { key: "po_number", header: "PO #" },
        { key: "order_date", header: "Date" },
        { key: "expected_date", header: "Expected" },
        { key: "status", header: "Status", render: r => <Badge className={COLOR[r.status] ?? ""} variant="secondary">{r.status}</Badge> },
        { key: "total", header: "Total", render: r => fmtMoney(r.total ?? 0) },
      ]}
      rowActions={[
        { label: "Send", icon: Send, show: r => r.status === "draft",
          run: async (r, reload) => { if (await updateStatus("purchase_orders", r.id, "sent")) reload(); } },
        { label: "Approve", icon: CheckCircle2, variant: "outline",
          className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
          show: r => r.status === "sent",
          run: async (r, reload) => { if (await updateStatus("purchase_orders", r.id, "approved")) reload(); } },
        { label: "Received", icon: Package, variant: "outline",
          className: "border-teal-300 text-teal-700 hover:bg-teal-50",
          show: r => r.status === "approved",
          run: async (r, reload) => { if (await updateStatus("purchase_orders", r.id, "received")) reload(); } },
      ]}
      fields={[
        { name: "po_number", label: "PO Number", required: true },
        { name: "order_date", label: "Order Date", type: "date", defaultValue: new Date().toISOString().slice(0,10) },
        { name: "expected_date", label: "Expected Date", type: "date" },
        { name: "status", label: "Status", type: "select", defaultValue: "draft",
          options: [{value:"draft",label:"Draft"},{value:"sent",label:"Sent"},{value:"approved",label:"Approved"},{value:"received",label:"Received"},{value:"cancelled",label:"Cancelled"}] },
        { name: "subtotal", label: "Subtotal", type: "number" },
        { name: "tax_amount", label: "Tax", type: "number" },
        { name: "total", label: "Total", type: "number" },
        { name: "currency", label: "Currency", defaultValue: "ZMW" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  ),
});
