import type { DatabasePort, DatabaseProvider } from "@/core/contracts/database";
import { getDb } from "@/lib/db/database";

class WindowsSqliteDatabase implements DatabasePort {
  readonly dialect = "sqlite" as const;

  async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return getDb().prepare(sql).all(...params) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    getDb().prepare(sql).run(...params);
  }
}

let database: DatabasePort | null = null;

export function getWindowsDatabase(): DatabasePort {
  if (!database) database = new WindowsSqliteDatabase();
  return database;
}

export const windowsDatabaseProvider: DatabaseProvider = {
  getDatabase: getWindowsDatabase,
};
