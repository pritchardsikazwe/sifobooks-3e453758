import { supabase } from "@/integrations/supabase/client";

export type PayrollJournalLine = {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
};

export const payrollRunReference = (runNumber: string) => `PR:${runNumber}`;

export async function findPayrollJournal(userId: string, runNumber: string) {
  const { data } = await supabase.from("journal_entries").select("id")
    .eq("user_id", userId).eq("reference", payrollRunReference(runNumber)).maybeSingle();
  return data?.id ?? null;
}

/** Post a balanced payroll run atomically through the central posting engine. */
export async function postPayrollRunLedger(opts: {
  userId: string; runNumber: string; payDate: string; periodLabel: string; lines: PayrollJournalLine[];
}) {
  const existing = await findPayrollJournal(opts.userId, opts.runNumber);
  if (existing) return { ok: true as const, alreadyPosted: true, entryId: existing };

  const lines = opts.lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
  if (!lines.length) return { ok: false as const, error: "No payroll journal lines to post." };
  const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  const totalDebit = round(lines.reduce((s, l) => s + Number(l.debit || 0), 0));
  const totalCredit = round(lines.reduce((s, l) => s + Number(l.credit || 0), 0));
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { ok: false as const, error: `Payroll journal is out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}.` };
  }

  const { data, error } = await (supabase as any).rpc("post_journal_entry", {
    _user_id: opts.userId,
    _entry_number: `JE-${opts.runNumber}`,
    _entry_date: opts.payDate,
    _reference: payrollRunReference(opts.runNumber),
    _description: `Payroll ${opts.periodLabel} — run ${opts.runNumber}`,
    _lines: lines.map(l => ({ account_id: l.accountId, debit: round(l.debit), credit: round(l.credit), description: l.description })),
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, alreadyPosted: false, entryId: data as string };
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
