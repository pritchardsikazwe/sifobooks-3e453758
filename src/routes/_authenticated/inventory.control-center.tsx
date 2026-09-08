import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoKpiCard } from "@/components/sifo/SifoKpiCard";
import { ExportMenu } from "@/lib/exports";
import { fmtMoney } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { fetchBalances, fetchLocations, type Location } from "@/lib/multi-location";

export const Route = createFileRoute("/_authenticated/inventory/control-center")({
  head: () => ({ meta: [
    { title: "Inventory Control Center — SifoBooks" },
    { name: "description", content: "One view of production, warehouse stock, stock in transit, outlet stock and open variances across every location." },
    { property: "og:title", content: "Inventory Control Center — SifoBooks" },
    { property: "og:description", content: "Production, warehouse, transit and outlet stock at a glance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ]}),
  component: ControlCenterPage,
});

type BalanceRow = { item_id: string; location_id: string; quantity: number; name: string; sku: string | null; unit: string; cost_price: number; sell_price: number; needs_cost_review: boolean; needs_unit_verification: boolean };
type MkpRow = { item_id: string; name: string; sku: string | null; unit: string; cost_price: number; sell_price: number; warehouse_initial: number; warehouse_transferred_out: number; warehouse_transferred_in: number; warehouse_purchased: number; warehouse_returns: number; warehouse_adjustments: number; warehouse_current: number; chibombo_received: number; chibombo_sales: number; chibombo_returns: number; chibombo_adjustments: number; chibombo_transferred_out: number; chibombo_current: number };
type ExceptionRow = { item: string; sku: string | null; unit: string; qty: number; cost: number; sell: number; issue: string };

function ControlCenterPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [mkp, setMkp] = useState<MkpRow[]>([]);
  const [produced, setProduced] = useState(0);
  const [batches, setBatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [locs, bal, prod, rec] = await Promise.all([
        fetchLocations(), fetchBalances(),
        supabase.from("stock_movements").select("quantity").eq("movement_type", "production"),
        supabase.from("mkp_inventory_reconciliation").select("*").order("name"),
      ]);
      if (rec.error) throw rec.error;
      setLocations(locs); setBalances(bal as unknown as BalanceRow[]); setMkp((rec.data ?? []) as MkpRow[]);
      const rows = (prod.data ?? []) as { quantity: number }[];
      setProduced(rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0)); setBatches(rows.length);
    } catch (e: any) { setError(e.message ?? "Could not load the control center"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byLocation = useMemo(() => locations.map((l) => {
    const rows = balances.filter((b) => b.location_id === l.id);
    const qty = rows.reduce((s, r) => s + r.quantity, 0);
    const value = rows.reduce((s, r) => s + r.quantity * r.cost_price, 0);
    const retail = rows.reduce((s, r) => s + r.quantity * r.sell_price, 0);
    return { id: l.id, name: l.name, code: l.code, type: l.location_type, lines: rows.length, qty, value, retail, margin: retail - value };
  }), [locations, balances]);

  const sumBy = (pred: (t: string) => boolean, key: "qty" | "value") => byLocation.filter((l) => pred(l.type)).reduce((s, l) => s + l[key], 0);
  const totalCost = byLocation.reduce((s, l) => s + l.value, 0);
  const totalRetail = byLocation.reduce((s, l) => s + l.retail, 0);
  const exceptions = useMemo<ExceptionRow[]>(() => {
    const seen = new Map<string, { item: string; sku: string | null; unit: string; qty: number; cost: number; sell: number; issues: string[] }>();
    for (const b of balances) {
      if (b.quantity === 0) continue;
      const issues: string[] = [];
      if (!b.cost_price) issues.push("Zero cost");
      if (b.needs_cost_review) issues.push("Cost flagged for review");
      if (!b.sell_price) issues.push("No selling price");
      if (!b.unit || b.unit === "each") issues.push("Unit not set");
      if (b.needs_unit_verification) issues.push("Unit needs verification");
      if (!b.sku) issues.push("No SKU");
      if (!issues.length) continue;
      const prev = seen.get(b.item_id);
      if (prev) { prev.qty += b.quantity; continue; }
      seen.set(b.item_id, { item: b.name, sku: b.sku, unit: b.unit, qty: b.quantity, cost: b.cost_price, sell: b.sell_price, issues });
    }
    return [...seen.values()].map((r) => ({ ...r, issue: r.issues.join(", ") }));
  }, [balances]);

  const cols: DTColumn<(typeof byLocation)[number]>[] = [
    { key: "name", header: "Location", sortable: true, sticky: true }, { key: "code", header: "Code" }, { key: "type", header: "Type" },
    { key: "lines", header: "Products", align: "right" }, { key: "qty", header: "Units on hand", align: "right", sortable: true },
    { key: "value", header: "Inventory value (cost)", align: "right", sortable: true, cell: (r) => fmtMoney(r.value) },
    { key: "retail", header: "Potential sales value", align: "right", cell: (r) => fmtMoney(r.retail) }, { key: "margin", header: "Potential gross margin", align: "right", cell: (r) => fmtMoney(r.margin) },
  ];
  const mkpCols: DTColumn<MkpRow>[] = [
    { key: "name", header: "Product", sticky: true, sortable: true }, { key: "unit", header: "Unit" },
    { key: "warehouse_initial", header: "Warehouse Initial", align: "right" }, { key: "warehouse_transferred_out", header: "WH Transfer Out", align: "right" },
    { key: "warehouse_current", header: "Warehouse Remaining", align: "right", sortable: true }, { key: "chibombo_received", header: "Chibombo Received", align: "right" },
    { key: "chibombo_sales", header: "Posted Sales", align: "right" }, { key: "chibombo_returns", header: "Returns", align: "right" },
    { key: "chibombo_adjustments", header: "Adjustments", align: "right" }, { key: "chibombo_transferred_out", header: "Chibombo Transfer Out", align: "right" },
    { key: "chibombo_current", header: "Chibombo Remaining", align: "right", sortable: true },
    { key: "chibombo_current", header: "Company Total", align: "right", cell: (r) => r.warehouse_current + r.chibombo_current },
    { key: "cost_price", header: "Company Cost Value", align: "right", cell: (r) => fmtMoney((Number(r.warehouse_current) + Number(r.chibombo_current)) * Number(r.cost_price)) },
  ];
  const exceptionCols: DTColumn<ExceptionRow>[] = [
    { key: "item", header: "Product", sortable: true, sticky: true }, { key: "sku", header: "SKU" }, { key: "unit", header: "Unit" },
    { key: "qty", header: "Quantity", align: "right" }, { key: "cost", header: "Cost", align: "right", cell: (r) => fmtMoney(r.cost) },
    { key: "sell", header: "Selling price", align: "right", cell: (r) => fmtMoney(r.sell) }, { key: "issue", header: "Needs review", cell: (r) => <span className="text-destructive">{r.issue}</span> },
  ];

  return <div className="space-y-4">
    <SifoModuleHeader module="inventory" title="Inventory control center" description="Production, warehouse, stock in transit and outlet stock, valued at cost with the retail upside beside it." icon={Gauge} actions={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SifoKpiCard label="Total inventory value (cost)" value={fmtMoney(totalCost)} /><SifoKpiCard label="Potential sales value" value={fmtMoney(totalRetail)} /><SifoKpiCard label="Potential gross margin" value={fmtMoney(totalRetail - totalCost)} /><SifoKpiCard label="Produced (all time)" value={`${produced} units · ${batches} lines`} /></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SifoKpiCard label="Warehouse value" value={fmtMoney(sumBy((t) => t === "warehouse", "value"))} hint={`${sumBy((t) => t === "warehouse", "qty")} units`} /><SifoKpiCard label="Store / outlet value" value={fmtMoney(sumBy((t) => t !== "warehouse" && t !== "transit", "value"))} hint={`${sumBy((t) => t !== "warehouse" && t !== "transit", "qty")} units`} /><SifoKpiCard label="Stock in transit value" value={fmtMoney(sumBy((t) => t === "transit", "value"))} hint={`${sumBy((t) => t === "transit", "qty")} units`} /><SifoKpiCard label="Company total" value={fmtMoney(totalCost)} /></div>
    <Card><CardHeader><CardTitle className="text-base">MKP Warehouse vs Chibombo</CardTitle></CardHeader><CardContent><DataTable tableId="mkp-reconciliation" data={mkp} columns={mkpCols} loading={loading} searchPlaceholder="Search MKP products…" empty="No MKP reconciliation rows yet." toolbarRight={<ExportMenu rows={mkp} filename="mkp-inventory-reconciliation" title="MKP Warehouse vs Chibombo" />} /></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Where to go next</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link to="/inventory/production">Production batches</Link></Button><Button asChild variant="outline" size="sm"><Link to="/inventory/transfers">Stock transfers</Link></Button><Button asChild variant="outline" size="sm"><Link to="/inventory/locations">Locations / Chibombo</Link></Button><Button asChild variant="outline" size="sm"><Link to="/inventory/stock-card">Stock card</Link></Button><Button asChild variant="outline" size="sm"><Link to="/inventory/reconciliation">Reconciliation</Link></Button><Button asChild variant="outline" size="sm"><Link to="/inventory/cashier-records">Cashier records</Link></Button></CardContent></Card>
    <DataTable tableId="inventory-control-center" data={byLocation} columns={cols} loading={loading} error={error} onRetry={load} searchPlaceholder="Search locations…" empty="No stock locations yet." toolbarRight={<ExportMenu rows={byLocation} filename="inventory-control-center" title="Inventory control center" />} />
    <div className="space-y-2"><h2 className="text-lg font-semibold">Inventory cost exceptions</h2><DataTable tableId="inventory-cost-exceptions" data={exceptions} columns={exceptionCols} loading={loading} searchPlaceholder="Search exceptions…" empty="Every product holding stock has a cost, a unit and a selling price." toolbarRight={<ExportMenu rows={exceptions} filename="inventory-cost-exceptions" title="Inventory cost exceptions" />} /></div>
  </div>;
}