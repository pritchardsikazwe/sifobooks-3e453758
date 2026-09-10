import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BalanceChip } from "@/components/accounting/JournalImpact";

import { BookText, CheckCircle2, XCircle, Undo2, Eye } from "lucide-react";
import { SimpleCrud, updateStatus } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { reverseJournalEntry } from "@/lib/reversal";
import { journalSource, numberToMinor, minorToNumber } from "@/lib/journal";
import { toast } from "sonner";
import { AttachmentCell } from "@/components/AttachmentCell";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  posted: "bg-emerald-100 text-emerald-700",
  void: "bg-red-100 text-red-700",
};

const diffMinor = (r: any) => numberToMinor(r.total_debit ?? 0) - numberToMinor(r.total_credit ?? 0);

export const Route = createFileRoute("/_authenticated/journal-entries")({
  head: () => ({ meta: [{ title: "Journal Entries — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: JournalEntriesList,
});

function JournalEntriesList() {
  const navigate = useNavigate();
  return (
    <SimpleCrud
      module="accounting"
      description="Manual double-entry journals"
      title="Journal Entries"
      icon={BookText}
      table="journal_entries"
      orderBy={{ column: "entry_date", ascending: false }}
      searchKeys={["entry_number", "reference", "description"]}
      statusField="status"
      dateField="entry_date"
      onNew={() => navigate({ to: "/journal-entry/new" })}
      onOpenRow={r => navigate({ to: "/journal-entry/$id", params: { id: r.id } })}
      columns={[
        { key: "entry_number", header: "Entry #", render: r => (
          <Link to="/journal-entry/$id" params={{ id: r.id }} className="font-mono text-xs font-medium text-primary hover:underline">
            {r.entry_number ?? "—"}
          </Link>
        ) },
        { key: "entry_date", header: "Date" },
        { key: "reference", header: "Reference" },
        { key: "description", header: "Description" },
        { key: "source", header: "Source", render: r => (
          <span className="text-xs text-muted-foreground">{journalSource(r.reference)}</span>
        ) },
        { key: "status", header: "Status", render: r => <Badge className={STATUS_COLOR[r.status] ?? ""} variant="secondary">{r.status}</Badge> },
        { key: "total_debit", header: "Debit", align: "right", render: r => <span className="tabular-nums">{fmtMoney(r.total_debit ?? 0)}</span> },
        { key: "total_credit", header: "Credit", align: "right", render: r => <span className="tabular-nums">{fmtMoney(r.total_credit ?? 0)}</span> },
        { key: "difference", header: "Difference", align: "right", render: r => {
          const d = diffMinor(r);
          return (
            <span className={d === 0 ? "tabular-nums text-muted-foreground" : "tabular-nums font-semibold text-destructive"}>
              {fmtMoney(Math.abs(minorToNumber(d)))}
            </span>
          );
        } },
        { key: "balance_check", header: "Balance", defaultHidden: true, render: r => {
          const d = diffMinor(r);
          return <BalanceChip balanced={d === 0 && numberToMinor(r.total_debit ?? 0) > 0} diff={minorToNumber(d)} />;
        } },
        { key: "attachment_url", header: "Source Doc", defaultHidden: true, render: r => <AttachmentCell table="journal_entries" row={r} /> },
      ]}
      rowActions={[
        {
          label: "Open", icon: Eye, variant: "ghost",
          run: r => { navigate({ to: "/journal-entry/$id", params: { id: r.id } }); },
        },
        {
          label: "Post", icon: CheckCircle2, variant: "outline",
          className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
          show: r => r.status === "draft" && diffMinor(r) === 0 && numberToMinor(r.total_debit ?? 0) > 0,
          run: async (r, reload) => { if (await updateStatus("journal_entries", r.id, "posted")) reload(); },
        },
        {
          label: "Void", icon: XCircle, variant: "outline",
          className: "border-red-300 text-red-700 hover:bg-red-50",
          show: r => r.status === "posted",
          run: async (r, reload) => { if (confirm("Void this entry?")) { if (await updateStatus("journal_entries", r.id, "void")) reload(); } },
        },
        {
          label: "Reverse", icon: Undo2, variant: "outline",
          className: "border-amber-300 text-amber-700 hover:bg-amber-50",
          show: r => r.status === "posted" && !r.reversed_by,
          run: async (r, reload) => {
            const reason = window.prompt(`Reverse entry ${r.entry_number}? Enter a reason (required):`);
            if (!reason?.trim()) return;
            try { await reverseJournalEntry(r.id, reason); toast.success("Reversed"); reload(); }
            catch (e: any) { toast.error(e.message); }
          },
        },
      ]}
      fields={[
        { name: "entry_number", label: "Entry Number", required: true, group: "Journal Details" },
        { name: "entry_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0,10), group: "Journal Details" },
        { name: "reference", label: "Reference", group: "Journal Details" },
        { name: "status", label: "Status", type: "select", defaultValue: "draft", group: "Workflow",
          options: [{value:"draft",label:"Draft"},{value:"posted",label:"Posted"},{value:"void",label:"Void"}] },
        { name: "total_debit", label: "Total Debit", type: "number", group: "Control Totals" },
        { name: "total_credit", label: "Total Credit", type: "number", group: "Control Totals" },
        { name: "description", label: "Description", type: "textarea", group: "Supporting Information" },
      ]}
    />
  );
}
