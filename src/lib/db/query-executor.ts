import { getDb, getColumns, generateUUID } from "./database";
import { JOIN_MAP } from "./join-map";

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "like" | "ilike" | "not.in" | "not.eq" | "not.like";
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
};

export type QueryResult = { data: any; error: any; count?: number | null };

// Parse column spec: "id, name, customers(*), stock_items(name, sku)"
type ParsedColumns = { columns: string[]; joins: { table: string; columns: string }[] };

function parseColumns(colSpec: string): ParsedColumns {
  const columns: string[] = [];
  const joins: { table: string; columns: string }[] = [];
  let depth = 0;
  let current = "";
  for (const char of colSpec) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      processPart(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) processPart(current.trim());

  function processPart(part: string) {
    // Handle alias: "col:alias" — just use the col part
    const cleanPart = part.split(":")[0].trim();
    const joinMatch = cleanPart.match(/^(\w+)\((.*)\)$/);
    if (joinMatch) {
      joins.push({ table: joinMatch[1], columns: joinMatch[2].trim() });
    } else if (cleanPart) {
      columns.push(cleanPart);
    }
  }
  return { columns, joins };
}

function buildWhereClause(filters: Filter[]): { clause: string; params: any[] } {
  const parts: string[] = [];
  const params: any[] = [];
  for (const f of filters) {
    const col = `"${f.column}"`;
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
        parts.push(`${col} LIKE ?`);
        params.push(val.replace(/%/g, "%%"));
        break;
      case "not.eq":
        parts.push(`${col} != ?`);
        params.push(val);
        break;
      case "not.like":
        parts.push(`${col} NOT LIKE ?`);
        params.push(val);
        break;
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
  const selectParts: string[] = [];

  // Main table columns
  if (parsed.columns.includes("*") || parsed.columns.length === 0) {
    selectParts.push(`"${table}".*`);
  } else {
    for (const col of parsed.columns) {
      selectParts.push(`"${table}"."${col}"`);
    }
  }

  // Join tables
  const joinClauses: string[] = [];
  for (const join of parsed.joins) {
    const fkCol = JOIN_MAP[`${table}->${join.table}`];
    if (!fkCol) {
      // Try reverse: maybe the joined table has a FK to the current table
      const reverseFk = JOIN_MAP[`${join.table}->${table}`];
      if (reverseFk) {
        joinClauses.push(`LEFT JOIN "${join.table}" ON "${join.table}"."${reverseFk}" = "${table}"."id"`);
      } else {
        // Try common naming: singular_id
        const sing = join.table.replace(/s$/, "");
        const tryCol = `${sing}_id`;
        joinClauses.push(`LEFT JOIN "${join.table}" ON "${table}"."${tryCol}" = "${join.table}"."id"`);
      }
    } else {
      joinClauses.push(`LEFT JOIN "${join.table}" ON "${table}"."${fkCol}" = "${join.table}"."id"`);
    }

    // Select joined columns with prefix
    if (join.columns === "*" || join.columns === "") {
      const joinCols = getColumns(join.table);
      for (const jc of joinCols) {
        selectParts.push(`"${join.table}"."${jc}" AS "__j_${join.table}.${jc}"`);
      }
    } else {
      for (const jc of join.columns.split(",").map(c => c.trim()).filter(Boolean)) {
        selectParts.push(`"${join.table}"."${jc}" AS "__j_${join.table}.${jc}"`);
      }
    }
  }

  let sql = `SELECT ${selectParts.join(", ")} FROM "${table}"`;
  if (joinClauses.length) sql += " " + joinClauses.join(" ");

  const { clause, params } = buildWhereClause(spec.filters);
  sql += clause;

  if (spec.order.length) {
    sql += " ORDER BY " + spec.order.map(o => `"${o.column}" ${o.ascending ? "ASC" : "DESC"}`).join(", ");
  }

  if (spec.range) {
    sql += ` LIMIT ${spec.range[1] - spec.range[0] + 1} OFFSET ${spec.range[0]}`;
  } else if (spec.limit !== null) {
    sql += ` LIMIT ${spec.limit}`;
  }

  return { sql, params, joins: parsed.joins };
}

function transformJoinResults(rows: any[], joins: ParsedColumns["joins"]): any[] {
  if (joins.length === 0) return rows;
  return rows.map(row => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith("__j_")) {
        const [_, tableName, colName] = key.match(/^__j_(\w+)\.(.+)$/) || [];
        if (tableName && colName) {
          if (!result[tableName]) result[tableName] = {};
          result[tableName][colName] = value;
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  });
}

export function executeQuery(spec: QuerySpec): QueryResult {
  const database = getDb();
  try {
    if (spec.operation === "select") {
      const { sql, params, joins } = buildSelect(spec);
      const rows = database.prepare(sql).all(...params);

      let data: any = transformJoinResults(rows, joins);

      if (spec.single) {
        data = data[0] ?? null;
        if (!data) return { data: null, error: { message: "No rows found" } };
      } else if (spec.maybeSingle) {
        data = data[0] ?? null;
      }

      return { data, error: null };
    }

    if (spec.operation === "insert") {
      const records = Array.isArray(spec.insertData) ? spec.insertData : [spec.insertData];
      const results: any[] = [];
      for (const record of records) {
        const cols = Object.keys(record);
        const vals = cols.map(c => {
          const v = record[c];
          if (v === undefined) return null;
          if (typeof v === "object" && v !== null) return JSON.stringify(v);
          return v;
        });
        // Ensure id is set
        if (!cols.includes("id") && !cols.includes("ID")) {
          cols.push("id");
          vals.push(generateUUID());
        }
        const placeholders = cols.map(() => "?").join(",");
        const sql = `INSERT INTO "${spec.table}" (${cols.map(c => `"${c}"`).join(",")}) VALUES (${placeholders})`;
        database.prepare(sql).run(...vals);
        const id = vals[cols.indexOf("id")];
        const inserted = database.prepare(`SELECT * FROM "${spec.table}" WHERE id = ?`).get(id);
        results.push(inserted);
      }
      return { data: Array.isArray(spec.insertData) ? results : results[0], error: null };
    }

    if (spec.operation === "update") {
      const setCols = Object.keys(spec.updateData || {});
      const setVals = setCols.map(c => {
        const v = spec.updateData![c];
        if (v === undefined) return null;
        if (typeof v === "object" && v !== null) return JSON.stringify(v);
        return v;
      });
      const setClause = setCols.map(c => `"${c}" = ?`).join(",");
      const { clause, params } = buildWhereClause(spec.filters);
      const sql = `UPDATE "${spec.table}" SET ${setClause}${clause}`;
      database.prepare(sql).run(...setVals, ...params);

      // Return updated rows
      const selectSql = `SELECT * FROM "${spec.table}"${clause}`;
      const rows = database.prepare(selectSql).all(...params);
      return { data: rows, error: null };
    }

    if (spec.operation === "delete") {
      const { clause, params } = buildWhereClause(spec.filters);
      const selectSql = `SELECT * FROM "${spec.table}"${clause}`;
      const rows = database.prepare(selectSql).all(...params);
      const sql = `DELETE FROM "${spec.table}"${clause}`;
      database.prepare(sql).run(...params);
      return { data: rows, error: null };
    }

    return { data: null, error: { message: "Unknown operation" } };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}
