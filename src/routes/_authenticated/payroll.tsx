import { createFileRoute } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({ meta: [{ title: "Payroll — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Payroll Runs"
      icon={Banknote}
      table="payroll_runs"
      orderBy={{ column: "period_year", ascending: false }}
      searchKeys={["run_number"]}
      columns={[
        { key: "run_number", header: "Run #" },
        { key: "period_month", header: "Month" },
        { key: "period_year", header: "Year" },
        { key: "pay_date", header: "Pay Date" },
        { key: "status", header: "Status" },
        { key: "total_gross", header: "Gross", render: r => fmtMoney(r.total_gross ?? 0) },
        { key: "total_net", header: "Net", render: r => fmtMoney(r.total_net ?? 0) },
      ]}
      fields={[
        { name: "run_number", label: "Run Number", required: true },
        { name: "period_month", label: "Month (1-12)", type: "number", required: true, defaultValue: new Date().getMonth()+1 },
        { name: "period_year", label: "Year", type: "number", required: true, defaultValue: new Date().getFullYear() },
        { name: "pay_date", label: "Pay Date", type: "date" },
        { name: "status", label: "Status", type: "select", defaultValue: "draft",
          options: [{value:"draft",label:"Draft"},{value:"approved",label:"Approved"},{value:"paid",label:"Paid"}] },
        { name: "total_gross", label: "Total Gross", type: "number" },
        { name: "total_paye", label: "Total PAYE", type: "number" },
        { name: "total_napsa", label: "Total NAPSA", type: "number" },
        { name: "total_nhima", label: "Total NHIMA", type: "number" },
        { name: "total_net", label: "Total Net Pay", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  ),
});
