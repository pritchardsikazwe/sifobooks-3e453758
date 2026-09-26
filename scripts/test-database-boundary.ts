import { checkDatabaseConnection } from "../src/core/database/health";
import { getWindowsDatabase } from "../src/platform/windows/database";

const result = await checkDatabaseConnection(getWindowsDatabase());
if (!result.ok || result.dialect !== "sqlite") {
  throw new Error(`Database boundary check failed: ${JSON.stringify(result)}`);
}

console.log(`[database-boundary] OK: ${result.dialect}`);
