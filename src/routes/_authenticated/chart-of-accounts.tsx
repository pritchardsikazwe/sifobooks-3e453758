import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/chart-of-accounts")({
  head: () => ({ meta: [{ title: "Chart of Accounts — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Chart of Accounts"
      icon={BookOpen}
      table="chart_of_accounts"
      orderBy={{ column: "account_code" }}
      searchKeys={["account_code", "account_name", "account_type"]}
      columns={[
        { key: "account_code", header: "Code" },
        { key: "account_name", header: "Name" },
        { key: "account_type", header: "Type" },
        { key: "is_active", header: "Active", render: r => (r.is_active ? "Yes" : "No") },
      ]}
      fields={[
        { name: "account_code", label: "Account Code", required: true },
        { name: "account_name", label: "Account Name", required: true },
        { name: "account_type", label: "Account Type", type: "select", required: true,
          options: [
            {value:"asset",label:"Asset"},{value:"liability",label:"Liability"},
            {value:"equity",label:"Equity"},{value:"revenue",label:"Revenue"},
            {value:"expense",label:"Expense"},{value:"cogs",label:"Cost of Goods Sold"},
          ]},
        { name: "description", label: "Description", type: "textarea" },
      ]}
    />
  ),
});
