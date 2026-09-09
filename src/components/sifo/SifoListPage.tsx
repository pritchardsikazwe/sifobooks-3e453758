import type { ReactNode } from "react";
import { Plus, Printer, Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SifoListColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
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
  status?: (row: T) => { label: string; tone?: "default" | "success" | "warning" | "danger" } | null;
  filters?: ReactNode;
  actions?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
};

const toneClass: Record<NonNullable<ReturnType<NonNullable<SifoListPageProps<any>["status"]>>>["tone"] extends infer T ? Extract<T, string> : never, string> = {
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
  status,
  filters,
  actions,
  empty,
  loading = false,
}: SifoListPageProps<T>) {
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

      <div className="sifo-list-toolbar">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {onSearch && <Input value={search} onChange={e => onSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="h-9 max-w-sm" />}
          {filters}
        </div>
        <span className="sifo-record-count">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
      </div>

      <div className="sifo-table-shell">
        <div className="overflow-x-auto">
          <table className="sifo-table">
            <thead><tr>
              {columns.map(c => <th key={c.key} className={cn(c.className, c.align === "right" && "text-right", c.align === "center" && "text-center")}>{c.label}</th>)}
              {(onView || onPrint) && <th className="text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={columns.length + 1} className="sifo-table-state">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={columns.length + 1} className="sifo-table-state">{empty ?? "No records found."}</td></tr> : rows.map(row => (
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
    </section>
  );
}

export function SifoStatus({ label, tone = "default" }: { label: string; tone?: keyof typeof toneClass }) {
  return <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-xs font-medium", toneClass[tone])}>{label}</Badge>;
}
