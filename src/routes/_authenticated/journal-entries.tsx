import { createFileRoute } from "@tanstack/react-router";
import { BookText, CheckCircle2, XCircle, Undo2 } from "lucide-react";
import { SimpleCrud, updateStatus } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { reverseJournalEntry } from "@/lib/reversal";
import { toast } from "sonner";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  posted: "bg-emerald-100 text-emerald-700",
  void: "bg-red-100 text-red-700",
};

export const Route = createFileRoute("/_authenticated/journal-entries")({
  head: () => ({ meta: [{ title: "Journal Entries — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Journal Entries"
      icon={BookText}
      table="journal_entries"
      orderBy={{ column: "entry_date", ascending: false }}
      searchKeys={["entry_number", "reference", "description"]}
      statusField="status"
      dateField="entry_date"
      columns={[
        { key: "entry_number", header: "Entry #" },
        { key: "entry_date", header: "Date" },
        { key: "reference", header: "Reference" },
        { key: "description", header: "Description" },
        { key: "status", header: "Status", render: r => <Badge className={STATUS_COLOR[r.status] ?? ""} variant="secondary">{r.status}</Badge> },
        { key: "total_debit", header: "Debit", render: r => fmtMoney(r.total_debit ?? 0) },
        { key: "total_credit", header: "Credit", render: r => fmtMoney(r.total_credit ?? 0) },
      ]}
      rowActions={[
        {
          label: "Post", icon: CheckCircle2, variant: "outline",
          className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
          show: r => r.status === "draft",
          run: async (r, reload) => { if (await updateStatus("journal_entries", r.id, "posted")) reload(); },
        },
        {
          label: "Void", icon: XCircle, variant: "outline",
          className: "border-red-300 text-red-700 hover:bg-red-50",
          show: r => r.status === "posted",
          run: async (r, reload) => { if (confirm("Void this entry?") && await updateStatus("journal_entries", r.id, "void")) reload(); },
        },
        {
          label: "Reverse", icon: Undo2, variant: "outline",
          className: "border-amber-300 text-amber-700 hover:bg-amber-50",
          show: r => r.status === "posted" && !r.reversed_by,
          run: async (r, reload) => {
            if (!confirm(`Reverse entry ${r.entry_number}? This creates a mirror journal entry cancelling all lines.`)) return;
            try { await reverseJournalEntry(r.id); toast.success("Reversed"); reload(); }
            catch (e: any) { toast.error(e.message); }
          },
        },
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
