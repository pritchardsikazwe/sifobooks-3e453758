import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { printTableDocument } from "@/services/printDocument";
import {
  FileText, ClipboardList, TrendingUp, ArrowLeftRight, Download, Printer,
  RefreshCw, MoreVertical, Copy,
} from "lucide-react";
import { DataTable, type DTColumn } from "@/components/data-table";
import { ExportMenu, exportCSV, exportExcel } from "@/lib/exports";
import { fmtMoney } from "@/lib/format";
import { generateBinCardPdf, generateStockTakeSheet, generateStockValuationPdf, generateStockMovementReport } from "@/lib/inventory-sheets-pdf";
import {
  REPORTS, agingBucket, buildMovements, buildSummary, expiryStatus, loadBase,
  type BaseData, type Filters, type ReportKey, type SummaryRow,
} from "@/lib/inventory-reports";

export const Route = createFileRoute("/_authenticated/inventory-sheets")({
  head: () => ({
    meta: [
      { title: "Inventory Sheets & Reports — SifoBooks" },
      { name: "description", content: "Professional inventory reporting workspace: summary, movement, valuation, bin card, stock take, aging, reorder, expiry, batch and serial reports with exports." },
      { property: "og:title", content: "Inventory Sheets & Reports — SifoBooks" },
      { property: "og:description", content: "ERP-grade inventory grid with filters, grouping, totals, saved views and Excel/CSV/PDF exports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventorySheetsPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const qty = (n: number) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const STATUS_TONE: Record<string, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 border-emerald-200",
  low: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-orange-50 text-orange-700 border-orange-200",
  out: "bg-rose-50 text-rose-700 border-rose-200",
  overstock: "bg-sky-50 text-sky-700 border-sky-200",
  negative: "bg-rose-100 text-rose-800 border-rose-300",
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <Badge variant="outline" className={`uppercase text-[10px] tracking-wide ${STATUS_TONE[status] ?? ""}`}>
      {label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */

function InventorySheetsPage() {
  const [filters, setFilters] = useState<Filters>({
    warehouse: "all", category: "all", item: "all", status: "all",
    from: daysAgo(30), to: today(),
  });
  const [draft, setDraft] = useState<Filters>(filters);
  const [base, setBase] = useState<BaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportKey>("summary");
  const [groupBy, setGroupBy] = useState<"none" | "warehouse" | "category" | "item">("none");
  const [drill, setDrill] = useState<SummaryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [binItem, setBinItem] = useState("");

  const load = async (f: Filters) => {
    setLoading(true); setError(null);
    try { setBase(await loadBase(f)); }
    catch (e: any) { setError(e.message ?? "Failed to load inventory data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(filters); /* eslint-disable-next-line */ }, [filters]);

  const warehouses = base?.warehouses ?? [];
  const allItems = base?.items ?? [];
  const categories = useMemo(
    () => Array.from(new Set(allItems.map((i) => i.category).filter(Boolean))) as string[],
    [allItems],
  );

  const summary = useMemo(() => (base ? buildSummary(base, filters) : []), [base, filters]);
  const movements = useMemo(() => (base ? buildMovements(base, filters) : []), [base, filters]);

  const statusFiltered = useMemo(
    () => (filters.status === "all" ? summary : summary.filter((r) => r.status === filters.status)),
    [summary, filters.status],
  );

  /* ---------------- report row sets ---------------- */
  const rows = useMemo<any[]>(() => {
    const s = statusFiltered;
    switch (report) {
      case "summary": return s;
      case "valuation": return s.filter((r) => r.closing !== 0 || r.stock_value !== 0);
      case "warehouse": return s;
      case "low_stock": return s.filter((r) => r.status === "low" || r.status === "critical");
      case "out_of_stock": return s.filter((r) => r.status === "out" || r.status === "negative");
      case "overstock": return s.filter((r) => r.status === "overstock");
      case "reorder": return s.filter((r) => r.reorder_level > 0 ? r.available <= r.reorder_level : r.available <= 0);
      case "aging": return s.map((r) => ({ ...r, bucket: agingBucket(r.days_idle) }));
      case "slow_moving": return s.filter((r) => (r.days_idle ?? 9999) > 90 && r.closing > 0)
        .map((r) => ({ ...r, bucket: agingBucket(r.days_idle) }));
      case "dead_stock": return s.filter((r) => (r.days_idle ?? 9999) > 365 && r.closing > 0)
        .map((r) => ({ ...r, bucket: agingBucket(r.days_idle) }));
      case "movement":
      case "ledger": return movements;
      case "bin_card": return movements.filter((m) => (binItem ? m.item_id === binItem : true));
      case "stock_take": {
        const lines = base?.countLines ?? [];
        const counts = new Map((base?.counts ?? []).map((c: any) => [c.id, c]));
        const items = new Map(allItems.map((i) => [i.id, i]));
        return lines
          .filter((l: any) => items.has(l.item_id))
          .map((l: any) => {
            const it = items.get(l.item_id)!;
            const c: any = counts.get(l.count_id);
            const variance = Number(l.variance ?? (Number(l.counted_qty ?? 0) - Number(l.expected_qty ?? 0)));
            return {
              id: l.id,
              item_code: it.sku ?? "—", barcode: it.barcode ?? null, item_name: it.name,
              warehouse: warehouses.find((w) => w.id === it.warehouse_id)?.name ?? "Unassigned",
              bin: it.bin ?? null,
              system_qty: Number(l.expected_qty ?? 0),
              counted_qty: Number(l.counted_qty ?? 0),
              variance,
              unit_cost: Number(it.cost_price ?? 0),
              variance_value: variance * Number(it.cost_price ?? 0),
              reason: l.note ?? "—",
              count_status: c?.status === "posted" ? "APPROVED" : variance === 0 ? "MATCHED" : "VARIANCE",
              count_number: c?.count_number ?? "—",
              count_date: c?.count_date ?? null,
            };
          });
      }
      case "variance": {
        const items = new Map(allItems.map((i) => [i.id, i]));
        return s.map((r) => {
          const it: any = items.get(r.id);
          const system = Number(it?.quantity_on_hand ?? 0);
          return { ...r, system_qty: system, computed_qty: r.closing, variance_qty: r.closing - system,
            variance_value: (r.closing - system) * r.avg_cost };
        }).filter((r) => Math.abs(r.variance_qty) > 0.0001);
      }
      case "expiry":
      case "batch": {
        const items = new Map(allItems.map((i) => [i.id, i]));
        return (base?.batches ?? [])
          .filter((b: any) => items.has(b.item_id))
          .map((b: any) => {
            const it: any = items.get(b.item_id)!;
            const st = expiryStatus(b.expiry_date);
            const cost = Number(b.unit_cost ?? it.cost_price ?? 0);
            return {
              id: b.id, item_name: it.name, item_code: it.sku ?? "—",
              batch_no: b.batch_no, warehouse: warehouses.find((w) => w.id === b.warehouse_id)?.name ?? "Unassigned",
              bin: it.bin ?? null, quantity: Number(b.quantity ?? 0),
              manufactured_date: b.manufactured_date, expiry_date: b.expiry_date,
              days_remaining: st.days, unit_cost: cost, stock_value: Number(b.quantity ?? 0) * cost,
              batch_status: b.status ?? "active", expiry_label: st.label,
            };
          })
          .filter((r: any) => (report === "expiry" ? !!r.expiry_date : true));
      }
      case "serial": {
        const items = new Map(allItems.map((i) => [i.id, i]));
        return (base?.serials ?? [])
          .filter((x: any) => items.has(x.item_id))
          .map((x: any) => {
            const it: any = items.get(x.item_id)!;
            return {
              id: x.id, serial_no: x.serial_no, item_code: it.sku ?? "—", item_name: it.name,
              warehouse: warehouses.find((w) => w.id === x.warehouse_id)?.name ?? "Unassigned",
              serial_status: x.status ?? "in_stock", received_date: x.received_date,
              sold_date: x.sold_date, reference: x.reference ?? "—",
            };
          });
      }
      default: return s;
    }
  }, [report, statusFiltered, movements, base, allItems, warehouses, binItem]);

  /* ---------------- column definitions ---------------- */
  const columns = useMemo<DTColumn<any>[]>(() => buildColumns(report, setDrill), [report]);

  const groupKey = (r: any) =>
    groupBy === "warehouse" ? (r.warehouse ?? "Unassigned")
    : groupBy === "category" ? (r.category ?? "Uncategorised")
    : groupBy === "item" ? (r.item_name ?? "—")
    : "";

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, any[]>();
    for (const r of rows) {
      const k = groupKey(r);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, groupBy]);

  const totalsFn = (subset: any[]) => reportTotals(report, subset);

  /* ---------------- exports / print ---------------- */
  const exportRows = useMemo(() => rows.map((r) => {
    const o: Record<string, any> = {};
    for (const c of columns) {
      if (c.key === "actions" || c.key === "sl") continue;
      o[c.header] = c.accessor ? c.accessor(r) : r[c.key];
    }
    return o;
  }), [rows, columns]);

  const reportLabel = REPORTS.find((r) => r.key === report)?.label ?? "Inventory";
  const filenameBase = `${reportLabel.replace(/\s+/g, "-").toLowerCase()}-${filters.from}_${filters.to}`;

  const headerLines = () => [
    `Warehouse: ${filters.warehouse === "all" ? "All warehouses" : warehouses.find((w) => w.id === filters.warehouse)?.name ?? "—"}`,
    `Category: ${filters.category === "all" ? "All categories" : filters.category}`,
    `Period: ${filters.from} → ${filters.to}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];

  const printReport = () => {
    const cols = columns.filter((c) => c.key !== "actions");
    const t = reportTotals(report, rows);
    void printTableDocument({
      title: reportLabel,
      subtitle: "SifoBooks Inventory",
      meta: headerLines(),
      columns: cols.map((c) => c.header),
      rows: rows.map((r) => cols.map((c) => String((c.accessor ? c.accessor(r) : r[c.key]) ?? ""))),
      totals: t as Record<string, string | number>,
      landscape: cols.length > 7,
      fileName: `${reportLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    });
  };

  const copyTable = async () => {
    const cols = columns.filter((c) => c.key !== "actions");
    const text = [cols.map((c) => c.header).join("\t"),
      ...rows.map((r) => cols.map((c) => (c.accessor ? c.accessor(r) : r[c.key]) ?? "").join("\t"))].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Table copied to clipboard");
  };

  /* ---------------- shortcut card PDFs (existing behaviour) ---------------- */
  const scoped = allItems.filter((i) => filters.category === "all" || i.category === filters.category);
  const runBinCard = async () => {
    const it = allItems.find((i) => i.id === binItem);
    if (!it) return toast.error("Pick an item for the bin card");
    setBusy(true);
    try { await generateBinCardPdf(it); toast.success("Bin card generated"); } finally { setBusy(false); }
  };
  const runStockTake = async () => {
    setBusy(true);
    try { await generateStockTakeSheet(scoped.map((r) => ({ ...r, warehouse: warehouses.find((w) => w.id === r.warehouse_id)?.name ?? "—" }))); }
    finally { setBusy(false); }
  };
  const runValuation = async () => { setBusy(true); try { await generateStockValuationPdf(scoped); } finally { setBusy(false); } };
  const runMovement = async () => { setBusy(true); try { await generateStockMovementReport(filters.from, filters.to); } finally { setBusy(false); } };

  const toolbarRight = (
    <div className="flex items-center gap-2">
      <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
        <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Group by" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No grouping</SelectItem>
          <SelectItem value="warehouse">Group: Warehouse</SelectItem>
          <SelectItem value="category">Group: Category</SelectItem>
          <SelectItem value="item">Group: Item</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={() => load(filters)}>
        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportExcel(exportRows, filenameBase, reportLabel)}>Excel (.xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportCSV(exportRows, filenameBase)}>CSV (.csv)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportReportPdf(exportRows, filenameBase, reportLabel, headerLines(), reportTotals(report, rows))}>
            PDF (.pdf)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={printReport}><Printer className="h-4 w-4 mr-2" /> Print</DropdownMenuItem>
          <DropdownMenuItem onClick={copyTable}><Copy className="h-4 w-4 mr-2" /> Copy table</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm" onClick={printReport}><Printer className="h-4 w-4 mr-1" /> Print</Button>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Sheets</h1>
          <p className="text-sm text-muted-foreground">
            Reporting workspace for warehouse, accounting and audit — every figure comes from the inventory ledger.
          </p>
        </div>
        <ExportMenu rows={exportRows} filename={filenameBase} title={reportLabel} />
      </div>

      {/* Global filters */}
      <div className="rounded-xl border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Field label="Warehouse">
          <Select value={draft.warehouse} onValueChange={(v) => setDraft({ ...draft, warehouse: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Category">
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Item">
          <Select value={draft.item} onValueChange={(v) => setDraft({ ...draft, item: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All items</SelectItem>
              {allItems.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Stock status">
          <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in_stock">In stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
              <SelectItem value="overstock">Overstock</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date from">
          <Input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </Field>
        <Field label="Date to">
          <Input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </Field>
        <div className="flex items-end gap-2">
          <Button className="w-full" onClick={() => setFilters(draft)}>Apply filters</Button>
        </div>
        <div className="lg:col-span-7 flex flex-wrap gap-2 pt-1">
          {[["Today", 0], ["This week", 7], ["This month", 30], ["This quarter", 90], ["This year", 365]].map(([label, d]) => (
            <Button key={label as string} variant="ghost" size="sm"
              onClick={() => { const f = { ...draft, from: daysAgo(d as number), to: today() }; setDraft(f); setFilters(f); }}>
              {label as string}
            </Button>
          ))}
        </div>
      </div>

      {/* Report shortcut cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SheetCard icon={<FileText className="h-5 w-5" />} title="Bin Card" desc="Movement history for one item with running balance.">
          <div className="flex gap-2">
            <Select value={binItem} onValueChange={(v) => { setBinItem(v); setReport("bin_card"); }}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {allItems.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={runBinCard} disabled={busy || !binItem}><Download className="h-4 w-4" /></Button>
          </div>
        </SheetCard>
        <SheetCard icon={<ClipboardList className="h-5 w-5" />} title="Stock Take Sheet" desc="Printable count sheet with signature lines.">
          <div className="flex items-center justify-between">
            <button className="text-xs text-primary underline" onClick={() => setReport("stock_take")}>Open in grid</button>
            <Button variant="outline" size="sm" onClick={runStockTake} disabled={busy}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </SheetCard>
        <SheetCard icon={<TrendingUp className="h-5 w-5" />} title="Stock Valuation" desc="Closing quantity × average cost, totalled in Kwacha.">
          <div className="flex items-center justify-between">
            <button className="text-xs text-primary underline" onClick={() => setReport("valuation")}>Open in grid</button>
            <Button variant="outline" size="sm" onClick={runValuation} disabled={busy}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </SheetCard>
        <SheetCard icon={<ArrowLeftRight className="h-5 w-5" />} title="Stock Movement" desc="Inbound, outbound and adjustment movements for the period.">
          <div className="flex items-center justify-between">
            <button className="text-xs text-primary underline" onClick={() => setReport("movement")}>Open in grid</button>
            <Button variant="outline" size="sm" onClick={runMovement} disabled={busy}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </SheetCard>
      </div>

      {/* Report selector + grid */}
      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Select value={report} onValueChange={(v: any) => setReport(v)}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              {["Core", "Analysis", "Exceptions", "Traceability"].map((g) => (
                <SelectGroup key={g}>
                  <SelectLabel>{g}</SelectLabel>
                  {REPORTS.filter((r) => r.group === g).map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {rows.length.toLocaleString()} rows · {filters.from} → {filters.to}
          </span>
        </div>

        <div className="p-4 space-y-6">
          {groups ? (
            <>
              {groups.map(([name, subset]) => (
                <div key={name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{name}</h3>
                    <span className="text-xs text-muted-foreground">{subset.length} rows</span>
                  </div>
                  <DataTable
                    data={subset}
                    columns={columns}
                    tableId={`inv-sheets-${report}`}
                    pageSize={50}
                    selectable
                    totals={totalsFn}
                    searchPlaceholder="Search…"
                    loading={loading}
                    error={error}
                    onRetry={() => load(filters)}
                  />
                </div>
              ))}
              <div className="rounded-lg border bg-muted/40 p-3 text-sm font-medium flex flex-wrap gap-x-6 gap-y-1">
                <span>Grand total</span>
                {Object.entries(reportTotals(report, rows)).map(([k, v]) => (
                  <span key={k} className="text-muted-foreground">{k}: <span className="text-foreground">{v}</span></span>
                ))}
              </div>
            </>
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              tableId={`inv-sheets-${report}`}
              pageSize={50}
              selectable
              totals={totalsFn}
              toolbarRight={toolbarRight}
              searchPlaceholder="Search SKU, barcode or item…"
              loading={loading}
              error={error}
              onRetry={() => load(filters)}
              onRowClick={(r) => { if ("closing" in r) setDrill(r as SummaryRow); }}
              empty={<div className="py-10 text-center text-sm text-muted-foreground">No records for the selected filters.</div>}
            />
          )}
          {groups && <div className="flex justify-end">{toolbarRight}</div>}
        </div>
      </div>

      {/* Drill-down */}
      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{drill?.item_name}</SheetTitle></SheetHeader>
          {drill && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Item code", drill.item_code], ["Barcode", drill.barcode ?? "—"],
                  ["Category", drill.category ?? "—"], ["Warehouse", drill.warehouse],
                  ["Bin", drill.bin ?? "—"], ["Unit", drill.unit ?? "—"],
                  ["Opening", qty(drill.opening)], ["Closing", qty(drill.closing)],
                  ["Reserved", qty(drill.reserved)], ["Available", qty(drill.available)],
                  ["Average cost", fmtMoney(drill.avg_cost)], ["Stock value", fmtMoney(drill.stock_value)],
                  ["Reorder level", qty(drill.reorder_level)], ["On order", qty(drill.on_order)],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg border p-2">
                    <div className="text-[11px] uppercase text-muted-foreground">{k}</div>
                    <div className="font-medium">{v as string}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-2 font-medium">Movements this period</div>
                <div className="space-y-1">
                  {movements.filter((m) => m.item_id === drill.id).slice(0, 20).map((m) => (
                    <div key={m.id} className="flex justify-between rounded border px-2 py-1 text-xs">
                      <span>{new Date(m.created_at).toLocaleDateString()} · {m.txn}</span>
                      <span className={m.signed >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {m.signed >= 0 ? "+" : ""}{qty(m.signed)} → {qty(m.balance)}
                      </span>
                    </div>
                  ))}
                  {!movements.some((m) => m.item_id === drill.id) && (
                    <div className="text-xs text-muted-foreground">No movements in this period.</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setBinItem(drill.id); setReport("bin_card"); setDrill(null); }}>Bin card</Button>
                <Button size="sm" variant="outline" asChild><Link to="/inventory">View item</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/stock-adjustments">Adjust</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/stock-counts">Count</Link></Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}

function SheetCard({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

/* ---------------- column builders ---------------- */

const n = (key: string, header: string, opts: Partial<DTColumn<any>> = {}): DTColumn<any> => ({
  key, header, align: "right", sortable: true,
  accessor: (r) => Number(r[key] ?? 0),
  cell: (r) => qty(Number(r[key] ?? 0)),
  ...opts,
});

const money = (key: string, header: string): DTColumn<any> => ({
  key, header, align: "right", sortable: true,
  accessor: (r) => Number(r[key] ?? 0),
  cell: (r) => fmtMoney(Number(r[key] ?? 0)),
});

const text = (key: string, header: string, opts: Partial<DTColumn<any>> = {}): DTColumn<any> => ({
  key, header, sortable: true, accessor: (r) => r[key] ?? "", cell: (r) => r[key] ?? "—", ...opts,
});

const dateCol = (key: string, header: string): DTColumn<any> => ({
  key, header, sortable: true,
  accessor: (r) => (r[key] ? new Date(r[key]).toISOString().slice(0, 10) : ""),
  cell: (r) => (r[key] ? new Date(r[key]).toLocaleDateString() : "—"),
});

function rowActions(setDrill: (r: any) => void): DTColumn<any> {
  return {
    key: "actions", header: "", sortable: false, align: "center",
    cell: (r) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setDrill(r)}>View stock breakdown</DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/inventory">View item</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/stock">View transactions</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/stock-adjustments">Adjust</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/stock-counts">Count</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/stock-batches">Batches</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/stock-serials">Serials</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };
}

const statusCol: DTColumn<any> = {
  key: "status", header: "Status", sortable: true,
  accessor: (r) => r.status_label ?? r.status ?? "",
  cell: (r) => <StatusBadge status={r.status} label={r.status_label ?? r.status} />,
};

function buildColumns(report: ReportKey, setDrill: (r: any) => void): DTColumn<any>[] {
  const idCols = [
    text("item_code", "Item Code", { sticky: true }),
    text("barcode", "Barcode", { defaultHidden: true }),
    text("item_name", "Item Name"),
    text("category", "Category"),
    text("warehouse", "Warehouse"),
    text("bin", "Location/Bin"),
    text("unit", "Unit"),
  ];

  switch (report) {
    case "movement":
    case "ledger":
      return [
        dateCol("created_at", "Date"),
        text("reference", "Reference"),
        text("txn", "Transaction Type"),
        text("item_code", "Item Code"),
        text("item_name", "Item"),
        text("warehouse", "Warehouse"),
        text("bin", "Bin"),
        n("qty_in", "Qty In"),
        n("qty_out", "Qty Out"),
        n("balance", "Running Balance"),
        money("unit_cost", "Unit Cost"),
        money("value", "Value"),
        text("note", "Note", { defaultHidden: true }),
      ];
    case "bin_card":
      return [
        dateCol("created_at", "Date"),
        text("reference", "Reference"),
        text("txn", "Transaction"),
        text("warehouse", "Warehouse"),
        text("bin", "Bin"),
        text("item_name", "Item"),
        n("qty_in", "Qty In"),
        n("qty_out", "Qty Out"),
        n("balance", "Balance"),
        money("unit_cost", "Unit Cost"),
        money("value", "Value"),
      ];
    case "valuation":
      return [
        text("item_code", "Item Code", { sticky: true }), text("item_name", "Item"),
        text("category", "Category"), text("warehouse", "Warehouse"), text("bin", "Bin"),
        n("closing", "Quantity"), text("unit", "Unit"),
        money("avg_cost", "Average Cost"), money("stock_value", "Stock Value"),
        statusCol, rowActions(setDrill),
      ];
    case "stock_take":
      return [
        text("count_number", "Count #"), dateCol("count_date", "Count Date"),
        text("item_code", "Item Code"), text("barcode", "Barcode"), text("item_name", "Item"),
        text("warehouse", "Warehouse"), text("bin", "Bin"),
        n("system_qty", "System Qty"), n("counted_qty", "Counted Qty"), n("variance", "Variance Qty"),
        money("unit_cost", "Unit Cost"), money("variance_value", "Variance Value"),
        text("reason", "Reason"),
        { key: "count_status", header: "Count Status", sortable: true, accessor: (r) => r.count_status,
          cell: (r) => <Badge variant="outline" className="text-[10px]">{r.count_status}</Badge> },
      ];
    case "aging":
    case "slow_moving":
    case "dead_stock":
      return [
        text("item_code", "Item Code"), text("item_name", "Item"), text("warehouse", "Warehouse"),
        n("closing", "Qty"), money("stock_value", "Stock Value"),
        dateCol("last_movement", "Last Movement"),
        n("days_idle", "Days Since Movement"),
        text("bucket", "Aging Bucket"),
        statusCol, rowActions(setDrill),
      ];
    case "reorder":
      return [
        text("item_code", "Item Code"), text("item_name", "Item"), text("warehouse", "Warehouse"),
        n("available", "Available"), n("reorder_level", "Reorder Point"), n("safety_stock", "Safety Stock"),
        n("max_stock", "Maximum Stock"), n("on_order", "On Order"),
        { key: "suggested", header: "Suggested Order Qty", align: "right", sortable: true,
          accessor: (r) => Math.max(0, (r.max_stock || r.reorder_level * 2) - r.available - r.on_order),
          cell: (r) => qty(Math.max(0, (r.max_stock || r.reorder_level * 2) - r.available - r.on_order)) },
        statusCol,
        { key: "action", header: "Action", sortable: false,
          cell: () => <Button size="sm" variant="outline" asChild><Link to="/purchase-orders">Create PO</Link></Button> },
      ];
    case "expiry":
      return [
        text("item_name", "Item"), text("batch_no", "Batch / Lot"), text("warehouse", "Warehouse"),
        text("bin", "Bin"), n("quantity", "Quantity"),
        dateCol("manufactured_date", "Manufacturing Date"), dateCol("expiry_date", "Expiry Date"),
        n("days_remaining", "Days Remaining"),
        money("unit_cost", "Unit Cost"), money("stock_value", "Stock Value"),
        { key: "expiry_label", header: "Status", sortable: true, accessor: (r) => r.expiry_label,
          cell: (r) => <Badge variant="outline" className={`text-[10px] ${r.expiry_label === "EXPIRED" ? STATUS_TONE.out : r.expiry_label === "SAFE" ? STATUS_TONE.in_stock : STATUS_TONE.low}`}>{r.expiry_label}</Badge> },
      ];
    case "batch":
      return [
        text("item_code", "Item Code"), text("item_name", "Item"), text("batch_no", "Batch"),
        text("warehouse", "Warehouse"), n("quantity", "Quantity"),
        dateCol("manufactured_date", "Manufactured"), dateCol("expiry_date", "Expiry"),
        money("unit_cost", "Unit Cost"), money("stock_value", "Stock Value"),
        text("batch_status", "Status"),
      ];
    case "serial":
      return [
        text("serial_no", "Serial Number"), text("item_code", "Item Code"), text("item_name", "Item"),
        text("warehouse", "Warehouse"), text("serial_status", "Status"),
        dateCol("received_date", "Received"), dateCol("sold_date", "Sold"), text("reference", "Reference"),
      ];
    case "variance":
      return [
        text("item_code", "Item Code"), text("item_name", "Item"), text("warehouse", "Warehouse"),
        n("system_qty", "System Qty"), n("computed_qty", "Ledger Qty"), n("variance_qty", "Variance"),
        money("avg_cost", "Unit Cost"), money("variance_value", "Variance Value"),
        statusCol,
      ];
    case "warehouse":
      return [
        text("warehouse", "Warehouse", { sticky: true }), text("item_code", "Item Code"), text("item_name", "Item"),
        text("bin", "Bin"), n("closing", "Closing"), n("reserved", "Reserved"), n("available", "Available"),
        money("avg_cost", "Avg Cost"), money("stock_value", "Stock Value"), statusCol, rowActions(setDrill),
      ];
    case "low_stock":
    case "out_of_stock":
    case "overstock":
      return [
        ...idCols.slice(0, 6),
        n("closing", "Closing"), n("reserved", "Reserved"), n("available", "Available"),
        n("reorder_level", "Reorder Level"), n("on_order", "On Order"),
        money("stock_value", "Stock Value"), statusCol, rowActions(setDrill),
      ];
    default: // summary
      return [
        { key: "sl", header: "SL", align: "right", accessor: (r) => r.sl, cell: (r) => r.sl },
        ...idCols,
        text("item_type", "Type", { defaultHidden: true }),
        n("opening", "Opening Qty"),
        n("purchased", "Purchased"),
        n("received", "Received", { defaultHidden: true }),
        n("production_in", "Production In", { defaultHidden: true }),
        n("transfer_in", "Transfer In"),
        n("sales", "Sales"),
        n("sales_return", "Sales Return", { defaultHidden: true }),
        n("production_out", "Production Out", { defaultHidden: true }),
        n("transfer_out", "Transfer Out"),
        n("purchase_return", "Purchase Return", { defaultHidden: true }),
        n("damaged", "Damaged"),
        n("adjustment", "Adjustment"),
        n("closing", "Closing Qty"),
        n("reserved", "Reserved"),
        n("available", "Available"),
        n("on_order", "On Order", { defaultHidden: true }),
        money("avg_cost", "Avg Cost"),
        money("stock_value", "Stock Value"),
        n("reorder_level", "Reorder Level"),
        statusCol,
        rowActions(setDrill),
      ];
  }
}

/* ---------------- totals ---------------- */

function reportTotals(report: ReportKey, rows: any[]): Record<string, React.ReactNode> {
  const sum = (k: string) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  if (report === "movement" || report === "ledger" || report === "bin_card") {
    return { qty_in: qty(sum("qty_in")), qty_out: qty(sum("qty_out")), value: fmtMoney(sum("value")) };
  }
  if (report === "stock_take") {
    return { system_qty: qty(sum("system_qty")), counted_qty: qty(sum("counted_qty")),
      variance: qty(sum("variance")), variance_value: fmtMoney(sum("variance_value")) };
  }
  if (report === "expiry" || report === "batch") {
    return { quantity: qty(sum("quantity")), stock_value: fmtMoney(sum("stock_value")) };
  }
  if (report === "serial") return { serial_no: `${rows.length} serials` };
  if (report === "variance") {
    return { variance_qty: qty(sum("variance_qty")), variance_value: fmtMoney(sum("variance_value")) };
  }
  if (report === "valuation") {
    return { closing: qty(sum("closing")), stock_value: fmtMoney(sum("stock_value")) };
  }
  return {
    opening: qty(sum("opening")),
    purchased: qty(sum("purchased")),
    sales: qty(sum("sales")),
    transfer_in: qty(sum("transfer_in")),
    transfer_out: qty(sum("transfer_out")),
    closing: qty(sum("closing")),
    reserved: qty(sum("reserved")),
    available: qty(sum("available")),
    stock_value: fmtMoney(sum("stock_value")),
  };
}

/* ---------------- branded PDF ---------------- */

async function exportReportPdf(
  rows: Record<string, any>[],
  filename: string,
  title: string,
  meta: string[],
  totals: Record<string, React.ReactNode>,
) {
  if (!rows.length) return toast.error("Nothing to export");
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"), import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16).text("SIFOBOOKS", 14, 14);
  doc.setFontSize(12).text(title, 14, 21);
  doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(line, 14, 28 + i * 5));
  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
    startY: 30 + meta.length * 5,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [16, 185, 129] },
    didDrawPage: (d: any) => {
      doc.setFontSize(8);
      doc.text(`Page ${doc.getNumberOfPages()}`, d.settings.margin.left, doc.internal.pageSize.getHeight() - 6);
    },
  });
  const y = (doc as any).lastAutoTable?.finalY ?? 40;
  doc.setFontSize(9).text(
    Object.entries(totals).map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`).join("   •   "),
    14, Math.min(y + 8, doc.internal.pageSize.getHeight() - 12),
  );
  doc.save(`${filename}.pdf`);
}
