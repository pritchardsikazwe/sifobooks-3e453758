import { SQL } from "bun";

let client: SQL | null = null;

function getUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
}

export function isCloudDatabaseConfigured() {
  const url = getUrl();
  return Boolean(url && !url.startsWith("sqlite:") && !url.startsWith("file:"));
}

export function getCloudDb() {
  if (!isCloudDatabaseConfigured()) throw new Error("CLOUD_DATABASE_NOT_CONFIGURED: Set POSTGRES_URL for SifoBooks Cloud.");
  if (!client) {
    client = new SQL({
      url: getUrl(),
      adapter: "postgres",
      max: Number(process.env.POSTGRES_POOL_MAX || 10),
      idleTimeout: Number(process.env.POSTGRES_IDLE_TIMEOUT || 30),
      connectionTimeout: Number(process.env.POSTGRES_CONNECTION_TIMEOUT || 10),
      tls: process.env.POSTGRES_TLS === "false" ? "disable" : "require",
    });
  }
  return client;
}

export async function cloudDbHealth() {
  const db = getCloudDb();
  const rows = await db`SELECT now() AS server_time`;
  return { ok: true, serverTime: rows[0]?.server_time ?? null };
}
