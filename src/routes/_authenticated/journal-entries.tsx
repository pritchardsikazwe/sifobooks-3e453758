import { createFileRoute } from "@tanstack/react-router";
import { BookText } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/journal-entries")({
  head: () => ({ meta: [{ title: "Journal Entries — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Journal Entries"
      icon={BookText}
      table="journal_entries"
      orderBy={{ column: "entry_date", ascending: false }}
      searchKeys={["entry_number", "reference", "description"]}
      columns={[
        { key: "entry_number", header: "Entry #" },
        { key: "entry_date", header: "Date" },
        { key: "reference", header: "Reference" },
        { key: "description", header: "Description" },
        { key: "status", header: "Status" },
        { key: "total_debit", header: "Debit", render: r => fmtMoney(r.total_debit ?? 0) },
        { key: "total_credit", header: "Credit", render: r => fmtMoney(r.total_credit ?? 0) },
      ]}
      fields={[
        { name: "entry_number", label: "Entry Number", required: true },
        { name: "entry_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0,10) },
        { name: "reference", label: "Reference" },
        { name: "status", label: "Status", type: "select", defaultValue: "draft",
          options: [{value:"draft",label:"Draft"},{value:"posted",label:"Posted"},{value:"void",label:"Void"}] },
        { name: "total_debit", label: "Total Debit", type: "number" },
        { name: "total_credit", label: "Total Credit", type: "number" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
    />
  ),
});
