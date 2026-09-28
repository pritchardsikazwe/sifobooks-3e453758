// @ts-nocheck -- loosely typed after local-database port; see AGENTS.md
import { getCloudDb } from "@/lib/cloud/postgres";
import { JOIN_MAP } from "./join-map";
import type { Filter, QuerySpec, QueryResult } from "./query-executor";

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const columnsCache = new Map<string, Set<string>>();

function assertIdentifier(value: string) {
  if (!identifier.test(value)) throw new Error("INVALID_DATABASE_IDENTIFIER");
  return value;
}

let schemaDbOverride: any = null; // tests only: schema lookups use this connection
export function __setCloudSchemaDbForTests(db: any) { schemaDbOverride = db; columnsCache.clear(); fkCache.clear(); }
async function getCloudColumns(table: string): Promise<Set<string>> {
  if (!identifier.test(table)) return new Set();
  const cached = columnsCache.get(table);
  if (cached) return cached;
  const db = schemaDbOverride ?? getCloudDb();
  const rows = await db.unsafe("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table]);
  const set = new Set(rows.map((r: any) => String(r.column_name)));
  columnsCache.set(table, set);
  return set;
}

function pushParam(params: any[], value: any) {
  params.push(value);
  return "$" + params.length;
}

function buildWhere(filters: Filter[], params: any[], table?: string) {
  const parts: string[] = [];
  for (const f of filters) {
    assertIdentifier(f.column);
    // Qualify with the main table so joined tables sharing user_id/company_id/
    // status etc. can never make the filter ambiguous.
    const col = table ? `"${table}"."${f.column}"` : `"${f.column}"`;
    switch (f.op) {
      case "eq":
        parts.push(`${col} = ${pushParam(params, f.value)}`); break;
      case "neq":
      case "not.eq":
        parts.push(`${col} <> ${pushParam(params, f.value)}`); break;
      case "gt": parts.push(`${col} > ${pushParam(params, f.value)}`); break;
      case "gte": parts.push(`${col} >= ${pushParam(params, f.value)}`); break;
      case "lt": parts.push(`${col} < ${pushParam(params, f.value)}`); break;
      case "lte": parts.push(`${col} <= ${pushParam(params, f.value)}`); break;
      case "is": parts.push(f.value === null ? `${col} IS NULL` : `${col} IS NOT NULL`); break;
      case "like": parts.push(`${col} LIKE ${pushParam(params, f.value)}`); break;
      case "ilike": parts.push(`${col} ILIKE ${pushParam(params, f.value)}`); break;
      case "not.like": parts.push(`${col} NOT LIKE ${pushParam(params, f.value)}`); break;
      case "in":
      case "not.in": {
        const values = Array.isArray(f.value) ? f.value : [];
        if (!values.length) { parts.push(f.op === "in" ? "FALSE" : "TRUE"); break; }
        const placeholders = values.map(v => pushParam(params, v)).join(",");
        parts.push(`${col} ${f.op === "in" ? "IN" : "NOT IN"} (${placeholders})`);
        break;
      }
      case "or": {
        const sub: Filter[] = [];
        for (const piece of String(f.value).split(",")) {
          const m = piece.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.*)$/);
          if (!m) continue;
          const v = m[2] === "is" ? (m[3] === "null" ? null : m[3]) : m[3].replace(/\*/g, "%");
          sub.push({ column: m[1], op: m[2] as any, value: v });
        }
        if (sub.length) parts.push("(" + sub.map((x) => buildWhere([x], params, table).replace(/^ WHERE /, "")).join(" OR ") + ")");
        break;
      }
      default:
        throw new Error(`UNSUPPORTED_FILTER_OPERATOR: ${f.op}`);
    }
  }
  return parts.length ? " WHERE " + parts.join(" AND ") : "";
}

