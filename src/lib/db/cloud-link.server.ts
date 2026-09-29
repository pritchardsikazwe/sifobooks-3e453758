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
  | { status: "ok"; userId: string; email: string; accessToken: string; refreshToken?: string; expiresAt?: number }
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
    if (res.ok && body?.access_token) return { status: "ok", userId: body.user.id, email: body.user.email, accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: body.expires_at };
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

  // 2. Read only what cloud security lets this user see. Each stage is logged;
  //    a failure names the stage and nothing is written locally (step 3 runs
  //    only after every read succeeded, inside one transaction).
  const t = cloud.accessToken;
  const stage = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    try { const v = await fn(); console.log(`[cloud-link] stage ok: ${name}`); return v; }
    catch (e: any) {
      console.error(`[cloud-link] stage FAILED: ${name}: ${String(e?.message || e).slice(0, 200)}`);
      throw new Error(`Cloud → Windows transfer failed at stage "${name}": ${e?.message || e}`);
    }
  };
  const profile = (await stage("profile", () => cloudGet(t, `profiles?select=*&id=eq.${cloud.userId}`)))[0];
  const members = await stage("company members", () => cloudGet(t, `company_members?select=*&user_id=eq.${cloud.userId}`));
  const owned = await stage("companies", () => cloudGet(t, `companies?select=*`));
  const companyIds = Array.from(new Set([...members.map((m) => m.company_id), ...owned.map((c) => c.id)].filter(Boolean)));
  const data: Record<string, any[]> = { companies: owned, company_members: members };
  if (companyIds.length) {
    const f = `company_id=${inList(companyIds)}`;
    data.branches = await stage("branches", () => cloudGet(t, `branches?select=*&${f}`));
    data.warehouses = await stage("warehouses", () => cloudGet(t, `warehouses?select=*&${f}`));
    data.inventory_locations = await stage("stock locations", () => cloudGet(t, `inventory_locations?select=*&${f}`));
  }

  // 3. Write atomically, parents first, same ids. Any error rolls back all rows.
  const counts: Record<string, number> = {};
  try {
    db.transaction(() => {
      if (profile) upsertRows(db, "profiles", [{ ...profile, id: localUserId, email }], mapUser);
      else if (!db.prepare("SELECT 1 FROM profiles WHERE id=?").get(localUserId))
        db.prepare("INSERT INTO profiles (id,email,full_name,onboarded,created_at,updated_at) VALUES (?,?,?,?,datetime('now'),datetime('now'))")
          .run(localUserId, email, email, companyIds.length ? 1 : 0);
      for (const table of TABLES) counts[table] = upsertRows(db, table, data[table] ?? [], mapUser);
    })();
  } catch (e: any) {
    console.error(`[cloud-link] stage FAILED: save to this PC (rolled back): ${String(e?.message || e).slice(0, 200)}`);
    throw new Error(`Cloud → Windows transfer failed at stage "save to this PC" (nothing saved): ${e?.message || e}`);
  }

  saveCloudSession(localUserId, cloud);
  console.log(`[cloud-link] ${email} linked: ${JSON.stringify(counts)}`);
  return { localUserId, companyIds, counts };
}

// ── Cloud write-through for company structure ──────────────────────────────
// While a Windows user is cloud-linked and online, company/branch/warehouse
// records are created in SifoBooks Cloud FIRST (same id, the user's own cloud
// session, cloud security applies) and only then copied into SQLite. Offline
// (cloud unreachable) falls back to a local-only write, logged explicitly.
export const WRITE_THROUGH_TABLES = new Set(["companies", "company_members", "branches", "warehouses", "inventory_locations"]);

function ensureLinkTable(db: any) {
  db.exec("CREATE TABLE IF NOT EXISTS cloud_links (local_user_id TEXT PRIMARY KEY, cloud_user_id TEXT NOT NULL, access_token TEXT, refresh_token TEXT, expires_at INTEGER, updated_at TEXT DEFAULT (datetime('now')))");
}

