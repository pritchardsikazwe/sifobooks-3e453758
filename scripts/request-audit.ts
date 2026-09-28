// Full data-request audit: extracts every `.from("table").select("columns")`
// request in the app and runs it against a fresh throwaway Windows database.
// Requests for screens hidden by ModuleGate (inactive modules) are reported
// separately and are NOT counted as passing.
// Run: bun scripts/request-audit.ts
// @ts-nocheck
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { join } from "path";

const dbPath = join(process.cwd(), "data", "request-audit.sqlite");
process.env.DATABASE_PATH = dbPath; process.env.SIFOBOOKS_MODE = "offline";
mkdirSync(join(process.cwd(), "data"), { recursive: true });
if (existsSync(dbPath)) rmSync(dbPath);
const { getDb } = await import("../src/lib/db/database");
const { executeQuery } = await import("../src/lib/db/query-executor");
getDb();

const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f) && !/routeTree|\.server\.|lib\/db\//.test(p)) files.push(p); } };
walk("src");

// Tables behind ModuleGate (from src/components/ModuleGate usages) = intentionally unavailable where missing.
const gated = new Set<string>();
const reqs = new Map<string, { table: string; columns: string; files: Set<string> }>();
for (const f of files) {
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/tables=\{(\[[^\]]*\])\}/g)) for (const t of m[1].matchAll(/["'](\w+)["']/g)) gated.add(t[1]);
  for (const m of s.matchAll(/SCHOOL_SCREEN_TABLES[\s\S]*?\];/g)) for (const t of m[0].matchAll(/"(\w+_\w+|\w+s)"/g)) gated.add(t[1]);
  for (const m of s.matchAll(/\.from\(\s*["'`](\w+)["'`]\s*\)\s*\.select\(\s*(["'`])([\s\S]*?)\2/g)) {
    if (m[3].includes("${")) continue;
    const cols = m[3].replace(/\s+/g, " ").trim();
    const k = `${m[1]}|${cols}`;
    if (!reqs.has(k)) reqs.set(k, { table: m[1], columns: cols, files: new Set() });
    reqs.get(k)!.files.add(f.replace("src/", ""));
  }
}

const U = "11111111-1111-1111-1111-111111111111";
let pass = 0; const hidden: string[] = []; const defects: string[] = [];
for (const r of reqs.values()) {
  let err: string | null = null;
  try {
    const res = executeQuery({ table: r.table, operation: "select", columns: r.columns, filters: [], order: [], limit: 1, range: null, single: false, maybeSingle: false }, U);
    if (res.error) err = String(res.error.message ?? res.error);
  } catch (e) { err = String(e?.message ?? e); }
  if (!err) { pass++; continue; }
  const line = `${r.table} [${r.columns.slice(0, 90)}] — ${err.slice(0, 120)} — ${[...r.files].slice(0, 2).join(", ")}`;
  if (gated.has(r.table)) hidden.push(line); else defects.push(line);
}
console.log(`TOTAL ${reqs.size}\nPASS ${pass}\nFAIL ${reqs.size - pass}\n  intentionally hidden (inactive module): ${hidden.length}\n  genuine defects: ${defects.length}`);
console.log("\n--- hidden ---\n" + hidden.join("\n"));
console.log("\n--- genuine defects ---\n" + defects.join("\n"));
getDb().close(); rmSync(dbPath, { force: true });
