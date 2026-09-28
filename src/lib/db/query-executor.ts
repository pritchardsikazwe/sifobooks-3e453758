import { getDb, getColumns, generateUUID } from "./database";
import { JOIN_MAP } from "./join-map";

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "like" | "ilike" | "not.in" | "not.eq" | "not.like" | "or";
export type Filter = { column: string; op: FilterOp; value: any };
export type OrderClause = { column: string; ascending: boolean; nullsFirst?: boolean };

export type QuerySpec = {
  table: string;
  operation: "select" | "insert" | "update" | "delete";
  columns?: string;
  filters: Filter[];
  order: OrderClause[];
  limit: number | null;
  range: [number, number] | null;
  single: boolean;
  maybeSingle: boolean;
  insertData?: Record<string, any> | Record<string, any>[];
  updateData?: Record<string, any>;
  onConflict?: string;
  count?: string | null;
  authToken?: string | null;
};

export type QueryResult = { data: any; error: any; count?: number | null };

// Parse column spec: "id, name, customers(*), customer:customer_id(name), journal_entries!inner(id)"
// Embeds are resolved as correlated JSON sub-queries (never JOINs), so no column
// of the main table can ever become ambiguous and one-to-many embeds never
// multiply parent rows.
type Embed = { key: string; name: string; hint: string | null; inner: boolean; columns: string };
type ParsedColumns = { columns: string[]; joins: Embed[] };

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

function parseColumns(colSpec: string): ParsedColumns {
  const columns: string[] = [];
  const joins: Embed[] = [];
  for (const part of splitTop(colSpec)) {
    const m = part.match(/^(?:(\w+)\s*:\s*)?(\w+)(?:!(\w+))?(?:!(inner|left))?\s*\(([\s\S]*)\)$/);
    if (m) {
      let hint = m[3] ?? null, inner = m[4] === "inner";
      if (hint === "inner") { hint = null; inner = true; }
      joins.push({ key: m[1] || m[2], name: m[2], hint, inner, columns: m[5].trim() });
      continue;
    }
    // "col:alias" / "alias:col" / "col::cast" — keep the real column
    const clean = part.split("::")[0];
    const bits = clean.split(":").map((x) => x.trim());
    columns.push(bits.length > 1 ? bits[1] : bits[0]);
  }
  return { columns, joins };
}

const fkCache = new Map<string, { table: string; from: string; to: string }[]>();
function fkList(table: string) {
  if (!fkCache.has(table)) {
    try { fkCache.set(table, getDb().prepare(`PRAGMA foreign_key_list("${table}")`).all() as any); }
    catch { fkCache.set(table, []); }
  }
  return fkCache.get(table)!;
}
const singular = (t: string) => t.replace(/ies$/, "y").replace(/(ses|xes)$/, (x) => x.slice(0, -2)).replace(/s$/, "");

/** How `parent` relates to embed `e`: many-to-one (object) or one-to-many (array). */
function resolveEmbed(parent: string, e: Embed): { table: string; kind: "one" | "many"; parentCol: string; childCol: string } | null {
  const pCols = getColumns(parent);
  // alias:fk_column(...)  e.g. customer:customer_id(name)
  if (pCols.includes(e.name) && !getColumns(e.name).length) {
    const fk = fkList(parent).find((f) => f.from === e.name);
    const hasId = (t?: string) => !!t && getColumns(t).includes("id");
    const base = e.name.replace(/_id$/, "");
    const candidates = [
      fk?.table,
      ...Object.entries(JOIN_MAP).filter(([k, v]) => k.startsWith(parent + "->") && v === e.name).map(([k]) => k.split("->")[1]),
      base + "s", base.replace(/y$/, "ies"),
      /account$/.test(base) ? "chart_of_accounts" : undefined,
      /(^user|_by)$/.test(e.name) || base === "user" ? "profiles" : undefined,
    ];
    const target = candidates.find(hasId);
    return target ? { table: target, kind: "one", parentCol: e.name, childCol: fk?.to || "id" } : null;
  }
  const table = e.name;
  const tCols = getColumns(table);
  if (!tCols.length) return null;
  if (e.hint && pCols.includes(e.hint)) return { table, kind: "one", parentCol: e.hint, childCol: "id" };
  if (e.hint && tCols.includes(e.hint)) return { table, kind: "many", parentCol: "id", childCol: e.hint };
  const fwd = fkList(parent).find((f) => f.table === table)?.from ?? JOIN_MAP[`${parent}->${table}`] ?? (pCols.includes(`${singular(table)}_id`) ? `${singular(table)}_id` : null);
  if (fwd && pCols.includes(fwd)) return { table, kind: "one", parentCol: fwd, childCol: "id" };
  const rev = fkList(table).find((f) => f.table === parent)?.from ?? JOIN_MAP[`${table}->${parent}`] ?? (tCols.includes(`${singular(parent)}_id`) ? `${singular(parent)}_id` : null);
  if (rev && tCols.includes(rev)) return { table, kind: "many", parentCol: "id", childCol: rev };
  return null;
}

