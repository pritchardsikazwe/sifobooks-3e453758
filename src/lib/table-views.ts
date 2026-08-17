// LocalStorage-backed saved views for DataTable screens.
// A "view" captures search text, sorting, pagination and column layout.

export type TableViewState = {
  q: string;
  sortKey: string | null;
  sortDir: "asc" | "desc";
  hidden: Record<string, boolean>;
  widths: Record<string, number>;
  density: "compact" | "comfortable";
  pageSize: number;
  page: number;
};

export type SavedView = { id: string; name: string; state: TableViewState };

type Store = { views: SavedView[]; activeId: string | null };

const key = (tableId: string) => `sifo.table.views.${tableId}`;

const empty: Store = { views: [], activeId: null };

export function loadViews(tableId?: string): Store {
  if (!tableId || typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(key(tableId));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Store;
    return { views: Array.isArray(parsed.views) ? parsed.views : [], activeId: parsed.activeId ?? null };
  } catch {
    return empty;
  }
}

export function persistViews(tableId: string | undefined, store: Store) {
  if (!tableId || typeof window === "undefined") return;
  try { window.localStorage.setItem(key(tableId), JSON.stringify(store)); } catch { /* noop */ }
}

export function newViewId() {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
