import { createFileRoute } from "@tanstack/react-router";
import { ClipboardEdit } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/stock-adjustments")({
  head: () => ({ meta: [{ title: "Stock Adjustments — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      module="inventory"
      description="Stock increases, decreases and write-offs"
      title="Stock Adjustments"
      icon={ClipboardEdit}
      table="stock_adjustments"
      orderBy={{ column: "adjustment_date", ascending: false }}
      searchKeys={["adjustment_number", "reason"]}
      columns={[
        { key: "adjustment_number", header: "Adj #" },
        { key: "adjustment_date", header: "Date" },
        { key: "adjustment_type", header: "Type" },
        { key: "quantity_before", header: "Before" },
        { key: "quantity_after", header: "After" },
        { key: "reason", header: "Reason" },
      ]}
      fields={[
        { name: "adjustment_number", label: "Adjustment Number", required: true, group: "Document Details" },
        { name: "adjustment_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0,10), group: "Document Details" },
        { name: "adjustment_type", label: "Type", type: "select", defaultValue: "count", group: "Document Details",
          options: [{value:"count",label:"Physical Count"},{value:"damage",label:"Damage"},{value:"loss",label:"Loss"},{value:"transfer",label:"Transfer"},{value:"return",label:"Return"}] },
        { name: "quantity_before", label: "Quantity Before", type: "number", group: "Quantity & Variance" },
        { name: "quantity_after", label: "Quantity After", type: "number", required: true, group: "Quantity & Variance" },
        { name: "reason", label: "Reason", group: "Reason & Audit" },
        { name: "notes", label: "Notes", type: "textarea", group: "Reason & Audit" },
      ]}
    />
  ),
});
