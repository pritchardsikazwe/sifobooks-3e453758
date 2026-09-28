// Self-hosted cloud (PostgreSQL) query engine regression test — throwaway
// in-memory Postgres (PGlite), never a real database.
// Run: NODE_PATH=/tmp/pgl/node_modules bun scripts/cloud-named-link-qa.ts
// @ts-nocheck
import { PGlite } from "@electric-sql/pglite";
import { executeCloudQueryInTransaction, __setCloudSchemaDbForTests } from "../src/lib/db/cloud-query-executor";

const pg = new PGlite();
const db = { unsafe: async (sql: string, params: any[] = []) => (await pg.query(sql, params)).rows };
__setCloudSchemaDbForTests(db);

const U1 = "11111111-1111-1111-1111-111111111111", U2 = "22222222-2222-2222-2222-222222222222";
await pg.exec(`
CREATE TABLE companies(id uuid PRIMARY KEY, user_id uuid, name text, status text);
CREATE TABLE branches(id uuid PRIMARY KEY, user_id uuid, company_id uuid NOT NULL REFERENCES companies(id), name text, status text);
CREATE TABLE warehouses(id uuid PRIMARY KEY, user_id uuid, company_id uuid REFERENCES companies(id), branch_id uuid REFERENCES branches(id), name text, status text, created_at timestamptz DEFAULT now());
CREATE TABLE customers(id uuid PRIMARY KEY, user_id uuid, company_id uuid, name text);
CREATE TABLE invoices(id uuid PRIMARY KEY, user_id uuid, customer_id uuid REFERENCES customers(id), number text, issue_date date, status text, total numeric);
CREATE TABLE invoice_items(id uuid PRIMARY KEY, user_id uuid, invoice_id uuid REFERENCES invoices(id), description text, line_total numeric);
CREATE TABLE chart_of_accounts(id uuid PRIMARY KEY, user_id uuid, account_code text, account_name text);
CREATE TABLE journal_entries(id uuid PRIMARY KEY, user_id uuid, entry_number text, status text);
CREATE TABLE journal_lines(id uuid PRIMARY KEY, user_id uuid, entry_id uuid REFERENCES journal_entries(id), account_id uuid REFERENCES chart_of_accounts(id), debit numeric, credit numeric);
`);
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
await pg.exec(`
INSERT INTO companies VALUES ('${id(1)}','${U1}','Test Co A','active'),('${id(2)}','${U2}','Other Co','active');
INSERT INTO branches VALUES ('${id(11)}','${U1}','${id(1)}','Main','active'),('${id(12)}','${U2}','${id(2)}','Theirs','active');
INSERT INTO warehouses(id,user_id,company_id,branch_id,name,status) VALUES ('${id(21)}','${U1}','${id(1)}','${id(11)}','WH A','active'),('${id(22)}','${U2}','${id(2)}','${id(12)}','WH B','active');
INSERT INTO customers VALUES ('${id(31)}','${U1}','${id(1)}','Cust A');
INSERT INTO invoices VALUES ('${id(41)}','${U1}','${id(31)}','INV-1','2026-09-01','sent',100),('${id(42)}','${U1}',NULL,'INV-2','2026-09-02','sent',50);
INSERT INTO invoice_items VALUES ('${id(51)}','${U1}','${id(41)}','a',60),('${id(52)}','${U1}','${id(41)}','b',40);
INSERT INTO chart_of_accounts VALUES ('${id(61)}','${U1}','1000','Bank');
INSERT INTO journal_entries VALUES ('${id(71)}','${U1}','JE-1','posted');
INSERT INTO journal_lines VALUES ('${id(81)}','${U1}','${id(71)}','${id(61)}',100,0);
`);

const q = (table: string, columns: string, extra: any = {}, uid = U1) => executeCloudQueryInTransaction(db,
  { table, operation: "select", columns, filters: [], order: [], limit: null, range: null, single: false, maybeSingle: false, ...extra }, uid, "t");
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info?: any) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + JSON.stringify(info)}`); };

let r = await q("warehouses", "id,name,branch_id,branches(name),companies(name)", { filters: [{ column: "company_id", op: "eq", value: id(1) }, { column: "status", op: "eq", value: "active" }] });
check("1 warehouse with branch filtered by company (shared user_id/company_id/status/name not ambiguous)", !r.error && r.data.length === 1 && r.data[0].branches?.name === "Main" && r.data[0].companies?.name === "Test Co A", r);
r = await q("invoices", "id,number,customer:customer_id(name)", { order: [{ column: "number", ascending: true }] });
check("2 customer on invoice via named link", !r.error && r.data[0].customer?.name === "Cust A" && r.data[1].customer === null, r);
r = await q("invoices", "id,number,invoice_items(description,line_total)", { filters: [{ column: "id", op: "eq", value: id(41) }] });
check("3 invoice with two lines appears once", !r.error && r.data.length === 1 && r.data[0].invoice_items.length === 2, r);
r = await q("journal_lines", "id,debit,account:account_id(account_code,account_name),journal_entries!inner(entry_number,status)");
check("4 journal lines with account and entry (!inner)", !r.error && r.data[0].account?.account_code === "1000" && r.data[0].journal_entries?.entry_number === "JE-1", r);
r = await q("invoice_items", "id,invoices(number,customers(name))", { order: [{ column: "description", ascending: true }] });
check("5 nested links", !r.error && r.data[0].invoices?.customers?.name === "Cust A", r);
r = await q("invoices", "id", { count: "exact", limit: 1 });
check("6 counts (exact count ignores page size)", !r.error && r.count === 2 && r.data.length === 1, r);
r = await q("invoices", "id,customers!inner(name)");
check("must-have-match filter drops invoice without customer", !r.error && r.data.length === 1, r);
r = await q("invoices", "id,number", { order: [{ column: "number", ascending: false }], range: [1, 1] });
check("sorting + pagination", !r.error && r.data.length === 1 && r.data[0].number === "INV-1", r);
r = await q("warehouses", "id,branches(name)", {}, U2);
check("8 another user sees only own rows", !r.error && r.data.length === 1 && r.data[0].branches?.name === "Theirs", r);
r = await q("warehouses", "id,branches(name)", { filters: [{ column: "id", op: "eq", value: id(21) }] }, U2);
check("company isolation: other user cannot read company A warehouse", !r.error && r.data.length === 0, r);
await pg.exec(`UPDATE warehouses SET branch_id='${id(12)}' WHERE id='${id(22)}'`);
await pg.exec(`INSERT INTO warehouses(id,user_id,company_id,branch_id,name,status) VALUES ('${id(23)}','${U1}','${id(1)}','${id(12)}','cross-link probe','active')`);
r = await q("warehouses", "id,branches(name)", { filters: [{ column: "id", op: "eq", value: id(23) }] });
check("linked record from another user is never embedded", !r.error && r.data[0].branches === null, r);
r = await q("branches", "id,name", { filters: [{ column: "company_id", op: "eq", value: id(1) }] });
check("branch filter by company", !r.error && r.data.length === 1, r);
let threw = false; try { await pg.exec(`INSERT INTO branches VALUES ('${id(13)}','${U1}',NULL,'orphan','active')`); } catch { threw = true; }
check("9 no branch without a company", threw);
r = await q("warehouses", "id,name", { filters: [{ column: "or", op: "or", value: "name.eq.WH A,name.eq.nope" }] });
check("or filter qualified", !r.error && r.data.length === 1, r);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
