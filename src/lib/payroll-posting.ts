import { supabase } from "@/integrations/supabase/client";

export type PayrollJournalLine = {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
};

export const payrollRunReference = (runNumber: string) => `PR:${runNumber}`;

/** Find the posted journal for a payroll run, if any. */
export async function findPayrollJournal(userId: string, runNumber: string) {
  const { data } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("reference", payrollRunReference(runNumber))
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Post a payroll run to the general ledger. Idempotent: a run that already has
 * a journal against its reference is left alone.
 */
export async function postPayrollRunLedger(opts: {
  userId: string;
  runNumber: string;
  payDate: string;
  periodLabel: string;
  lines: PayrollJournalLine[];
}) {
  const ref = payrollRunReference(opts.runNumber);
  const existing = await findPayrollJournal(opts.userId, opts.runNumber);
  if (existing) return { ok: true as const, alreadyPosted: true, entryId: existing };

  const lines = opts.lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
  if (lines.length === 0) return { ok: false as const, error: "No payroll journal lines to post." };

  const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  const totalDebit = round(lines.reduce((s, l) => s + Number(l.debit || 0), 0));
  const totalCredit = round(lines.reduce((s, l) => s + Number(l.credit || 0), 0));
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { ok: false as const, error: `Payroll journal is out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}.` };
  }

  const { data: entry, error } = await supabase.from("journal_entries").insert({
    user_id: opts.userId,
    entry_number: `JE-${opts.runNumber}`,
    entry_date: opts.payDate,
    reference: ref,
    description: `Payroll ${opts.periodLabel} — run ${opts.runNumber}`,
    status: "posted",
    total_debit: totalDebit,
    total_credit: totalCredit,
  }).select("id").single();
  if (error || !entry) return { ok: false as const, error: error?.message ?? "Could not create the payroll journal." };

  const { error: lineError } = await supabase.from("journal_lines").insert(
    lines.map(l => ({
      user_id: opts.userId,
      entry_id: entry.id,
      account_id: l.accountId,
      debit: round(l.debit),
      credit: round(l.credit),
      description: l.description,
    })),
  );
  if (lineError) {
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return { ok: false as const, error: lineError.message };
  }
  return { ok: true as const, alreadyPosted: false, entryId: entry.id };
}

/** Reverse a posted payroll run through the audited reversal RPC. */
export async function reversePayrollRunLedger(userId: string, runNumber: string, reason: string) {
  const entryId = await findPayrollJournal(userId, runNumber);
  if (!entryId) return { ok: true as const, nothingToReverse: true };
  const { error } = await (supabase as any).rpc("safe_reverse_journal_entry", {
    _entry_id: entryId,
    _reason: reason,
    _reversal_date: new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, nothingToReverse: false };
}
