// Server-side admin client — direct SQLite access (bypasses server function RPC).
// Used in server functions for admin operations.
import { executeQuery, type QuerySpec } from "@/lib/db/query-executor";
import { getDb, generateUUID } from "@/lib/db/database";

class ServerQueryBuilder {
  private spec: QuerySpec;

  constructor(table: string, operation: QuerySpec["operation"]) {
    this.spec = { table, operation, filters: [], order: [], limit: null, range: null, single: false, maybeSingle: false };
  }

  select(columns: string = "*") { this.spec.columns = columns; return this; }
  insert(data: any) { this.spec.insertData = data; return this; }
  update(data: any) { this.spec.updateData = data; return this; }
  delete() { return this; }

  eq(col: string, val: any) { this.spec.filters.push({ column: col, op: "eq", value: val }); return this; }
  neq(col: string, val: any) { this.spec.filters.push({ column: col, op: "neq", value: val }); return this; }
  gt(col: string, val: any) { this.spec.filters.push({ column: col, op: "gt", value: val }); return this; }
  gte(col: string, val: any) { this.spec.filters.push({ column: col, op: "gte", value: val }); return this; }
  lt(col: string, val: any) { this.spec.filters.push({ column: col, op: "lt", value: val }); return this; }
  lte(col: string, val: any) { this.spec.filters.push({ column: col, op: "lte", value: val }); return this; }
  in(col: string, vals: any[]) { this.spec.filters.push({ column: col, op: "in", value: vals }); return this; }
  is(col: string, val: any) { this.spec.filters.push({ column: col, op: "is", value: val }); return this; }
  like(col: string, val: string) { this.spec.filters.push({ column: col, op: "like", value: val }); return this; }
  ilike(col: string, val: string) { this.spec.filters.push({ column: col, op: "ilike", value: val }); return this; }
  contains(col: string, val: any) { this.spec.filters.push({ column: col, op: "like", value: `%${JSON.stringify(val)}%` }); return this; }

  order(col: string, opts?: { ascending?: boolean }) {
    this.spec.order.push({ column: col, ascending: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) { this.spec.limit = n; return this; }
  range(from: number, to: number) { this.spec.range = [from, to]; return this; }
  single() { this.spec.single = true; return this; }
  maybeSingle() { this.spec.maybeSingle = true; return this; }

  get not() {
    const self = this;
    return {
      eq: (col: string, val: any) => { self.spec.filters.push({ column: col, op: "not.eq", value: val }); return self; },
      in: (col: string, vals: any[]) => { self.spec.filters.push({ column: col, op: "not.in", value: vals }); return self; },
      like: (col: string, val: string) => { self.spec.filters.push({ column: col, op: "not.like", value: val }); return self; },
    };
  }

  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    const result = executeQuery(this.spec);
    if (onFulfilled) return Promise.resolve(result).then(onFulfilled, onRejected);
    return result;
  }
}

// Simple RPC handler for admin client
function executeAdminRpc(name: string, args: Record<string, any>): { data: any; error: any } {
  const db = getDb();
  try {
    switch (name) {
      case "verify_cashier_pin": {
        const row = db.prepare("SELECT id, pin_hash FROM cashier_records WHERE pin_code = ?").get(args._pin) as any;
        if (!row) return { data: null, error: { message: "Invalid PIN" } };
        return { data: { valid: true, cashier_id: row.id }, error: null };
      }
      case "next_doc_number": {
        const prefix = args._prefix || "DOC";
        const year = new Date().getFullYear();
        const pattern = `${prefix}-${year}-%`;
        const row = db.prepare(
          `SELECT number FROM (SELECT invoice_number AS number FROM invoices WHERE user_id = ? AND invoice_number LIKE ?
           UNION ALL SELECT bill_number AS number FROM bills WHERE user_id = ? AND bill_number LIKE ?)
           ORDER BY number DESC LIMIT 1`
        ).get(args._uid, pattern, args._uid, pattern) as any;
        let seq = 1;
        if (row?.number) {
          const match = String(row.number).match(/(\d+)$/);
          if (match) seq = parseInt(match[1]) + 1;
        }
        return { data: `${prefix}-${year}-${String(seq).padStart(4, "0")}`, error: null };
      }
      case "has_role": {
        const row = db.prepare("SELECT role FROM user_roles WHERE user_id = ? AND role = ?").get(args._user_id, args._role) as any;
        return { data: !!row, error: null };
      }
      case "can_manage_company": {
        const row = db.prepare("SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND role IN ('admin','owner')").get(args._user_id, args._company_id) as any;
        return { data: !!row, error: null };
      }
      case "ensure_account": {
        let row = db.prepare("SELECT id FROM chart_of_accounts WHERE user_id = ? AND account_code = ?").get(args._uid, args._code) as any;
        if (row) return { data: row.id, error: null };
        const id = generateUUID();
        db.prepare("INSERT INTO chart_of_accounts (id, user_id, account_code, account_name, account_type, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))")
          .run(id, args._uid, args._code, args._name, args._type);
        return { data: id, error: null };
      }
      default:
        return { data: null, error: { message: `RPC "${name}" not implemented` } };
    }
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}

class AdminRpcBuilder {
  private name: string;
  private args: Record<string, any>;
  constructor(name: string, args: Record<string, any>) { this.name = name; this.args = args; }
  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    const result = executeAdminRpc(this.name, this.args);
    if (onFulfilled) return Promise.resolve(result).then(onFulfilled, onRejected);
    return result;
  }
}

export const supabaseAdmin = {
  from(table: string) { return new ServerQueryBuilder(table, "select"); },
  rpc(name: string, args: Record<string, any> = {}) { return new AdminRpcBuilder(name, args); },
};
