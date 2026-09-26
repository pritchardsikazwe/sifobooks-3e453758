import type { DatabasePort, DatabaseProvider } from "@/core/contracts/database";
import { getCloudDb } from "@/lib/cloud/postgres";

function toPostgresPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

class CloudPostgresDatabase implements DatabasePort {
  readonly dialect = "postgres" as const;

  async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return await getCloudDb().unsafe(toPostgresPlaceholders(sql), params) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await getCloudDb().unsafe(toPostgresPlaceholders(sql), params);
  }
}

let database: DatabasePort | null = null;

export function getCloudDatabase(): DatabasePort {
  if (!database) database = new CloudPostgresDatabase();
  return database;
}

export const cloudDatabaseProvider: DatabaseProvider = {
  getDatabase: getCloudDatabase,
};