let aliasSeq = 0;
/** JSON object expression for `cols` of alias `a` (chunked: SQLite caps function args). */
function jsonObjectExpr(table: string, a: string, colSpec: string): string {
  const parsed = parseColumns(colSpec || "*");
  const all = getColumns(table);
  const cols = parsed.columns.includes("*") || !parsed.columns.length ? all : parsed.columns.filter((c) => all.includes(c));
  const pairs: string[] = cols.map((c) => `'${c}', "${a}"."${c}"`);
  for (const nested of parsed.joins) {
    const sub = embedExpr(table, a, nested);
    if (sub) pairs.push(`'${nested.key}', json(${sub.expr})`);
  }
  if (!pairs.length) return "json_object()";
  const chunks: string[] = [];
  for (let i = 0; i < pairs.length; i += 50) chunks.push(`json_object(${pairs.slice(i, i + 50).join(", ")})`);
  return chunks.reduce((acc, c) => (acc ? `json_patch(${acc}, ${c})` : c), "");
}

function embedExpr(parent: string, parentAlias: string, e: Embed): { expr: string; exists: string } | null {
  const r = resolveEmbed(parent, e);
  if (!r) return null;
  const a = `__e${aliasSeq++}`;
  const where = `"${a}"."${r.childCol}" = "${parentAlias}"."${r.parentCol}"`;
  const obj = jsonObjectExpr(r.table, a, e.columns);
  const expr = r.kind === "one"
    ? `(SELECT ${obj} FROM "${r.table}" AS "${a}" WHERE ${where} LIMIT 1)`
    : `(SELECT COALESCE(json_group_array(json(${obj})), '[]') FROM "${r.table}" AS "${a}" WHERE ${where})`;
  const exists = `EXISTS (SELECT 1 FROM "${r.table}" AS "${a}x" WHERE ${where.replaceAll(`"${a}"`, `"${a}x"`)})`;
  return { expr, exists };
}

function buildWhereClause(filters: Filter[], table?: string): { clause: string; params: any[] } {
  const parts: string[] = [];
  const params: any[] = [];
  for (const f of filters) {
    // Always qualify with the main table: joined tables (e.g. companies,
    // branches) also carry user_id/company_id, which made SQLite fail with
    // "ambiguous column name: user_id" on any select with an embed.
    const col = table && !String(f.column).includes(".") ? `"${table}"."${f.column}"` : `"${f.column}"`;
    const op = f.op;
    const val = f.value;
    switch (op) {
      case "eq":
        parts.push(`${col} = ?`);
        params.push(val);
        break;
      case "neq":
        parts.push(`${col} != ?`);
        params.push(val);
        break;
      case "gt":
        parts.push(`${col} > ?`);
        params.push(val);
        break;
      case "gte":
        parts.push(`${col} >= ?`);
        params.push(val);
        break;
      case "lt":
        parts.push(`${col} < ?`);
        params.push(val);
        break;
      case "lte":
        parts.push(`${col} <= ?`);
        params.push(val);
        break;
      case "in":
        if (Array.isArray(val) && val.length > 0) {
          const placeholders = val.map(() => "?").join(",");
          parts.push(`${col} IN (${placeholders})`);
          params.push(...val);
        } else {
          parts.push("0"); // empty IN = no results
        }
        break;
      case "not.in":
        if (Array.isArray(val) && val.length > 0) {
          const placeholders = val.map(() => "?").join(",");
          parts.push(`${col} NOT IN (${placeholders})`);
          params.push(...val);
        }
        break;
      case "is":
        parts.push(val === null ? `${col} IS NULL` : `${col} IS NOT NULL`);
        break;
      case "like":
        parts.push(`${col} LIKE ?`);
        params.push(val);
        break;
      case "ilike":
        // SQLite LIKE is already case-insensitive for ASCII; pass the pattern through unchanged.
        parts.push(`${col} LIKE ?`);
        params.push(String(val));
        break;
      case "not.eq":
        parts.push(`${col} != ?`);
        params.push(val);
        break;
      case "not.like":
        parts.push(`${col} NOT LIKE ?`);
        params.push(val);
        break;
      case "or": {
        // PostgREST-style "col.op.value,col.op.value" expression.
        const sub: Filter[] = [];
        for (const piece of String(val).split(",")) {
          const m = piece.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.*)$/);
          if (!m) continue;
          const v = m[2] === "is" ? (m[3] === "null" ? null : m[3]) : m[3].replace(/\*/g, "%");
          sub.push({ column: m[1], op: m[2] as FilterOp, value: v });
        }
        if (sub.length) {
          const inner = sub.map((s) => buildWhereClause([s], table));
          parts.push("(" + inner.map((i) => i.clause.replace(/^ WHERE /, "")).join(" OR ") + ")");
          inner.forEach((i) => params.push(...i.params));
        }
        break;
      }
      default:
        parts.push(`${col} = ?`);
        params.push(val);
    }
  }
  return { clause: parts.length ? " WHERE " + parts.join(" AND ") : "", params };
}

