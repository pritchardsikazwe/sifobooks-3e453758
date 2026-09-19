import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve(process.argv[2] || "");
const destination = resolve(process.env.DATABASE_PATH || "data/sifobooks.db");

if (!source) {
  console.error("Usage: bun run scripts/restore-db.ts <backup-file>");
  process.exit(1);
}

const sourceFile = Bun.file(source);
if (!(await sourceFile.exists())) {
  console.error("Backup not found: " + source);
  process.exit(1);
}

await mkdir(dirname(destination), { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const safetyCopy = destination + ".before-restore-" + stamp;

if (await Bun.file(destination).exists()) {
  await Bun.write(safetyCopy, await Bun.file(destination).arrayBuffer());
  console.log("Existing database preserved at: " + safetyCopy);
}

await Bun.write(destination, await sourceFile.arrayBuffer());
console.log("SQLite database restored to: " + destination);
