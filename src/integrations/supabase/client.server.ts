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
async function executeAdminRpc(name: string, args: Record<string, any>): Promise<{ data: any; error: any }> {
  const db = getDb();
  try {
    switch (name) {
      case "verify_cashier_pin": {
        const row = db.prepare(
          "SELECT id,pin_hash,pin_disabled,pin_locked_until FROM employee_pos_permissions WHERE id=? AND is_active=1 LIMIT 1",
        ).get(args._permission_id) as any;
        if (!row || Number(row.pin_disabled || 0) === 1) return { data: { ok: false, error: "PIN disabled" }, error: null };
        if (row.pin_locked_until && new Date(row.pin_locked_until).getTime() > Date.now()) {
          return { data: { ok: false, error: "PIN temporarily locked" }, error: null };
        }
        const valid = row.pin_hash ? await Bun.password.verify(String(args._pin || ""), String(row.pin_hash)) : false;
        if (!valid) {
          db.prepare("UPDATE employee_pos_permissions SET failed_pin_attempts=COALESCE(failed_pin_attempts,0)+1 WHERE id=?").run(row.id);
          return { data: { ok: false, error: "Incorrect PIN" }, error: null };
        }
        db.prepare("UPDATE employee_pos_permissions SET failed_pin_attempts=0,pin_locked_until=NULL,last_pin_login_at=datetime('now') WHERE id=?").run(row.id);
        return { data: { ok: true }, error: null };
      }
      case "set_cashier_pin": {
        const permissionId = String(args._permission_id || "");
        const pin = String(args._pin || "");
        if (!/^\\d{4,8}$/.test(pin)) return { data: { ok: false, error: "PIN must be 4-8 digits" }, error: null };
        const hash = await Bun.password.hash(pin);
        const result = db.prepare(
          "UPDATE employee_pos_permissions SET pin_hash=?,pin_set_at=datetime('now'),pin_disabled=0,failed_pin_attempts=0,pin_locked_until=NULL WHERE id=? AND is_active=1",
        ).run(hash, permissionId);
        if (!result.changes) return { data: { ok: false, error: "Cashier profile not found" }, error: null };
        return { data: { ok: true }, error: null };
      }
      case "set_cashier_pin_state": {
        const permissionId = String(args._permission_id || "");
        const disabled = Boolean(args._disabled);
        const unlock = Boolean(args._unlock);
        const result = db.prepare(
          "UPDATE employee_pos_permissions SET pin_disabled=?,pin_locked_until=CASE WHEN ? THEN NULL ELSE pin_locked_until END,failed_pin_attempts=CASE WHEN ? THEN 0 ELSE COALESCE(failed_pin_attempts,0) END WHERE id=? AND is_active=1",
        ).run(disabled ? 1 : 0, unlock ? 1 : 0, unlock ? 1 : 0, permissionId);
        if (!result.changes) return { data: { ok: false, error: "Cashier profile not found" }, error: null };
        return { data: { ok: true }, error: null };
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
    if (onFulfilled) return result.then(onFulfilled, onRejected);
    return result;
  }
}

export const supabaseAdmin = {
  from(table: string) { return new ServerQueryBuilder(table, "select"); },
  rpc(name: string, args: Record<string, any> = {}) { return new AdminRpcBuilder(name, args); },
};
