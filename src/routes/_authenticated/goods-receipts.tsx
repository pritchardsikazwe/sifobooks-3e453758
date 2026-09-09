import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, PackageCheck, ShieldCheck } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";

const STATUS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  posted: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export const Route = createFileRoute("/_authenticated/goods-receipts")({
  head: () => ({ meta: [{ title: "Goods Receipts — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      module="inventory"
      title="Goods Receipts"
      icon={PackageCheck}
      description="Record supplier deliveries before stock is posted. A receipt is the inventory event; a purchase order is not."
      table="goods_receipts"
      orderBy={{ column: "receipt_date", ascending: false }}
      searchKeys={["receipt_number", "po_number", "reference", "notes"]}
      statusField="status"
      dateField="receipt_date"
      columns={[
        { key: "receipt_number", header: "Receipt #", className: "font-mono text-xs" },
        { key: "po_number", header: "PO #", className: "font-mono text-xs" },
        { key: "receipt_date", header: "Date" },
        { key: "warehouse_id", header: "Warehouse / Location" },
        { key: "status", header: "Status", render: r => <Badge variant="secondary" className={STATUS[String(r.status ?? "draft")] ?? ""}>{String(r.status ?? "draft").replaceAll("_", " ")}</Badge> },
        { key: "total", header: "Receipt Value", align: "right", render: r => fmtMoney(r.total ?? 0, r.currency) },
      ]}
      fields={[
        { name: "receipt_number", label: "Receipt Number", required: true, group: "Document Details" },
        { name: "po_number", label: "Purchase Order #", group: "Document Details" },
        { name: "receipt_date", label: "Receipt Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10), group: "Document Details" },
        { name: "warehouse_id", label: "Warehouse / Location", group: "Inventory Control" },
        { name: "status", label: "Status", type: "select", defaultValue: "draft", options: [{ value: "draft", label: "Draft" }, { value: "posted", label: "Posted" }, { value: "cancelled", label: "Cancelled" }], group: "Workflow" },
        { name: "currency", label: "Currency", defaultValue: "ZMW", group: "Document Details" },
        { name: "total", label: "Receipt Value", type: "number", group: "Totals" },
        { name: "reference", label: "Supplier Delivery / GRN Reference", group: "Supporting Information" },
        { name: "notes", label: "Receiving Notes", type: "textarea", colSpan: 2, group: "Supporting Information" },
      ]}
    />
  ),
});
