import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, SlidersHorizontal, Rows3, Rows2,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DTColumn<T> = {
  key: string;
  header: string;
  /** Cell renderer. Default renders row[key]. */
  cell?: (row: T) => ReactNode;
  /** Value used for sort + accessible search. Default: row[key]. */
  accessor?: (row: T) => string | number | null | undefined;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  /** Hide by default; user can enable via column menu. */
  defaultHidden?: boolean;
  /** Cannot be hidden. */
  sticky?: boolean;
  /** Initial column width in px (user can drag to resize). */
  width?: number;

};

type Props<T> = {
  data: T[];
  columns: DTColumn<T>[];
  /** Unique id per row. Default: row.id. */
  rowKey?: (row: T) => string;
  /** Enables checkbox column + bulk actions bar. */
  selectable?: boolean;
  /** Renders on the left of the toolbar (title, filters). */
  toolbarLeft?: ReactNode;
  /** Renders on the right of the toolbar (buttons, export). */
  toolbarRight?: ReactNode;
  /** Renders when selection is non-empty. Receives selected rows + a clear() fn. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  /** Row click opens detail. Selection checkbox is separate. */
  onRowClick?: (row: T) => void;
  /** Global search placeholder. Set null to hide search. */
  searchPlaceholder?: string | null;
  /** Empty state content. */
  empty?: ReactNode;
  pageSize?: number;
  /** Extra className for wrapper card. */
  className?: string;
  /** Persist column widths / visibility / density per user under this id. */
  tableId?: string;
  /** Allow dragging column edges to resize. Default true. */
  resizable?: boolean;
  /** Show a skeleton/spinner state instead of rows. */
  loading?: boolean;
  /** Show an error state instead of rows. */
  error?: string | null;
  /** Retry handler rendered inside the error state. */
  onRetry?: () => void;
  /** Footer totals keyed by column key, computed from the filtered rows. */
  totals?: (rows: T[]) => Record<string, ReactNode>;
};


type Prefs = {
  hidden?: Record<string, boolean>;
  widths?: Record<string, number>;
  density?: "compact" | "comfortable";
};

