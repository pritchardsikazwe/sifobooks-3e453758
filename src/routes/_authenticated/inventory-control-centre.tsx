import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Boxes, ClipboardCheck, Eye, FileText, MapPin, Package, RefreshCw, ShieldCheck, Store, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { InventoryTransactionExplorer } from "@/components/sifo/InventoryTransactionExplorer";
import { fetchBalances, fetchLocations, fetchTransfers, type BalanceRow, type Location, type Transfer } from "@/lib/multi-location";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory-control-centre")({
  head: () => ({ meta: [{ title: "Inventory Control Centre — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InventoryControlCentre,
});

function InventoryControlCentre() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Location | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locs, bals, trfs] = await Promise.all([fetchLocations(true), fetchBalances(), fetchTransfers()]);
      setLocations(locs); setBalances(bals); setTransfers(trfs);
    } catch (e: any) { toast.error(e?.message ?? "Could not load inventory control data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const locationStats = useMemo(() => locations.map(location => {
    const rows = balances.filter(b => b.location_id === location.id);
    const quantity = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
    const value = rows.reduce((sum, r) => sum + Number(r.quantity) * Number(r.cost_price), 0);
    const low = rows.filter(r => Number(r.reorder_level) > 0 && Number(r.quantity) <= Number(r.reorder_level)).length;
    return { location, rows, quantity, value, low };
  }), [locations, balances]);

  const warehouseStats = locationStats.filter(x => x.location.location_type === "warehouse" || x.location.location_type === "factory" || x.location.location_type === "production");
  const storeStats = locationStats.filter(x => x.location.location_type === "store" || x.location.location_type === "outlet" || x.location.location_type === "branch");
  const otherStats = locationStats.filter(x => !warehouseStats.includes(x) && !storeStats.includes(x));

  const openLocation = (location: Location) => setSelected(location);

  const transferRows = transfers.map(t => ({
    ...t,
    from_name: locations.find(l => l.id === t.from_location_id)?.name ?? "—",
    to_name: locations.find(l => l.id === t.to_location_id)?.name ?? "—",
  }));
  const transferColumns: DTColumn<any>[] = [
    { key: "transfer_number", header: "Transfer #", sticky: true, cell: r => <button className="font-medium text-primary hover:underline" onClick={() => toast.info(`Transfer ${r.transfer_number ?? "record"} — open Transaction Trail below to inspect source lines`)}>{r.transfer_number ?? "—"}</button> },
    { key: "transfer_date", header: "Date", cell: r => r.transfer_date ? new Date(r.transfer_date).toLocaleDateString() : "—" },
    { key: "from_name", header: "From", cell: r => r.from_name },
    { key: "to_name", header: "To", cell: r => r.to_name },
    { key: "status", header: "Status", cell: r => <SifoStatusBadge status={r.status} /> },
    { key: "total_value", header: "Value", align: "right", cell: r => fmtMoney(Number(r.total_value || 0)) },
  ];

  const statsFor = (location: Location) => locationStats.find(x => x.location.id === location.id);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
      <SifoModuleHeader
        title="Inventory Control Centre"
        description="MKP Farms Limited 1 — see exactly what is held at each location and trace stock from origin to sale."
        icon={Boxes}
        actions={<Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={MapPin} label="Locations" value={String(locations.filter(l => l.is_active).length)} hint="Active inventory locations" />
        <SummaryCard icon={Package} label="Tracked item positions" value={String(balances.length)} hint="Item + location balances" />
        <SummaryCard icon={Warehouse} label="Warehouse stock value" value={fmtMoney(warehouseStats.reduce((s, x) => s + x.value, 0))} hint="At recorded cost" />
        <SummaryCard icon={Store} label="Store stock value" value={fmtMoney(storeStats.reduce((s, x) => s + x.value, 0))} hint="At recorded cost" />
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-3"><ArrowRightLeft className="h-5 w-5 text-primary" /><div><div className="font-semibold">Stock Flow</div><div className="text-xs text-muted-foreground">The operational chain used for MKP Farms Limited 1.</div></div></div>
        <div className="grid gap-2 md:grid-cols-5 items-stretch">
          <FlowCard step="01" title="Opening / Production" text="Starting batch enters the warehouse" />
          <FlowArrow />
          <FlowCard step="02" title="Warehouse" text="Admin checks actual item balances" />
          <FlowArrow />
          <FlowCard step="03" title="Transfer" text="Dispatch → in transit → received" />
          <FlowArrow />
          <FlowCard step="04" title="Chibombo Store" text="Store holds its own stock" />
          <FlowArrow />
          <FlowCard step="05" title="Cashier / Sale" text="Sale reduces store stock and is auditable" />
        </div>
      </div>

      <LocationSection title="Warehouses & Production" icon={Warehouse} locations={warehouseStats} onOpen={openLocation} />
      <LocationSection title="Stores & Outlets" icon={Store} locations={storeStats} onOpen={openLocation} />
      {otherStats.length > 0 && <LocationSection title="Other Locations" icon={MapPin} locations={otherStats} onOpen={openLocation} />}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Transfer Trace</CardTitle><p className="text-xs text-muted-foreground mt-1">Follow stock from the starting warehouse through every transfer to its destination.</p></div>
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search transfer…" className="sm:w-64" />
        </CardHeader>
        <CardContent className="px-0">
          <DataTable tableId="inventory-control-transfers" columns={transferColumns} data={transferRows.filter(r => !query || JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))} loading={loading} empty="No inventory transfers recorded." />
        </CardContent>
      </Card>

      <InventoryTransactionExplorer />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard icon={ClipboardCheck} title="Stock Takes" description="Count, review, approve and post location variances." to="/stock-counts" />
        <ActionCard icon={FileText} title="Stock Adjustments" description="Review controlled increases, decreases and write-offs." to="/stock-adjustments" />
        <ActionCard icon={ShieldCheck} title="Cashier & POS Audit" description="Review shifts, sales, voids, refunds and discounts." to="/retail-control-center" />
        <ActionCard icon={Eye} title="System Audit Logs" description="Inspect who changed records and when." to="/audit-logs" />
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && <LocationDetail location={selected} rows={statsFor(selected)?.rows ?? []} transfers={transfers} locations={locations} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowCard({ step, title, text }: { step: string; title: string; text: string }) { return <Card className="border-dashed"><CardContent className="p-3"><div className="text-[10px] font-bold text-primary">{step}</div><div className="font-semibold text-sm mt-1">{title}</div><div className="text-[11px] text-muted-foreground mt-1">{text}</div></CardContent></Card>; }
function FlowArrow() { return <div className="hidden md:flex items-center justify-center text-muted-foreground">→</div>; }
function SummaryCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div><div className="mt-2 text-xl font-semibold">{value}</div><div className="text-[11px] text-muted-foreground mt-1">{hint}</div></CardContent></Card>; }

