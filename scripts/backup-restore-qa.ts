import { Database } from "bun:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

const root = await mkdtemp(join(process.cwd(), ".qa-backup-"));
const dbPath = join(root, "data", "sifobooks.db");
const backupPath = join(root, "backups", "qa-backup.db");
const restoredPath = join(root, "restored.db");
await Bun.write(join(root, "placeholder"), "qa");
await Bun.write(dbPath, "");
await Bun.write(join(root, "data", ".keep"), "");

const run = async (args: string[], env: Record<string,string>) => {
  const proc = Bun.spawn(["bun", ...args], { cwd: process.cwd(), env: { ...process.env, ...env }, stdout:"pipe", stderr:"pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error("Command failed: bun " + args.join(" ") + "\n" + out + "\n" + err);
  return out;
};

try {
  const db = new Database(dbPath);
  db.exec("PRAGMA foreign_keys=ON;");
  db.exec(Bun.file("src/lib/db/schema.sql").text ? await Bun.file("src/lib/db/schema.sql").text() : "");
  const marker = "BACKUP-QA-" + crypto.randomUUID();
  const user = "backup-qa-user";
  db.query("INSERT INTO companies (id,user_id,name,base_currency) VALUES (?,?,?,?)").run("backup-qa-company",user,marker,"ZMW");
  db.close();

  const backupOutput = await run(["run","scripts/backup-db.ts",backupPath], { DATABASE_PATH: dbPath });
  const backupExists = await Bun.file(backupPath).exists();
  if (!backupExists) throw new Error("Backup file was not created");
  console.log("PASS  BACKUP CREATED");

  const sourceDb = new Database(dbPath);
  sourceDb.query("UPDATE companies SET name=? WHERE id=?").run("CHANGED-AFTER-BACKUP","backup-qa-company");
  sourceDb.close();

  const restoreOutput = await run(["run","scripts/restore-db.ts",backupPath], { DATABASE_PATH: restoredPath });
  const restored = new Database(restoredPath);
  const row:any = restored.query("SELECT name,base_currency FROM companies WHERE id=?").get("backup-qa-company");
  if (!row || row.name !== marker || row.base_currency !== "ZMW") throw new Error("Restored data does not match backup");
  restored.close();
  console.log("PASS  RESTORE ROUND-TRIP");

  const safetyPath = restoredPath + ".before-restore-" ;
  // Restore script must preserve an existing destination.
  const target = new Database(restoredPath);
  target.query("UPDATE companies SET name=? WHERE id=?").run("CURRENT-DATA","backup-qa-company");
  target.close();
  const before = await run(["run","scripts/restore-db.ts",backupPath], { DATABASE_PATH: restoredPath });
  const files = await Array.fromAsync(new Bun.Glob("restored.db.before-restore-*").scan({ cwd: root }));
  if (files.length === 0) throw new Error("Restore did not create a safety copy");
  const restoredAgain = new Database(restoredPath);
  const final:any = restoredAgain.query("SELECT name FROM companies WHERE id=?").get("backup-qa-company");
  restoredAgain.close();
  if (final.name !== marker) throw new Error("Second restore did not restore original backup contents");
  console.log("PASS  RESTORE SAFETY COPY");

  // Schema integrity check: required accounting/control tables exist.
  const check = new Database(restoredPath);
  const required = ["companies","invoices","journal_entries","journal_lines","audit_logs","stock_items","stock_movements","pos_sales","pos_payments"];
  for (const table of required) {
    const found:any = check.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!found) throw new Error("Required table missing after restore: " + table);
  }
  check.close();
  console.log("PASS  SCHEMA INTEGRITY AFTER RESTORE");
  console.log("BACKUP/RESTORE QA: PASSED");
} finally {
  await rm(root,{recursive:true,force:true});
}
