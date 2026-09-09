import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes, PackageCheck, PackageX, AlertTriangle, Layers, Coins, ScanLine, Plus,
  Warehouse as WarehouseIcon, ArrowDownRight, ArrowUpRight, Search, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { ExportMenu } from "@/lib/exports";
import { fmtMoney } from "@/lib/format";
import {
  fetchInventory, fetchItemMovements, fetchRecentActivity, summarise, warehouseValues,
  STATUS_LABEL, type InvItem, type StockStatus,
} from "@/lib/inventory";
import { toast } from "sonner";
import { SifoHubTabs } from "@/components/sifo/SifoHubTabs";

type SearchParams = { q?: string; warehouse?: string; category?: string; status?: string };

export const Route = createFileRoute("/_authenticated/inventory/")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    warehouse: typeof s.warehouse === "string" ? s.warehouse : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inventory Dashboard — SifoBooks" },
      { name: "description", content: "Live stock on hand, warehouse valuation and reorder attention across your SifoBooks inventory." },
      { property: "og:title", content: "Inventory Dashboard — SifoBooks" },
      { property: "og:description", content: "Live stock on hand, warehouse valuation and reorder attention." },
    ],
  }),
  component: InventoryDashboard,
});

const statusTone: Record<StockStatus, string> = {
  in_stock: "success", low: "warning", critical: "destructive",
  out: "destructive", overstock: "info", negative: "destructive",
};