function LocationSection({ title, icon: Icon, locations, onOpen }: { title: string; icon: any; locations: { location: Location; rows: BalanceRow[]; quantity: number; value: number; low: number }[]; onOpen: (l: Location) => void }) {
  return <section className="space-y-3"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h2 className="text-base font-semibold">{title}</h2><Badge variant="outline">{locations.length}</Badge></div>{locations.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No locations in this group.</CardContent></Card> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{locations.map(x => <Card key={x.location.id} className="hover:shadow-sm transition-shadow"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{x.location.name}</div><div className="text-xs text-muted-foreground">{x.location.code || x.location.location_type}</div></div><SifoStatusBadge status={x.location.is_active ? "active" : "inactive"} /></div><div className="grid grid-cols-3 gap-2 mt-4"><Metric label="Items" value={String(x.rows.length)} /><Metric label="Units" value={String(x.quantity)} /><Metric label="Value" value={fmtMoney(x.value)} /></div>{x.low > 0 && <div className="mt-3 text-xs text-amber-700">{x.low} item{x.low === 1 ? "" : "s"} at/below reorder level</div>}<Button className="mt-4 w-full" size="sm" onClick={() => onOpen(x.location)}><Eye className="h-4 w-4 mr-1" /> View stock in {x.location.name}</Button></CardContent></Card>)}</div>}</section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><div className="text-[11px] text-muted-foreground">{label}</div><div className="text-sm font-semibold truncate">{value}</div></div>; }