// Embeds ("customers(name)", "customer:customer_id(name)", "journal_entries!inner(id)",
// nested embeds) are resolved as correlated JSON sub-queries — never JOINs —
// exactly like the Windows engine (query-executor.ts). Main-table columns can
// never become ambiguous and one-to-many embeds never repeat parent rows.
type Embed = { key: string; name: string; hint: string | null; inner: boolean; columns: string };

function splitTop(spec: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of spec) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

export function parseColumns(spec: string): { columns: string[]; joins: Embed[] } {
  const columns: string[] = [];
  const joins: Embed[] = [];
  for (const part of splitTop(spec || "*")) {
    const m = part.match(/^(?:(\w+)\s*:\s*)?(\w+)(?:!(\w+))?(?:!(inner|left))?\s*\(([\s\S]*)\)$/);
    if (m) {
      let hint: string | null = m[3] ?? null, inner = m[4] === "inner";
      if (hint === "inner") { hint = null; inner = true; }
      joins.push({ key: m[1] || m[2], name: m[2], hint, inner, columns: m[5].trim() });
      continue;
    }
    const bits = part.split("::")[0].split(":").map((x) => x.trim());
    columns.push(bits.length > 1 ? bits[1] : bits[0]);
  }
  return { columns, joins };
}

const fkCache = new Map<string, { table: string; from: string; to: string }[]>();
async function fkList(table: string) {
  if (!fkCache.has(table)) {
    const db = schemaDbOverride ?? getCloudDb();
    const rows = await db.unsafe(
      `SELECT kcu.column_name AS "from", ccu.table_name AS "table", ccu.column_name AS "to"
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
         JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`, [table]);
    fkCache.set(table, rows.map((r: any) => ({ table: String(r.table), from: String(r.from), to: String(r.to) })));
  }
  return fkCache.get(table)!;
}
const singular = (t: string) => t.replace(/ies$/, "y").replace(/(ses|xes)$/, (x) => x.slice(0, -2)).replace(/s$/, "");

async function resolveEmbed(parent: string, e: Embed): Promise<{ table: string; kind: "one" | "many"; parentCol: string; childCol: string } | null> {
  const pCols = await getCloudColumns(parent);
  if (pCols.has(e.name) && !(await getCloudColumns(e.name)).size) {
    // alias:fk_column(...)
    const fk = (await fkList(parent)).find((f) => f.from === e.name);
    const base = e.name.replace(/_id$/, "");
    const candidates = [
      fk?.table,
      ...Object.entries(JOIN_MAP).filter(([k, v]) => k.startsWith(parent + "->") && v === e.name).map(([k]) => k.split("->")[1]),
      base + "s", base.replace(/y$/, "ies"),
      /account$/.test(base) ? "chart_of_accounts" : undefined,
      /(^user|_by)$/.test(e.name) || base === "user" ? "profiles" : undefined,
    ];
    for (const t of candidates) if (t && (await getCloudColumns(t)).has("id")) return { table: t, kind: "one", parentCol: e.name, childCol: fk?.to || "id" };
    return null;
  }
  const table = e.name;
  const tCols = await getCloudColumns(table);
  if (!tCols.size) return null;
  if (e.hint && pCols.has(e.hint)) return { table, kind: "one", parentCol: e.hint, childCol: "id" };
  if (e.hint && tCols.has(e.hint)) return { table, kind: "many", parentCol: "id", childCol: e.hint };
  const fwd = (await fkList(parent)).find((f) => f.table === table)?.from ?? JOIN_MAP[`${parent}->${table}`] ?? (pCols.has(`${singular(table)}_id`) ? `${singular(table)}_id` : null);
  if (fwd && pCols.has(fwd)) return { table, kind: "one", parentCol: fwd, childCol: "id" };
  const rev = (await fkList(table)).find((f) => f.table === parent)?.from ?? JOIN_MAP[`${table}->${parent}`] ?? (tCols.has(`${singular(parent)}_id`) ? `${singular(parent)}_id` : null);
  if (rev && tCols.has(rev)) return { table, kind: "many", parentCol: "id", childCol: rev };
  return null;
}

type EmbedCtx = { seq: number; params: any[]; userId: string };

