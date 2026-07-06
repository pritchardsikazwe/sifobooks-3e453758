import { createFileRoute } from "@tanstack/react-router";
import { FileBox } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({ meta: [{ title: "Bills — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Supplier Bills"
      icon={FileBox}
      table="bills"
      orderBy={{ column: "bill_date", ascending: false }}
      searchKeys={["bill_number", "supplier_invoice_number"]}
      columns={[
        { key: "bill_number", header: "Bill #" },
        { key: "supplier_invoice_number", header: "Supplier Inv #" },
        { key: "bill_date", header: "Date" },
        { key: "due_date", header: "Due" },
        { key: "status", header: "Status" },
        { key: "total", header: "Total", render: r => fmtMoney(r.total ?? 0) },
        { key: "balance_due", header: "Balance", render: r => fmtMoney(r.balance_due ?? 0) },
      ]}
      fields={[
        { name: "bill_number", label: "Bill Number", required: true },
        { name: "supplier_invoice_number", label: "Supplier Invoice #" },
        { name: "bill_date", label: "Bill Date", type: "date", defaultValue: new Date().toISOString().slice(0,10) },
        { name: "due_date", label: "Due Date", type: "date" },
        { name: "status", label: "Status", type: "select", defaultValue: "unpaid",
          options: [{value:"unpaid",label:"Unpaid"},{value:"partial",label:"Partial"},{value:"paid",label:"Paid"},{value:"overdue",label:"Overdue"}] },
        { name: "subtotal", label: "Subtotal", type: "number" },
        { name: "tax_amount", label: "Tax", type: "number" },
        { name: "total", label: "Total", type: "number" },
        { name: "amount_paid", label: "Amount Paid", type: "number" },
        { name: "balance_due", label: "Balance Due", type: "number" },
        { name: "currency", label: "Currency", defaultValue: "ZMW" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  ),
});
