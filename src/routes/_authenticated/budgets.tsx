import { createFileRoute } from "@tanstack/react-router";
import { PiggyBank } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({ meta: [{ title: "Budgets — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      module="accounting"
      description="Budget vs actual by period"
      title="Budgets"
      icon={PiggyBank}
      table="budgets"
      orderBy={{ column: "fiscal_year", ascending: false }}
      searchKeys={["name"]}
      columns={[
        { key: "name", header: "Name" },
        { key: "fiscal_year", header: "Year" },
        { key: "period", header: "Period" },
        { key: "budgeted_amount", header: "Budgeted", render: r => fmtMoney(r.budgeted_amount ?? 0) },
        { key: "actual_amount", header: "Actual", render: r => fmtMoney(r.actual_amount ?? 0) },
      ]}
      fields={[
        { name: "name", label: "Budget Name", required: true },
        { name: "fiscal_year", label: "Fiscal Year", type: "number", required: true, defaultValue: new Date().getFullYear() },
        { name: "period", label: "Period", type: "select", defaultValue: "annual",
          options: [{value:"monthly",label:"Monthly"},{value:"quarterly",label:"Quarterly"},{value:"annual",label:"Annual"}] },
        { name: "budgeted_amount", label: "Budgeted Amount", type: "number", required: true },
        { name: "actual_amount", label: "Actual Amount", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  ),
});
