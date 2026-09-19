import { createServerFn } from "@tanstack/react-start";
import { executeQuery, type QuerySpec } from "./query-executor";
import { signUp, signInWithPassword, getUser, getSession, updateUser, verifyToken } from "./auth";
import { getDb, generateUUID } from "./database";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

// ── Query execution ──
export const executeQueryFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as QuerySpec)
  .handler(async ({ data }) => {
    return executeQuery(data);
  });

// ── Auth ──
export const signUpFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { email: string; password: string; metadata?: Record<string, any> })
  .handler(async ({ data }) => {
    return signUp(data.email, data.password, data.metadata);
  });

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { email: string; password: string })
  .handler(async ({ data }) => {
    return signInWithPassword(data.email, data.password);
  });

export const getUserFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { token: string })
  .handler(async ({ data }) => {
    return getUser(data.token);
  });

export const getSessionFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { token: string })
  .handler(async ({ data }) => {
    return getSession(data.token);
  });

export const updateUserFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { token: string; attrs: Record<string, any> })
  .handler(async ({ data }) => {
    return updateUser(data.token, data.attrs);
  });

// ── Storage ──
const STORAGE_DIR = join(process.cwd(), "data", "storage");

export const uploadFileFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { bucket: string; path: string; data: string; upsert?: boolean })
  .handler(async ({ data }) => {
    try {
      const dir = join(STORAGE_DIR, data.bucket);
      mkdirSync(dir, { recursive: true });
      const filePath = join(dir, data.path);
      if (!data.upsert && existsSync(filePath)) {
        return { data: null, error: { message: "File already exists" } };
      }
      const buffer = Buffer.from(data.data, "base64");
      writeFileSync(filePath, buffer);
      return { data: { path: data.path }, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  });

export const getSignedUrlFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { bucket: string; path: string })
  .handler(async ({ data }) => {
    // Return a local URL — no signing needed for local storage
    return { data: { signedUrl: `/api/storage/${data.bucket}/${data.path}` }, error: null };
  });

export const removeFileFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { bucket: string; paths: string[] })
  .handler(async ({ data }) => {
    try {
      for (const p of data.paths) {
        const filePath = join(STORAGE_DIR, data.bucket, p);
        if (existsSync(filePath)) unlinkSync(filePath);
      }
      return { data: null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  });

// ── RPC ──
export const rpcFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { name: string; args: Record<string, any> })
  .handler(async ({ data }) => {
    return executeRpc(data.name, data.args);
  });

// ── Token verification (for auth middleware) ──
export const verifyTokenFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { token: string })
  .handler(async ({ data }) => {
    const result = await verifyToken(data.token);
    return result;
  });

// ── RPC implementations ──
function executeRpc(name: string, args: Record<string, any>): { data: any; error: any } {
  const db = getDb();
  try {
    switch (name) {
      case "next_doc_number": {
        const uid = args._uid;
        const prefix = args._prefix || "DOC";
        const year = new Date().getFullYear();
        const pattern = `${prefix}-${year}-%`;
        const row = db.prepare(
          `SELECT number FROM (SELECT invoice_number AS number FROM invoices WHERE user_id = ? AND invoice_number LIKE ?
           UNION ALL SELECT bill_number AS number FROM bills WHERE user_id = ? AND bill_number LIKE ?
           UNION ALL SELECT number FROM journal_entries WHERE user_id = ? AND number LIKE ?
           UNION ALL SELECT quote_number AS number FROM quotes WHERE user_id = ? AND quote_number LIKE ?)
           ORDER BY number DESC LIMIT 1`
        ).get(uid, pattern, uid, pattern, uid, pattern, uid, pattern) as any;
        let seq = 1;
        if (row?.number) {
          const match = String(row.number).match(/(\d+)$/);
          if (match) seq = parseInt(match[1]) + 1;
        }
        return { data: `${prefix}-${year}-${String(seq).padStart(4, "0")}`, error: null };
      }
      case "has_role": {
        const userId = args._user_id;
        const role = args._role;
        const row = db.prepare("SELECT role FROM user_roles WHERE user_id = ? AND role = ?").get(userId, role) as any;
        return { data: !!row, error: null };
      }
      case "can_manage_company": {
        const userId = args._user_id;
        const companyId = args._company_id;
        const row = db.prepare("SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND role IN ('admin', 'owner')").get(userId, companyId) as any;
        return { data: !!row, error: null };
      }
      case "is_company_admin": {
        const userId = args._user_id;
        const companyId = args._company_id;
        const row = db.prepare("SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND role IN ('admin', 'owner')").get(userId, companyId) as any;
        return { data: !!row, error: null };
      }
      case "ensure_account": {
        const uid = args._uid;
        const code = args._code;
        const name = args._name;
        const type = args._type;
        let row = db.prepare("SELECT id FROM chart_of_accounts WHERE user_id = ? AND account_code = ?").get(uid, code) as any;
        if (row) return { data: row.id, error: null };
        const id = generateUUID();
        db.prepare("INSERT INTO chart_of_accounts (id, user_id, account_code, account_name, account_type, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))")
          .run(id, uid, code, name, type);
        return { data: id, error: null };
      }
      case "current_tenant": {
        // Return the first company for the user
        const row = db.prepare("SELECT company_id FROM company_members WHERE user_id = ? LIMIT 1").get(args._uid || "") as any;
        return { data: row?.company_id || null, error: null };
      }
      case "has_perm": {
        return { data: true, error: null }; // Permissive for local dev
      }
      case "pos_can": {
        return { data: true, error: null };
      }
      case "pos_has_books": {
        return { data: true, error: null };
      }
      case "my_access": {
        return { data: { role: "admin", permissions: [] }, error: null };
      }
      case "can_act_on_request": {
        return { data: true, error: null };
      }
      case "approver_role_for_request": {
        return { data: "admin", error: null };
      }
      case "has_override": {
        return { data: false, error: null };
      }
      case "fx_rate": {
        return { data: 1, error: null };
      }
      case "branch_ok": {
        return { data: true, error: null };
      }
      case "is_staff_of": {
        return { data: true, error: null };
      }
      case "notify_once": {
        return { data: null, error: null };
      }
      default:
        console.warn(`[rpc] Unimplemented: ${name}`);
        return { data: null, error: { message: `RPC "${name}" not implemented in local mode` } };
    }
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}