function saveCloudSession(localUserId: string, c: any) {
  const db = getDb();
  ensureLinkTable(db);
  db.prepare("INSERT INTO cloud_links (local_user_id,cloud_user_id,access_token,refresh_token,expires_at,updated_at) VALUES (?,?,?,?,?,datetime('now')) ON CONFLICT(local_user_id) DO UPDATE SET cloud_user_id=excluded.cloud_user_id,access_token=excluded.access_token,refresh_token=COALESCE(excluded.refresh_token,cloud_links.refresh_token),expires_at=excluded.expires_at,updated_at=datetime('now')")
    .run(localUserId, c.userId, c.accessToken, c.refreshToken ?? null, c.expiresAt ?? null);
}

async function cloudSessionFor(localUserId: string) {
  const db = getDb();
  ensureLinkTable(db);
  const row: any = db.prepare("SELECT * FROM cloud_links WHERE local_user_id=?").get(localUserId);
  if (!row) return null;
  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at && row.expires_at - 60 > now) return row;
  const cfg = cloudConfig();
  if (!cfg || !row.refresh_token) return row;
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST", headers: { apikey: cfg.key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: row.refresh_token }), signal: AbortSignal.timeout(10000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body?.access_token) throw Object.assign(new Error("SifoBooks Cloud session expired — please sign out and sign in again."), { auth: true });
  saveCloudSession(localUserId, { userId: row.cloud_user_id, accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: body.expires_at });
  return { ...row, access_token: body.access_token };
}

type WriteResult = { status: "cloud"; rows: any[] } | { status: "offline"; reason: string } | { status: "not-linked" } | { status: "error"; message: string };

/** Push an insert/update to SifoBooks Cloud. Returns cloud rows (same ids). */
export async function cloudWriteThrough(localUserId: string, spec: any): Promise<WriteResult> {
  const cfg = cloudConfig();
  if (!cfg) return { status: "not-linked" };
  let link: any;
  try { link = await cloudSessionFor(localUserId); } catch (e: any) {
    if (e?.auth) return { status: "error", message: e.message };
    return { status: "offline", reason: String(e?.message || e) };
  }
  if (!link) return { status: "not-linked" };
  const toCloud = (v: any) => (v === localUserId ? link.cloud_user_id : v);
  const mapRow = (r: any) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, toCloud(v)]));
  let path = `${cfg.url}/rest/v1/${spec.table}`;
  let method = "POST";
  let payload: any;
  const headers: any = { apikey: cfg.key, Authorization: `Bearer ${link.access_token}`, "Content-Type": "application/json", Prefer: "return=representation" };
  if (spec.operation === "insert") {
    const rows = (Array.isArray(spec.insertData) ? spec.insertData : [spec.insertData]).map((r: any) => ({ ...r, id: r.id || crypto.randomUUID() }));
    spec.insertData = Array.isArray(spec.insertData) ? rows : rows[0]; // keep ids identical locally
    payload = rows.map(mapRow);
    if (spec.onConflict) { headers.Prefer += ",resolution=merge-duplicates"; path += `?on_conflict=${spec.onConflict}`; }
  } else if (spec.operation === "update") {
    if (!spec.filters?.length || spec.filters.some((f: any) => f.op !== "eq")) return { status: "not-linked" };
    method = "PATCH";
    payload = mapRow(spec.updateData || {});
    path += "?" + spec.filters.map((f: any) => `${f.column}=eq.${encodeURIComponent(String(toCloud(f.value)))}`).join("&");
  } else return { status: "not-linked" };

  for (let attempt = 0; attempt < 15; attempt++) {
    let res: Response;
    try {
      res = await fetch(path, { method, headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    } catch (e: any) {
      return { status: "offline", reason: String(e?.message || e) };
    }
    const body: any = await res.json().catch(() => null);
    if (res.ok) return { status: "cloud", rows: Array.isArray(body) ? body : [] };
    // Local-only column the cloud doesn't have: drop it and retry.
    const m = body?.code === "PGRST204" && /'([^']+)' column/.exec(body?.message || "");
    if (m) {
      const col = m[1];
      if (Array.isArray(payload)) payload = payload.map((r: any) => { const { [col]: _, ...rest } = r; return rest; });
      else { const { [col]: _, ...rest } = payload; payload = rest; }
      continue;
    }
    if (res.status >= 500) return { status: "offline", reason: `HTTP ${res.status}` };
    return { status: "error", message: `SifoBooks Cloud rejected ${spec.table}: ${body?.message || "HTTP " + res.status}` };
  }
  return { status: "error", message: `SifoBooks Cloud rejected ${spec.table}` };
}
