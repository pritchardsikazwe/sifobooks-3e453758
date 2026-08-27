/**
 * Connectivity model for SifoBooks.
 *
 * `navigator.onLine` only proves a local link exists, so we additionally probe
 * the backend. Sync state is derived from the IndexedDB queue.
 */
import { getMeta } from "@/lib/offline-db";
import { countQueue, drainQueue, queueStats, subscribeQueue } from "@/lib/offline-queue";

export type ConnState = "online" | "offline" | "syncing" | "synced";

export type NetworkSnapshot = {
  state: ConnState;
  browserOnline: boolean;
  backendReachable: boolean;
  pending: number;
  failed: number;
  lastSyncAt: number | null;
  syncing: boolean;
};

let snap: NetworkSnapshot = {
  state: "online",
  browserOnline: true,
  backendReachable: true,
  pending: 0,
  failed: 0,
  lastSyncAt: null,
  syncing: false,
};

const listeners = new Set<(s: NetworkSnapshot) => void>();
let started = false;
let syncedFlashTimer: ReturnType<typeof setTimeout> | null = null;

function emit(patch: Partial<NetworkSnapshot>) {
  snap = { ...snap, ...patch };
  if (!snap.browserOnline || !snap.backendReachable) snap.state = "offline";
  else if (snap.syncing) snap.state = "syncing";
  else if (snap.state !== "synced") snap.state = "online";
  listeners.forEach((l) => l(snap));
}

export function getNetworkSnapshot() {
  return snap;
}

export function subscribeNetwork(fn: (s: NetworkSnapshot) => void) {
  listeners.add(fn);
  fn(snap);
  startMonitor();
  return () => listeners.delete(fn);
}

async function probeBackend(): Promise<boolean> {
  const url = import.meta.env['VITE_SUPABASE_URL'];
  if (!url) return navigator.onLine;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    // No credentials, no caching — just a reachability check.
    await fetch(`${url}/auth/v1/health`, { method: "GET", cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

async function refreshCounts() {
  const { pending, failed } = await queueStats();
  const lastSyncAt = (await getMeta<number>("last_sync_at")) ?? null;
  emit({ pending, failed, lastSyncAt });
}

/** Manual "Sync Now". Returns the drain result. */
export async function syncNow() {
  emit({ syncing: true });
  try {
    const res = await drainQueue();
    await refreshCounts();
    const remaining = await countQueue();
    if (res.ok && remaining === 0) {
      emit({ syncing: false, state: "synced" });
      if (syncedFlashTimer) clearTimeout(syncedFlashTimer);
      syncedFlashTimer = setTimeout(() => emit({}), 5000);
    }
    return res;
  } finally {
    emit({ syncing: false });
  }
}

export function startMonitor() {
  if (started || typeof window === "undefined") return;
  started = true;

  const setOnlineFlag = async () => {
    const browserOnline = navigator.onLine;
    emit({ browserOnline });
    const backendReachable = browserOnline ? await probeBackend() : false;
    emit({ backendReachable });
    if (browserOnline && backendReachable) void syncNow();
  };

  void setOnlineFlag();
  void refreshCounts();

  window.addEventListener("online", () => void setOnlineFlag());
  window.addEventListener("offline", () => emit({ browserOnline: false, backendReachable: false }));
  subscribeQueue(() => void refreshCounts());
  // Periodic reachability check — the network can die without an event.
  setInterval(() => void setOnlineFlag(), 45_000);
}
