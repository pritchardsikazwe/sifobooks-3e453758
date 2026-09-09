import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, ExternalLink } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { supplierPaymentLines } from "@/lib/posting-lines";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/bill-payments")({
  head: () => ({ meta: [{ title: "Supplier Payments — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => <SimpleCrud module="purchases" description="Supplier payment vouchers, settlement accounts and ledger impact" title="Supplier Payments" icon={Wallet} table="bill_payments" orderBy={{ column: "payment_date", ascending: false }} searchKeys={["payment_number", "reference"]} dateField="payment_date"
    columns={[
      { key: "payment_number", header: "Payment #", render: r => <Link to="/bill-payment-detail/$id" params={{ id: r.id }} className="font-mono text-xs text-primary hover:underline">{r.payment_number}</Link> },
      { key: "payment_date", header: "Date" },
      { key: "payment_method", header: "Method", render: r => <span className="capitalize">{String(r.payment_method ?? "").replace(/_/g, " ")}</span> },
      { key: "reference", header: "Reference" },
      { key: "amount", header: "Amount", align: "right", render: r => <span className="font-semibold tabular-nums">{fmtMoney(r.amount ?? 0)}</span> },
      { key: "open", header: "Open", align: "right", render: r => <Link to="/bill-payment-detail/$id" params={{ id: r.id }}><Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5 mr-1" />View</Button></Link> },
    ]}
    posting={{ kind: "bill", reference: r => (r.id ? `PAY:${r.id}` : null), label: r => `Payment ${r.payment_number ?? ""} — accounting impact` }}
    fields={[
      { name: "payment_number", label: "Payment Number", required: true, group: "Payment Details" },
      { name: "payment_date", label: "Payment Date", type: "date", defaultValue: new Date().toISOString().slice(0,10), group: "Payment Details" },
      { name: "amount", label: "Amount", type: "number", required: true, group: "Payment Details" },
      { name: "payment_method", label: "Payment Method", type: "select", defaultValue: "bank", group: "Payment Details", options: [{value:"cash",label:"Cash"},{value:"bank",label:"Bank"},{value:"mobile_money",label:"Mobile Money"},{value:"cheque",label:"Cheque"}] },
      { name: "reference", label: "Reference / Voucher #", group: "Supporting Information" },
      { name: "notes", label: "Notes", type: "textarea", colSpan: 2, group: "Supporting Information" },
    ]}
    accountFields={[{ key: "payable", label: "Debit — supplier payable", defaultCode: "2100", help: "Reduces the amount owed to suppliers." }, { key: "bank", label: "Credit — cash / bank", defaultCode: "1000", cashBankOnly: true, types: ["asset"], help: "The cash, bank or mobile-money account the payment leaves." }]}
    previewLines={(form, account) => supplierPaymentLines({ amount: Number(form.amount) || 0, payable: account("payable"), bank: account("bank") })}
    requireBalanced />,
});
