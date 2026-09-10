import { supabase } from "@/integrations/supabase/client";

/**
 * Journal entry service built on the EXISTING `journal_entries` /
 * `journal_lines` tables. All balance decisions use integer minor units
 * (ngwee/cents) so posting never depends on floating-point display maths.
 */

export type JournalLineDraft = {
  key: string;
  account_id: string | null;
  description: string;
  /** Raw text from the grid input — parsed to minor units for all maths. */
  debit: string;
  credit: string;
};

export type JournalHeaderDraft = {
  entry_number: string;
  entry_date: string;
  reference: string;
  description: string;
};

export const emptyLine = (): JournalLineDraft => ({
  key: Math.random().toString(36).slice(2),
  account_id: null,
  description: "",
  debit: "",
  credit: "",
});

/** Parse a money string into integer minor units. Returns null when invalid. */
export function toMinor(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).trim().replace(/,/g, "");
  if (s === "") return 0;
  if (!/^\d*(\.\d{0,6})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const cents = `${frac}00`.slice(0, 2);
  const value = Number(whole || "0") * 100 + Number(cents || "0");
  return Number.isFinite(value) ? value : null;
}

/** Convert a stored numeric column into integer minor units without drift. */
export function numberToMinor(n: number | string | null | undefined): number {
  if (n === null || n === undefined || n === "") return 0;
  return Math.round(Number(n) * 100);
}

export const minorToNumber = (minor: number) => minor / 100;

export type JournalTotals = {
  debitMinor: number;
  creditMinor: number;
  differenceMinor: number;
  balanced: boolean;
  invalidAmounts: boolean;
};

export function journalTotals(lines: JournalLineDraft[]): JournalTotals {
  let debitMinor = 0;
  let creditMinor = 0;
  let invalidAmounts = false;
  for (const l of lines) {
    const d = toMinor(l.debit);
    const c = toMinor(l.credit);
    if (d === null || c === null) { invalidAmounts = true; continue; }
    debitMinor += d;
    creditMinor += c;
  }
  const differenceMinor = debitMinor - creditMinor;
  return {
    debitMinor,
    creditMinor,
    differenceMinor,
    balanced: differenceMinor === 0 && debitMinor > 0,
    invalidAmounts,
  };
}

/** Lines that actually carry data (an account or any amount). */
export function usedLines(lines: JournalLineDraft[]) {
  return lines.filter(l => l.account_id || l.debit.trim() || l.credit.trim() || l.description.trim());
}

/** Blocking problems. An empty array means the journal may be posted. */
export function validateJournal(header: JournalHeaderDraft, lines: JournalLineDraft[]): string[] {
  const problems: string[] = [];
  if (!header.entry_number.trim()) problems.push("Entry number is required.");
  if (!header.entry_date) problems.push("Entry date is required.");

  const used = usedLines(lines);
  if (used.length === 0) problems.push("Add at least one journal line.");
  if (used.length === 1) problems.push("A journal needs at least two lines — one debit and one credit.");

  used.forEach((l, i) => {
    const n = i + 1;
    const d = toMinor(l.debit);
    const c = toMinor(l.credit);
    if (!l.account_id) problems.push(`Line ${n}: choose an account from the chart of accounts.`);
    if (d === null || c === null) { problems.push(`Line ${n}: amount is not a valid number.`); return; }
    if (d > 0 && c > 0) problems.push(`Line ${n}: enter either a debit or a credit, not both.`);
    if (d === 0 && c === 0) problems.push(`Line ${n}: enter a debit or credit amount.`);
  });

  const totals = journalTotals(used);
  if (!totals.invalidAmounts && used.length > 1) {
    if (totals.debitMinor === 0 && totals.creditMinor === 0) problems.push("The journal has no amounts.");
    else if (totals.differenceMinor !== 0) problems.push("Debits and credits must be equal before posting.");
  }
  return problems;
}

export type SaveJournalInput = {
  id?: string | null;
  header: JournalHeaderDraft;
  lines: JournalLineDraft[];
  status: "draft" | "posted";
};

/**
 * Creates or updates a DRAFT journal and its lines. Posted journals are never
 * rewritten here — use the existing reversal workflow instead.
 */
export async function saveJournalEntry(input: SaveJournalInput): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("You are not signed in.");

  if (input.id) {
    const { data: existing, error } = await supabase
      .from("journal_entries").select("status").eq("id", input.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) throw new Error("This journal entry no longer exists.");
    if (existing.status !== "draft") throw new Error("Posted journals cannot be edited. Reverse the entry instead.");
  }

  const used = usedLines(input.lines);
  const totals = journalTotals(used);
  if (totals.invalidAmounts) throw new Error("One or more amounts are not valid numbers.");
  if (input.status === "posted" && !totals.balanced) throw new Error("A journal must balance before it can be posted.");

  const header = {
    user_id: uid,
    entry_number: input.header.entry_number.trim(),
    entry_date: input.header.entry_date,
    reference: input.header.reference.trim() || null,
    description: input.header.description.trim() || null,
    status: input.status,
    total_debit: minorToNumber(totals.debitMinor),
    total_credit: minorToNumber(totals.creditMinor),
  };

  let entryId = input.id ?? null;
  if (entryId) {
    const { error } = await supabase.from("journal_entries").update(header).eq("id", entryId);
    if (error) throw new Error(error.message);
    const { error: delErr } = await supabase.from("journal_lines").delete().eq("entry_id", entryId);
    if (delErr) throw new Error(delErr.message);
  } else {
    const { data, error } = await supabase.from("journal_entries").insert(header).select("id").single();
    if (error) throw new Error(error.message);
    entryId = data.id;
  }

  if (used.length) {
    const payload = used.map(l => ({
      user_id: uid,
      entry_id: entryId!,
      account_id: l.account_id,
      description: l.description.trim() || null,
      debit: minorToNumber(toMinor(l.debit) ?? 0),
      credit: minorToNumber(toMinor(l.credit) ?? 0),
    }));
    const { error } = await supabase.from("journal_lines").insert(payload);
    if (error) throw new Error(error.message);
  }

  return entryId!;
}

/** Human label for where a journal came from, derived from its reference prefix. */
export function journalSource(reference: string | null | undefined) {
  if (!reference) return "Manual journal";
  const prefix = reference.split(":")[0]?.toUpperCase();
  const map: Record<string, string> = {
    POS: "Point of sale", INV: "Sales invoice", CN: "Credit note", BILL: "Supplier bill",
    EXP: "Expense", RCP: "Customer receipt", RCT: "Customer receipt", TRF: "Stock transfer",
    CNT: "Stock count", PAY: "Payroll", DEP: "Depreciation", JE: "Manual journal",
  };
  return map[prefix ?? ""] ?? "Manual journal";
}
