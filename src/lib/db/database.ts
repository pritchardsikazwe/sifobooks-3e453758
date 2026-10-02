import cloudColumns from "./cloud-columns.json";
// SQLite is runtime-specific and server-only (Windows/standalone build):
// - Bun/Windows production uses bun:sqlite.
// - Node/Vite development uses node:sqlite.
// The loader stays synchronous and avoids statically analyzable Bun-only imports.
// Synchronous, server-only driver resolution. No static reference to bun:sqlite,
// so hosted/cloud bundles never try to resolve the Bun-only module.
// SQLite is runtime-specific and server-only (Windows/standalone build only):
// - Bun/Windows production uses bun:sqlite.
// - Node/Vite development uses node:sqlite.
// The loader stays synchronous (the SQLite API is synchronous) but has no
// statically analyzable module specifier, so hosted/cloud bundles never try to
// resolve bun:sqlite or node:sqlite.
type Database = any;

let DatabaseConstructorCache: any = null;
function getDatabaseConstructor(): any {
  if (DatabaseConstructorCache) return DatabaseConstructorCache;
  const proc: any = typeof process !== "undefined" ? process : undefined;
  if (proc?.versions?.bun) {
    const req = (import.meta as any).require ?? (globalThis as any).require;
    DatabaseConstructorCache = req("bun" + ":sqlite").Database;
  } else {
    const mod = proc?.getBuiltinModule?.("node" + ":sqlite");
    if (!mod) throw new Error("LOCAL_SQLITE_UNAVAILABLE: local SQLite is only available in the Windows/standalone build.");
    DatabaseConstructorCache = mod.DatabaseSync;
  }
  return DatabaseConstructorCache;
}
// Namespace imports, read lazily inside functions: a named import of a Node
// built-in is evaluated at module load and crashes any browser page whose
// import chain reaches this file (e.g. via @/lib/zra/server).
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as zlib from "zlib";

let db: Database | null = null;
const dbPath = () => process.env.DATABASE_PATH || path.join(process.cwd(), "data", "sifobooks.db");

export function getDb(): Database {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath()), { recursive: true });
    const DatabaseConstructor = getDatabaseConstructor();
    db = new DatabaseConstructor(dbPath());
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
  const sourceDir = path.dirname(url.fileURLToPath(import.meta.url));
  const devPath = path.join(sourceDir, "schema.sql");
  if (fs.existsSync(devPath)) return fs.readFileSync(devPath, "utf8");

  // Protected desktop package: compressed schema is intentionally not exposed as raw SQL.
  const protectedPath = path.join(process.cwd(), ".sifobooks-schema.bin");
  if (fs.existsSync(protectedPath)) return zlib.gunzipSync(fs.readFileSync(protectedPath)).toString("utf8");

  // Desktop development/fallback mode: schema.sql next to the executable.
  const desktopPath = path.join(process.cwd(), "schema.sql");
  if (fs.existsSync(desktopPath)) return fs.readFileSync(desktopPath, "utf8");

  // Desktop mode: schema.sql in the data directory
  const dataPath = path.join(process.cwd(), "data", "schema.sql");
  if (fs.existsSync(dataPath)) return fs.readFileSync(dataPath, "utf8");

  throw new Error("schema.sql not found. Expected next to source, executable, or in data/ directory.");
}

function splitSqlStatements(sql: string): string[] {
  const cleaned = sql.replace(/^\s*--.*$/gm, "");
  const statements: string[] = [];
  let current = "";
  let triggerDepth = 0;
  for (const line of cleaned.split(/\r?\n/)) {
    current += line + "\n";
    if (/^\s*CREATE\s+TRIGGER\b/i.test(line)) triggerDepth = 1;
    if (triggerDepth > 0 && /^\s*END\s*;\s*$/i.test(line)) {
      statements.push(current.trim());
      current = "";
      triggerDepth = 0;
    } else if (triggerDepth === 0 && /;\s*$/.test(line)) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(Boolean);
}

function initSchema(database: Database) {
  const schema = findSchemaSql();
  for (const stmt of splitSqlStatements(schema)) {
    try {
      database.exec(stmt);
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        console.error("[db] Schema error:", e.message?.slice(0, 200));
      }
    }
  }

  // Legacy-database repair: CREATE TABLE IF NOT EXISTS preserves an older
  // table shape, so it cannot add columns introduced by a newer release.
  // Reconcile additive columns before application queries run.
  repairSchemaColumns(database, schema);
}

