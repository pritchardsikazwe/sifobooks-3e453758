import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bill-payments")({
  head: () => ({ meta: [{ title: "Supplier Payments — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Supplier Payments"
      icon={Wallet}
      table="bill_payments"
      orderBy={{ column: "payment_date", ascending: false }}
      searchKeys={["payment_number", "reference"]}
      columns={[
        { key: "payment_number", header: "Payment #" },
        { key: "payment_date", header: "Date" },
        { key: "payment_method", header: "Method" },
        { key: "reference", header: "Reference" },
        { key: "amount", header: "Amount", render: r => fmtMoney(r.amount ?? 0) },
      ]}
      fields={[
        { name: "payment_number", label: "Payment Number", required: true },
        { name: "payment_date", label: "Payment Date", type: "date", defaultValue: new Date().toISOString().slice(0,10) },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "payment_method", label: "Method", type: "select", defaultValue: "bank",
          options: [{value:"cash",label:"Cash"},{value:"bank",label:"Bank"},{value:"mobile_money",label:"Mobile Money"},{value:"cheque",label:"Cheque"}] },
        { name: "reference", label: "Reference" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  ),
});
