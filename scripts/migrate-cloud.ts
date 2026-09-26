import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const migrationsDir = join(process.cwd(), "cloud", "migrations");
const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

if (!url || url.startsWith("sqlite:") || url.startsWith("file:")) {
  throw new Error("Cloud migration requires POSTGRES_URL pointing to PostgreSQL.");
}

const sql = postgres(url, {
  max: 1,
  idle_timeout: Number(process.env.POSTGRES_IDLE_TIMEOUT || 30),
  connect_timeout: Number(process.env.POSTGRES_CONNECTION_TIMEOUT || 10),
  ssl: process.env.POSTGRES_TLS === "false" ? false : "require",
});

try {
  await sql`
    CREATE TABLE IF NOT EXISTS sifobooks_schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(migrationsDir))
    .filter((file) => /^\\d+_.*\\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const version = file.split("_", 1)[0];
    const existing = await sql`
      SELECT 1 FROM sifobooks_schema_migrations WHERE version = ${version}
    `;

    if (existing.length) {
      console.log(`SKIP ${file}`);
      continue;
    }

    console.log(`APPLY ${file}`);
    const migration = await readFile(join(migrationsDir, file), "utf8");

    await sql.begin(async (tx) => {
      await tx.unsafe(migration);
      await tx`
        INSERT INTO sifobooks_schema_migrations (version)
        VALUES (${version})
      `;
    });
  }

  console.log(`Cloud migrations complete: ${files.length} migration file(s) checked.`);
} finally {
  await sql.end({ timeout: 5 });
}
