// Offline write queue backed by IndexedDB.
// Used to queue supabase.from(table).insert(payload) calls when the device
// is offline, and drain them when connectivity returns.
import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "sifo-offline";
const STORE = "queue";
const VERSION = 1;

export type QueuedItem = {
  id?: number;
  table: string;
  payload: any;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    Promise.resolve(fn(store)).then((v) => {
      t.oncomplete = () => resolve(v);
      t.onerror = () => reject(t.error);
    }, reject);
  });
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function queueInsert(table: string, payload: any) {
  await tx("readwrite", (s) =>
    req(s.add({ table, payload, createdAt: Date.now(), attempts: 0 } as QueuedItem)),
  );
  notifyChange();
}

export async function listQueue(): Promise<QueuedItem[]> {
  return tx("readonly", (s) => req(s.getAll())) as Promise<QueuedItem[]>;
}

export async function countQueue(): Promise<number> {
  try {
    return (await tx("readonly", (s) => req(s.count()))) as number;
  } catch {
    return 0;
  }
}

async function removeItem(id: number) {
  await tx("readwrite", (s) => req(s.delete(id)));
}
async function updateItem(item: QueuedItem) {
  await tx("readwrite", (s) => req(s.put(item)));
}

let draining = false;
export async function drainQueue(): Promise<{ ok: number; failed: number }> {
  if (draining || typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: 0, failed: 0 };
  }
  draining = true;
  let ok = 0, failed = 0;
  try {
    const items = await listQueue();
    for (const it of items) {
      const { error } = await supabase.from(it.table as any).insert(it.payload);
      if (error) {
        failed++;
        it.attempts += 1;
        it.lastError = error.message;
        // Give up after 8 attempts to avoid poison-message loops.
        if (it.attempts >= 8 && it.id != null) await removeItem(it.id);
        else await updateItem(it);
      } else {
        ok++;
        if (it.id != null) await removeItem(it.id);
      }
    }
  } finally {
    draining = false;
    notifyChange();
  }
  return { ok, failed };
}

const EVT = "sifo-offline-queue-change";
function notifyChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}
export function subscribeQueue(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVT, fn);
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener(EVT, fn);
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}

/**
 * Try a direct Supabase insert. If offline OR a network-level error occurs,
 * queue for later replay and return a synthetic success.
 * Note: server-side triggers (e.g. auto-posting to GL) still run when the
 * insert is finally replayed online.
 */
export async function offlineInsert(
  table: string,
  payload: any,
): Promise<{ error: null | { message: string }; queued: boolean }> {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  if (!online) {
    await queueInsert(table, payload);
    return { error: null, queued: true };
  }
  try {
    const { error } = await supabase.from(table as any).insert(payload);
    if (error && /fetch|network|Failed to fetch|NetworkError/i.test(error.message)) {
      await queueInsert(table, payload);
      return { error: null, queued: true };
    }
    return { error: error ? { message: error.message } : null, queued: false };
  } catch (e: any) {
    // Thrown network errors
    await queueInsert(table, payload);
    return { error: null, queued: true };
  }
}

/** Register auto-drain on page load and connectivity restore. */
export function installOfflineAutoDrain() {
  if (typeof window === "undefined") return;
  const run = () => { void drainQueue(); };
  window.addEventListener("online", run);
  // Try once on load in case items are pending from a previous session
  setTimeout(run, 2000);
  // Periodic best-effort every 60s
  setInterval(run, 60_000);
}
