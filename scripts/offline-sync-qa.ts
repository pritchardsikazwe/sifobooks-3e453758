// Isolated offline-sale sync QA. Uses an in-memory browser store and a MOCK
// server in a temp JSON file — never touches the cloud or any real company.
// Usage: bun scripts/offline-sync-qa.ts <deviceName> <stateFile>
import "fake-indexeddb/auto";
import { mock } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "fs";

const [device = "DEVICE-A", stateFile = "/tmp/sifo-offline-qa.json"] = process.argv.slice(2);
const TEST_COMPANY = "qa-isolated-test-company";
let online = false;
let insertCalls = 0;
const load = () => (existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { sales: [] });
const save = (s: any) => writeFileSync(stateFile, JSON.stringify(s));

const mockClient = {
  auth: { getUser: async () => ({ data: { user: null } }) },
  rpc: async () => ({ data: null, error: { message: "not used" } }),
  from: (_t: string) => ({
    insert: (row: any) => ({ select: () => ({ maybeSingle: async () => {
      insertCalls++;
      if (!online) return { data: null, error: { message: "Failed to fetch" } };
      const s = load();
      if (s.sales.some((r: any) => r.reference === row.reference)) return { data: null, error: { message: "duplicate key value violates unique constraint" } };
      const rec = { id: `srv_${s.sales.length + 1}`, ...row }; s.sales.push(rec); save(s);
      return { data: { id: rec.id }, error: null };
    } }) }),
    select: () => ({ eq: (f: string, v: string) => ({ limit: async () => ({ data: load().sales.filter((r: any) => r[f] === v), error: null }) }) }),
  }),
};
mock.module("@/integrations/supabase/client", () => ({ supabase: mockClient }));
Object.defineProperty(globalThis, "navigator", { value: { get onLine() { return online; } }, configurable: true });

const q = await import("@/lib/offline-queue");
const check = (name: string, pass: boolean, extra = "") => { console.log(`${pass ? "PASS" : "FAIL"} [${device}] ${name} ${extra}`); if (!pass) process.exitCode = 1; };

const reference = `QA-${device}-${Date.now()}`;
const sale = { company_id: TEST_COMPANY, reference, total: 125.5, customer_name: "QA Walk-in (test)" };

// 1. offline sale stored locally + pending
await q.queueInsert("sales_invoices", sale);
let items = await q.listQueue();
check("offline sale stored locally", items.length === 1 && items[0].payload.reference === reference);
check("sale is pending in sync queue", items[0].status === "pending");
let r = await q.drainQueue();
check("no sync attempt while offline", r.ok === 0 && insertCalls === 0);

// 2. internet restored -> syncs exactly once
online = true;
r = await q.drainQueue();
const onServer = () => load().sales.filter((s: any) => s.reference === reference).length;
check("synced after reconnect", r.ok === 1 && (await q.countQueue()) === 0);
check("stored on server exactly once", onServer() === 1);
r = await q.drainQueue();
check("repeat sync does nothing", r.ok === 0 && onServer() === 1);

// 3. duplicate submission (retry of a write the server already accepted)
await q.queueInsert("sales_invoices", sale);
items = await q.listQueue(); items[0].attempts = 1; // simulate "response lost, retrying"
const { withStore, idbReq, QUEUE_STORE } = await import("@/lib/offline-db");
await withStore(QUEUE_STORE, "readwrite", (s: any) => idbReq(s.put(items[0])));
const before = insertCalls;
r = await q.drainQueue();
check("duplicate resubmission prevented", onServer() === 1 && insertCalls === before && (await q.countQueue()) === 0);

const stats: any = await q.queueStats();
check("sync status successful (0 pending, 0 failed)", Number(stats.pending ?? 0) === 0 && Number(stats.failed ?? 0) === 0);
console.log(`[${device}] server now holds ${load().sales.filter((s: any) => s.company_id === TEST_COMPANY).length} test sale(s) for ${TEST_COMPANY}`);
