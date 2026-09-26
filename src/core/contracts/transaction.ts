import type { DatabasePort } from "@/core/contracts/database";

/**
 * Atomic transaction boundary shared by accounting, inventory and POS.
 * The core layer owns the contract; each runtime owns the transaction
 * implementation (SQLite locally, PostgreSQL in cloud mode).
 */
export interface TransactionPort extends DatabasePort {}

export interface TransactionProvider {
  withTransaction<T>(work: (tx: TransactionPort) => Promise<T>): Promise<T>;
}
