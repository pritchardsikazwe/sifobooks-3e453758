import type { DatabasePort } from "@/core/contracts/database";

export interface JournalLineInput {
  accountId: string;
  description?: string;
  debit?: number;
  credit?: number;
}

export interface PreparedJournalLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

const money = (value: unknown) => Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;

export function prepareJournalLines(lines: JournalLineInput[]): PreparedJournalLine[] {
  if (!lines.length) throw new Error("EMPTY_JOURNAL");

  const prepared = lines.map((line) => ({
    accountId: String(line.accountId),
    description: String(line.description ?? ""),
    debit: money(line.debit),
    credit: money(line.credit),
  }));

  if (prepared.some((line) => !line.accountId || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0))) {
    throw new Error("INVALID_JOURNAL_LINE");
  }

  const debit = money(prepared.reduce((sum, line) => sum + line.debit, 0));
  const credit = money(prepared.reduce((sum, line) => sum + line.credit, 0));

  if (debit <= 0 || Math.abs(debit - credit) > 0.01) throw new Error("UNBALANCED_JOURNAL");
  return prepared;
}

/** Shared journal posting boundary. The first extraction keeps persistence
 * deliberately small: validation is shared, while database writes remain in
 * the existing accounting transaction until the repository migration. */
export async function validateJournalAccounts(db: DatabasePort, accountIds: string[]): Promise<void> {
  if (!accountIds.length) throw new Error("NO_JOURNAL_ACCOUNTS");
  const placeholders = accountIds.map(() => "?").join(",");
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM chart_of_accounts WHERE id IN (${placeholders}) AND is_active = 1`,
    accountIds,
  );
  if (rows.length !== new Set(accountIds).size) throw new Error("INVALID_JOURNAL_ACCOUNT");
}