function buildSelect(spec: QuerySpec): { sql: string; params: any[]; joins: ParsedColumns["joins"] } {
  const parsed = parseColumns(spec.columns || "*");
  const table = spec.table;
  const tableCols = getColumns(table);
  const selectParts: string[] = [];
  if (parsed.columns.includes("*") || parsed.columns.length === 0) selectParts.push(`"${table}".*`);
  else for (const col of parsed.columns) selectParts.push(`"${table}"."${col}"`);

  const innerParts: string[] = [];
  const embeds: Embed[] = [];
  for (const e of parsed.joins) {
    const sub = embedExpr(table, table, e);
    if (!sub) { if (tableCols.length) console.warn(`[db] unresolved embed ${table} -> ${e.name}`); continue; }
    selectParts.push(`${sub.expr} AS "__j_${e.key}"`);
    if (e.inner) innerParts.push(sub.exists);
    embeds.push(e);
  }

  let sql = `SELECT ${selectParts.join(", ")} FROM "${table}"`;
  const { clause, params } = buildWhereClause(spec.filters, table);
  sql += clause;
  if (innerParts.length) sql += (clause ? " AND " : " WHERE ") + innerParts.join(" AND ");
  if (spec.order.length) {
    sql += " ORDER BY " + spec.order.map((o) => `"${table}"."${o.column}" ${o.ascending ? "ASC" : "DESC"}`).join(", ");
  }
  if (spec.range) sql += ` LIMIT ${spec.range[1] - spec.range[0] + 1} OFFSET ${spec.range[0]}`;
  else if (spec.limit !== null) sql += ` LIMIT ${spec.limit}`;
  return { sql, params, joins: embeds };
}

