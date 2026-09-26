import type { DatabasePort } from "@/core/contracts/database";

export async function checkDatabaseConnection(db: DatabasePort): Promise<{ ok: boolean; dialect: DatabasePort["dialect"] }> {
  await db.query("SELECT 1 AS ok");
  return { ok: true, dialect: db.dialect };
}