function repairSchemaColumns(database: Database, schema: string) {
  const tableStatements = splitSqlStatements(schema).filter((statement) =>
    /^\s*CREATE\s+TABLE\s+/i.test(statement),
  );

  for (const statement of tableStatements) {
    const header = statement.match(/^\s*CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+["\`]?([A-Za-z0-9_]+)["\`]?\s*\(/i);
    if (!header) continue;
    const table = header[1];
    const open = statement.indexOf("(");
    const close = statement.lastIndexOf(")");
    if (open < 0 || close <= open) continue;

    const existing = new Set(getTableColumns(database, table));
    if (!existing.size) continue;

    const body = statement.slice(open + 1, close);
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim().replace(/,$/, "").trim();
      if (!line || /^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK)\b/i.test(line)) continue;

      const match = line.match(/^["\`]?([A-Za-z_][A-Za-z0-9_]*)["\`]?\s+(.+)$/);
      if (!match) continue;

      const name = match[1];
      let definition = match[2];
      if (existing.has(name)) continue;

      // Avoid non-additive definitions that SQLite cannot safely append.
      if (/\bPRIMARY\s+KEY\b|\bUNIQUE\b|\bGENERATED\s+ALWAYS\b/i.test(definition)) continue;
      if (/\bNOT\s+NULL\b/i.test(definition) && !/\bDEFAULT\b/i.test(definition)) continue;
      if (/\bDEFAULT\s+(CURRENT_TIME|CURRENT_DATE|CURRENT_TIMESTAMP)\b/i.test(definition)) continue;
      if (/\bREFERENCES\b/i.test(definition) && !/\bDEFAULT\b/i.test(definition)) definition += " DEFAULT NULL";

      try {
        database.exec("ALTER TABLE \"" + table + "\" ADD COLUMN \"" + name + "\" " + definition + ";");
        existing.add(name);
        console.info("[db] Legacy schema repaired: " + table + "." + name);
      } catch (error: any) {
        const message = String(error?.message || "");
        if (!/duplicate column|already exists/i.test(message)) {
          console.error("[db] Legacy schema repair failed: " + table + "." + name + ":", message.slice(0, 200));
        }
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
  // Authentication is required by local signup/login. Older local databases or
  // protected schema bundles may predate the auth table, so repair it before
  // any auth query runs. This is additive and does not alter existing users.
  database.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      session_version INTEGER NOT NULL DEFAULT 0,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      password_changed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Accounting posting rules are consulted by POS/Restaurant checkout before
  // falling back to the standard chart-of-accounts codes. Older local/desktop
  // databases may predate this table, so create it compatibly at startup.
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounting_posting_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT,
      rule_key TEXT NOT NULL,
      debit_account_id TEXT,
      credit_account_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, company_id, rule_key)
    );
    CREATE INDEX IF NOT EXISTS idx_accounting_posting_rules_user
      ON accounting_posting_rules(user_id, company_id, rule_key, active);
  `);
  // Butchery extension compatibility: repair older/local databases even if the\n  // SQL migration was already recorded before the tables were introduced.\n  database.exec(`\n    CREATE TABLE IF NOT EXISTS butchery_products (\n      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, item_id TEXT NOT NULL,\n      animal_type TEXT NOT NULL DEFAULT 'beef', cut_name TEXT, grade TEXT,\n      unit TEXT NOT NULL DEFAULT 'kg', price_per_kg REAL NOT NULL DEFAULT 0,\n      min_price_per_kg REAL NOT NULL DEFAULT 0, scale_enabled INTEGER NOT NULL DEFAULT 1,\n      label_enabled INTEGER NOT NULL DEFAULT 1, is_active INTEGER NOT NULL DEFAULT 1,\n      updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(user_id,item_id)\n    );\n    CREATE TABLE IF NOT EXISTS butchery_scale_devices (\n      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, manufacturer TEXT,\n      model TEXT, connection_type TEXT NOT NULL DEFAULT 'web_serial', port TEXT,\n      baud_rate INTEGER NOT NULL DEFAULT 9600, unit TEXT NOT NULL DEFAULT 'kg',\n      decimal_places INTEGER NOT NULL DEFAULT 3, is_active INTEGER NOT NULL DEFAULT 1,\n      last_weight REAL, last_stable INTEGER NOT NULL DEFAULT 0,\n      updated_at TEXT NOT NULL DEFAULT (datetime('now'))\n    );\n    CREATE TABLE IF NOT EXISTS butchery_processing_batches (\n      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, reference TEXT NOT NULL,\n      source_item_id TEXT, input_qty REAL NOT NULL DEFAULT 0, input_unit TEXT NOT NULL DEFAULT 'kg',\n      input_cost REAL NOT NULL DEFAULT 0, saleable_qty REAL NOT NULL DEFAULT 0,\n      waste_qty REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft',\n      processed_at TEXT, notes TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now'))\n    );\n    CREATE TABLE IF NOT EXISTS butchery_yield_lines (\n      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, batch_id TEXT NOT NULL, output_item_id TEXT,\n      output_name TEXT NOT NULL, output_qty REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'kg',\n      yield_percent REAL NOT NULL DEFAULT 0, note TEXT\n    );\n    CREATE INDEX IF NOT EXISTS idx_butchery_products_user ON butchery_products(user_id,is_active);\n    CREATE INDEX IF NOT EXISTS idx_butchery_scales_user ON butchery_scale_devices(user_id,is_active);\n    CREATE INDEX IF NOT EXISTS idx_butchery_batches_user ON butchery_processing_batches(user_id,processed_at);\n  `);\n\n  // Warehouse records existed in some desktop builds without the columns
  // required by the current warehouse UI. Create the table first, then add
  // missing columns safely for existing databases.
  // Inventory schema safety: older portable databases may not contain these tables.
  // Only create missing structures; existing tables/columns are preserved.
  database.exec(`CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT,
    item_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL,
    reference TEXT,
    note TEXT,
    location_id TEXT,
    transaction_date TEXT,
    source_type TEXT,
    source_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_stock_movements_user_item ON stock_movements(user_id,item_id);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON stock_movements(user_id,location_id);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(user_id,reference);
  `);
  database.exec(`CREATE TABLE IF NOT EXISTS goods_receipts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT,
    po_number TEXT,
    receipt_date TEXT NOT NULL DEFAULT (date('now')),
    warehouse_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    currency TEXT NOT NULL DEFAULT 'ZMW',
    total REAL NOT NULL DEFAULT 0,
    reference TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);

  database.exec(`CREATE TABLE IF NOT EXISTS inventory_locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT,
    warehouse_id TEXT,
    branch_id TEXT,
    code TEXT,
    name TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'store',
    address TEXT,
    notes TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS item_unit_conversions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    multiplier REAL NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_item_unit_conversions_lookup
    ON item_unit_conversions(user_id,item_id,from_unit,to_unit,is_active);
  CREATE TABLE IF NOT EXISTS item_unit_conversion_audit (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    conversion_id TEXT,
    action TEXT NOT NULL,
    from_unit TEXT,
    to_unit TEXT,
    multiplier REAL,
    actor_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  try {
    database.prepare("UPDATE stock_items SET base_unit=COALESCE(NULLIF(unit,''),'each') WHERE base_unit='each' AND COALESCE(NULLIF(unit,''),'each') <> 'each'").run();
    database.prepare("UPDATE stock_items SET sales_unit=COALESCE(sales_unit,unit) WHERE sales_unit IS NULL").run();
  } catch {}
  
  const inventoryLocationColumns = getTableColumns(database, "inventory_locations");
  if (!inventoryLocationColumns.includes("branch_id")) {
    database.exec("ALTER TABLE inventory_locations ADD COLUMN branch_id TEXT;");
  }
  database.exec(`
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_user ON inventory_locations(user_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_warehouse ON inventory_locations(user_id,warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_branch ON inventory_locations(user_id,branch_id);
  `);

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
  const warehouseColumns = getTableColumns(database, "warehouses");
  if (!warehouseColumns.includes("branch_id")) {
    database.exec("ALTER TABLE warehouses ADD COLUMN branch_id TEXT;");
  }
  database.exec(`CREATE INDEX IF NOT EXISTS idx_warehouses_user ON warehouses(user_id);`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON warehouses(branch_id);`);

  const migrations: Record<string, string[]> = {
    // bank_running_balance view reads bt.status; without it every PRAGMA/
    // query touching that view fails with "no such column: bt.status".
    bank_transactions: [
      "status TEXT",
    ],
    companies: [
      "payslip_footer TEXT",
    ],
    company_members: [
      "role TEXT NOT NULL DEFAULT 'staff'",
    ],
    stock_items: [
      "barcode TEXT",
      "base_unit TEXT",
      "sales_unit TEXT",
      "purchase_unit TEXT",
      "track_stock INTEGER NOT NULL DEFAULT 1",
      "category TEXT",
      "item_type TEXT",
      "bin TEXT",
      "reserved_qty REAL NOT NULL DEFAULT 0",
      "reserved_stock REAL NOT NULL DEFAULT 0",
      "on_order_qty REAL NOT NULL DEFAULT 0",
      "safety_stock REAL NOT NULL DEFAULT 0",
      "max_stock REAL NOT NULL DEFAULT 0",
      "is_active INTEGER NOT NULL DEFAULT 1",
      "needs_cost_review INTEGER NOT NULL DEFAULT 0",
      "needs_unit_verification INTEGER NOT NULL DEFAULT 0",
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
      // Idempotent restaurant checkout reference used by the atomic POS
      // checkout engine. NULL keeps legacy/manual orders fully compatible.
      "client_ref TEXT",
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
    employee_pos_permissions: [
      "cashier_code TEXT",
      "display_name TEXT",
      "pin_set_at TEXT",
      "pin_disabled INTEGER NOT NULL DEFAULT 0",
      "branch_id TEXT",
      "location_id TEXT",
      "register_id TEXT",
      "drawer_name TEXT",
      "failed_pin_attempts INTEGER NOT NULL DEFAULT 0",
      "pin_locked_until TEXT",
      "last_pin_login_at TEXT",
    ],
    invoice_items: [
      "discount_amount REAL NOT NULL DEFAULT 0",
      "discount_type TEXT NOT NULL DEFAULT 'amount'",
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
    pos_registers: [
      "location_id TEXT",
      "created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    ],
    pos_shifts: [
      "location_id TEXT",
      "branch_id TEXT",
      "cash_sales REAL NOT NULL DEFAULT 0",
      "card_sales REAL NOT NULL DEFAULT 0",
      "momo_sales REAL NOT NULL DEFAULT 0",
      "other_sales REAL NOT NULL DEFAULT 0",
      "drawer_name TEXT",
      "station TEXT",
      "manager_comment TEXT",
      "review_status TEXT",
      "reviewed_at TEXT",
      "reviewed_by TEXT",
      "submitted_at TEXT",
      "cash_denominations TEXT",
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

  // account_balances must only count POSTED journal lines. The original view
  // LEFT JOINed journal_entries with the status filter in the ON clause, so
  // draft/void lines were still summed. Views hold no data: safe to recreate.
  try {
    database.exec(`DROP VIEW IF EXISTS "account_balances";
CREATE VIEW "account_balances" AS
SELECT a.user_id, a.id AS account_id, a.account_code, a.account_name, a.account_type,
  COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.debit END), 0) AS total_debit,
  COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.credit END), 0) AS total_credit,
  CASE WHEN a.account_type IN ('asset','expense','cogs')
    THEN COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.debit END),0)-COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.credit END),0)
    ELSE COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.credit END),0)-COALESCE(SUM(CASE WHEN je.id IS NOT NULL THEN jl.debit END),0) END AS balance,
  COUNT(je.id) AS entry_count
