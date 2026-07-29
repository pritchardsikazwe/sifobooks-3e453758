// LocalStorage-backed report favorites + recently-viewed tracking.

const FAV_KEY = "sifobooks.reports.favorites.v1";
const RECENT_KEY = "sifobooks.reports.recent.v1";
const LAST_GEN_KEY = "sifobooks.reports.lastgen.v1";

const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
};

export function getFavorites(): string[] { return read<string[]>(FAV_KEY, []); }
export function isFavorite(id: string): boolean { return getFavorites().includes(id); }
export function toggleFavorite(id: string): boolean {
  const cur = getFavorites();
  const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
  write(FAV_KEY, next);
  return next.includes(id);
}

export type RecentEntry = { id: string; at: string };
export function getRecent(): RecentEntry[] { return read<RecentEntry[]>(RECENT_KEY, []); }
export function trackVisit(id: string) {
  const cur = getRecent().filter(r => r.id !== id);
  write(RECENT_KEY, [{ id, at: new Date().toISOString() }, ...cur].slice(0, 20));
}

export function getLastGenerated(): Record<string, string> {
  return read<Record<string, string>>(LAST_GEN_KEY, {});
}
export function markGenerated(id: string) {
  const cur = getLastGenerated();
  cur[id] = new Date().toISOString();
  write(LAST_GEN_KEY, cur);
}
