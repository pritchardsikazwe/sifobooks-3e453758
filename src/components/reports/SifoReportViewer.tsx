import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Inbox,
  Loader2,
  Printer,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportMenu } from "@/lib/exports";
import { printBrandedDoc } from "@/services/printDocument";
import { reportResultToSpec } from "@/lib/reports/doc";
import { acctFmt, resultToExportRows, type ReportResult, type ReportRow } from "@/lib/reports/engine";
import { SifoSmartReporter } from "@/components/reports/SifoSmartReporter";
import type { ReportId } from "@/lib/reports/insights";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const toneClass: Record<string, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-destructive",
  default: "",
};

export function SifoReportViewer({
  reportId,
  title,
  subtitle,
  filename,
  filters,
  loading,
  error,
  result,
  extraActions,
}: {
  reportId: ReportId;
  title: string;
  subtitle?: string;
  filename: string;
  filters?: ReactNode;
  loading?: boolean;
  error?: string | null;
  result: ReportResult | null;
  extraActions?: ReactNode;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<string[]>(() => []);

  const visibleColumns = useMemo(() => {
    const base = result?.columns ?? [];
    const autoHidden = base.filter((c) => c.defaultHidden).map((c) => c.key);
    return base.filter((c) => !hidden.includes(c.key) && !(autoHidden.includes(c.key) && !hidden.includes(`show:${c.key}`)));
  }, [result, hidden]);

  const rows = result?.rows ?? [];

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      (result?.columns ?? []).some((c) => String(r[c.key] ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, q, result]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const emphasised = filtered.filter((r) => r._emphasis);
    const body = filtered.filter((r) => !r._emphasis);
    const dir = sortDir === "asc" ? 1 : -1;
    const sortedBody = [...body].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = Number(av);
      const bn = Number(bv);
      if (typeof av === "number" || (av !== "" && av != null && !isNaN(an) && !isNaN(bn))) return (an - bn) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
    return [...sortedBody, ...emphasised];
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const exportRows = result ? resultToExportRows({ ...result, rows: sorted }) : [];
  const docSpec = useMemo(
    () => reportResultToSpec(result ? { ...result, rows: sorted } : null, { title, subtitle, filename }),
    [result, sorted, title, subtitle, filename],
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleColumn = (key: string, isDefaultHidden: boolean) => {
    setHidden((prev) => {
      if (isDefaultHidden) {
        return prev.includes(`show:${key}`) ? prev.filter((k) => k !== `show:${key}`) : [...prev, `show:${key}`];
      }
      return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    });
  };

  const openRow = (r: ReportRow) => {
    if (!r._link) return;
    navigate({ to: r._link as never }).catch(() => {
      window.location.assign(r._link as string);
    });
  };

  return (
    <div className="space-y-4 p-4 md:p-6 print:p-0">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
        <Link to="/reports" className="hover:text-foreground">Reports</Link>
        <span>/</span>
        <span className="text-foreground">{title}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex items-start gap-2">
          <Link to="/reports">
            <Button variant="ghost" size="sm" aria-label="Back to reports">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          <Button
            size="sm"
            variant="outline"
            disabled={!exportRows.length}
            onClick={() => void printBrandedDoc(docSpec)}
          >
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          <ExportMenu
            rows={exportRows}
            filename={filename}
            title={title}
            subtitle={subtitle}
            docType="report"
            kpis={docSpec.kpis}
            sections={docSpec.sections.slice(0, Math.max(0, docSpec.sections.length - 1))}
          />
        </div>
      </div>

      {/* print header */}
      <div className="hidden print:mb-4 print:block">
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {filters && <div className="print:hidden">{filters}</div>}

      {loading && (
        <Card className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating report from your live data…
        </Card>
      )}

      {!loading && error && (
        <Card className="flex items-start gap-3 border-destructive/40 p-6 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            <p className="font-medium text-destructive">This report could not be generated</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </Card>
      )}

      {!loading && !error && result && (
        <>
          {/* Summary */}
          {result.summary.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {result.summary.map((s) => (
                <Card key={s.label} className="p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
                  <div className={cn("mt-1 text-lg font-semibold tabular-nums", toneClass[s.tone ?? "default"])}>
                    {s.value}
                  </div>
                  {s.hint && <div className="text-[11px] text-muted-foreground">{s.hint}</div>}
                </Card>
              ))}
            </div>
          )}

          {result.notes.length > 0 && (
            <div className="flex flex-wrap gap-2 print:hidden">
              {result.notes.map((nte, i) => (
                <Badge key={i} variant="outline" className="whitespace-normal text-left text-[11px] font-normal">
                  {nte}
                </Badge>
              ))}
            </div>
          )}

          {!result.sufficient ? (
            <Card className="flex flex-col items-center gap-2 p-10 text-center">
              <Inbox className="h-6 w-6 text-muted-foreground" />
              <p className="font-medium">Not enough data for this report</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Nothing was found for the selected period and filters. Widen the dates or capture and post the
                underlying transactions, then generate again.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* table toolbar */}
              <div className="flex flex-wrap items-center gap-2 border-b p-3 print:hidden">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Search this report…"
                    className="h-9 w-56 pl-7"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Columns3 className="mr-1 h-4 w-4" /> Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-80 overflow-auto">
                    <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                    {result.columns.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={visibleColumns.some((v) => v.key === c.key)}
                        onCheckedChange={() => toggleColumn(c.key, !!c.defaultHidden)}
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="ml-auto text-xs text-muted-foreground">
                  {sorted.length} row{sorted.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <tr>
                      {visibleColumns.map((c) => (
                        <th
                          key={c.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                            c.money || c.numeric ? "text-right" : "text-left",
                            (c.priority ?? 1) >= 3 && "hidden lg:table-cell",
                          )}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => toggleSort(c.key)}
                          >
                            {c.label}
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, idx) => (
                      <tr
                        key={idx}
                        onClick={() => openRow(r)}
                        className={cn(
                          "border-b last:border-0",
                          r._link && "cursor-pointer hover:bg-muted/50",
                          r._emphasis === "subtotal" && "bg-muted/40 font-medium",
                          r._emphasis === "total" && "bg-muted/60 font-semibold",
                          r._emphasis === "warn" && "bg-destructive/5",
                        )}
                      >
                        {visibleColumns.map((c) => {
                          const v = r[c.key];
                          const display = c.money
                            ? acctFmt(v as number, true)
                            : c.numeric
                              ? v == null || v === ""
                                ? ""
                                : Number(v).toFixed(2)
                              : String(v ?? "");
                          return (
                            <td
                              key={c.key}
                              className={cn(
                                "px-3 py-1.5",
                                c.money || c.numeric ? "text-right tabular-nums" : "text-left",
                                (c.priority ?? 1) >= 3 && "hidden lg:table-cell",
                                c.money && Number(v) < 0 && "text-destructive",
                              )}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={visibleColumns.length} className="px-3 py-8 text-center text-muted-foreground">
                          No rows match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 && (
                <div className="flex items-center justify-between border-t p-2 print:hidden">
                  <span className="text-xs text-muted-foreground">
                    Page {page + 1} of {pageCount}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pageCount - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          <SifoSmartReporter reportId={reportId} result={result} />
        </>
      )}
    </div>
  );
}