function InventoryDashboard() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/inventory/" });
  const [items, setItems] = useState<InvItem[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState(search.q ?? "");
  const [active, setActive] = useState<InvItem | null>(null);
  const [moves, setMoves] = useState<any[]>([]);

  const setParam = (patch: SearchParams) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch }), replace: true });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ items, warehouses }, act] = await Promise.all([
        fetchInventory({ search: search.q, warehouse: search.warehouse, category: search.category }),
        fetchRecentActivity(),
      ]);
      setItems(items); setWarehouses(warehouses); setActivity(act);
    } catch (e: any) {
      setError(e.message ?? "Failed to load inventory");
    } finally { setLoading(false); }
  }, [search.q, search.warehouse, search.category]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!active) { setMoves([]); return; }
    fetchItemMovements(active.id).then(setMoves);
  }, [active]);

  const kpis = useMemo(() => summarise(items), [items]);
  const whValues = useMemo(() => warehouseValues(items), [items]);
  const totalValue = whValues.reduce((s, w) => s + w.value, 0);
  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[],
    [items],
  );

  const rows = useMemo(() => {
    if (!search.status || search.status === "all") return items;
    if (search.status === "reorder") return items.filter((i) => ["low", "critical", "out"].includes(i.status));
    return items.filter((i) => i.status === search.status);
  }, [items, search.status]);

  const columns: DTColumn<InvItem>[] = [
    { key: "sku", header: "SKU", sortable: true, width: 120, cell: (r) => <span className="font-mono text-xs">{r.sku ?? "—"}</span> },
    { key: "name", header: "Item", sortable: true, width: 240, sticky: true, cell: (r) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">{r.name}</div>
        {r.barcode && <div className="text-[11px] text-muted-foreground font-mono">{r.barcode}</div>}
      </div>
    ) },
    { key: "category", header: "Category", sortable: true, cell: (r) => r.category ?? "—" },
    { key: "warehouse_name", header: "Warehouse", sortable: true, cell: (r) => r.warehouse_name },
    { key: "bin", header: "Bin", cell: (r) => r.bin ?? "—", defaultHidden: true },
    { key: "quantity_on_hand", header: "On hand", align: "right", sortable: true },
    { key: "reserved_qty", header: "Reserved", align: "right", sortable: true },
    { key: "available", header: "Available", align: "right", sortable: true,
      cell: (r) => <span className={r.available <= 0 ? "text-destructive font-semibold" : ""}>{r.available}</span> },
    { key: "on_order_qty", header: "On order", align: "right", sortable: true },
    { key: "cost_price", header: "Avg cost", align: "right", sortable: true, cell: (r) => fmtMoney(r.cost_price) },
    { key: "stock_value", header: "Stock value", align: "right", sortable: true, cell: (r) => fmtMoney(r.stock_value) },
    { key: "status", header: "Status", cell: (r) => (
      <SifoStatusBadge status={STATUS_LABEL[r.status]} tone={statusTone[r.status] as any} />
    ) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 space-y-5">
      <SifoHubTabs hub="inventory" active="/inventory" />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Live stock on hand, valuation and reorder attention.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportMenu
            rows={rows.map((r) => ({
              SKU: r.sku, Item: r.name, Category: r.category, Warehouse: r.warehouse_name, Bin: r.bin,
              "On hand": r.quantity_on_hand, Reserved: r.reserved_qty, Available: r.available,
              "On order": r.on_order_qty, "Avg cost": r.cost_price, "Stock value": r.stock_value,
              Status: STATUS_LABEL[r.status],
            }))}
            filename="inventory-stock-on-hand"
            title="Stock on hand"
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            const code = window.prompt("Scan or type a barcode / SKU");
            if (!code) return;
            const hit = items.find((i) => i.barcode === code || i.sku === code);
            if (hit) setActive(hit);
            else { setTerm(code); setParam({ q: code }); toast.message("Searching inventory for " + code); }
          }}>
            <ScanLine className="h-4 w-4" /> Scan barcode
          </Button>
          <Button asChild size="sm" variant="save" className="gap-1.5">
            <Link to="/stock"><Plus className="h-4 w-4" /> New transaction</Link>
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <Kpi label="Total items" value={String(kpis.totalItems)} icon={<Boxes className="h-4 w-4" />} onClick={() => setParam({ status: "all" })} />
        <Kpi label="Stock value" value={fmtMoney(kpis.stockValue)} icon={<Coins className="h-4 w-4" />} to="/reports/inventory-valuation" />
        <Kpi label="Available" value={kpis.available.toLocaleString()} icon={<PackageCheck className="h-4 w-4" />} onClick={() => setParam({ status: "in_stock" })} />
        <Kpi label="Reserved" value={kpis.reserved.toLocaleString()} icon={<Layers className="h-4 w-4" />} onClick={() => setParam({ status: "all" })} />
        <Kpi label="Low stock" value={String(kpis.low + kpis.critical)} tone="warn" icon={<AlertTriangle className="h-4 w-4" />} onClick={() => setParam({ status: "reorder" })} />
        <Kpi label="Out of stock" value={String(kpis.out)} tone="bad" icon={<PackageX className="h-4 w-4" />} onClick={() => setParam({ status: "out" })} />
      </div>

      {/* Grid + side panels */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-9"
                placeholder="Search SKU, barcode or item..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setParam({ q: term || undefined }); }}
                onBlur={() => setParam({ q: term || undefined })}
              />
            </div>
            <Select value={search.warehouse ?? "all"} onValueChange={(v) => setParam({ warehouse: v })}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Warehouse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.category ?? "all"} onValueChange={(v) => setParam({ category: v })}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.status ?? "all"} onValueChange={(v) => setParam({ status: v })}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
                <SelectItem value="overstock">Overstock</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="reorder">Needs reorder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            data={rows}
            columns={columns}
            tableId="inventory-grid"
            selectable
            loading={loading}
            error={error}
            onRetry={load}
            searchPlaceholder={null}
            onRowClick={(r) => setActive(r)}
            pageSize={25}
            totals={(rs) => ({
              name: `${rs.length} items`,
              stock_value: fmtMoney(rs.reduce((s, r) => s + r.stock_value, 0)),
              quantity_on_hand: rs.reduce((s, r) => s + r.quantity_on_hand, 0),
            })}
            empty={<div className="py-10 text-center text-sm text-muted-foreground">No stock items match these filters.</div>}
          />
        </div>

        <div className="space-y-4">
          <Panel title="Warehouse stock value" icon={<WarehouseIcon className="h-4 w-4" />}>
            {whValues.length === 0 && <p className="text-sm text-muted-foreground">No stock recorded yet.</p>}
            {whValues.map((w) => {
              const pct = totalValue > 0 ? (w.value / totalValue) * 100 : 0;
              return (
                <button
                  key={w.id ?? "none"}
                  onClick={() => setParam({ warehouse: w.id ?? "all" })}
                  className="w-full rounded-lg px-2 py-2 text-left hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{w.name}</span>
                    <span className="font-semibold">{fmtMoney(w.value)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{pct.toFixed(1)}% of inventory · {w.units.toLocaleString()} units</div>
                </button>
              );
            })}
          </Panel>

          <Panel title="Reorder attention" icon={<AlertTriangle className="h-4 w-4" />}>
            <ReorderRow label="Critical" count={kpis.critical} tone="text-destructive" onClick={() => setParam({ status: "critical" })} />
            <ReorderRow label="Low stock" count={kpis.low} tone="text-amber-600" onClick={() => setParam({ status: "low" })} />
            <ReorderRow label="Out of stock" count={kpis.out} tone="text-destructive" onClick={() => setParam({ status: "out" })} />
            <ReorderRow label="Overstock" count={kpis.overstock} tone="text-sky-600" onClick={() => setParam({ status: "overstock" })} />
          </Panel>

          <Panel title="Recent inventory activity" icon={<Sparkles className="h-4 w-4" />}>
            {activity.length === 0 && <p className="text-sm text-muted-foreground">No stock movements yet.</p>}
            {activity.map((m) => {
              const inbound = Number(m.quantity) >= 0;
              const item = items.find((i) => i.id === m.item_id);
              return (
                <div key={m.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-border/60 last:border-0">
                  {inbound
                    ? <ArrowDownRight className="h-4 w-4 shrink-0 text-emerald-600" />
                    : <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{item?.name ?? m.reference ?? "Stock movement"}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">
                      {String(m.movement_type ?? "").replace(/_/g, " ")} · {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="font-medium tabular-nums">{Number(m.quantity)}</span>
                </div>
              );
            })}
          </Panel>
        </div>
      </div>

      {/* Item drawer */}
      <DetailDrawer
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        title={active?.name ?? ""}
        subtitle={active ? `${active.sku ?? "No SKU"} · ${active.warehouse_name}` : undefined}
        meta={active && <SifoStatusBadge status={STATUS_LABEL[active.status]} tone={statusTone[active.status] as any} />}
        footer={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/stock-adjustments">Adjust</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/inventory-sheets">Count sheet</Link></Button>
            <Button variant="save" size="sm" asChild><Link to="/stock">Receive / issue</Link></Button>
          </>
        }
      >
        {active && (
          <Tabs defaultValue="overview">
            <TabsList className="mb-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="grid grid-cols-2 gap-4">
              <DrawerField label="SKU">{active.sku ?? "—"}</DrawerField>
              <DrawerField label="Barcode">{active.barcode ?? "—"}</DrawerField>
              <DrawerField label="Category">{active.category ?? "—"}</DrawerField>
              <DrawerField label="Unit">{active.unit ?? "—"}</DrawerField>
              <DrawerField label="Warehouse">{active.warehouse_name}</DrawerField>
              <DrawerField label="Bin">{active.bin ?? "—"}</DrawerField>
              <DrawerField label="Average cost">{fmtMoney(active.cost_price)}</DrawerField>
              <DrawerField label="Selling price">{fmtMoney(active.sell_price)}</DrawerField>
            </TabsContent>
            <TabsContent value="stock" className="grid grid-cols-2 gap-4">
              <DrawerField label="On hand">{active.quantity_on_hand}</DrawerField>
              <DrawerField label="Reserved">{active.reserved_qty}</DrawerField>
              <DrawerField label="Available">{active.available}</DrawerField>
              <DrawerField label="On order">{active.on_order_qty}</DrawerField>
              <DrawerField label="Reorder point">{active.reorder_level}</DrawerField>
              <DrawerField label="Safety stock">{active.safety_stock}</DrawerField>
              <DrawerField label="Maximum stock">{active.max_stock || "—"}</DrawerField>
              <DrawerField label="Stock value">{fmtMoney(active.stock_value)}</DrawerField>
            </TabsContent>
            <TabsContent value="transactions">
              <DrawerSection title="Movement history">
                {moves.length === 0 && <p className="text-sm text-muted-foreground">No movements recorded for this item.</p>}
                <div className="divide-y divide-border">
                  {moves.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="capitalize">{String(m.movement_type ?? "").replace(/_/g, " ")}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(m.created_at).toLocaleString()}{m.reference ? ` · ${m.reference}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tabular-nums font-medium">{Number(m.quantity)}</div>
                        <div className="text-[11px] text-muted-foreground">{fmtMoney(Number(m.unit_cost ?? 0))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </DrawerSection>
            </TabsContent>
          </Tabs>
        )}
      </DetailDrawer>
    </div>
  );
}

function Kpi({ label, value, icon, tone, onClick, to }: {
  label: string; value: string; icon: React.ReactNode;
  tone?: "warn" | "bad"; onClick?: () => void; to?: string;
}) {
  const body = (
    <div className="rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        <span className={tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "text-primary"}>{icon}</span>
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
  if (to) return <Link to={to as any} className="block">{body}</Link>;
  return <button type="button" onClick={onClick} className="block w-full">{body}</button>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>{title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReorderRow({ label, count, tone, onClick }: { label: string; count: number; tone: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted/60">
      <span>{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{count}</span>
    </button>
  );
}
