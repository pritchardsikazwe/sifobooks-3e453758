import type { TransactionPort, TransactionProvider } from "@/core/contracts/transaction";
import { getDb } from "@/lib/db/database";

class WindowsSqliteTransaction implements TransactionPort {
  readonly dialect = "sqlite" as const;

  constructor(private readonly database: ReturnType<typeof getDb>) {}

  async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.database.prepare(sql).all(...params) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.database.prepare(sql).run(...params);
  }
}

/** Explicit SQLite BEGIN/COMMIT/ROLLBACK keeps the async core contract safe.
 * We deliberately do not pass an async callback to Bun's synchronous
 * Database.transaction wrapper. */
export const windowsTransactionProvider: TransactionProvider = {
  async withTransaction<T>(work: (tx: TransactionPort) => Promise<T>): Promise<T> {
    const database = getDb();
    database.exec("BEGIN");
    try {
      const result = await work(new WindowsSqliteTransaction(database));
      database.exec("COMMIT");
      return result;
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch { /* preserve original error */ }
      throw error;
    }
  },
};
