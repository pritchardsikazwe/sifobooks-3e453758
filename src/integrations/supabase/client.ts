// Client-side Supabase compatibility shim.
// Mimics the Supabase JS client API but routes all calls to local SQLite via server functions.
import { executeQueryFn, signUpFn, signInFn, getUserFn, getSessionFn, updateUserFn, adminResetPasswordFn, uploadFileFn, getSignedUrlFn, removeFileFn, rpcFn } from "@/lib/db/server-api";
import type { QuerySpec, FilterOp } from "@/lib/db/query-executor";

const TOKEN_KEY = "sifobooks-auth-token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  notifyAuthListeners();
}

// ── Auth state change listeners ──
const authListeners = new Set<(event: string, session: any) => void>();
function notifyAuthListeners(event = "SIGNED_IN", session: any = null) {
  authListeners.forEach(cb => cb(event, session));
}

// ── Query Builder ──
class QueryBuilder {
  private spec: QuerySpec;

  constructor(table: string, operation: QuerySpec["operation"]) {
    this.spec = { table, operation, filters: [], order: [], limit: null, range: null, single: false, maybeSingle: false };
  }

  select(columns: string = "*") { this.spec.columns = columns; return this; }
  insert(data: any) { this.spec.operation = "insert"; this.spec.insertData = data; return this; }
  upsert(data: any, opts?: { onConflict?: string }) { this.spec.operation = "insert"; this.spec.insertData = data; this.spec.onConflict = opts?.onConflict ?? null; return this; }
  update(data: any) { this.spec.operation = "update"; this.spec.updateData = data; return this; }
  delete() { this.spec.operation = "delete"; return this; }

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
  or(expr: string) { this.spec.filters.push({ column: "__or__", op: "or", value: expr }); return this; }
  contains(col: string, val: any) { this.spec.filters.push({ column: col, op: "like", value: `%${JSON.stringify(val)}%` }); return this; }
  overlaps(col: string, val: any[]) { this.spec.filters.push({ column: col, op: "like", value: `%${val.join(",")}%` }); return this; }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.spec.order.push({ column: col, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst });
    return this;
  }
  limit(n: number) { this.spec.limit = n; return this; }
  range(from: number, to: number) { this.spec.range = [from, to]; return this; }
  single() { this.spec.single = true; return this; }
  maybeSingle() { this.spec.maybeSingle = true; return this; }
  onConflict(col: string) { this.spec.onConflict = col; return this; }
  count(type?: string) { this.spec.count = type || "exact"; return this; }

  // Negation filters
  get not() {
    const self = this;
    return {
      eq: (col: string, val: any) => { self.spec.filters.push({ column: col, op: "not.eq", value: val }); return self; },
      in: (col: string, vals: any[]) => { self.spec.filters.push({ column: col, op: "not.in", value: vals }); return self; },
      like: (col: string, val: string) => { self.spec.filters.push({ column: col, op: "not.like", value: val }); return self; },
      ilike: (col: string, val: string) => { self.spec.filters.push({ column: col, op: "not.like", value: val }); return self; },
    };
  }

  // Make thenable — `await` triggers execution
  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    return executeQueryFn({ data: { ...this.spec, authToken: getToken() } } as any).then(
      (result: any) => onFulfilled ? onFulfilled(result) : result,
      (err: any) => onRejected ? onRejected(err) : err
    );
  }
}

// ── RPC Builder ──
class RpcBuilder {
  private name: string;
  private args: Record<string, any>;
  constructor(name: string, args: Record<string, any>) {
    this.name = name; this.args = args;
  }
  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    return rpcFn({ data: { name: this.name, args: this.args, authToken: getToken() } } as any).then(
      (result: any) => onFulfilled ? onFulfilled(result) : result,
      (err: any) => onRejected ? onRejected(err) : err
    );
  }
}

// ── Storage ──
class StorageBucket {
  private bucket: string;
  constructor(bucket: string) { this.bucket = bucket; }

