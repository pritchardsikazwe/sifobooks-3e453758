// VAT Return + Turnover Tax regression test on BOTH engines with identical
// throwaway data: Windows (SQLite, query-executor.ts) and the self-hosted
// cloud engine (PostgreSQL via PGlite, cloud-query-executor.ts).
// Run: NODE_PATH=/tmp/pgl/node_modules bun scripts/tax-report-qa.ts
// @ts-nocheck
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { PGlite } from "@electric-sql/pglite";

const dbPath = join(process.cwd(), "data", "tax-report-qa.sqlite");
process.env.DATABASE_PATH = dbPath;
process.env.SIFOBOOKS_MODE = "offline";
mkdirSync(join(process.cwd(), "data"), { recursive: true });
if (existsSync(dbPath)) rmSync(dbPath);

const { getDb } = await import("../src/lib/db/database");
const { executeQuery } = await import("../src/lib/db/query-executor");
const { executeCloudQueryInTransaction, __setCloudSchemaDbForTests } = await import("../src/lib/db/cloud-query-executor");
const T = await import("../src/lib/tax-reports");

const U1 = "11111111-1111-1111-1111-111111111111", U2 = "22222222-2222-2222-2222-222222222222";
const uid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const customers = [{ id: uid(1), user_id: U1, name: "Cust A" }, { id: uid(2), user_id: U2, name: "Other" }];
const suppliers = [{ id: uid(3), user_id: U1, name: "Supp A" }];
const invoices = [
  // September 2026 (user 1)
  { id: uid(11), user_id: U1, customer_id: uid(1), number: "INV-1", issue_date: "2026-09-03", status: "sent", subtotal: 1000, vat_amount: 160, total: 1160 },
  { id: uid(12), user_id: U1, customer_id: uid(1), number: "INV-2", issue_date: "2026-09-10", status: "paid", subtotal: 500, vat_amount: 0, total: 500 },
  { id: uid(13), user_id: U1, customer_id: uid(1), number: "INV-3", issue_date: "2026-09-15", status: "draft", subtotal: 9999, vat_amount: 1599.84, total: 11598.84 },
  { id: uid(14), user_id: U1, customer_id: uid(1), number: "INV-4", issue_date: "2026-09-20", status: "voided", subtotal: 800, vat_amount: 128, total: 928 },
  // October 2026 (user 1)
  { id: uid(15), user_id: U1, customer_id: uid(1), number: "INV-5", issue_date: "2026-10-01", status: "sent", subtotal: 200, vat_amount: 32, total: 232 },
  // September 2026 (another user/company) — must never appear for user 1
  { id: uid(16), user_id: U2, customer_id: uid(2), number: "X-1", issue_date: "2026-09-05", status: "sent", subtotal: 7000, vat_amount: 1120, total: 8120 },
];
const bills = [
  { id: uid(21), user_id: U1, supplier_id: uid(3), bill_number: "B-1", bill_date: "2026-09-04", status: "approved", subtotal: 300, tax_amount: 48, total: 348 },
  { id: uid(22), user_id: U1, supplier_id: uid(3), bill_number: "B-2", bill_date: "2026-09-12", status: "draft", subtotal: 400, tax_amount: 64, total: 464 },
  { id: uid(23), user_id: U1, supplier_id: uid(3), bill_number: "B-3", bill_date: "2026-10-02", status: "approved", subtotal: 100, tax_amount: 16, total: 116 },
];

