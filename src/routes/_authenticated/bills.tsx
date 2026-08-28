import { createFileRoute } from "@tanstack/react-router";
import { FileBox, CheckCircle2 } from "lucide-react";
import { SimpleCrud, updateStatus } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { supplierBillLines } from "@/lib/posting-lines";

const COLOR: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({ meta: [{ title: "Bills — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      module="purchases"
      description="Supplier bills and payables"
      title="Supplier Bills"
      icon={FileBox}
      table="bills"
      orderBy={{ column: "bill_date", ascending: false }}
      searchKeys={["bill_number", "supplier_invoice_number"]}
      statusField="status"
      dateField="bill_date"
      columns={[
        { key: "bill_number", header: "Bill #" },
        { key: "supplier_invoice_number", header: "Supplier Inv #" },
        { key: "bill_date", header: "Date" },
        { key: "due_date", header: "Due" },
        { key: "status", header: "Status", render: r => <Badge className={COLOR[r.status] ?? ""} variant="secondary">{r.status}</Badge> },
        { key: "total", header: "Total", render: r => fmtMoney(r.total ?? 0) },
        { key: "balance_due", header: "Balance", render: r => fmtMoney(r.balance_due ?? 0) },
      ]}
      posting={{
        kind: "bill",
        reference: r => (r.bill_number ? `BILL:${r.bill_number}` : null),
        label: r => `Bill ${r.bill_number ?? ""} — accounting impact`,
      }}
      rowActions={[

        {
          label: "Mark Paid", icon: CheckCircle2, variant: "outline",
          className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
          show: r => r.status !== "paid",
          run: async (r, reload) => { if (await updateStatus("bills", r.id, "paid")) reload(); },
        },
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
      accountFields={[
        { key: "expense", label: "Debit — expense / purchase", types: ["expense"], defaultCode: "5000", help: "Where the cost of this bill is recorded." },
        { key: "vatInput", label: "Debit — VAT input", defaultCode: "2201", help: "Recoverable VAT on this bill." },
        { key: "payable", label: "Credit — supplier payable", defaultCode: "2100", help: "What you now owe the supplier." },
      ]}
      previewLines={(form, account) => supplierBillLines({
        subtotal: Number(form.subtotal) || 0,
        vat: Number(form.tax_amount) || 0,
        total: Number(form.total) || 0,
        expense: account("expense"),
        vatInput: account("vatInput"),
        payable: account("payable"),
      })}
      requireBalanced
    />
  ),
});
