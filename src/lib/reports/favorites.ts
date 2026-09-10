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

/* ------------------------------------------------------------------ */
/* Saved views: a report route plus its period and options, so a user  */
/* can re-run the same report later for another period.                */
/* ------------------------------------------------------------------ */

const SAVED_KEY = "sifobooks.reports.saved.v1";

export type SavedView = { id: string; name: string; path: string; at: string };

export function getSavedViews(): SavedView[] { return read<SavedView[]>(SAVED_KEY, []); }

export function saveView(v: { name: string; path: string }): SavedView {
  const entry: SavedView = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: v.name,
    path: v.path,
    at: new Date().toISOString(),
  };
  const cur = getSavedViews().filter(x => !(x.name === v.name && x.path === v.path));
  write(SAVED_KEY, [entry, ...cur].slice(0, 50));
  return entry;
}

export function removeSavedView(id: string) {
  write(SAVED_KEY, getSavedViews().filter(v => v.id !== id));
}
