import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const dbPath = join(process.cwd(), "data", "schema-qa.sqlite");
process.env.DATABASE_PATH = dbPath;
process.env.SIFOBOOKS_MODE = "offline";

if (existsSync(dbPath)) rmSync(dbPath);
mkdirSync(join(process.cwd(), "data"), { recursive: true });

const { getDb, getColumns } = await import("../src/lib/db/database");
const db = getDb();

const requiredTables = ["stock_items", "stock_movements", "stock_balances", "goods_receipts", "warehouses"];
const tables = new Set(
  (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>)
    .map((row) => row.name),
);

for (const table of requiredTables) {
  if (!tables.has(table)) throw new Error(`Missing required table: ${table}`);
}

const requiredColumns: Record<string, string[]> = {
  stock_items: ["category", "needs_cost_review", "needs_unit_verification", "reserved_qty", "safety_stock", "max_stock"],
  stock_movements: ["item_id", "movement_type", "quantity", "unit_cost", "total_cost", "reference", "location_id"],
  stock_balances: ["item_id", "location_id", "quantity"],
  goods_receipts: ["receipt_date", "warehouse_id", "status", "total"],
};

for (const [table, columns] of Object.entries(requiredColumns)) {
  const actual = new Set(getColumns(table));
  for (const column of columns) {
    if (!actual.has(column)) throw new Error(`Missing required column: ${table}.${column}`);
  }
}

db.close();
rmSync(dbPath, { force: true });
console.log("[windows-schema-qa] OK: inventory schema tables and required columns are present");