  async upload(path: string, file: File | Blob, opts?: { upsert?: boolean; contentType?: string }) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return uploadFileFn({ data: { bucket: this.bucket, path, data: base64, upsert: opts?.upsert } } as any);
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }

  async createSignedUrl(path: string, expiresIn: number) {
    return getSignedUrlFn({ data: { bucket: this.bucket, path } } as any);
  }

  async remove(paths: string[]) {
    return removeFileFn({ data: { bucket: this.bucket, paths } } as any);
  }
}

// ── Channel stub (no realtime in local mode) ──
class ChannelStub {
  private callbacks: ((payload: any) => void)[] = [];
  on(_event: string, _filter: any, callback?: (payload: any) => void) {
    if (callback) this.callbacks.push(callback);
    return this;
  }
  subscribe() {
    return { unsubscribe: () => {} };
  }
  unsubscribe() {}
}

// ── Auth ──
const auth = {
  async getUser() {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    return getUserFn({ data: { token } } as any);
  },

  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };
    const result = await getSessionFn({ data: { token } } as any);
    if (!result?.data?.session) {
      // Do not leave the UI in a "signed in" state with an expired/invalid JWT.
      setToken(null);
      return { data: { session: null }, error: null };
    }
    return result;
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) {
    const result = await signUpFn({ data: { email, password, metadata: options?.data } } as any);
    if (result?.data?.session?.access_token) {
      setToken(result.data.session.access_token);
      notifyAuthListeners("SIGNED_IN", result.data.session);
    }
    return result;
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const result = await signInFn({ data: { email, password } } as any);
    if (result?.data?.session?.access_token) {
      setToken(result.data.session.access_token);
      notifyAuthListeners("SIGNED_IN", result.data.session);
    }
    return result;
  },

  async setSession({ access_token }: { access_token: string }) {
    if (!access_token) return { data: { session: null }, error: { message: "Missing access token" } };
    const result = await getSessionFn({ data: { token: access_token } } as any);
    if (!result?.data?.session) return { data: { session: null }, error: { message: "Invalid session" } };
    setToken(access_token);
    notifyAuthListeners("SIGNED_IN", result.data.session);
    return { data: { session: result.data.session }, error: null };
  },

  async signOut() {
    setToken(null);
    notifyAuthListeners("SIGNED_OUT", null);
    return { error: null };
  },

  async updateUser(attrs: Record<string, any>) {
    const token = getToken();
    if (!token) return { data: null, error: { message: "Not authenticated" } };
    const result = await updateUserFn({ data: { token, attrs } } as any);
    if (result?.data?.session?.access_token) setToken(result.data.session.access_token);
    return result;
  },

  async adminResetPassword(targetUserId: string, newPassword: string, forceChange = true, reason = "Administrator password reset") {
    const token = getToken();
    if (!token) return { data: null, error: { message: "Not authenticated" } };
    return adminResetPasswordFn({ data: { authToken: token, targetUserId, newPassword, forceChange, reason } } as any);
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    authListeners.add(callback);
    // Also listen for storage events (cross-tab)
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === TOKEN_KEY) {
          callback(e.newValue ? "SIGNED_IN" : "SIGNED_OUT", null);
        }
      });
    }
    return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
  },

  // Stubs for unused methods
  resetPasswordForEmail: async () => ({ data: null, error: null }),
  verifyOtp: async () => ({ data: null, error: null }),
  getClaims: async (token: string) => {
    const result = await getUserFn({ data: { token } } as any);
    return result;
  },
};

// ── Main supabase object ──
const supabaseImpl = {
  from(table: string) {
    return new QueryBuilder(table, "select");
  },
  auth,
  storage: {
    from(bucket: string) { return new StorageBucket(bucket); },
  },
  channel(_name: string) { return new ChannelStub(); },
  rpc(name: string, args: Record<string, any> = {}) {
    return new RpcBuilder(name, args);
  },
  // Channel cleanup stubs for local SQLite mode.
  removeChannel(_channel: any) {},
  removeAllChannels() {},
};
// Loosely typed on purpose: callers were written against the Supabase client API.
export const supabase: any = supabaseImpl;
