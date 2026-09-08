import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Warehouse, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoKpiCard } from "@/components/sifo/SifoKpiCard";
import { ExportMenu } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import {
  LOCATION_TYPES, currentUserId, fetchBalances, fetchLocations, type BalanceRow, type Location,
} from "@/lib/multi-location";

export const Route = createFileRoute("/_authenticated/inventory/locations")({
  head: () => ({
    meta: [
      { title: "Inventory Locations — SifoBooks" },
      { name: "description", content: "Warehouses, outlets, branches and transit stock with live quantities and stock value per location." },
      { property: "og:title", content: "Inventory Locations — SifoBooks" },
      { property: "og:description", content: "Stock held at every warehouse, outlet and branch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LocationsPage,
});

type Row = Location & { units: number; value: number; skus: number; low: number };

function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", location_type: "warehouse", address: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [locs, bals] = await Promise.all([fetchLocations(true), fetchBalances()]);
      setLocations(locs); setBalances(bals);
    } catch (e: any) { setError(e.message ?? "Could not load locations"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows: Row[] = useMemo(() => locations.map((l) => {
    const mine = balances.filter((b) => b.location_id === l.id);
    return {
      ...l,
      skus: mine.filter((b) => b.quantity !== 0).length,
      units: mine.reduce((s, b) => s + b.quantity, 0),
      value: mine.reduce((s, b) => s + b.quantity * b.cost_price, 0),
      low: mine.filter((b) => b.reorder_level > 0 && b.quantity <= b.reorder_level).length,
    };
  }), [locations, balances]);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const transitUnits = rows.filter((r) => r.location_type === "transit").reduce((s, r) => s + r.units, 0);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Give the location a name");
    setBusy(true);
    try {
      const uid = await currentUserId();
      const { error } = await supabase.from("inventory_locations").insert({
        user_id: uid, name: form.name.trim(), code: form.code.trim() || null,
        location_type: form.location_type, address: form.address || null, notes: form.notes || null,
      } as never);
      if (error) throw error;
      toast.success("Location added");
      setOpen(false);
      setForm({ name: "", code: "", location_type: "warehouse", address: "", notes: "" });
      load();
    } catch (e: any) { toast.error(e.message ?? "Could not save location"); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<Row>[] = [
    { key: "name", header: "Location", sortable: true, sticky: true },
    { key: "code", header: "Code", sortable: true },
    { key: "location_type", header: "Type", sortable: true, cell: (r) => <span className="capitalize">{r.location_type}</span> },
    { key: "skus", header: "Products", align: "right", sortable: true },
    { key: "units", header: "Units", align: "right", sortable: true },
    { key: "value", header: "Stock value", align: "right", sortable: true, cell: (r) => fmtMoney(r.value) },
    { key: "low", header: "Low stock", align: "right", sortable: true },
  ];

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Inventory locations"
        description="Warehouses, sales outlets, branches and stock in transit — each holds its own stock."
        icon={Warehouse}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New location</Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SifoKpiCard label="Locations" value={String(rows.length)} />
        <SifoKpiCard label="Total stock value" value={fmtMoney(totalValue)} />
        <SifoKpiCard label="Units in transit" value={String(transitUnits)} />
      </div>

      <DataTable
        tableId="inventory-locations"
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={load}
        searchPlaceholder="Search locations…"
        empty="No locations yet. Add a warehouse and a sales outlet to get started."
        toolbarRight={<ExportMenu rows={rows} filename="inventory-locations" title="Inventory locations" />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New inventory location</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="MKP Sales Outlet" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="MKP-OUTLET" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.location_type} onValueChange={(v) => setForm((f) => ({ ...f, location_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>Save location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