function transformJoinResults(rows: any[], joins: ParsedColumns["joins"]): any[] {
  if (joins.length === 0) return rows;
  return rows.map((row) => {
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
}

export function executeQuery(spec: QuerySpec, authenticatedUserId?: string): QueryResult {
  const database = getDb();
  const secured: QuerySpec = {
    ...spec,
    filters: [...spec.filters],
    insertData: spec.insertData,
    updateData: spec.updateData ? { ...spec.updateData } : spec.updateData,
  };

  if (authenticatedUserId && getColumns(spec.table).includes("user_id")) {
    secured.filters.push({ column: "user_id", op: "eq", value: authenticatedUserId });
    if (secured.operation === "insert") {
      const records = Array.isArray(secured.insertData) ? secured.insertData : [secured.insertData];
      for (const record of records) if (record) record.user_id = authenticatedUserId;
    }
    if (secured.operation === "update" && secured.updateData) {
      secured.updateData.user_id = authenticatedUserId;
    }
  }

  const protectedTables = new Set(["audit_event_log", "fiscal_transaction_controls", "zra_outbox"]);
  if (protectedTables.has(spec.table) && ["insert", "update", "delete"].includes(spec.operation)) {
    return { data: null, error: { message: "PROTECTED_COMPLIANCE_RECORD: use the application service." } };
  }

  if (spec.table === "pos_sales") {
    if (spec.operation === "insert") {
      const records = Array.isArray(spec.insertData) ? spec.insertData : [spec.insertData];
      if (records.some((row: any) => !["held", "draft"].includes(String(row?.status ?? "").toLowerCase()))) {
        return { data: null, error: { message: "POS_SALE_POSTING_REQUIRED: use the POS checkout service." } };
      }
    }
    if (["update", "delete"].includes(spec.operation)) {
      const { clause, params } = buildWhereClause(secured.filters, secured.table);
      const targeted = database.prepare(`SELECT status FROM pos_sales${clause}`).all(...params) as any[];
      if (targeted.some((row) => !["held", "draft"].includes(String(row.status ?? "").toLowerCase()))) {
        return { data: null, error: { message: "POSTED_POS_SALE_IMMUTABLE: use the reversal/correction workflow." } };
      }
    }
  }

  try {
    if (secured.operation === "select") {
      const { sql, params, joins } = buildSelect(secured);
      const rows = database.prepare(sql).all(...params);
      let data: any = transformJoinResults(rows, joins);
      let count: number | null = null;
      if (secured.count) {
        const { clause, params: cp } = buildWhereClause(secured.filters, secured.table);
        count = Number((database.prepare(`SELECT COUNT(*) AS n FROM "${secured.table}"${clause}`).get(...cp) as any)?.n ?? 0);
      }

      if (secured.single) {
        data = data[0] ?? null;
        if (!data) return { data: null, error: { message: "No rows found" } };
      } else if (secured.maybeSingle) {
        data = data[0] ?? null;
      }
      return { data, error: null, count };
    }

    if (secured.operation === "insert") {
      const records = Array.isArray(secured.insertData) ? secured.insertData : [secured.insertData];
      const results: any[] = [];
      for (const record of records) {
        const cols = Object.keys(record);
        const vals = cols.map(c => {
          const v = record[c];
          if (v === undefined) return null;
          if (typeof v === "object" && v !== null) return JSON.stringify(v);
          return v;
        });
        if (!cols.includes("id") && !cols.includes("ID")) {
          cols.push("id");
          vals.push(generateUUID());
        }
        const placeholders = cols.map(() => "?").join(",");
        const colSql = cols.map(c => `"${c}"`).join(",");
        let sql = `INSERT INTO "${secured.table}" (${colSql}) VALUES (${placeholders})`;
        if (secured.onConflict) {
          const conflictCols = secured.onConflict.split(",").map((c) => c.trim()).filter(Boolean);
          if (conflictCols.length) {
            const updates = cols.filter((col) => !conflictCols.includes(col)).map((col) => `"${col}"=excluded."${col}"`);
            sql += ` ON CONFLICT (${conflictCols.map((col) => `"${col}"`).join(",")}) DO ${updates.length ? `UPDATE SET ${updates.join(",")}` : "NOTHING"}`;
          }
        }
        database.prepare(sql).run(...vals);
        const id = vals[cols.indexOf("id")];
        const inserted = database.prepare(`SELECT * FROM "${secured.table}" WHERE id = ?`).get(id);
        results.push(inserted);
      }
      return { data: Array.isArray(secured.insertData) ? results : results[0], error: null };
    }

    if (secured.operation === "update") {
      const setCols = Object.keys(secured.updateData || {});
      const setVals = setCols.map(c => {
        const v = secured.updateData![c];
        if (v === undefined) return null;
        if (typeof v === "object" && v !== null) return JSON.stringify(v);
        return v;
      });
      const setClause = setCols.map(c => `"${c}" = ?`).join(",");
      const { clause, params } = buildWhereClause(secured.filters, secured.table);
      const sql = `UPDATE "${secured.table}" SET ${setClause}${clause}`;
      database.prepare(sql).run(...setVals, ...params);
      const rows = database.prepare(`SELECT * FROM "${secured.table}"${clause}`).all(...params);
      // Honour .single()/.maybeSingle() like PostgREST: return one row object, not an array.
      if (secured.single) {
        if (!rows[0]) return { data: null, error: { message: "No rows found" } };
        return { data: rows[0], error: null };
      }
      if (secured.maybeSingle) return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }

    if (secured.operation === "delete") {
      const { clause, params } = buildWhereClause(secured.filters, secured.table);
      const rows = database.prepare(`SELECT * FROM "${secured.table}"${clause}`).all(...params);
      database.prepare(`DELETE FROM "${secured.table}"${clause}`).run(...params);
      return { data: rows, error: null };
    }

    return { data: null, error: { message: "Unknown operation" } };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}