function loadPrefs(id?: string): Prefs {
  if (!id || typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(`sifo.table.${id}`) ?? "{}") as Prefs; }
  catch { return {}; }
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey = (r) => r.id,
  selectable = false,
  toolbarLeft,
  toolbarRight,
  bulkActions,
  onRowClick,
  searchPlaceholder = "Search…",
  empty,
  pageSize: initialPageSize = 25,
  className,
  tableId,
  resizable = true,
  loading = false,
  error = null,
  onRetry,
  totals,
}: Props<T>) {

  const saved = useMemo(() => loadPrefs(tableId), [tableId]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hidden, setHidden] = useState<Record<string, boolean>>(() =>
    saved.hidden ?? Object.fromEntries(columns.filter(c => c.defaultHidden).map(c => [c.key, true])),
  );
  const [widths, setWidths] = useState<Record<string, number>>(
    () => saved.widths ?? Object.fromEntries(columns.filter(c => c.width).map(c => [c.key, c.width!])),
  );
  const [density, setDensity] = useState<"compact" | "comfortable">(saved.density ?? "comfortable");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Remember the user's table layout between visits.
  useEffect(() => {
    if (!tableId || typeof window === "undefined") return;
    window.localStorage.setItem(`sifo.table.${tableId}`, JSON.stringify({ hidden, widths, density }));
  }, [tableId, hidden, widths, density]);

  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null);
  const startResize = useCallback((key: string, e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget.parentElement as HTMLElement | null);
    drag.current = { key, startX: e.clientX, startW: widths[key] ?? th?.offsetWidth ?? 140 };
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      const next = Math.max(64, drag.current.startW + (ev.clientX - drag.current.startX));
      setWidths(w => ({ ...w, [drag.current!.key]: next }));
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [widths]);

  const resetLayout = () => {
    setWidths({});
    setHidden(Object.fromEntries(columns.filter(c => c.defaultHidden).map(c => [c.key, true])));
    setDensity("comfortable");
  };

  const visibleColumns = useMemo(() => columns.filter(c => !hidden[c.key]), [columns, hidden]);


  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const needle = q.toLowerCase();
    return data.filter(row =>
      columns.some(c => {
        const v = c.accessor ? c.accessor(row) : row[c.key];
        return String(v ?? "").toLowerCase().includes(needle);
      }),
    );
  }, [data, q, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.accessor ? col.accessor(a) : a[col.key];
      const bv = col.accessor ? col.accessor(b) : b[col.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const selectedRows = useMemo(
    () => sorted.filter(r => selected.has(rowKey(r))),
    [sorted, selected, rowKey],
  );
  const allOnPageSelected = paged.length > 0 && paged.every(r => selected.has(rowKey(r)));
  const someOnPageSelected = paged.some(r => selected.has(rowKey(r)));

  const toggleAllOnPage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) paged.forEach(r => next.delete(rowKey(r)));
    else paged.forEach(r => next.add(rowKey(r)));
    setSelected(next);
  };
  const toggleRow = (row: T) => {
    const k = rowKey(row);
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortKey(null);
  };

  const rowPad = density === "compact" ? "py-1.5" : "py-2.5";

  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-sm overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 bg-card">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {searchPlaceholder !== null && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={e => { setQ(e.target.value); setPage(0); }}
                placeholder={searchPlaceholder ?? "Search…"}
                className="pl-8 h-9 text-sm"
              />
            </div>
          )}
          {toolbarLeft}
        </div>
        <div className="flex items-center gap-1.5">
          {toolbarRight}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setDensity(d => d === "compact" ? "comfortable" : "compact")}
            title={density === "compact" ? "Comfortable rows" : "Compact rows"}
          >
            {density === "compact" ? <Rows3 className="h-4 w-4" /> : <Rows2 className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground hover:text-foreground" title="Columns">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Toggle columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map(c => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  disabled={c.sticky}
                  checked={!hidden[c.key]}
                  onCheckedChange={v => setHidden(h => ({ ...h, [c.key]: !v }))}
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={resetLayout}>Reset layout</DropdownMenuItem>
            </DropdownMenuContent>

          </DropdownMenu>
        </div>
      </div>

      {/* Bulk bar */}
      {selectable && selectedRows.length > 0 && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-primary/5 text-sm">
          <span className="font-medium text-foreground">{selectedRows.length} selected</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>Clear</Button>
          <div className="ml-auto flex items-center gap-1.5">
            {bulkActions?.(selectedRows, clearSelection)}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border sticky top-0 z-[1]">
            <tr>
              {selectable && (
                <th className="w-10 pl-3 pr-1 py-2">
                  <Checkbox
                    checked={allOnPageSelected ? true : (someOnPageSelected ? "indeterminate" as any : false)}
                    onCheckedChange={toggleAllOnPage}
                    aria-label="Select all on page"
                  />
                </th>
              )}
              {visibleColumns.map(col => {
                const isSorted = sortKey === col.key;
                const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                return (
                  <th
                    key={col.key}
                    style={widths[col.key] ? { width: widths[col.key], minWidth: widths[col.key] } : undefined}
                    className={cn(
                      "relative px-3 py-2 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground select-none",
                      align,
                      col.headerClassName,
                    )}
                  >
                    {col.sortable !== false ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {col.header}
                        {isSorted
                          ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      col.header
                    )}
                    {resizable && (
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        onPointerDown={e => startResize(col.key, e)}
                        onDoubleClick={() => setWidths(w => { const n = { ...w }; delete n[col.key]; return n; })}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-primary/40"
                        title="Drag to resize · double-click to reset"
                      />
                    )}
                  </th>

                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="py-16 text-center text-muted-foreground">
                  {empty ?? "No records found."}
                </td>
              </tr>
            ) : paged.map(row => {
              const k = rowKey(row);
              const isSel = selected.has(k);
              return (
                <tr
                  key={k}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border/60 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer",
                    isSel ? "bg-primary/5" : "hover:bg-muted/40",
                  )}
                >
                  {selectable && (
                    <td className="pl-3 pr-1" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSel} onCheckedChange={() => toggleRow(row)} aria-label="Select row" />
                    </td>
                  )}
                  {visibleColumns.map(col => {
                    const align = col.align === "right" ? "text-right num" : col.align === "center" ? "text-center" : "text-left";
                    const v = col.cell ? col.cell(row) : (row as any)[col.key];
                    return (
                      <td key={col.key} className={cn("px-3 text-foreground/90", rowPad, align, col.className)}>
                        {v ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center gap-3 justify-between border-t border-border px-3 py-2 bg-card text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="bg-muted/40 border border-border rounded px-1.5 py-0.5 text-xs text-foreground"
          >
            {[25, 50, 100, 250].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="ml-2">
            {sorted.length === 0 ? "0" : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, sorted.length)}`} of {sorted.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-foreground">{currentPage + 1} / {pageCount}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
