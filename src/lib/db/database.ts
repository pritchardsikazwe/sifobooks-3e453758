import { Database } from "bun:sqlite";
import { readFileSync, mkdirSync } from "fs";
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
  }
  return db;
}

function initSchema(database: Database) {
  const schemaPath = join(import.meta.dir, "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
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
