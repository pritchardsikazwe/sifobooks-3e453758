import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Purchase Orders"
      icon={ShoppingCart}
      table="purchase_orders"
      orderBy={{ column: "order_date", ascending: false }}
      searchKeys={["po_number", "notes"]}
      columns={[
        { key: "po_number", header: "PO #" },
        { key: "order_date", header: "Date" },
        { key: "expected_date", header: "Expected" },
        { key: "status", header: "Status" },
        { key: "total", header: "Total", render: r => fmtMoney(r.total ?? 0) },
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