// ---- seed Windows (SQLite)
const sdb = getDb();
const ins = (table: string, rows: any[]) => {
  const cols = new Set((sdb.prepare(`PRAGMA table_info("${table}")`).all() as any[]).map((c) => c.name));
  for (const r of rows) {
    const rec: any = { ...r };
    for (const c of ["due_date"]) if (cols.has(c) && !rec[c]) rec[c] = rec.issue_date ?? rec.bill_date;
    const k = Object.keys(rec).filter((x) => cols.has(x));
    sdb.prepare(`INSERT INTO "${table}" (${k.map((x) => `"${x}"`).join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map((x) => rec[x]));
  }
};
ins("customers", customers); ins("suppliers", suppliers); ins("invoices", invoices); ins("bills", bills);

// ---- seed self-hosted cloud (PostgreSQL)
const pg = new PGlite();
const pdb = { unsafe: async (sql: string, p: any[] = []) => (await pg.query(sql, p)).rows };
__setCloudSchemaDbForTests(pdb);
await pg.exec(`
CREATE TABLE customers(id uuid PRIMARY KEY, user_id uuid, name text);
CREATE TABLE suppliers(id uuid PRIMARY KEY, user_id uuid, name text);
CREATE TABLE invoices(id uuid PRIMARY KEY, user_id uuid, customer_id uuid REFERENCES customers(id), number text, issue_date date, status text, subtotal numeric, vat_amount numeric, total numeric);
CREATE TABLE bills(id uuid PRIMARY KEY, user_id uuid, supplier_id uuid REFERENCES suppliers(id), bill_number text, bill_date date, status text, subtotal numeric, tax_amount numeric, total numeric);`);
for (const [t, rows] of [["customers", customers], ["suppliers", suppliers], ["invoices", invoices], ["bills", bills]] as const)
  for (const r of rows) { const k = Object.keys(r); await pg.query(`INSERT INTO ${t}(${k.join(",")}) VALUES (${k.map((_, i) => "$" + (i + 1)).join(",")})`, k.map((x) => r[x])); }

// ---- tiny Supabase-style client capturing the report's exact query
function client(run: (spec: any) => Promise<any>) {
  return { from(table: string) {
    const spec: any = { table, operation: "select", columns: "*", filters: [], order: [], limit: null, range: null, single: false, maybeSingle: false };
    const b: any = {
      select(c: string) { spec.columns = c; return b; },
      gte(c: string, v: any) { spec.filters.push({ column: c, op: "gte", value: v }); return b; },
      lte(c: string, v: any) { spec.filters.push({ column: c, op: "lte", value: v }); return b; },
      neq(c: string, v: any) { spec.filters.push({ column: c, op: "neq", value: v }); return b; },
      order(c: string, o: any) { spec.order.push({ column: c, ascending: o?.ascending !== false }); return b; },
      then(res: any, rej: any) { return run(spec).then(res, rej); },
    };
    return b;
  } };
}
const winClient = (u: string) => client(async (s) => executeQuery(s, u));
const cloudClient = (u: string) => client(async (s) => executeCloudQueryInTransaction(pdb, s, u, "t"));

const range = (m: string) => { const [y, mo] = m.split("-").map(Number); return { from: `${m}-01`, to: new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10) }; };
async function reports(db: any, month: string) {
  const { from, to } = range(month);
  const [i, b, t] = await Promise.all([T.vatInvoicesQuery(db, from, to), T.vatBillsQuery(db, from, to), T.totInvoicesQuery(db, from, to)]);
  for (const x of [i, b, t]) if (x.error) throw new Error(x.error.message);
  return { vat: T.computeVatReturn(i.data, b.data), tot: T.computeTurnoverTax(t.data, month), refs: i.data.filter(T.isCountable).map((r: any) => `${r.number}/${r.customers?.name}`).sort() };
}

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info?: any) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + JSON.stringify(info)}`); };

for (const [label, mk] of [["Windows", winClient], ["Cloud", cloudClient]] as const) {
  const sep = await reports(mk(U1), "2026-09");
  check(`${label} VAT Sep: excludes draft+voided, output 160 / zero-rated 500 / input 48 / net 112`,
    sep.vat.salesStandardNet === 1000 && sep.vat.salesStandardVat === 160 && sep.vat.salesZeroRatedNet === 500 && sep.vat.purchasesNet === 300 && sep.vat.purchasesVat === 48 && sep.vat.netVat === 112 && sep.vat.invoiceCount === 2 && sep.vat.billCount === 1, sep.vat);
  check(`${label} TOT Sep: turnover 1660, tax 83, due 2026-10-14`, sep.tot.turnover === 1660 && sep.tot.tax === 83 && sep.tot.dueDate === "2026-10-14", sep.tot);
  check(`${label} customer names resolved on invoices`, JSON.stringify(sep.refs) === JSON.stringify(["INV-1/Cust A", "INV-2/Cust A"]), sep.refs);
  const oct = await reports(mk(U1), "2026-10");
  check(`${label} VAT Oct (second period): output 32, input 16, net 16`, oct.vat.salesStandardVat === 32 && oct.vat.purchasesVat === 16 && oct.vat.netVat === 16, oct.vat);
  check(`${label} TOT Oct: turnover 232, tax 11.6`, oct.tot.turnover === 232 && oct.tot.tax === 11.6, oct.tot);
  const dec = await reports(mk(U1), "2026-12");
  check(`${label} empty period: all zero, TOT due 2027-01-14`, dec.vat.netVat === 0 && dec.vat.invoiceCount === 0 && dec.tot.turnover === 0 && dec.tot.dueDate === "2027-01-14", dec);
  const other = await reports(mk(U2), "2026-09");
  check(`${label} company isolation: other company sees only its own 1120 VAT`, other.vat.salesStandardVat === 1120 && other.vat.invoiceCount === 1 && other.vat.purchasesVat === 0, other.vat);
}
const w = await reports(winClient(U1), "2026-09"), c = await reports(cloudClient(U1), "2026-09");
check("Cloud and Windows return identical results for the same data", JSON.stringify(w) === JSON.stringify(c), { w, c });

sdb.close(); rmSync(dbPath, { force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
