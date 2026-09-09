import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookText, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { BalanceChip } from "@/components/accounting/JournalImpact";
import { PostingFlow } from "@/components/accounting/PostingFlow";

export const Route = createFileRoute("/_authenticated/journal-entry/$id")({
  head: () => ({ meta: [{ title: "Journal Entry — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: JournalEntryDetail,
});

type Entry = {
  id: string; entry_number: string | null; entry_date: string; reference: string | null;
  description: string | null; status: string; total_debit: number | null; total_credit: number | null;
};
type Line = {
  id: string; description: string | null; debit: number; credit: number;
  account: { account_code: string; account_name: string; account_type: string } | null;
};

function JournalEntryDetail() {
  const { id } = Route.useParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: e }, { data: l }] = await Promise.all([
        supabase.from("journal_entries").select("*").eq("id", id).maybeSingle(),
        supabase.from("journal_lines")
          .select("id,description,debit,credit,account:account_id(account_code,account_name,account_type)")
          .eq("entry_id", id),
      ]);
      if (cancelled) return;
      setEntry((e ?? null) as any);
      setLines((l ?? []) as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.005 && totalDebit > 0;

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
    <div className="space-y-4 p-6" data-print-area>
      <SifoModuleHeader
        module="accounting"
        icon={BookText}
        title={`Journal ${entry.entry_number ?? ""}`}
        description={entry.description ?? "Double-entry journal detail"}
        breadcrumbs={[{ label: "Finance", to: "/journal-entries" }, { label: "Journal Entries", to: "/journal-entries" }, { label: entry.entry_number ?? "Entry" }]}
        actions={
          <Button asChild variant="outline" size="sm" className="h-9" data-print-hide>
            <Link to="/journal-entries"><ArrowLeft className="mr-1.5 h-4 w-4" /> All journals</Link>
          </Button>
        }
      />

      <section className="surface-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Journal header</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{entry.status}</Badge>
            <BalanceChip balanced={balanced} diff={diff} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="Date">{entry.entry_date}</Field>
          <Field label="Reference">{entry.reference ?? "—"}</Field>
          <Field label="Source">{sourceOf(entry.reference)}</Field>
          <Field label="Currency">ZMW</Field>
        </dl>
      </section>

      <PostingFlow kind="journal" reference={entry.reference ?? `JE:${entry.entry_number ?? ""}`} />

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">Journal lines</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(totalDebit)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            {balanced ? "Debits equal credits — this journal can post." : "A journal cannot post until debits equal credits."}
          </span>
          <BalanceChip balanced={balanced} diff={diff} />
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

function sourceOf(reference: string | null) {
  if (!reference) return "Manual journal";
  const prefix = reference.split(":")[0]?.toUpperCase();
  const map: Record<string, string> = {
    POS: "Point of sale", INV: "Sales invoice", BILL: "Supplier bill",
    EXP: "Expense", RCP: "Customer receipt", RCT: "Customer receipt",
    PAY: "Payroll", JE: "Manual journal",
  };
  return map[prefix ?? ""] ?? "Manual journal";
}
