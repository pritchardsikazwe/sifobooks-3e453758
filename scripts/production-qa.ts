/** SifoBooks production readiness QA gate. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

type Check = { area: string; name: string; ok: boolean; detail: string };
const checks: Check[] = [];
const root = process.cwd();
const file = (path: string) => join(root, path);
function add(area: string, name: string, ok: boolean, detail: string) { checks.push({ area, name, ok, detail }); }
function requireFile(area: string, path: string) { const ok = existsSync(file(path)); add(area, path, ok, ok ? "present" : "missing"); }
function requireText(area: string, path: string, needles: string[]) {
  if (!existsSync(file(path))) { add(area, path, false, "missing"); return; }
  const source = readFileSync(file(path), "utf8");
  const missing = needles.filter((needle) => !source.includes(needle));
  add(area, path, missing.length === 0, missing.length ? "missing: " + missing.join(", ") : "required markers present");
}

const editions = ["enterprise", "accounting", "retail", "restaurant", "hotel", "school"];
requireText("Build", "scripts/build-desktop.ts", editions);
requireText("Build", ".github/workflows/ci.yml", editions);
requireText("Build", "package.json", ["build:desktop", "test", "qa:production"]);

const core = ["dashboard.tsx","companies.tsx","chart-of-accounts.tsx","customers.tsx","suppliers.tsx","invoices.tsx","bills.tsx","journal-entries.tsx","posting-centre.tsx","audit-logs.tsx","reconciliation.tsx","pos.tsx","payroll.tsx","compliance.tsx","zra-smart-invoice.tsx","network-setup.tsx"];
for (const route of core) requireFile("Core workflows", "src/routes/_authenticated/" + route);
const reports = ["reports.trial-balance.tsx","reports.general-ledger.tsx","reports.pnl.tsx","reports.balance-sheet.tsx","reports.vat-return.tsx","reports.bank-reconciliation.tsx","reports.inventory-valuation.tsx","reports.stock-reconciliation.tsx","reports.pos-integrity.tsx","reports.payroll-summary.tsx"];
for (const route of reports) requireFile("Reports", "src/routes/_authenticated/" + route);

const editionRoutes: Record<string,string[]> = {
 retail:["retail-control-center.tsx","retail-shift-control.tsx","pos.retail-command-center.tsx","inventory.reconciliation.tsx","stock-counts.tsx"],
 restaurant:["restaurant.tsx","restaurant.pos.tsx","restaurant.orders.tsx","restaurant.kitchen.tsx","restaurant.tables.tsx","restaurant.end-of-day.tsx","restaurant.reports.tsx"],
 hotel:["hotel.tsx","hotel/booking.tsx","hotel/front-desk.tsx","hotel/check-in-out.tsx","hotel/folios.tsx","hotel/housekeeping.tsx","hotel/night-audit.tsx","hotel/reports.tsx"],
 school:["school.tsx","school/students.tsx","school/admissions.tsx","school/attendance.tsx","school/fees.tsx","school/exams.tsx","school/report-cards.tsx","school/parent-portal.tsx"]
};
for (const entry of Object.entries(editionRoutes)) for (const route of entry[1]) requireFile("Edition: " + entry[0], "src/routes/_authenticated/" + route);

for (const path of ["src/lib/demo-seed.ts","src/lib/demo/index.ts","src/lib/demo/hotel.ts","src/lib/demo/school.ts","src/lib/demo/restaurant.ts","src/lib/demo/payroll.ts"]) requireFile("Demo", path);
requireText("Demo","src/routes/_authenticated/demo-centre.tsx",["SifoDemo Enterprise Ltd","SifoDemo Accounting Services","SifoRetail Demo Store","SifoRestaurant Demo","SifoHotel Demo Lodge","SifoSchool Demo Academy","workflowChecks"]);

for (const path of ["src/lib/licensing.ts","src/routes/license.tsx","scripts/license-issue.ts","scripts/license-keygen.ts","docs/LICENSING-SELLING.md"]) requireFile("Licensing", path);
requireText("Licensing","src/lib/licensing.ts",["verifyLicenseToken","getDeviceFingerprint","storeLicense","issueLicense","SifoBooksLicense"]);

for (const path of ["desktop/network.example.json","desktop/NETWORK-3-POS-GUIDE.txt","src/routes/_authenticated/network-setup.tsx"]) requireFile("LAN/ZRA", path);
requireText("LAN/ZRA","src/desktop/server.ts",["/api/network/info","/api/network/config","SIFOBOOKS_MODE","network.json"]);
requireText("LAN/ZRA","src/lib/db/migrations/20260922130000_network_pos_zra_stations.sql",["CREATE TABLE IF NOT EXISTS pos_stations","CREATE TABLE IF NOT EXISTS pos_station_events","CREATE TABLE IF NOT EXISTS fiscal_station_transactions"]);

requireFile("Branding","public/favicon.ico");
requireText("Branding","scripts/build-desktop.ts",["SifoBooks.ico","README-FIRST.txt","license-public-key.pem"]);

const forbidden = ["base" + "44.app","@" + "base44/"];
const violations: string[] = [];
function walk(dir: string): string[] {
  const out: string[] = []; if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir,{withFileTypes:true})) { const path=join(dir,entry.name); if(entry.isDirectory()) out.push(...walk(path)); else out.push(path); }
  return out;
}
for (const rootDir of ["src","scripts"]) for (const path of walk(file(rootDir))) {
  if(path.endsWith("production-qa.ts") || path.endsWith("standalone-check.ts") || !/\.(ts|tsx|js|mjs|cjs|json|yaml|yml)$/.test(path)) continue;
  const source=readFileSync(path,"utf8").toLowerCase(); for(const marker of forbidden) if(source.includes(marker.toLowerCase())) violations.push(path.replaceAll("\\","/")+": "+marker);
}
add("Standalone","No Base44 runtime markers",violations.length===0,violations.length?violations.join("; "):"clean");

const buildScript=readFileSync(file("scripts/build-desktop.ts"),"utf8");
const networkWrites=(buildScript.match(/network\.example\.json/g)||[]).length;
const launcherWrites=(buildScript.match(/start-sifobooks\.bat/g)||[]).length;
add("Windows packaging","Single network template writer",networkWrites===1,String(networkWrites)+" occurrence(s)");
add("Windows packaging","Launcher references are bounded",launcherWrites===2,String(launcherWrites)+" occurrence(s)");
add("Windows packaging","No orphan launcher array",!/\}\);\s*\n\s*"@echo off"/.test(buildScript),"launcher block structure is valid");

const privateKeyFiles=existsSync(file("config"))?walk(file("config")).filter((p)=>/private.*key|license.*private/i.test(p)):[];
add("Licensing security","No private signing key in repository config",privateKeyFiles.length===0,privateKeyFiles.length?privateKeyFiles.join(", "):"clean");

const failed=checks.filter((c)=>!c.ok);
const grouped=new Map<string,Check[]>();
for(const check of checks){const list=grouped.get(check.area)||[];list.push(check);grouped.set(check.area,list);}
console.log("\nSIFOBOOKS PRODUCTION QA\n========================");
for(const [area,list] of grouped){console.log("\n["+area+"]");for(const check of list) console.log((check.ok?"PASS":"FAIL")+"  "+check.name+" — "+check.detail);}
console.log("\nRESULT: "+(failed.length?"FAILED":"PASSED")+" ("+(checks.length-failed.length)+"/"+checks.length+" checks passed)");
if(failed.length) process.exit(1);