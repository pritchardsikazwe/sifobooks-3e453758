// Cloud → Windows transfer regression test on a throwaway SQLite database
// with a simulated SifoBooks Cloud (fetch is mocked; no real account/data).
// Run: bun scripts/cloud-transfer-qa.ts
// @ts-nocheck
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const dbPath = join(process.cwd(), "data", "cloud-transfer-qa.sqlite");
process.env.DATABASE_PATH = dbPath; process.env.SIFOBOOKS_MODE = "offline";
process.env.VITE_SUPABASE_URL = "https://cloud.test.invalid"; process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "test-key";
mkdirSync(join(process.cwd(), "data"), { recursive: true });
for (const s of ["", "-wal", "-shm"]) if (existsSync(dbPath + s)) rmSync(dbPath + s);

const U1 = "a1111111-1111-1111-1111-111111111111", U2 = "b2222222-2222-2222-2222-222222222222";
const C1 = "c1111111-1111-1111-1111-111111111111", B1 = "d1111111-1111-1111-1111-111111111111", W1 = "e1111111-1111-1111-1111-111111111111";
const C2 = "c2222222-2222-2222-2222-222222222222", B2 = "d2222222-2222-2222-2222-222222222222", W2 = "e2222222-2222-2222-2222-222222222222";
const cloud: Record<string, Record<string, any[]>> = {
  [U1]: {
    profiles: [{ id: U1, email: "qa1@test.invalid", full_name: "QA One" }],
    company_members: [{ id: "f1111111-1111-1111-1111-111111111111", company_id: C1, user_id: U1, role: "owner" }],
    companies: [{ id: C1, user_id: U1, name: "QA Test Co", base_currency: "ZMW", country: "Zambia" }],
    branches: [{ id: B1, user_id: U1, company_id: C1, name: "QA Main", code: "HQ" }],
    warehouses: [{ id: W1, user_id: U1, company_id: C1, branch_id: B1, name: "QA Warehouse", status: "active" }],
    inventory_locations: [],
  },
  [U2]: {
    profiles: [{ id: U2, email: "qa2@test.invalid" }],
    company_members: [{ id: "f2222222-2222-2222-2222-222222222222", company_id: C2, user_id: U2, role: "owner" }],
    companies: [{ id: C2, user_id: U2, name: "QA Other Co" }],
    branches: [{ id: B2, user_id: U2, company_id: C2, name: "Other Main" }],
    warehouses: [{ id: W2, user_id: U2, company_id: C2, branch_id: B2, name: "Other WH", status: "active" }],
    inventory_locations: [],
  },
};
let failTable: string | null = null;
globalThis.fetch = (async (url: string, init: any) => {
  const token = String(init?.headers?.Authorization ?? "").replace("Bearer ", "");
  const table = String(url).split("/rest/v1/")[1]?.split("?")[0];
  if (table === failTable) return new Response("boom", { status: 500 });
  return new Response(JSON.stringify(cloud[token]?.[table] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
}) as any;

const { getDb } = await import("../src/lib/db/database");
const { executeQuery } = await import("../src/lib/db/query-executor");
const { linkCloudAccount } = await import("../src/lib/db/cloud-link.server");
const db = getDb();
const count = (t: string, w = "1=1", p: any[] = []) => (db.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).get(...p) as any).n;
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info?: any) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + JSON.stringify(info)}`); };
const link = (u: string, email: string) => linkCloudAccount({ userId: u, email, accessToken: u }, "not-a-real-password");

await link(U1, "qa1@test.invalid");
const w = db.prepare("SELECT id, company_id, branch_id FROM warehouses WHERE id=?").get(W1) as any;
check("12 Cloud → Windows transfer: warehouse same id, company and branch", w?.company_id === C1 && w?.branch_id === B1, w);
check("12 company + branch imported with cloud ids", count("companies", "id=?", [C1]) === 1 && count("branches", "id=? AND company_id=?", [B1, C1]) === 1);
const scr = executeQuery({ table: "warehouses", operation: "select", columns: "*, branches(name)", filters: [{ column: "company_id", op: "eq", value: C1 }], order: [], limit: null, range: null, single: false, maybeSingle: false }, U1);
check("12 warehouse shows on the Warehouses screen request", !scr.error && scr.data.length === 1 && scr.data[0].branches?.name === "QA Main", scr);

await link(U1, "qa1@test.invalid");
check("13 repeated transfer: no duplicates", count("companies") === 1 && count("branches") === 1 && count("warehouses") === 1 && count("company_members") === 1,
  { c: count("companies"), b: count("branches"), w: count("warehouses"), m: count("company_members") });

failTable = "warehouses";
let msg = ""; try { await link(U2, "qa2@test.invalid"); } catch (e) { msg = String(e.message); }
check("14 simulated failure names the stage", msg.includes('stage "warehouses"'), msg);
check("14 failed transfer leaves no partial company/branch", count("companies", "id=?", [C2]) === 0 && count("branches", "id=?", [B2]) === 0);
failTable = null;
await link(U2, "qa2@test.invalid");

const sel = (t: string, u: string, f: any[] = []) => executeQuery({ table: t, operation: "select", columns: "id", filters: f, order: [], limit: null, range: null, single: false, maybeSingle: false }, u).data?.length ?? -1;
check("16 company isolation: user 1 cannot read user 2's company", sel("companies", U1, [{ column: "id", op: "eq", value: C2 }]) === 0 && sel("companies", U2) === 1);
check("17 branch isolation", sel("branches", U1, [{ column: "id", op: "eq", value: B2 }]) === 0 && sel("branches", U1) === 1);
check("18 warehouse isolation", sel("warehouses", U2, [{ column: "id", op: "eq", value: W1 }]) === 0 && sel("warehouses", U2) === 1);

db.close();
// 15 restart on the existing database (fresh process opens the same file)
const proc = Bun.spawnSync(["bun", "-e", `process.env.DATABASE_PATH=${JSON.stringify(dbPath)};process.env.SIFOBOOKS_MODE="offline";const {getDb}=await import("./src/lib/db/database");const d=getDb();console.log(JSON.stringify(d.prepare("SELECT (SELECT count(*) FROM companies) c,(SELECT count(*) FROM warehouses) w").get()));`], { cwd: process.cwd() });
const out = proc.stdout.toString().trim().split("\n").pop();
check("15 restart on existing database keeps data (2 companies, 2 warehouses)", out === '{"c":2,"w":2}', { out, err: proc.stderr.toString().slice(-300) });

for (const s of ["", "-wal", "-shm"]) rmSync(dbPath + s, { force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
