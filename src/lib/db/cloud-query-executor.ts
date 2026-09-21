import { getCloudDb } from "@/lib/cloud/postgres";
import { JOIN_MAP } from "./join-map";
import type { Filter, QuerySpec, QueryResult } from "./query-executor";

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const columnsCache = new Map<string, Set<string>>();

function assertIdentifier(value: string) {
  if (!identifier.test(value)) throw new Error("INVALID_DATABASE_IDENTIFIER");
  return value;
}

async function getCloudColumns(table: string): Promise<Set<string>> {
  assertIdentifier(table);
  const cached = columnsCache.get(table);
  if (cached) return cached;
  const db = getCloudDb();
  const rows = await db`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${table}`;
  const set = new Set(rows.map((r: any) => String(r.column_name)));
  columnsCache.set(table, set);
  return set;
}

function pushParam(params: any[], value: any) {
  params.push(value);
  return "$" + params.length;
}

function buildWhere(filters: Filter[], params: any[]) {
  const parts: string[] = [];
  for (const f of filters) {
    assertIdentifier(f.column);
    const col = `"${f.column}"`;
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
      default:
        throw new Error(`UNSUPPORTED_FILTER_OPERATOR: ${f.op}`);
    }
  }
  return parts.length ? " WHERE " + parts.join(" AND ") : "";
}

function parseColumns(spec: string) {
  const columns: string[] = [];
  const joins: { table: string; columns: string }[] = [];
  let depth = 0, current = "";
  const flush = () => {
    const part = current.trim();
    current = "";
    if (!part) return;
    const clean = part.split(":")[0].trim();
    const match = clean.match(/^(\w+)\((.*)\)$/);
    if (match) joins.push({ table: match[1], columns: match[2].trim() });
    else columns.push(clean);
  };
  for (const ch of spec) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) flush(); else current += ch;
  }
  flush();
  return { columns, joins };
}

function serializeValue(value: any) {
  return typeof value === "object" && value !== null ? JSON.stringify(value) : value;
}

export async function executeCloudQuery(spec: QuerySpec, authenticatedUserId: string): Promise<QueryResult> {
  const table = assertIdentifier(spec.table);
  const db = getCloudDb();
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

      const joinClauses: string[] = [];
      for (const join of parsed.joins) {
        const joinTable = assertIdentifier(join.table);
        const joinColumns = await getCloudColumns(joinTable);
        if (!joinColumns.size) throw new Error(`TABLE_NOT_FOUND: ${joinTable}`);
        const fkCol = JOIN_MAP[`${table}->${joinTable}`] || `${joinTable.replace(/s$/, "")}_id`;
        const reverseFk = JOIN_MAP[`${joinTable}->${table}`];
        const condition = reverseFk
          ? `"${joinTable}"."${reverseFk}" = "${table}"."id"`
          : tableColumns.has(fkCol)
            ? `"${table}"."${fkCol}" = "${joinTable}"."id"`
            : null;
        if (!condition) throw new Error(`JOIN_NOT_MAPPED: ${table}->${joinTable}`);
        joinClauses.push(`LEFT JOIN "${joinTable}" ON ${condition}`);
        const cols = join.columns === "*" || !join.columns ? [...joinColumns] : join.columns.split(",").map(c => c.trim());
        for (const col of cols) {
          assertIdentifier(col);
          if (!joinColumns.has(col)) throw new Error(`COLUMN_NOT_FOUND: ${joinTable}.${col}`);
          selectParts.push(`"${joinTable}"."${col}" AS "__j_${joinTable}.${col}"`);
        }
      }

      const params: any[] = [];
      let sql = `SELECT ${selectParts.join(", ")} FROM "${table}"${joinClauses.length ? " " + joinClauses.join(" ") : ""}`;
      sql += buildWhere(filters, params);
      if (spec.order.length) {
        sql += " ORDER BY " + spec.order.map(o => {
          assertIdentifier(o.column);
          if (!tableColumns.has(o.column)) throw new Error(`COLUMN_NOT_FOUND: ${table}.${o.column}`);
          return `"${o.column}" ${o.ascending ? "ASC" : "DESC"}${o.nullsFirst == null ? "" : o.nullsFirst ? " NULLS FIRST" : " NULLS LAST"}`;
        }).join(", ");
      }
      if (spec.range) {
        sql += ` LIMIT ${Math.max(0, spec.range[1] - spec.range[0] + 1)} OFFSET ${Math.max(0, spec.range[0])}`;
      } else if (spec.limit !== null) {
        sql += ` LIMIT ${Math.max(0, spec.limit)}`;
      }
      const rows = await db.unsafe(sql, params);
      let data: any = rows.map((row: any) => {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          const m = key.match(/^__j_(\w+)\.(.+)$/);
          if (m) { (result[m[1]] ||= {})[m[2]] = value; } else result[key] = value;
        }
        return result;
      });
      if (spec.single) {
        if (!data[0]) return { data: null, error: { message: "No rows found" } };
        data = data[0];
      } else if (spec.maybeSingle) data = data[0] ?? null;
      return { data, error: null, count: spec.count ? rows.length : null };
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
