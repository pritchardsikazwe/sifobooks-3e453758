import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleGate } from "@/components/ModuleGate";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft, Boxes, ClipboardCheck, ClipboardList, History, MapPin,
  Package, RefreshCw, Scale, Warehouse,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoKpiCard } from "@/components/sifo/SifoKpiCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory-control")({
  head: () => ({
    meta: [
      { title: "Inventory Control Centre — SifoBooks" },
      { name: "description", content: "Central inventory control for stock, locations, transfers, counts, reconciliation and audit." },
    ],
  }),
  component: () => (
    <ModuleGate name="Inventory Control Centre" tables={["stock_reconciliations"]}>
      <InventoryControl />
    </ModuleGate>
  ),
});

type Item = {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number | null;
  quantity_on_hand: number | null;
  reorder_level: number | null;
};

type Location = {
  id: string;
  name: string;
  location_type: string | null;
  is_active: boolean | null;
};

function InventoryControl() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, l, t, c] = await Promise.all([
        supabase
          .from("stock_items")
          .select("id,name,sku,cost_price,quantity_on_hand,reorder_level")
          .order("name")
          .limit(2000),
        supabase
          .from("inventory_locations")
          .select("id,name,location_type,is_active")
          .order("name"),
        supabase
          .from("inventory_transfers")
          .select("id,transfer_number,reference,status,transfer_date,from_location_id,to_location_id")
          .order("updated_at", { ascending: false })
          .limit(10),
        supabase
          .from("stock_reconciliations")
          .select("id,count_number,status,count_date,total_variance_value")
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

      if (i.error) throw i.error;
      if (l.error) throw l.error;
      if (t.error) throw t.error;
      if (c.error) throw c.error;

      setItems((i.data ?? []) as Item[]);
      setLocations((l.data ?? []) as Location[]);
      setTransfers(t.data ?? []);
      setCounts(c.data ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load inventory controls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => {
    const active = items.filter((i) => Number(i.quantity_on_hand) > 0);
    const low = items.filter((i) => Number(i.reorder_level) > 0 && Number(i.quantity_on_hand) <= Number(i.reorder_level));
    const value = items.reduce((sum, i) => sum + Number(i.cost_price ?? 0) * Number(i.quantity_on_hand ?? 0), 0);
    return {
      items: items.length,
      active: active.length,
      low: low.length,
      value,
      locations: locations.filter((l) => l.is_active !== false).length,
      pendingTransfers: transfers.filter((t) => !["completed", "received", "cancelled", "POSTED"].includes(String(t.status).toLowerCase())).length,
      pendingCounts: counts.filter((c) => ["draft", "counted", "approved"].includes(String(c.status).toLowerCase())).length,
    };
  }, [items, locations, transfers, counts]);

  const money = (n: number) =>
    `ZMW ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <SifoModuleHeader
        module="inventory"
        title="Inventory Control Centre"
        description="One control surface for products, locations, transfers, stock takes, reconciliation and inventory audit."
        icon={Boxes}
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SifoKpiCard label="Items / SKUs" value={metrics.items.toLocaleString()} hint={`${metrics.active.toLocaleString()} with stock on hand`} />
        <SifoKpiCard label="Stock value" value={money(metrics.value)} hint="Current quantity × cost" />
        <SifoKpiCard label="Low stock" value={metrics.low.toLocaleString()} hint="At or below reorder level" />
        <SifoKpiCard label="Locations" value={metrics.locations.toLocaleString()} hint="Active warehouses / outlets" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Inventory workflow</CardTitle>
          <p className="text-xs text-muted-foreground">
            Warehouse → transfer → store/outlet → cashier/POS, with stock movement and reconciliation controls.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <ControlLink icon={Package} title="Items / Products" text="Item master, SKU, pricing, tax and stock levels." to="/stock" />
          <ControlLink icon={Warehouse} title="Locations" text="Warehouses, outlets and stock held by location." to="/inventory/locations" />
          <ControlLink icon={ArrowRightLeft} title="Stock Transfers" text="Draft, dispatch, transit and receive stock." to="/inventory/transfers" />
          <ControlLink icon={ClipboardList} title="Stock Takes" text="Physical count, variance, approval and posting." to="/stock-counts" />
          <ControlLink icon={Scale} title="Reconciliation" text="Expected closing versus physical quantity." to="/inventory/reconciliation" />
          <ControlLink icon={History} title="Stock Card" text="Running movement history for each item/location." to="/inventory/stock-card" />
          <ControlLink icon={ClipboardCheck} title="Inventory Sheets" text="Inventory reports, valuation and stock-take tools." to="/inventory-sheets" />
          <ControlLink icon={MapPin} title="Flow & Audit" text="Trace stock back to its source transaction." to="/inventory-flow-audit" />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
            <div>
              <CardTitle className="text-base">Recent stock transfers</CardTitle>
              <p className="text-xs text-muted-foreground">Latest warehouse/outlet transfer documents.</p>
            </div>
            <Button asChild size="sm" variant="outline"><Link to="/inventory/transfers">Open register</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {transfers.length ? transfers.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{x.transfer_number ?? x.reference ?? "Transfer"}</div>
                  <div className="text-xs text-muted-foreground">{x.transfer_date ?? "—"}</div>
                </div>
                <Badge variant={String(x.status).toLowerCase() === "completed" ? "default" : "secondary"}>{x.status ?? "—"}</Badge>
              </div>
            )) : (
              <EmptyState text="No stock transfers recorded." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
            <div>
              <CardTitle className="text-base">Recent stock reconciliations</CardTitle>
              <p className="text-xs text-muted-foreground">Physical count and variance control.</p>
            </div>
            <Button asChild size="sm" variant="outline"><Link to="/inventory/reconciliation">Open reconciliation</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {counts.length ? counts.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{x.count_number ?? "Stock count"}</div>
                  <div className="text-xs text-muted-foreground">{x.count_date ?? "—"} · Variance {money(Number(x.total_variance_value ?? 0))}</div>
                </div>
                <Badge variant={String(x.status).toLowerCase() === "posted" ? "default" : "secondary"}>{x.status ?? "—"}</Badge>
              </div>
            )) : (
              <EmptyState text="No stock reconciliations recorded." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Control queue</CardTitle>
          <p className="text-xs text-muted-foreground">Items that may require an operator or manager action.</p>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <QueueCard label="Low-stock items" value={metrics.low} to="/stock" />
          <QueueCard label="Transfer documents in progress" value={metrics.pendingTransfers} to="/inventory/transfers" />
          <QueueCard label="Counts awaiting completion/approval" value={metrics.pendingCounts} to="/stock-counts" />
        </CardContent>
      </Card>
    </div>
  );
}

function ControlLink({
  icon: Icon, title, text, to,
}: { icon: any; title: string; text: string; to: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg border p-2 text-primary"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{text}</div>
        </div>
      </div>
    </Link>
  );
}

function QueueCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-xl border p-4 hover:bg-muted/40">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-muted-foreground">Open control →</div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
