import type { ReactNode } from "react";
import { Plus, Printer, Eye, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SifoListStatusTone = "default" | "success" | "warning" | "danger";

export type SifoListColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  mobile?: boolean;
};

export type SifoListStat = {
  label: string;
  value: ReactNode;
  tone?: SifoListStatusTone;
};

export type SifoListPageProps<T> = {
  title: string;
  description?: string;
  rows: T[];
  columns: SifoListColumn<T>[];
  getRowId: (row: T) => string;
  search?: string;
  onSearch?: (value: string) => void;
  onNew?: () => void;
  onView?: (row: T) => void;
  onPrint?: (row: T) => void;
  filters?: ReactNode;
  actions?: ReactNode;
  empty?: ReactNode;
  emptyAction?: ReactNode;
  loading?: boolean;
  stats?: SifoListStat[];
  filterSummary?: string;
  onClearFilters?: () => void;
};

const toneClass: Record<SifoListStatusTone, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
};

export function SifoListPage<T>({
  title,
  description,
  rows,
  columns,
  getRowId,
  search = "",
  onSearch,
  onNew,
  onView,
  onPrint,
  filters,
  actions,
  empty,
  emptyAction,
  loading = false,
  stats = [],
  filterSummary,
  onClearFilters,
}: SifoListPageProps<T>) {
  const mobileColumns = columns.filter(c => c.mobile !== false).slice(0, 4);

  return (
    <section className="sifo-list-page">
      <header className="sifo-page-header">
        <div className="min-w-0">
          <div className="sifo-breadcrumb">SifoBooks / {title}</div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="sifo-page-actions">
          {actions}
          {onNew && <Button onClick={onNew} className="h-9"><Plus className="mr-1.5 h-4 w-4" />New {title.replace(/s$/i, "")}</Button>}
        </div>
      </header>

      {stats.length > 0 && (
        <div className="sifo-kpi-grid grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
          {stats.map(stat => (
            <div key={stat.label} className="sifo-kpi-card rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
              <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</div>
              <div className={cn("mt-1 text-base font-bold tabular-nums", stat.tone ? toneClass[stat.tone].split(" ").find(c => c.startsWith("text-")) : "text-foreground")}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="sifo-list-toolbar">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {onSearch && (
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => onSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="h-9 pl-9" />
            </div>
          )}
          {filters}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {filterSummary && <span className="hidden text-xs text-muted-foreground sm:inline">{filterSummary}</span>}
          {onClearFilters && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearFilters}><SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />Clear</Button>}
          <span className="sifo-record-count">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="sifo-table-shell hidden sm:block">
        <div className="overflow-x-auto">
          <table className="sifo-table">
            <thead><tr>
              {columns.map(c => <th key={c.key} className={cn(c.className, c.align === "right" && "text-right", c.align === "center" && "text-center")}>{c.label}</th>)}
              {(onView || onPrint) && <th className="text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={columns.length + 1} className="sifo-table-state">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={columns.length + 1} className="sifo-table-state"><div>{empty ?? "No records found."}</div>{emptyAction && <div className="mt-3">{emptyAction}</div>}</td></tr> : rows.map(row => (
                <tr key={getRowId(row)} className="sifo-table-row" onDoubleClick={() => onView?.(row)}>
                  {columns.map(c => <td key={c.key} className={cn(c.className, c.align === "right" && "text-right tabular-nums", c.align === "center" && "text-center")}>{c.render ? c.render(row) : String((row as any)[c.key] ?? "—")}</td>)}
                  {(onView || onPrint) && <td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      {onView && <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => onView(row)}><Eye className="mr-1 h-3.5 w-3.5" />View</Button>}
                      {onPrint && <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => onPrint(row)}><Printer className="mr-1 h-3.5 w-3.5" />Print</Button>}
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 sm:hidden">
        {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
            <div>{empty ?? "No records found."}</div>
            {emptyAction && <div className="mt-3">{emptyAction}</div>}
          </div>
        ) : rows.map(row => (
          <article key={getRowId(row)} className="rounded-xl border border-border bg-card p-3 shadow-sm active:scale-[0.995]">
            <div className="space-y-2">
              {mobileColumns.map((c, index) => (
                <div key={c.key} className={cn("flex items-start justify-between gap-4", index === 0 && "pb-1") }>
                  <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", index === 0 && "text-primary")}>{c.label}</span>
                  <span className={cn("min-w-0 text-right text-sm font-medium text-foreground", c.align === "right" && "tabular-nums")}>{c.render ? c.render(row) : String((row as any)[c.key] ?? "—")}</span>
                </div>
              ))}
            </div>
            {(onView || onPrint) && (
              <div className="mt-3 flex gap-2 border-t border-border pt-2">
                {onView && <Button size="sm" variant="outline" className="h-9 flex-1" onClick={() => onView(row)}><Eye className="mr-1.5 h-4 w-4" />View</Button>}
                {onPrint && <Button size="sm" variant="outline" className="h-9 flex-1" onClick={() => onPrint(row)}><Printer className="mr-1.5 h-4 w-4" />Print</Button>}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function SifoStatus({ label, tone = "default" }: { label: string; tone?: SifoListStatusTone }) {
  return <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-xs font-medium", toneClass[tone])}>{label}</Badge>;
}
