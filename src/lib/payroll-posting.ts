import { supabase } from "@/integrations/supabase/client";
import { capturePostingFailure } from "./posting-failure";

export type PayrollJournalLine = { accountId: string; debit: number; credit: number; description: string };
export const payrollRunReference = (runNumber: string) => `PR:${runNumber}`;

export async function findPayrollJournal(userId: string, runNumber: string) {
  const { data } = await supabase.from("journal_entries").select("id").eq("user_id", userId).eq("reference", payrollRunReference(runNumber)).maybeSingle();
  return data?.id ?? null;
}

/** Post payroll accrual atomically. Net salary is a liability until the separate salary payment. */
export async function postPayrollRunLedger(opts: { userId: string; runNumber: string; payDate: string; periodLabel: string; lines: PayrollJournalLine[] }) {
  const existing = await findPayrollJournal(opts.userId, opts.runNumber);
  if (existing) return { ok: true as const, alreadyPosted: true, entryId: existing };
  let lines = opts.lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
  if (!lines.length) {
    const error = "No payroll journal lines to post.";
    await capturePostingFailure({ userId: opts.userId, sourceModule: "payroll", sourceType: "payroll_run", sourceReference: payrollRunReference(opts.runNumber), error, payload: { runNumber: opts.runNumber, periodLabel: opts.periodLabel } });
    return { ok: false as const, error };
  }

  const netLine = lines.find(l => /net (salary|pay) to staff/i.test(l.description) && l.credit > 0);
  if (netLine) {
    const { data: netAccount } = await supabase.from("chart_of_accounts").select("id, account_code").eq("user_id", opts.userId).eq("account_code", "2400").eq("is_active", true).maybeSingle();
    if (netAccount && netLine.accountId !== netAccount.id) {
      const { data: current } = await supabase.from("chart_of_accounts").select("account_code").eq("id", netLine.accountId).maybeSingle();
      if (current?.account_code === "1000") netLine.accountId = netAccount.id;
    }
  }

  const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  const totalDebit = round(lines.reduce((s, l) => s + Number(l.debit || 0), 0));
  const totalCredit = round(lines.reduce((s, l) => s + Number(l.credit || 0), 0));
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    const error = `Payroll journal is out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}.`;
    await capturePostingFailure({ userId: opts.userId, sourceModule: "payroll", sourceType: "payroll_run", sourceReference: payrollRunReference(opts.runNumber), error,
      payload: { runNumber: opts.runNumber, totalDebit, totalCredit, periodLabel: opts.periodLabel } });
    return { ok: false as const, error };
  }

  const { data, error } = await (supabase as any).rpc("post_journal_entry", {
    _user_id: opts.userId, _entry_number: `JE-${opts.runNumber}`, _entry_date: opts.payDate,
    _reference: payrollRunReference(opts.runNumber), _description: `Payroll ${opts.periodLabel} — run ${opts.runNumber}`,
    _lines: lines.map(l => ({ account_id: l.accountId, debit: round(l.debit), credit: round(l.credit), description: l.description })),
  });
  if (error) {
    await capturePostingFailure({ userId: opts.userId, sourceModule: "payroll", sourceType: "payroll_run", sourceReference: payrollRunReference(opts.runNumber), error: error.message,
      payload: { runNumber: opts.runNumber, payDate: opts.payDate, periodLabel: opts.periodLabel, lines } });
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, alreadyPosted: false, entryId: data as string };
}

export async function reversePayrollRunLedger(userId: string, runNumber: string, reason: string) {
  const entryId = await findPayrollJournal(userId, runNumber);
  if (!entryId) return { ok: true as const, nothingToReverse: true };
  const { error } = await (supabase as any).rpc("safe_reverse_journal_entry", { _entry_id: entryId, _reason: reason, _reversal_date: new Date().toISOString().slice(0, 10) });
  if (error) {
    await capturePostingFailure({ userId, sourceModule: "payroll", sourceType: "payroll_reversal", sourceId: entryId, sourceReference: payrollRunReference(runNumber), operation: "reverse", error: error.message,
      payload: { runNumber, reason } });
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, nothingToReverse: false };
}
