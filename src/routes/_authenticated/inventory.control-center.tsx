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
  head: () => ({
    meta: [
      { title: "Inventory Control Center — SifoBooks" },
      { name: "description", content: "One view of production, warehouse stock, stock in transit, outlet stock and open variances across every location." },
      { property: "og:title", content: "Inventory Control Center — SifoBooks" },
      { property: "og:description", content: "Production, warehouse, transit and outlet stock at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ControlCenterPage,
});

type BalanceRow = {
  item_id: string; location_id: string; quantity: number;
  item_name?: string; sku?: string | null; unit?: string; cost_price?: number | null;
};

function ControlCenterPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [produced, setProduced] = useState(0);
  const [batches, setBatches] = useState(0);
  const [openTransfers, setOpenTransfers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [locs, bal, prod, trf] = await Promise.all([
        fetchLocations(),
        fetchBalances(),
        supabase.from("stock_movements").select("quantity").eq("movement_type", "production"),
        supabase.from("inventory_transfers").select("id, status"),
      ]);
      setLocations(locs);
      setBalances(bal as unknown as BalanceRow[]);
      const rows = (prod.data ?? []) as { quantity: number }[];
      setProduced(rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0));
      setBatches(rows.length);
      setOpenTransfers(((trf.data ?? []) as { status: string }[]).filter((t) => t.status !== "received" && t.status !== "cancelled").length);
    } catch (e: any) { setError(e.message ?? "Could not load the control center"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byLocation = useMemo(() => {
    return locations.map((l) => {
      const rows = balances.filter((b) => b.location_id === l.id);
      const qty = rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0);
      const value = rows.reduce((s, r) => s + Number(r.quantity ?? 0) * Number(r.cost_price ?? 0), 0);
      return { id: l.id, name: l.name, code: l.code, type: l.location_type, lines: rows.length, qty, value };
    });
  }, [locations, balances]);

  const transitQty = byLocation.filter((l) => l.type === "transit").reduce((s, l) => s + l.qty, 0);
  const warehouseQty = byLocation.filter((l) => l.type === "warehouse").reduce((s, l) => s + l.qty, 0);
  const outletQty = byLocation.filter((l) => l.type !== "warehouse" && l.type !== "transit").reduce((s, l) => s + l.qty, 0);
  const totalValue = byLocation.reduce((s, l) => s + l.value, 0);

  const cols: DTColumn<(typeof byLocation)[number]>[] = [
    { key: "name", header: "Location", sortable: true, sticky: true },
    { key: "code", header: "Code" },
    { key: "type", header: "Type" },
    { key: "lines", header: "Products", align: "right" },
    { key: "qty", header: "Units on hand", align: "right", sortable: true },
    { key: "value", header: "Stock value", align: "right", cell: (r) => fmtMoney(r.value) },
  ];

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Inventory control center"
        description="Production, warehouse, stock in transit and outlet stock in one place."
        icon={Gauge}
        actions={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <SifoKpiCard label="Produced (all time)" value={String(produced)} />
        <SifoKpiCard label="Production batches" value={String(batches)} />
        <SifoKpiCard label="Warehouse units" value={String(warehouseQty)} />
        <SifoKpiCard label="In transit" value={String(transitQty)} />
        <SifoKpiCard label="Outlet units" value={String(outletQty)} />
        <SifoKpiCard label="Stock value" value={fmtMoney(totalValue)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Where to go next</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/inventory/production">Production batches</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/inventory/transfers">Stock transfers</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/inventory/locations">Locations</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/inventory/stock-card">Stock card</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/inventory/reconciliation">Reconciliation</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/inventory/cashier-records">Cashier records</Link></Button>
        </CardContent>
      </Card>

      <DataTable
        tableId="inventory-control-center"
        data={byLocation}
        columns={cols}
        loading={loading}
        error={error}
        onRetry={load}
        searchPlaceholder="Search locations…"
        empty="No stock locations yet."
        toolbarRight={<ExportMenu rows={byLocation} filename="inventory-control-center" title="Inventory control center" />}
      />
    </div>
  );
}
