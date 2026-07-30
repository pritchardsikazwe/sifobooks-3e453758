import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/petty-cash")({
  head: () => ({
    meta: [
      { title: "Petty Cash Register — SifoBooks" },
      { name: "description", content: "Petty cash float, vouchers and reimbursements with Ministry charge codes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireModule moduleKey="school_erp"><PettyCashPage /></RequireModule>,
});

function PettyCashPage() {
  return (
    <SimpleCrud
      title="Petty Cash" icon={Wallet} table="petty_cash" orderBy={{ column: "txn_date", ascending: false }}
      searchKeys={["voucher_no", "payee", "description", "charge_code"]} dateField="txn_date"
      extraFilters={[{ name: "txn_type", label: "Type", options: [
        { value: "float", label: "Float received" },
        { value: "payment", label: "Payment" },
        { value: "reimbursement", label: "Reimbursement" },
      ] }]}
      columns={[
        { key: "voucher_no", header: "Voucher #" },
        { key: "txn_date", header: "Date" },
        { key: "txn_type", header: "Type" },
        { key: "payee", header: "Payee" },
        { key: "description", header: "Details" },
        { key: "charge_code", header: "Charge code" },
        { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0)) },
        { key: "balance_after", header: "Balance", align: "right", render: (r: any) => (r.balance_after == null ? "—" : fmtMoney(Number(r.balance_after))) },
        { key: "approved_by", header: "Approved by" },
      ]}
      fields={[
        { name: "voucher_no", label: "Voucher #", defaultValue: `PC-${Date.now().toString().slice(-6)}` },
        { name: "txn_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
        { name: "txn_type", label: "Type", type: "select", defaultValue: "payment", options: [
          { value: "float", label: "Float received" },
          { value: "payment", label: "Payment" },
          { value: "reimbursement", label: "Reimbursement" },
        ] },
        { name: "payee", label: "Payee" },
        { name: "charge_code", label: "Charge code" },
        { name: "amount", label: "Amount (K)", type: "number", required: true },
        { name: "balance_after", label: "Balance after", type: "number" },
        { name: "approved_by", label: "Approved by" },
        { name: "description", label: "Details", type: "textarea" },
      ]}
    />
  );
}