async function jsonObjectExpr(table: string, a: string, colSpec: string, ctx: EmbedCtx): Promise<string> {
  const parsed = parseColumns(colSpec || "*");
  const all = await getCloudColumns(table);
  const cols = parsed.columns.includes("*") || !parsed.columns.length ? [...all] : parsed.columns.filter((c) => all.has(c));
  const pairs: string[] = cols.map((c) => `'${assertIdentifier(c)}', "${a}"."${c}"`);
  for (const nested of parsed.joins) {
    const sub = await embedExpr(table, a, nested, ctx);
    if (sub) pairs.push(`'${assertIdentifier(nested.key)}', ${sub.expr}`);
  }
  if (!pairs.length) return "'{}'::jsonb";
  const chunks: string[] = [];
  for (let i = 0; i < pairs.length; i += 50) chunks.push(`jsonb_build_object(${pairs.slice(i, i + 50).join(", ")})`);
  return chunks.join(" || ");
}

async function embedExpr(parent: string, parentAlias: string, e: Embed, ctx: EmbedCtx): Promise<{ expr: string; exists: string } | null> {
  const r = await resolveEmbed(parent, e);
  if (!r) return null;
  const a = `__e${ctx.seq++}`;
  const childCols = await getCloudColumns(r.table);
  // Linked records are isolated exactly like the main table: never another user's rows.
  const scope = (al: string) => (childCols.has("user_id") ? ` AND "${al}"."user_id" = ${pushParam(ctx.params, ctx.userId)}` : "");
  const where = (al: string) => `"${al}"."${r.childCol}"::text = "${parentAlias}"."${r.parentCol}"::text${scope(al)}`;
  const obj = await jsonObjectExpr(r.table, a, e.columns, ctx);
  const expr = r.kind === "one"
    ? `(SELECT ${obj} FROM "${r.table}" AS "${a}" WHERE ${where(a)} LIMIT 1)`
    : `(SELECT COALESCE(jsonb_agg(${obj}), '[]'::jsonb) FROM "${r.table}" AS "${a}" WHERE ${where(a)})`;
  const exists = `EXISTS (SELECT 1 FROM "${r.table}" AS "${a}x" WHERE ${where(a + "x")})`;
  return { expr, exists };
}

function serializeValue(value: any) {
  return typeof value === "object" && value !== null ? JSON.stringify(value) : value;
}

