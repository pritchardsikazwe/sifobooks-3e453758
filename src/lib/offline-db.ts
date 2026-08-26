/**
 * IndexedDB layer for SifoBooks offline mode.
 *
 * Holds (a) read-through caches of business data needed to keep modules usable
 * offline and (b) the durable pending-sync queue for writes captured offline.
 *
 * SECURITY: never write passwords, access/refresh tokens or any auth secret
 * into this database. Only business records the signed-in user already sees.
 */

const DB_NAME = "sifo-offline";
export const DB_VERSION = 2;

/** Offline read caches — one object store per entity, keyed by `id`. */
export const DATA_STORES = [
  "products",
  "customers",
  "suppliers",
  "invoices",
  "invoice_items",
  "quotations",
  "sales",
  "purchases",
  "inventory_movements",
  "pos_transactions",
  "payments",
  "expenses",
  "journals",
  "cashbook_transactions",
] as const;

export type DataStore = (typeof DATA_STORES)[number];

/** Queue of writes captured offline (legacy name `queue`, kept for migration). */
export const QUEUE_STORE = "queue";
/** Key/value metadata: last sync time, per-store freshness, device id. */
export const META_STORE = "sync_metadata";
/** Sync conflicts kept for the user to resolve — never auto-discarded. */
export const CONFLICT_STORE = "sync_conflicts";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
        db.createObjectStore(CONFLICT_STORE, { keyPath: "id", autoIncrement: true });
      }
      for (const s of DATA_STORES) {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
    req.onblocked = () => {
      /* another tab holds an old version; it will close eventually */
    };
  });
  return dbPromise;
}

export function idbReq<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(store, mode);
    } catch (e) {
      reject(e);
      return;
    }
    const os = tx.objectStore(store);
    Promise.resolve(fn(os)).then((value) => {
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }, reject);
  });
}

/* ------------------------------- data caches ------------------------------ */

/** Replace the cached rows for a store with a freshly fetched set. */
export async function cacheRows(store: DataStore, rows: any[]) {
  try {
    await withStore(store, "readwrite", (s) => {
      s.clear();
      for (const r of rows) if (r && r.id != null) s.put(r);
    });
    await setMeta(`freshness:${store}`, Date.now());
  } catch {
    /* caching is best-effort */
  }
}

/** Upsert a single row into a cache store (used for optimistic offline writes). */
export async function cacheRow(store: DataStore, row: any) {
  try {
    await withStore(store, "readwrite", (s) => s.put(row));
  } catch {
    /* best-effort */
  }
}

export async function readCached<T = any>(store: DataStore): Promise<T[]> {
  try {
    return (await withStore(store, "readonly", (s) => idbReq(s.getAll()))) as T[];
  } catch {
    return [];
  }
}

/** Epoch ms of the last successful refresh for a cache store, if any. */
export async function cacheFreshness(store: DataStore): Promise<number | null> {
  return (await getMeta<number>(`freshness:${store}`)) ?? null;
}

/* --------------------------------- metadata -------------------------------- */

export async function setMeta(key: string, value: any) {
  try {
    await withStore(META_STORE, "readwrite", (s) => s.put({ key, value }));
  } catch {
    /* best-effort */
  }
}

export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  try {
    const row: any = await withStore(META_STORE, "readonly", (s) => idbReq(s.get(key)));
    return row?.value as T;
  } catch {
    return undefined;
  }
}

/** Stable per-device identifier used on queued transactions for audit. */
export async function deviceId(): Promise<string> {
  let id = await getMeta<string>("device_id");
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await setMeta("device_id", id);
  }
  return id;
}

/* --------------------------------- conflicts ------------------------------- */

export type SyncConflict = {
  id?: number;
  table: string;
  clientId: string;
  reason: string;
  payload: any;
  serverRow?: any;
  at: number;
};

export async function recordConflict(c: Omit<SyncConflict, "id">) {
  try {
    await withStore(CONFLICT_STORE, "readwrite", (s) => idbReq(s.add(c)));
  } catch {
    /* best-effort */
  }
}

export async function listConflicts(): Promise<SyncConflict[]> {
  try {
    return (await withStore(CONFLICT_STORE, "readonly", (s) => idbReq(s.getAll()))) as SyncConflict[];
  } catch {
    return [];
  }
}

export async function clearConflict(id: number) {
  try {
    await withStore(CONFLICT_STORE, "readwrite", (s) => idbReq(s.delete(id)));
  } catch {
    /* best-effort */
  }
}

/** Wipe cached business data on sign-out. Pending writes are kept on purpose. */
export async function clearCachedBusinessData() {
  for (const s of DATA_STORES) {
    try {
      await withStore(s, "readwrite", (os) => os.clear());
    } catch {
      /* best-effort */
    }
  }
}
