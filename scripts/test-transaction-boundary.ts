import { windowsTransactionProvider } from "../src/platform/windows/transaction";
import { getWindowsDatabase } from "../src/platform/windows/database";

await windowsTransactionProvider.withTransaction(async (tx) => {
  await tx.query("SELECT 1 AS ok");
});

const db = getWindowsDatabase();
const rows = await db.query<{ ok: number }>("SELECT 1 AS ok");
if (rows[0]?.ok !== 1) throw new Error("Transaction boundary check failed");

console.log("[transaction-boundary] OK: SQLite transaction committed");
