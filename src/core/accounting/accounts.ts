import type { DatabasePort } from "@/core/contracts/database";

export interface AccountSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

/**
 * Shared accounting read operation. It deliberately knows nothing about
 * SQLite, PostgreSQL, Bun, Supabase, or filesystem APIs.
 */
export async function listActiveAccounts(db: DatabasePort, userId: string): Promise<AccountSummary[]> {
  const rows = await db.query<Record<string, unknown>>(
    "SELECT id, account_code, account_name, account_type, is_active FROM chart_of_accounts WHERE user_id = ? AND is_active = 1 ORDER BY account_code",
    [userId],
  );

  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.account_code ?? ""),
    name: String(row.account_name ?? ""),
    type: String(row.account_type ?? ""),
    active: Boolean(row.is_active),
  }));
}
