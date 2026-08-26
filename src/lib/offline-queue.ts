// Offline write queue backed by IndexedDB.
// Queues supabase.from(table).insert(payload) calls made while the device (or
// the backend) is unreachable, and replays them exactly once when it returns.
import { supabase } from "@/integrations/supabase/client";
import {
  QUEUE_STORE,
  cacheRow,
  deviceId,
  idbReq,
  recordConflict,
  setMeta,
  withStore,
  type DataStore,
} from "@/lib/offline-db";

export type QueueStatus = "pending" | "syncing" | "failed" | "conflict";

export type QueuedItem = {
  id?: number;
  /** Idempotency key generated on this device. */
  clientId: string;
  device?: string;
  table: string;
  payload: any;
  status: QueueStatus;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  serverId?: string;
  /** Natural key used to detect a transaction the server already accepted. */
  dedupe?: { field: string; value: string } | null;
};

const MAX_ATTEMPTS = 12;
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

/* ------------------------------ queue plumbing ----------------------------- */

const DEDUPE_FIELDS = [
  "client_ref",
  "invoice_number",
  "receipt_number",
  "quote_number",
  "bill_number",
  "voucher_no",
  "reference",
  "reference_no",
  "txn_ref",
  "number",
];

function dedupeKeyFor(payload: any): { field: string; value: string } | null {
  if (!payload || typeof payload !== "object") return null;
  for (const f of DEDUPE_FIELDS) {
    const v = payload[f];
    if (typeof v === "string" && v.trim()) return { field: f, value: v };
  }
  return null;
}

export function newClientId(prefix = "cid") {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${rnd}`;
}

/** Local reference for documents created offline, e.g. OFFLINE-INV-8F3K21. */
export function offlineReference(kind: string) {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OFFLINE-${kind.toUpperCase()}-${rnd}`;
}

export async function queueInsert(table: string, payload: any, clientId?: string) {
  const now = Date.now();
  const item: QueuedItem = {
    clientId: clientId ?? newClientId(),
    device: await deviceId(),
    table,
    payload,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    nextAttemptAt: now,
    dedupe: dedupeKeyFor(payload),
  };
  await withStore(QUEUE_STORE, "readwrite", (s) => idbReq(s.add(item)));
  notifyChange();
  return item.clientId;
}

export async function listQueue(): Promise<QueuedItem[]> {
  try {
    return (await withStore(QUEUE_STORE, "readonly", (s) => idbReq(s.getAll()))) as QueuedItem[];
  } catch {
    return [];
  }
}

export async function countQueue(): Promise<number> {
  try {
    return (await withStore(QUEUE_STORE, "readonly", (s) => idbReq(s.count()))) as number;
  } catch {
    return 0;
  }
}

export async function queueStats() {
  const items = await listQueue();
  return {
    total: items.length,
    pending: items.filter((i) => i.status !== "failed" && i.status !== "conflict").length,
    failed: items.filter((i) => i.status === "failed" || i.status === "conflict").length,
    items,
  };
}

async function removeItem(id: number) {
  await withStore(QUEUE_STORE, "readwrite", (s) => idbReq(s.delete(id)));
}
async function putItem(item: QueuedItem) {
  await withStore(QUEUE_STORE, "readwrite", (s) => idbReq(s.put(item)));
}

/** Drop an item the user explicitly discards (kept as an audit conflict row). */
export async function discardQueued(item: QueuedItem, reason = "Discarded by user") {
  await recordConflict({
    table: item.table,
    clientId: item.clientId,
    reason,
    payload: item.payload,
    at: Date.now(),
  });
  if (item.id != null) await removeItem(item.id);
  notifyChange();
}

export async function retryQueued(id: number) {
  const items = await listQueue();
  const it = items.find((i) => i.id === id);
  if (!it) return;
  it.status = "pending";
  it.attempts = 0;
  it.nextAttemptAt = Date.now();
  await putItem(it);
  notifyChange();
  void drainQueue();
}

function isNetworkError(message: string) {
  return /fetch|network|timeout|Failed to fetch|NetworkError|ECONN|502|503|504/i.test(message);
}

