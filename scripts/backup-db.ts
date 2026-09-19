import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";

const source = resolve(process.env.DATABASE_PATH || "data/sifobooks.db");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = resolve(process.argv[2] || ("backups/sifobooks-" + timestamp + ".db"));

await mkdir(dirname(destination), { recursive: true });

const db = new Database(source);
try {
  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
} finally {
  db.close();
}

await Bun.write(destination, await Bun.file(source).arrayBuffer());
console.log("SQLite backup created: " + destination);
