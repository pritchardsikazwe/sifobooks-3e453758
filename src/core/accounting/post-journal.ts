import type { DatabasePort } from "@/core/contracts/database";
import type { TransactionPort, TransactionProvider } from "@/core/contracts/transaction";
import { prepareJournalLines, validateJournalAccounts, type JournalLineInput, type PreparedJournalLine } from "@/core/accounting/journal";

export interface PostJournalInput {
  userId: string;
  entryNumber: string;
  entryDate?: string;
  reference?: string;
  description?: string;
  currency?: string;
  exchangeRate?: number;
  batchId?: string;
  lines: JournalLineInput[];
}

export interface PostedJournal {
  id: string;
  entryNumber: string;
  totalDebit: number;
  totalCredit: number;
}

export interface JournalIdFactory {
  nextId(): string;
}

export interface JournalClock {
  now(): string;
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Shared accounting posting operation. It validates the journal first and
 * persists the header and lines inside one runtime-provided transaction.
 * Database/transaction drivers stay outside the core layer.
 */
export async function postJournal(
  database: DatabasePort,
  transactions: TransactionProvider,
  ids: JournalIdFactory,
  clock: JournalClock,
  input: PostJournalInput,
): Promise<PostedJournal> {
  if (!input.userId) throw new Error("JOURNAL_USER_REQUIRED");
  if (!input.entryNumber) throw new Error("JOURNAL_ENTRY_NUMBER_REQUIRED");

  const lines = prepareJournalLines(input.lines);
  await validateJournalAccounts(database, lines.map((line) => line.accountId));

  const journalId = ids.nextId();
  const entryDate = input.entryDate ?? clock.now().slice(0, 10);
  const totalDebit = money(lines.reduce((sum, line) => sum + line.debit, 0));
  const totalCredit = money(lines.reduce((sum, line) => sum + line.credit, 0));

  await transactions.withTransaction(async (tx: TransactionPort) => {
    await tx.execute(
      `INSERT INTO journal_entries
       (id, user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit, updated_at, currency, exchange_rate, batch_id)
       VALUES (?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?, ?, ?)`,
      [
        journalId,
        input.userId,
        input.entryNumber,
        entryDate,
        input.reference ?? null,
        input.description ?? null,
        totalDebit,
        totalCredit,
        clock.now(),
        input.currency ?? "ZMW",
        input.exchangeRate ?? 1,
        input.batchId ?? null,
      ],
    );

    for (const line of lines) {
      await tx.execute(
        `INSERT INTO journal_lines (id, user_id, entry_id, account_id, description, debit, credit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ids.nextId(), input.userId, journalId, line.accountId, line.description || null, line.debit, line.credit],
      );
    }
  });

  return { id: journalId, entryNumber: input.entryNumber, totalDebit, totalCredit };
}
