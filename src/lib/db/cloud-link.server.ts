// @ts-nocheck -- Windows-only (local SQLite) cloud account linking; see AGENTS.md
// Signs a Windows user in against SifoBooks Cloud and mirrors the user's EXISTING
// companies, branches, warehouses and locations into local SQLite using the SAME
// ids. Never creates a company. Foreign keys stay enforced: missing parents are
// either linked (auth_users stub) or the reference is nulled/row skipped.
import { getDb } from "./database";

const TABLES = ["companies", "company_members", "branches", "warehouses", "inventory_locations"] as const;

function cloudConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url: String(url).replace(/\/$/, ""), key: String(key) } : null;
}

export type CloudSignIn =
  | { status: "ok"; userId: string; email: string; accessToken: string }
  | { status: "invalid" }
  | { status: "unavailable"; reason: string };

export async function cloudSignIn(email: string, password: string): Promise<CloudSignIn> {
  const cfg = cloudConfig();
  if (!cfg) return { status: "unavailable", reason: "cloud not configured" };
  try {
    const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: cfg.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000),
    });
    const body: any = await res.json().catch(() => ({}));
    if (res.ok && body?.access_token) return { status: "ok", userId: body.user.id, email: body.user.email, accessToken: body.access_token };
    if (res.status === 400 || res.status === 401) return { status: "invalid" };
    return { status: "unavailable", reason: `HTTP ${res.status}` };
  } catch (e: any) {
    return { status: "unavailable", reason: String(e?.message || e) };
  }
}

async function cloudGet(token: string, path: string): Promise<any[]> {
  const cfg = cloudConfig()!;
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Cloud read failed (${path.split("?")[0]}): HTTP ${res.status}`);
  return res.json();
}

const inList = (ids: string[]) => `in.(${ids.map((i) => `"${i}"`).join(",")})`;

function columnsOf(db: any, table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; notnull: number; pk: number }[];
}
function tableExists(db: any, table: string) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
}
function toSqlite(v: any) {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return v;
}

function ensureAuthStub(db: any, id: string) {
  if (db.prepare("SELECT 1 FROM auth_users WHERE id=?").get(id)) return;
  // Linked cloud identity with an unusable password (cannot sign in locally).
  db.prepare("INSERT OR IGNORE INTO auth_users (id,email,password_hash) VALUES (?,?,?)")
    .run(id, `cloud-${id}@linked.sifobooks.local`, "!cloud-linked");
}

function upsertRows(db: any, table: string, rows: any[], mapUser: (v: any) => any) {
  if (!tableExists(db, table) || !rows.length) return 0;
  const cols = columnsOf(db, table);
  const names = new Set(cols.map((c) => c.name));
  const fks = db.prepare(`PRAGMA foreign_key_list(${table})`).all() as { table: string; from: string; to: string }[];
  let n = 0;
  for (const raw of rows) {
    const row: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) if (names.has(k)) row[k] = toSqlite(mapUser(v));
    let skip = false;
    for (const fk of fks) {
      const val = row[fk.from];
      if (val == null) continue;
      const exists = db.prepare(`SELECT 1 FROM ${fk.table} WHERE ${fk.to || "id"}=?`).get(val);
      if (exists) continue;
      if (fk.table === "auth_users") { ensureAuthStub(db, val); continue; }
      const col = cols.find((c) => c.name === fk.from);
      if (col && !col.notnull) row[fk.from] = null; else { skip = true; break; }
    }
    if (skip || !row.id) continue;
    const keys = Object.keys(row);
    if (db.prepare(`SELECT 1 FROM ${table} WHERE id=?`).get(row.id)) {
      const set = keys.filter((k) => k !== "id");
      if (set.length) db.prepare(`UPDATE ${table} SET ${set.map((k) => `${k}=?`).join(",")} WHERE id=?`).run(...set.map((k) => row[k]), row.id);
    } else {
      db.prepare(`INSERT OR IGNORE INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).run(...keys.map((k) => row[k]));
    }
    n++;
  }
  return n;
}

/**
 * Mirrors the signed-in cloud user and their existing companies into SQLite.
 * Returns the LOCAL user id to issue a session for.
 */
export async function linkCloudAccount(cloud: { userId: string; email: string; accessToken: string }, password: string) {
  const db = getDb();
  const email = cloud.email.trim().toLowerCase();
  const hash = await Bun.password.hash(password);

  // 1. Local identity: reuse the cloud user id; if this email already exists
  //    locally with another id, keep that local id and map the cloud id onto it.
  const existing = db.prepare("SELECT id FROM auth_users WHERE lower(email)=?").get(email) as any;
  let localUserId = cloud.userId;
  if (existing) {
    localUserId = existing.id;
    db.prepare("UPDATE auth_users SET password_hash=? WHERE id=?").run(hash, localUserId);
  } else {
    db.prepare("INSERT INTO auth_users (id,email,password_hash) VALUES (?,?,?)").run(localUserId, email, hash);
  }
  const mapUser = (v: any) => (v === cloud.userId ? localUserId : v);

  // 2. Read only what cloud security lets this user see.
  const t = cloud.accessToken;
  const profile = (await cloudGet(t, `profiles?select=*&id=eq.${cloud.userId}`))[0];
  const members = await cloudGet(t, `company_members?select=*&user_id=eq.${cloud.userId}`);
  const owned = await cloudGet(t, `companies?select=*`);
  const companyIds = Array.from(new Set([...members.map((m) => m.company_id), ...owned.map((c) => c.id)].filter(Boolean)));
  const data: Record<string, any[]> = { companies: owned, company_members: members };
  if (companyIds.length) {
    const f = `company_id=${inList(companyIds)}`;
    data.branches = await cloudGet(t, `branches?select=*&${f}`);
    data.warehouses = await cloudGet(t, `warehouses?select=*&${f}`).catch(() => []);
    data.inventory_locations = await cloudGet(t, `inventory_locations?select=*&${f}`).catch(() => []);
  }

  // 3. Write atomically, parents first, same ids.
  const counts: Record<string, number> = {};
  db.transaction(() => {
    if (profile) upsertRows(db, "profiles", [{ ...profile, id: localUserId, email }], mapUser);
    else if (!db.prepare("SELECT 1 FROM profiles WHERE id=?").get(localUserId))
      db.prepare("INSERT INTO profiles (id,email,full_name,onboarded,created_at,updated_at) VALUES (?,?,?,?,datetime('now'),datetime('now'))")
        .run(localUserId, email, email, companyIds.length ? 1 : 0);
    for (const table of TABLES) counts[table] = upsertRows(db, table, data[table] ?? [], mapUser);
  })();

  console.log(`[cloud-link] ${email} linked: ${JSON.stringify(counts)}`);
  return { localUserId, companyIds, counts };
}