FROM chart_of_accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.entry_id AND je.status='posted'
GROUP BY a.user_id, a.id, a.account_code, a.account_name, a.account_type;`);
  } catch (error: any) { console.error("[db] account_balances view:", String(error?.message).slice(0, 160)); }

  // Cloud schema parity: screens query the same columns on Windows as on the
  // web. Add any column the cloud table has but the local one lacks, as a
  // NULLABLE column with no default (additive only: never drops, renames,
  // retypes or tightens anything, and never creates tables).
  for (const [table, cols] of Object.entries(cloudColumns as Record<string, Record<string, string>>)) {
    const existing = getTableColumns(database, table);
    if (!existing.length) continue;
    const have = new Set(existing);
    for (const [name, type] of Object.entries(cols)) {
      if (have.has(name)) continue;
      try { database.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${type};`); }
      catch (error: any) {
        if (!/duplicate column/i.test(String(error?.message))) console.error(`[db] parity column ${table}.${name}:`, String(error?.message).slice(0, 160));
      }
    }
  }
}

function getTableColumns(database: Database, table: string): string[] {
  return (database.prepare(`PRAGMA table_info("${table}")`).all() as any[]).map((row) => String(row.name));
}


/** Read-only schema status for startup checks. Never applies or changes anything. */
export function getSchemaStatus(): { schemaVersion: string | null; appliedCount: number; pendingMigrations: string[] } {
  const database = getDb();
  let applied: string[] = [];
  try {
    applied = (database.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as any[]).map((r) => String(r.id));
  } catch { applied = []; }
  const known = new Set<string>();
  const protectedMigrations = path.join(process.cwd(), ".sifobooks-migrations.bin");
  if (fs.existsSync(protectedMigrations)) {
    try { for (const e of JSON.parse(zlib.gunzipSync(fs.readFileSync(protectedMigrations)).toString("utf8"))) known.add(e.name); } catch { /* reported via pending */ }
  }
  const dir = [path.join(process.cwd(), "src", "lib", "db", "migrations"), path.join(process.cwd(), "migrations")].find((c) => fs.existsSync(c));
  if (dir) for (const n of fs.readdirSync(dir)) if (/^\d+_.*\.sql$/.test(n)) known.add(n);
  const appliedSet = new Set(applied);
  const pendingMigrations = [...known].filter((n) => !appliedSet.has(n)).sort();
  return { schemaVersion: applied.length ? applied[applied.length - 1] : null, appliedCount: applied.length, pendingMigrations };
}