function LocationDetail({ location, rows, transfers, locations }: { location: Location; rows: BalanceRow[]; transfers: Transfer[]; locations: Location[] }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter(r => !q || `${r.name} ${r.sku ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const inbound = transfers.filter(t => t.to_location_id === location.id);
  const outbound = transfers.filter(t => t.from_location_id === location.id);
  const columns: DTColumn<BalanceRow>[] = [
    { key: "name", header: "Item", sticky: true, cell: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.sku || "No SKU"}</div></div> },
    { key: "unit", header: "Unit" },
    { key: "quantity", header: "Current Qty", align: "right", cell: r => <span className="font-semibold">{Number(r.quantity)}</span> },
    { key: "cost_price", header: "Unit Cost", align: "right", cell: r => fmtMoney(Number(r.cost_price)) },
    { key: "value", header: "Stock Value", align: "right", accessor: r => Number(r.quantity) * Number(r.cost_price), cell: r => fmtMoney(Number(r.quantity) * Number(r.cost_price)) },
    { key: "reorder_level", header: "Reorder", align: "right", cell: r => Number(r.reorder_level) || "—" },
    { key: "status", header: "Control", cell: r => r.needs_cost_review ? <Badge variant="destructive">Cost review</Badge> : r.needs_unit_verification ? <Badge variant="outline">Unit review</Badge> : <Badge variant="secondary">OK</Badge> },
  ];
  return <div className="space-y-4"><div className="rounded-lg border bg-muted/30 p-3 grid gap-3 sm:grid-cols-4"><Metric label="Location type" value={location.location_type} /><Metric label="Items" value={String(rows.length)} /><Metric label="Units" value={String(rows.reduce((s, r) => s + Number(r.quantity), 0))} /><Metric label="Stock value" value={fmtMoney(rows.reduce((s, r) => s + Number(r.quantity) * Number(r.cost_price), 0))} /></div><div className="flex flex-wrap gap-2"><Badge variant="outline">Inbound transfers: {inbound.length}</Badge><Badge variant="outline">Outbound transfers: {outbound.length}</Badge>{location.address && <span className="text-xs text-muted-foreground">{location.address}</span>}</div><Input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search items in ${location.name}…`} /><DataTable tableId={`location-stock-${location.id}`} columns={columns} data={filtered} empty="No stock is currently recorded at this location." /><div className="grid gap-3 md:grid-cols-2"><TransferMini title="Recent inbound" transfers={inbound} locations={locations} /><TransferMini title="Recent outbound" transfers={outbound} locations={locations} /></div></div>;
}

function TransferMini({ title, transfers, locations }: { title: string; transfers: Transfer[]; locations: Location[] }) { const recent = transfers.slice(0, 5); return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="space-y-2">{recent.length === 0 ? <div className="text-xs text-muted-foreground">None recorded.</div> : recent.map(t => <div key={t.id} className="flex items-center justify-between gap-2 text-xs border-b last:border-0 pb-2 last:pb-0"><span className="font-medium">{t.transfer_number || t.id.slice(0, 8)}</span><span>{locations.find(l => l.id === t.from_location_id)?.name ?? "—"} → {locations.find(l => l.id === t.to_location_id)?.name ?? "—"}</span><SifoStatusBadge status={t.status} /></div>)}</CardContent></Card>; }
function ActionCard({ icon: Icon, title, description, to }: { icon: any; title: string; description: string; to: string }) { return <Link to={to as any}><Card className="h-full hover:shadow-sm hover:border-primary/40 transition-all"><CardContent className="p-4"><Icon className="h-5 w-5 text-primary" /><div className="mt-3 font-semibold">{title}</div><div className="text-xs text-muted-foreground mt-1">{description}</div><div className="text-xs text-primary mt-3">Open →</div></CardContent></Card></Link>; }
