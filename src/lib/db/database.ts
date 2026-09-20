import { Database } from "bun:sqlite";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

let db: Database | null = null;
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), "data", "sifobooks.db");

export function getDb(): Database {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH, { create: true });
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    initSchema(db);
    runCompatibilityMigrations(db);
  }
  return db;
}

function findSchemaSql(): string {
  // Dev mode: schema.sql next to the source file
  const devPath = join(import.meta.dir, "schema.sql");
  if (existsSync(devPath)) return readFileSync(devPath, "utf8");

  // Desktop mode: schema.sql in the working directory (next to the .exe)
  const desktopPath = join(process.cwd(), "schema.sql");
  if (existsSync(desktopPath)) return readFileSync(desktopPath, "utf8");

  // Desktop mode: schema.sql in the data directory
  const dataPath = join(process.cwd(), "data", "schema.sql");
  if (existsSync(dataPath)) return readFileSync(dataPath, "utf8");

  throw new Error("schema.sql not found. Expected next to source, executable, or in data/ directory.");
}

function initSchema(database: Database) {
  const schema = findSchemaSql();
  const statements = schema.split(/;\s*\n/).filter(s => s.trim() && !s.trim().startsWith("--"));
  for (const stmt of statements) {
    try {
      database.exec(stmt + ";");
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        console.error("[db] Schema error:", e.message?.slice(0, 200));
      }
    }
  }
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

const columnCache = new Map<string, string[]>();
export function getColumns(table: string): string[] {
  if (columnCache.has(table)) return columnCache.get(table)!;
  const database = getDb();
  const cols = database.prepare(`PRAGMA table_info("${table}")`).all() as any[];
  const names = cols.map(c => c.name);
  columnCache.set(table, names);
  return names;
}


function runCompatibilityMigrations(database: Database) {
  const migrations: Record<string, string[]> = {
    stock_items: [
      "zra_item_code TEXT",
      "zra_item_class_code TEXT",
      "zra_item_type_code TEXT",
      "zra_origin_country_code TEXT",
      "zra_pkg_unit_code TEXT",
      "zra_qty_unit_code TEXT",
      "zra_vat_category_code TEXT",
      "zra_tax_rate REAL",
      "zra_sync_status TEXT NOT NULL DEFAULT 'unmapped'",
      "zra_last_sync_at TEXT",
      "zra_raw_data TEXT",
    ],
    zra_invoice_queue: [
      "attempt_count INTEGER NOT NULL DEFAULT 0",
      "last_attempt_at TEXT",
      "zra_receipt_number TEXT",
      "zra_internal_data TEXT",
      "zra_receipt_signature TEXT",
      "zra_qr_url TEXT",
      "error_code TEXT",
    ],
    zra_standard_codes: ["code_class_name TEXT"],
  };

  for (const [table, columns] of Object.entries(migrations)) {
    const existing = new Set(getTableColumns(database, table));
    for (const definition of columns) {
      const name = definition.split(/\s+/)[0];
      if (existing.has(name)) continue;
      try {
        database.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition.slice(name.length).trim()};`);
        existing.add(name);
      } catch (error: any) {
        if (!/duplicate column|already exists/i.test(String(error?.message))) {
          console.error("[db] Migration error:", error?.message?.slice(0, 200));
        }
      }
    }
  }
}

function getTableColumns(database: Database, table: string): string[] {
  return (database.prepare(`PRAGMA table_info("${table}")`).all() as any[]).map((row) => String(row.name));
}
