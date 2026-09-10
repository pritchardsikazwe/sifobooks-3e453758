import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BookText, ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { AccountSelector } from "@/components/selectors/AccountSelector";
import { useCoaAccounts } from "@/hooks/useCoaAccounts";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  emptyLine, journalTotals, minorToNumber, numberToMinor, saveJournalEntry, journalSource,
  usedLines, validateJournal, type JournalHeaderDraft, type JournalLineDraft,
} from "@/lib/journal";

type Props = { entryId?: string };

const today = () => new Date().toISOString().slice(0, 10);

export function JournalEntryEditor({ entryId }: Props) {
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useCoaAccounts();

  const [loading, setLoading] = useState(Boolean(entryId));
  const [status, setStatus] = useState<string>("draft");
  const [header, setHeader] = useState<JournalHeaderDraft>({
    entry_number: "", entry_date: today(), reference: "", description: "",
  });
  const [lines, setLines] = useState<JournalLineDraft[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState<null | "draft" | "posted">(null);
  const [showProblems, setShowProblems] = useState(false);

  // Sibling entries for Previous / position / Next while editing.
  const [siblings, setSiblings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("journal_entries").select("id")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled) setSiblings((data ?? []).map(r => r.id));
    })();
    return () => { cancelled = true; };
  }, []);

  // Suggest the next manual journal number for a brand-new entry.
  useEffect(() => {
    if (entryId) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.rpc("next_doc_number", { _uid: u.user.id, _prefix: "JE" } as never);
      if (!cancelled && typeof data === "string" && data) {
        setHeader(h => (h.entry_number ? h : { ...h, entry_number: data }));
      }
    })();
    return () => { cancelled = true; };
  }, [entryId]);

  useEffect(() => {
    if (!entryId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: e }, { data: l }] = await Promise.all([
        supabase.from("journal_entries").select("*").eq("id", entryId).maybeSingle(),
        supabase.from("journal_lines").select("id,account_id,description,debit,credit").eq("entry_id", entryId),
      ]);
      if (cancelled) return;
      if (e) {
        setStatus(e.status);
        setHeader({
          entry_number: e.entry_number ?? "",
          entry_date: e.entry_date ?? today(),
          reference: e.reference ?? "",
          description: e.description ?? "",
        });
      }
      const drafts = (l ?? []).map(row => ({
        key: row.id,
        account_id: row.account_id,
        description: row.description ?? "",
        debit: Number(row.debit) ? String(minorToNumber(numberToMinor(row.debit)).toFixed(2)) : "",
        credit: Number(row.credit) ? String(minorToNumber(numberToMinor(row.credit)).toFixed(2)) : "",
      })) as JournalLineDraft[];
      setLines(drafts.length ? drafts : [emptyLine(), emptyLine()]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [entryId]);

  const totals = useMemo(() => journalTotals(usedLines(lines)), [lines]);
  const problems = useMemo(() => validateJournal(header, lines), [header, lines]);
  const canPost = problems.length === 0 && status === "draft";
  const readOnly = Boolean(entryId) && status !== "draft";

  const position = entryId ? siblings.indexOf(entryId) : -1;
  const prevId = position > 0 ? siblings[position - 1] : null;
  const nextId = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : null;

  const setLine = (key: string, patch: Partial<JournalLineDraft>) =>
    setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (key: string) =>
    setLines(ls => (ls.length <= 1 ? [emptyLine()] : ls.filter(l => l.key !== key)));

  /** Balance the last touched line against the running difference. */
  const balanceRemaining = () => {
    const diff = totals.differenceMinor;
    if (diff === 0) return;
    const target = lines.find(l => !l.debit.trim() && !l.credit.trim()) ?? null;
    const amount = Math.abs(minorToNumber(diff)).toFixed(2);
    if (!target) {
      const l = emptyLine();
      if (diff > 0) l.credit = amount; else l.debit = amount;
      setLines(ls => [...ls, l]);
      return;
    }
    setLine(target.key, diff > 0 ? { credit: amount } : { debit: amount });
  };

  const submit = async (nextStatus: "draft" | "posted") => {
    if (nextStatus === "posted" && problems.length) { setShowProblems(true); return; }
    setSaving(nextStatus);
    try {
      const id = await saveJournalEntry({ id: entryId ?? null, header, lines, status: nextStatus });
      toast.success(nextStatus === "posted" ? "Journal posted to the ledger" : "Draft saved");
      navigate({ to: "/journal-entry/$id", params: { id } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not save this journal");
    } finally {
      setSaving(null);
    }
  };

  if (loading || accountsLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (readOnly) {
    return (
      <div className="p-4 sm:p-6">
        <div className="surface-card p-8 text-center">
          <BookText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm text-muted-foreground">
            This journal is {status} and cannot be edited. Use the reversal workflow to correct it.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/journal-entry/$id" params={{ id: entryId! }}>Open journal</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-28 sm:p-6">
      <SifoModuleHeader
        module="accounting"
        icon={BookText}
        title={entryId ? "Edit Journal Entry" : "New Journal Entry"}
        description="Manual double-entry journal — debits must equal credits before posting."
        breadcrumbs={[
          { label: "Accounting", to: "/journal-entries" },
          { label: "Journal Entries", to: "/journal-entries" },
          { label: entryId ? "Edit Journal Entry" : "New Journal Entry" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link to="/journal-entries"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Journal Entries</Link>
            </Button>
            {entryId && (
              <div className="flex items-center gap-1 rounded-lg border border-border px-1 py-0.5">
                <Button
                  variant="ghost" size="icon" className="h-8 w-8" disabled={!prevId} aria-label="Previous entry"
                  onClick={() => prevId && navigate({ to: "/journal-entry/edit/$id", params: { id: prevId } })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-1 text-xs tabular-nums text-muted-foreground">
                  {position >= 0 ? `${position + 1} of ${siblings.length}` : "—"}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8" disabled={!nextId} aria-label="Next entry"
                  onClick={() => nextId && navigate({ to: "/journal-entry/edit/$id", params: { id: nextId } })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        }
      />

      <section className="surface-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Journal header</h2>
          <Badge variant="secondary" className="capitalize">{status}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeaderField label="Entry number" required>
            <Input value={header.entry_number} onChange={e => setHeader(h => ({ ...h, entry_number: e.target.value }))} className="h-9 font-mono" />
          </HeaderField>
          <HeaderField label="Date" required>
            <Input type="date" value={header.entry_date} onChange={e => setHeader(h => ({ ...h, entry_date: e.target.value }))} className="h-9" />
          </HeaderField>
          <HeaderField label="Reference">
            <Input value={header.reference} onChange={e => setHeader(h => ({ ...h, reference: e.target.value }))} className="h-9" placeholder="e.g. ADJ-2026-04" />
          </HeaderField>
          <HeaderField label="Source">
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
              {journalSource(header.reference)}
            </div>
          </HeaderField>
          <HeaderField label="Description" className="sm:col-span-2 lg:col-span-4">
            <Textarea
              rows={2} value={header.description}
              onChange={e => setHeader(h => ({ ...h, description: e.target.value }))}
              placeholder="Why is this journal being raised?"
            />
          </HeaderField>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Journal lines</h2>
          <div className="flex items-center gap-2">
            {totals.differenceMinor !== 0 && usedLines(lines).length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={balanceRemaining}>
                Balance difference
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={addLine}>
              <Plus className="mr-1.5 h-4 w-4" /> Add line
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="w-[34%] px-3 py-2 text-left font-semibold">Account</th>
                <th className="px-3 py-2 text-left font-semibold">Line description</th>
                <th className="w-[15%] px-3 py-2 text-right font-semibold">Debit</th>
                <th className="w-[15%] px-3 py-2 text-right font-semibold">Credit</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map(l => {
                const acct = accounts.find(a => a.id === l.account_id);
                return (
                  <tr key={l.key} className="border-t border-border/60 align-top">
                    <td className="px-3 py-2">
                      <AccountSelector
                        label=""
                        accounts={accounts}
                        value={l.account_id}
                        onChange={id => setLine(l.key, { account_id: id })}
                        recentKey="journal-line-account"
                      />
                      {acct && (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          <span className="font-mono">{acct.account_code}</span> · {acct.account_name}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={l.description}
                        onChange={e => setLine(l.key, { description: e.target.value })}
                        placeholder="Narration"
                        className="h-9"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <AmountInput
                        value={l.debit}
                        onChange={v => setLine(l.key, { debit: v, credit: v ? "" : l.credit })}
                        onEnter={addLine}
                        ariaLabel="Debit amount"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <AmountInput
                        value={l.credit}
                        onChange={v => setLine(l.key, { credit: v, debit: v ? "" : l.debit })}
                        onEnter={addLine}
                        ariaLabel="Credit amount"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeLine(l.key)} aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/50 font-semibold">
                <td className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground" colSpan={2}>Totals</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(minorToNumber(totals.debitMinor))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoney(minorToNumber(totals.creditMinor))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {usedLines(lines).length === 0 && (
          <div className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Start by choosing an account and entering a debit, then a second account with the matching credit.
          </div>
        )}
      </section>

      <BalanceSummary totals={totals} />

      {showProblems && problems.length > 0 && (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <h3 className="text-sm font-semibold text-destructive">This journal cannot post yet</h3>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-destructive">
            {problems.map(p => <li key={p}>{p}</li>)}
          </ul>
        </section>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mr-auto text-xs text-muted-foreground">
          {totals.balanced
            ? "Debits equal credits — this journal can be posted."
            : `Out of balance by ${fmtMoney(Math.abs(minorToNumber(totals.differenceMinor)))}`}
        </div>
        <Button variant="outline" className="min-h-10" onClick={() => navigate({ to: "/journal-entries" })}>Cancel</Button>
        <Button
          variant="outline" className="min-h-10" disabled={saving !== null}
          onClick={() => submit("draft")}
        >
          {saving === "draft" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Save draft
        </Button>
        <Button
          className="min-h-10" disabled={saving !== null || !canPost}
          onClick={() => submit("posted")}
        >
          {saving === "posted" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
          Post journal
        </Button>
      </div>
    </div>
  );
}

function HeaderField({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}

function AmountInput({
  value, onChange, onEnter, ariaLabel,
}: { value: string; onChange: (v: string) => void; onEnter: () => void; ariaLabel: string }) {
  return (
    <Input
      value={value}
      aria-label={ariaLabel}
      inputMode="decimal"
      onChange={e => {
        const v = e.target.value;
        if (v === "" || /^\d*(\.\d{0,2})?$/.test(v.replace(/,/g, ""))) onChange(v.replace(/,/g, ""));
      }}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
      onBlur={() => { if (value.trim()) onChange(Number(value).toFixed(2)); }}
      placeholder="0.00"
      className="h-9 text-right tabular-nums"
    />
  );
}

export function BalanceSummary({ totals }: { totals: ReturnType<typeof journalTotals> }) {
  const diff = minorToNumber(totals.differenceMinor);
  return (
    <section className={cn(
      "grid gap-3 rounded-xl border p-4 sm:grid-cols-4",
      totals.balanced ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5",
    )}>
      <Stat label="Total debit" value={fmtMoney(minorToNumber(totals.debitMinor))} />
      <Stat label="Total credit" value={fmtMoney(minorToNumber(totals.creditMinor))} />
      <Stat label="Difference" value={fmtMoney(Math.abs(diff))} tone={totals.differenceMinor === 0 ? "ok" : "bad"} />
      <div className="flex items-center sm:justify-end">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
          totals.balanced ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
        )}>
          {totals.balanced ? "Balanced" : "Out of balance"}
        </span>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-0.5 text-lg font-semibold tabular-nums",
        tone === "bad" && "text-destructive", tone === "ok" && "text-primary",
      )}>{value}</div>
    </div>
  );
}