function runSqlMigrations(database: Database) {
  database.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  );
  const protectedMigrations = path.join(process.cwd(), ".sifobooks-migrations.bin");
  let bundled: { name: string; sql: string }[] = [];
  if (fs.existsSync(protectedMigrations)) {
    try { bundled = JSON.parse(zlib.gunzipSync(fs.readFileSync(protectedMigrations)).toString("utf8")); }
    catch (error) { console.error("[db] Protected migration bundle could not be opened:", error); throw error; }
  }
  const candidates = [path.join(process.cwd(), "src", "lib", "db", "migrations"), path.join(process.cwd(), "migrations")];
  const dir = candidates.find((candidate) => fs.existsSync(candidate));
  if (!dir && bundled.length === 0) return;
  const applied = new Set(
    (database.prepare("SELECT id FROM schema_migrations").all() as any[]).map((row) => String(row.id)),
  );
  // A protected migration bundle may predate source migrations added later.
  // Always merge both sources so an existing portable database receives newly
  // added compatibility columns instead of remaining on the old bundle.
  const sourceEntries = dir
    ? fs.readdirSync(dir).filter((name) => /^\d+_.*\.sql$/.test(name)).sort()
      .map((name) => ({ name, sql: fs.readFileSync(path.join(dir!, name), "utf8") }))
    : [];
  const bundledEntries = bundled.map((entry) => ({ name: entry.name, sql: entry.sql }));
  const migrationMap = new Map<string, string>();
  for (const entry of [...bundledEntries, ...sourceEntries]) migrationMap.set(entry.name, entry.sql);
  const files = [...migrationMap.keys()].sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = migrationMap.get(file) || "";
    const statements = splitSqlStatements(sql);
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