export async function executeCloudQueryInTransaction(db: any, spec: QuerySpec, authenticatedUserId: string, tenantId: string): Promise<QueryResult> {
  const table = assertIdentifier(spec.table);
  const tableColumns = await getCloudColumns(table);
  if (!tableColumns.size) return { data: null, error: { message: `TABLE_NOT_FOUND: ${table}` } };

  const filters: Filter[] = [...spec.filters];
  if (tableColumns.has("user_id")) {
    filters.push({ column: "user_id", op: "eq", value: authenticatedUserId });
  }

  const protectedTables = new Set(["audit_event_log", "fiscal_transaction_controls", "zra_outbox"]);
  if (protectedTables.has(table) && ["insert","update","delete"].includes(spec.operation)) {
    return { data: null, error: { message: "PROTECTED_COMPLIANCE_RECORD: use the application service." } };
  }

  try {
    if (spec.operation === "select") {
      const parsed = parseColumns(spec.columns || "*");
      const selectParts: string[] = [];
      if (parsed.columns.includes("*") || parsed.columns.length === 0) {
        selectParts.push(`"${table}".*`);
      } else {
        for (const col of parsed.columns) {
          assertIdentifier(col);
          if (!tableColumns.has(col)) throw new Error(`COLUMN_NOT_FOUND: ${table}.${col}`);
          selectParts.push(`"${table}"."${col}"`);
        }
      }

      const params: any[] = [];
      const where = buildWhere(filters, params, table);
      const ctx: EmbedCtx = { seq: 0, params, userId: authenticatedUserId };
      const innerParts: string[] = [];
      const embedKeys: string[] = [];
      for (const e of parsed.joins) {
        const sub = await embedExpr(table, table, e, ctx);
        if (!sub) throw new Error(`JOIN_NOT_MAPPED: ${table}->${e.name}`);
        selectParts.push(`${sub.expr} AS "__j_${assertIdentifier(e.key)}"`);
        if (e.inner) innerParts.push(sub.exists);
        embedKeys.push(e.key);
      }
      const fullWhere = where + (innerParts.length ? (where ? " AND " : " WHERE ") + innerParts.join(" AND ") : "");

      let count: number | null = null;
      if (spec.count) {
        const c = await db.unsafe(`SELECT count(*)::int AS n FROM "${table}"${fullWhere}`, params);
        count = Number(c[0]?.n ?? 0);
      }

      let sql = `SELECT ${selectParts.join(", ")} FROM "${table}"${fullWhere}`;
      if (spec.order.length) {
        sql += " ORDER BY " + spec.order.map(o => {
          assertIdentifier(o.column);
          if (!tableColumns.has(o.column)) throw new Error(`COLUMN_NOT_FOUND: ${table}.${o.column}`);
          return `"${table}"."${o.column}" ${o.ascending ? "ASC" : "DESC"}${o.nullsFirst == null ? "" : o.nullsFirst ? " NULLS FIRST" : " NULLS LAST"}`;
        }).join(", ");
      }
      if (spec.range) {
        sql += ` LIMIT ${Math.max(0, spec.range[1] - spec.range[0] + 1)} OFFSET ${Math.max(0, spec.range[0])}`;
      } else if (spec.limit !== null && spec.limit !== undefined) {
        sql += ` LIMIT ${Math.max(0, spec.limit)}`;
      }
      const rows = await db.unsafe(sql, params);
      let data: any = rows.map((row: any) => {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith("__j_")) {
            let v: any = value;
            if (typeof v === "string") { try { v = JSON.parse(v); } catch { /* keep */ } }
            result[key.slice(4)] = v ?? null;
          } else result[key] = value;
        }
        return result;
      });
      if (spec.single) {
        if (!data[0]) return { data: null, error: { message: "No rows found" } };
        data = data[0];
      } else if (spec.maybeSingle) data = data[0] ?? null;
      return { data, error: null, count };
    }

    if (spec.operation === "insert") {
      const records = Array.isArray(spec.insertData) ? spec.insertData : [spec.insertData];
      const results: any[] = [];
      for (const input of records) {
        const record = { ...(input || {}) } as Record<string, any>;
        if (!record.id) record.id = crypto.randomUUID();
        for (const key of Object.keys(record)) {
          assertIdentifier(key);
          if (!tableColumns.has(key)) throw new Error(`COLUMN_NOT_FOUND: ${table}.${key}`);
        }
        if (tableColumns.has("user_id")) record.user_id = authenticatedUserId;
        if (tableColumns.has("tenant_id")) record.tenant_id = tenantId;
        const cols = Object.keys(record);
        const params: any[] = [];
        const values = cols.map(c => pushParam(params, serializeValue(record[c]))).join(",");
        let sql = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(",")}) VALUES (${values})`;
        if (spec.onConflict) {
          const conflict = spec.onConflict.split(",").map(c => c.trim()).filter(Boolean);
          conflict.forEach(assertIdentifier);
          const updates = cols.filter(c => !conflict.includes(c)).map(c => `"${c}"=EXCLUDED."${c}"`);
          sql += ` ON CONFLICT (${conflict.map(c => `"${c}"`).join(",")}) DO ${updates.length ? "UPDATE SET " + updates.join(",") : "NOTHING"}`;
        }
        sql += " RETURNING *";
        const rows = await db.unsafe(sql, params);
        results.push(rows[0]);
        if (table === "companies" && rows[0]) {
          await db.unsafe("INSERT INTO cloud_tenants(owner_user_id,company_id,name,country,base_currency,trial_ends_at) VALUES($1,$2,$3,$4,$5,now()+interval '14 days') ON CONFLICT(company_id) DO UPDATE SET name=EXCLUDED.name,country=EXCLUDED.country,base_currency=EXCLUDED.base_currency,updated_at=now()", [authenticatedUserId, rows[0].id, rows[0].name || "SifoBooks Company", rows[0].country || "Zambia", rows[0].base_currency || "ZMW"]);
          await db.unsafe("INSERT INTO cloud_members(tenant_id,user_id,role) SELECT id,$1,'owner' FROM cloud_tenants WHERE company_id=$2 ON CONFLICT(tenant_id,user_id) DO UPDATE SET role='owner'", [authenticatedUserId, rows[0].id]);
        }
        if (table === "company_members" && rows[0]) {
          await db.unsafe("INSERT INTO cloud_members(tenant_id,user_id,role) SELECT id,$1,$2 FROM cloud_tenants WHERE company_id=$3 ON CONFLICT(tenant_id,user_id) DO UPDATE SET role=EXCLUDED.role,status='active'", [rows[0].user_id, rows[0].role || "staff", rows[0].company_id]);
        }
      }
      return { data: Array.isArray(spec.insertData) ? results : results[0], error: null };
    }

    if (spec.operation === "update") {
      const data = { ...(spec.updateData || {}) };
      for (const key of Object.keys(data)) {
        assertIdentifier(key);
        if (!tableColumns.has(key)) throw new Error(`COLUMN_NOT_FOUND: ${table}.${key}`);
      }
      if (tableColumns.has("user_id")) data.user_id = authenticatedUserId;
      if (tableColumns.has("tenant_id")) data.tenant_id = tenantId;
      const params: any[] = [];
      const setSql = Object.entries(data).map(([key,value]) => `"${key}"=${pushParam(params, serializeValue(value))}`).join(",");
      const where = buildWhere(filters, params);
      const rows = await db.unsafe(`UPDATE "${table}" SET ${setSql}${where} RETURNING *`, params);
      return { data: rows, error: null };
    }

    if (spec.operation === "delete") {
      const params: any[] = [];
      const where = buildWhere(filters, params);
      const rows = await db.unsafe(`DELETE FROM "${table}"${where} RETURNING *`, params);
      return { data: rows, error: null };
    }

    return { data: null, error: { message: "Unknown operation" } };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || String(e) } };
  }
}


export async function executeCloudQuery(spec: QuerySpec, authenticatedUserId: string): Promise<QueryResult> {
  const db = getCloudDb();
  const requestedCompany = spec.filters.find(
    (f) => f.column === "company_id" && f.op === "eq" && typeof f.value === "string",
  )?.value as string | undefined;

  const tenantRows = requestedCompany
    ? await db.unsafe(
        "SELECT ct.id FROM cloud_tenants ct INNER JOIN cloud_members cm ON cm.tenant_id=ct.id WHERE ct.company_id=$1 AND cm.user_id=$2 AND cm.status='active' LIMIT 1",
        [requestedCompany, authenticatedUserId],
      )
    : await db.unsafe(
        "SELECT ct.id FROM cloud_tenants ct INNER JOIN cloud_members cm ON cm.tenant_id=ct.id WHERE cm.user_id=$1 AND cm.status='active' ORDER BY ct.created_at LIMIT 1",
        [authenticatedUserId],
      );

  const tenantId = tenantRows[0]?.id ? String(tenantRows[0].id) : "";
  if (!tenantId) return { data: null, error: { message: "CLOUD_TENANT_NOT_FOUND" } };

  try {
    return await db.begin(async (tx: any) => {
      await tx.unsafe(
        "SELECT set_config('app.tenant_id',$1,true), set_config('app.user_id',$2,true)",
        [tenantId, authenticatedUserId],
      );
      return executeCloudQueryInTransaction(tx, spec, authenticatedUserId, tenantId);
    });
  } catch (e: any) {
    return { data: null, error: { message: e?.message || String(e) } };
  }
}
