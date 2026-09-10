import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookText, ArrowLeft, Loader2, Pencil, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoPrintTools, SifoPrintStyles } from "@/components/sifo/SifoPrintTools";
import { BalanceChip } from "@/components/accounting/JournalImpact";
import { PostingFlow } from "@/components/accounting/PostingFlow";
import { reverseJournalEntry } from "@/lib/reversal";
import { journalSource, numberToMinor, minorToNumber } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/journal-entry/$id")({
  head: () => ({ meta: [{ title: "Journal Entry — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: JournalEntryDetail,
});

type Entry = {
  id: string; entry_number: string | null; entry_date: string; reference: string | null;
  description: string | null; status: string; total_debit: number | null; total_credit: number | null;
  created_at?: string | null; updated_at?: string | null; currency?: string | null;
  reversal_of?: string | null; reversed_by?: string | null; reversed_at?: string | null; reversal_reason?: string | null;
};
type Line = {
  id: string; description: string | null; debit: number; credit: number;
  account: { account_code: string; account_name: string; account_type: string } | null;
};
type AuditRow = { id: string; action: string; actor_email: string | null; created_at: string };

function JournalEntryDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: l }, { data: a }] = await Promise.all([
      supabase.from("journal_entries").select("*").eq("id", id).maybeSingle(),
      supabase.from("journal_lines")
        .select("id,description,debit,credit,account:account_id(account_code,account_name,account_type)")
        .eq("entry_id", id),
      supabase.from("audit_logs")
        .select("id,action,actor_email,created_at")
        .eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    setEntry((e ?? null) as any);
    setLines((l ?? []) as any);
    setAudit((a ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const debitMinor = lines.reduce((s, l) => s + numberToMinor(l.debit), 0);
  const creditMinor = lines.reduce((s, l) => s + numberToMinor(l.credit), 0);
  const diffMinor = debitMinor - creditMinor;
  const balanced = diffMinor === 0 && debitMinor > 0;

  const reverse = async () => {
    if (!entry) return;
    const reason = window.prompt(`Reverse entry ${entry.entry_number ?? ""}? Enter a reason (required):`);
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      const reversalId = await reverseJournalEntry(entry.id, reason);
      toast.success("Journal reversed");
      navigate({ to: "/journal-entry/$id", params: { id: reversalId } });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!entry) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <BookText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm text-muted-foreground">This journal entry no longer exists.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/journal-entries">Back to journal entries</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-print-area>
      <SifoPrintStyles />
      <SifoModuleHeader
        module="accounting"
        icon={BookText}
        title={`Journal ${entry.entry_number ?? ""}`}
        description={entry.description ?? "Double-entry journal detail"}
        breadcrumbs={[
          { label: "Accounting", to: "/journal-entries" },
          { label: "Journal Entries", to: "/journal-entries" },
          { label: entry.entry_number ?? "Entry" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2" data-print-hide>
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link to="/journal-entries"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Journal Entries</Link>
            </Button>
            {entry.status === "draft" && (
              <Button asChild size="sm" className="h-9">
                <Link to="/journal-entry/edit/$id" params={{ id: entry.id }}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Link>
              </Button>
            )}
            {entry.status === "posted" && !entry.reversed_by && (
              <Button variant="outline" size="sm" className="h-9 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={reverse} disabled={busy}>
                <Undo2 className="mr-1.5 h-4 w-4" /> Reverse
              </Button>
            )}
          </div>
        }
      />

      <section className="surface-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Journal header</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{entry.status}</Badge>
            <BalanceChip balanced={balanced} diff={minorToNumber(diffMinor)} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="Entry number"><span className="font-mono">{entry.entry_number ?? "—"}</span></Field>
          <Field label="Date">{entry.entry_date}</Field>
          <Field label="Reference">{entry.reference ?? "—"}</Field>
          <Field label="Source">{journalSource(entry.reference)}</Field>
          <Field label="Currency">{entry.currency ?? "ZMW"}</Field>
          <Field label="Created">{fmtStamp(entry.created_at)}</Field>
          <Field label="Last updated">{fmtStamp(entry.updated_at)}</Field>
          <Field label="Reversed">{entry.reversed_at ? fmtStamp(entry.reversed_at) : "—"}</Field>
        </dl>
        {(entry.reversal_of || entry.reversed_by) && (
          <div className="mt-3 flex flex-wrap gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs" data-print-hide>
            {entry.reversal_of && (
              <Link to="/journal-entry/$id" params={{ id: entry.reversal_of }} className="text-primary hover:underline">
                This journal reverses an earlier entry — open it
              </Link>
            )}
            {entry.reversed_by && (
              <Link to="/journal-entry/$id" params={{ id: entry.reversed_by }} className="text-primary hover:underline">
                This journal has been reversed — open the reversal
              </Link>
            )}
            {entry.reversal_reason && <span className="text-muted-foreground">Reason: {entry.reversal_reason}</span>}
          </div>
        )}
      </section>

      <PostingFlow kind="journal" reference={entry.reference ?? `JE:${entry.entry_number ?? ""}`} />

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">Journal lines</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Account</th>
                <th className="px-3 py-2 text-left font-semibold">Description</th>
                <th className="px-3 py-2 text-right font-semibold">Debit</th>
                <th className="px-3 py-2 text-right font-semibold">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs text-muted-foreground">{l.account?.account_code}</span>{" "}
                    {l.account?.account_name ?? "Unknown account"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{l.description ?? "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{Number(l.debit) ? fmtMoney(l.debit) : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{Number(l.credit) ? fmtMoney(l.credit) : "—"}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">This journal has no lines.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/50 font-semibold">
                <td className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground" colSpan={2}>Total</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(minorToNumber(debitMinor))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(minorToNumber(creditMinor))}</td>
              </tr>
              <tr className="border-t border-border text-xs">
                <td className="px-3 py-2 uppercase tracking-wider text-muted-foreground" colSpan={2}>Difference</td>
                <td className="px-3 py-2 text-right tabular-nums" colSpan={2}>
                  <span className={diffMinor === 0 ? "text-muted-foreground" : "font-semibold text-destructive"}>
                    {fmtMoney(Math.abs(minorToNumber(diffMinor)))}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            {balanced ? "Debits equal credits — this journal is in balance." : "A journal cannot post until debits equal credits."}
          </span>
          <div className="flex items-center gap-2">
            <BalanceChip balanced={balanced} diff={minorToNumber(diffMinor)} />
            <SifoPrintTools title={`Journal ${entry.entry_number ?? ""}`} />
          </div>
        </div>
      </section>

      {audit.length > 0 && (
        <section className="surface-card p-4" data-print-hide>
          <h2 className="mb-2 text-sm font-semibold">Audit history</h2>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {audit.map(a => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border/50 pb-1.5 last:border-0">
                <span className="font-medium text-foreground">{a.action}</span>
                <span>{a.actor_email ?? "—"} · {fmtStamp(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function fmtStamp(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
