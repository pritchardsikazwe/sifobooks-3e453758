import { Database } from "bun:sqlite";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { readdirSync } from "fs";
import { gunzipSync } from "zlib";

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

  // Protected desktop package: compressed schema is intentionally not exposed as raw SQL.
  const protectedPath = join(process.cwd(), ".sifobooks-schema.bin");
  if (existsSync(protectedPath)) return gunzipSync(readFileSync(protectedPath)).toString("utf8");

  // Desktop development/fallback mode: schema.sql next to the executable.
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
      "barcode TEXT",
      "category TEXT",
      "item_type TEXT",
      "bin TEXT",
      "reserved_qty REAL NOT NULL DEFAULT 0",
      "on_order_qty REAL NOT NULL DEFAULT 0",
      "safety_stock REAL NOT NULL DEFAULT 0",
      "max_stock REAL NOT NULL DEFAULT 0",
      "is_active INTEGER NOT NULL DEFAULT 1",
      "needs_cost_review INTEGER NOT NULL DEFAULT 0",
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
    // Restaurant/purchasing compatibility for older desktop databases. The
    // SQL migration files cover normal startup; this belt-and-braces layer also
    // repairs a database when an older protected schema is already in use.
    suppliers: [
      "email TEXT",
      "phone TEXT",
      "vat_number TEXT",
      "address TEXT",
    ],
    restaurant_menu_items: [
      "is_86 INTEGER NOT NULL DEFAULT 0",
      "prices TEXT NOT NULL DEFAULT '{}'",
    ],
    restaurant_order_items: [
      "unit_cost REAL NOT NULL DEFAULT 0",
      "discount REAL NOT NULL DEFAULT 0",
      "modifiers TEXT NOT NULL DEFAULT '[]'",
    ],
    restaurant_orders: [
      "customer_name TEXT",
      "notes TEXT",
      "service_charge REAL NOT NULL DEFAULT 0",
      "gratuity REAL NOT NULL DEFAULT 0",
      "delivery_fee REAL NOT NULL DEFAULT 0",
      "amount_paid REAL NOT NULL DEFAULT 0",
      "journal_entry_id TEXT",
      "void_reason TEXT",
    ],
    restaurant_tables: [
      "shape TEXT NOT NULL DEFAULT 'square'",
      "occupied_since TEXT",
      "current_order_id TEXT",
      "server_name TEXT",
    ],
    restaurant_order_types: [
      "delivery_fee REAL NOT NULL DEFAULT 0",
    ],
    stock_movements: [
      "total_cost REAL",
      "transaction_date TEXT",
      "source_type TEXT",
      "source_id TEXT",
      "created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    ],
    pos_sales: [
      "branch_id TEXT",
    ],
    goods_receipts: [
      "company_id TEXT",
      "po_number TEXT",
      "receipt_date TEXT NOT NULL DEFAULT (date('now'))",
      "warehouse_id TEXT",
      "status TEXT NOT NULL DEFAULT 'draft'",
      "currency TEXT NOT NULL DEFAULT 'ZMW'",
      "total REAL NOT NULL DEFAULT 0",
      "reference TEXT",
      "notes TEXT",
      "created_at TEXT NOT NULL DEFAULT (datetime('now'))",
      "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
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
  const protectedMigrations = join(process.cwd(), ".sifobooks-migrations.bin");
  let bundled: { name: string; sql: string }[] = [];
  if (existsSync(protectedMigrations)) {
    try { bundled = JSON.parse(gunzipSync(readFileSync(protectedMigrations)).toString("utf8")); }
    catch (error) { console.error("[db] Protected migration bundle could not be opened:", error); throw error; }
  }
  const candidates = [join(process.cwd(), "src", "lib", "db", "migrations"), join(process.cwd(), "migrations")];
  const dir = candidates.find((candidate) => existsSync(candidate));
  if (!dir && bundled.length === 0) return;
  const applied = new Set(
    (database.prepare("SELECT id FROM schema_migrations").all() as any[]).map((row) => String(row.id)),
  );
  // A protected migration bundle may predate source migrations added later.
  // Always merge both sources so an existing portable database receives newly
  // added compatibility columns instead of remaining on the old bundle.
  const sourceEntries = dir
    ? readdirSync(dir).filter((name) => /^\d+_.*\.sql$/.test(name)).sort()
      .map((name) => ({ name, sql: readFileSync(join(dir!, name), "utf8") }))
    : [];
  const bundledEntries = bundled.map((entry) => ({ name: entry.name, sql: entry.sql }));
  const migrationMap = new Map<string, string>();
  for (const entry of [...bundledEntries, ...sourceEntries]) migrationMap.set(entry.name, entry.sql);
  const files = [...migrationMap.keys()].sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = migrationMap.get(file) || "";
    const statements = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
    try {
      // Migrations must be safe against databases whose schema already contains
      // some of the same objects/columns (for example databases created from
      // the protected schema before a migration bundle was introduced).
      for (const statement of statements) {
        try {
          database.exec(statement + ";");
        } catch (error: any) {
          const message = String(error?.message || "");
          if (!/already exists|duplicate column|duplicate index/i.test(message)) {
            throw error;
          }
        }
      }
      database.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(file);
    } catch (error: any) {
      console.error("[db] Migration failed:", file, error?.message?.slice(0, 500));
      throw error;
    }
  }
}
