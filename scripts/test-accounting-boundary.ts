import { listActiveAccounts } from "../src/core/accounting/accounts";
import { getWindowsDatabase } from "../src/platform/windows/database";

const userId = process.env.SIFOBOOKS_QA_USER_ID;
if (!userId) {
  console.log("[accounting-boundary] SKIPPED: set SIFOBOOKS_QA_USER_ID to run against a local company");
  process.exit(0);
}

const accounts = await listActiveAccounts(getWindowsDatabase(), userId);
console.log(`[accounting-boundary] OK: ${accounts.length} active accounts read through DatabasePort`);
