import { Database } from "bun:sqlite";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { readdirSync } from "fs";

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
    runSqlMigrations(db);
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
  // Warehouse records existed in some desktop builds without the columns
  // required by the current warehouse UI. Create the table first, then add
  // missing columns safely for existing databases.
  database.exec(`CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT,
    code TEXT,
    name TEXT NOT NULL DEFAULT 'Warehouse',
    branch_id TEXT,
    location TEXT,
    manager TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_warehouses_user ON warehouses(user_id);`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON warehouses(branch_id);`);

  const migrations: Record<string, string[]> = {
    companies: [
      "payslip_footer TEXT",
    ],
    company_members: [
      "role TEXT NOT NULL DEFAULT 'staff'",
    ],
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
    warehouses: [
      "company_id TEXT",
      "name TEXT NOT NULL DEFAULT 'Warehouse'",
      "location TEXT",
      "is_active INTEGER NOT NULL DEFAULT 1",
      "created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    ],
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


function runSqlMigrations(database: Database) {
  database.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  );
  const candidates = [join(process.cwd(), "src", "lib", "db", "migrations"), join(process.cwd(), "migrations")];
  const dir = candidates.find((candidate) => existsSync(candidate));
  if (!dir) return;
  const applied = new Set(
    (database.prepare("SELECT id FROM schema_migrations").all() as any[]).map((row) => String(row.id)),
  );
  const files = readdirSync(dir).filter((name) => /^\\d+_.*\\.sql$/.test(name)).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), "utf8");
    const tx = database.transaction(() => {
      const statements = sql.split(/;\\s*\\n/).map((s) => s.trim()).filter(Boolean);
      for (const statement of statements) database.exec(statement + ";");
      database.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(file);
    });
    try {
      tx();
    } catch (error: any) {
      console.error("[db] Migration failed:", file, error?.message?.slice(0, 500));
      throw error;
    }
  }
}