function backoffMs(attempts: number) {
  // 5s, 10s, 20s … capped at 15 minutes.
  return Math.min(5_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
}

/**
 * Was this transaction already accepted by the server on an earlier attempt?
 * Uses the document's natural reference so an interrupted sync can never
 * create a second accounting record.
 */
async function alreadyOnServer(item: QueuedItem): Promise<boolean> {
  if (!item.dedupe) return false;
  try {
    const { data, error } = await supabase
      .from(item.table as any)
      .select("id")
      .eq(item.dedupe.field, item.dedupe.value)
      .limit(1);
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

let draining = false;

export async function drainQueue(): Promise<{ ok: number; failed: number }> {
  if (draining) return { ok: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: 0, failed: 0 };
  draining = true;
  let ok = 0;
  let failed = 0;
  try {
    const items = (await listQueue()).sort((a, b) => a.createdAt - b.createdAt);
    const now = Date.now();
    for (const it of items) {
      if (it.status === "conflict") continue;
      if ((it.nextAttemptAt ?? 0) > now) continue;

      it.status = "syncing";
      it.updatedAt = Date.now();
      await putItem(it);
      notifyChange();

      // Duplicate protection for retries of a possibly-accepted write.
      if (it.attempts > 0 && (await alreadyOnServer(it))) {
        ok++;
        if (it.id != null) await removeItem(it.id);
        continue;
      }

      try {
        const { data, error } = await supabase
          .from(it.table as any)
          .insert(it.payload)
          .select("id")
          .maybeSingle();

        if (error) {
          it.attempts += 1;
          it.lastError = error.message;
          it.updatedAt = Date.now();
          if (isNetworkError(error.message) && it.attempts < MAX_ATTEMPTS) {
            it.status = "pending";
            it.nextAttemptAt = Date.now() + backoffMs(it.attempts);
          } else {
            // Business/permission rejection — never silently discard it.
            it.status = "failed";
            it.nextAttemptAt = Date.now() + backoffMs(it.attempts);
            if (it.attempts >= MAX_ATTEMPTS) {
              it.status = "conflict";
              await recordConflict({
                table: it.table,
                clientId: it.clientId,
                reason: error.message,
                payload: it.payload,
                at: Date.now(),
              });
            }
          }
          await putItem(it);
          failed++;
        } else {
          ok++;
          it.serverId = (data as any)?.id;
          if (it.id != null) await removeItem(it.id);
        }
      } catch (e: any) {
        it.attempts += 1;
        it.lastError = e?.message ?? String(e);
        it.status = it.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
        it.nextAttemptAt = Date.now() + backoffMs(it.attempts);
        it.updatedAt = Date.now();
        await putItem(it);
        failed++;
      }
    }
    if (ok) await setMeta("last_sync_at", Date.now());
  } finally {
    draining = false;
    notifyChange();
  }
  return { ok, failed };
}

/**
 * Try a direct Supabase insert. If offline OR a network-level error occurs,
 * queue for later replay and return a synthetic success. Optionally mirrors the
 * record into an offline cache store so the UI shows it immediately.
 *
 * Server-side triggers (e.g. auto-posting to the GL) still run when the insert
 * is finally replayed online.
 */
export async function offlineInsert(
  table: string,
  payload: any,
  opts?: { cacheStore?: DataStore },
): Promise<{ error: null | { message: string }; queued: boolean; clientId?: string }> {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  const stash = async () => {
    const clientId = await queueInsert(table, payload);
    if (opts?.cacheStore) {
      await cacheRow(opts.cacheStore, {
        ...payload,
        id: clientId,
        __offline: true,
        __clientId: clientId,
        created_at: payload?.created_at ?? new Date().toISOString(),
      });
    }
    return { error: null, queued: true, clientId };
  };

  if (!online) return stash();

  try {
    const { error } = await supabase.from(table as any).insert(payload);
    if (error && isNetworkError(error.message)) return stash();
    return { error: error ? { message: error.message } : null, queued: false };
  } catch {
    return stash();
  }
}

/** Register auto-drain on load, connectivity restore and background sync. */
export function installOfflineAutoDrain() {
  if (typeof window === "undefined") return;
  const run = () => {
    void drainQueue();
  };
  window.addEventListener("online", run);
  window.addEventListener("focus", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run();
  });
  setTimeout(run, 2000);
  setInterval(run, 60_000);

  // Background Sync where supported — the SW wakes this tab (or a fresh one).
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg: any) => reg.sync?.register?.("sifobooks-sync"))
      .catch(() => {});
    navigator.serviceWorker.addEventListener("message", (e: MessageEvent) => {
      if ((e.data as any)?.type === "SIFO_SYNC") run();
    });
  }
}
