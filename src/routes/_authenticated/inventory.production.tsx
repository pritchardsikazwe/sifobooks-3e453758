import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Factory, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { ExportMenu } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  createProductionBatch, fetchLocations, fetchProductionBatches, fetchProductionLines,
  type Location, type ProductionBatch, type ProductionLine,
} from "@/lib/multi-location";

export const Route = createFileRoute("/_authenticated/inventory/production")({
  head: () => ({
    meta: [
      { title: "Production Batches — SifoBooks" },
      { name: "description", content: "Record factory or farm production batches straight into warehouse stock, and trace every batch to the products it produced." },
      { property: "og:title", content: "Production Batches — SifoBooks" },
      { property: "og:description", content: "Production runs feeding warehouse stock, fully traceable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductionPage,
});

type Item = { id: string; name: string; sku: string | null; unit: string };
type FormLine = { item_id: string; quantity: string; unit_cost: string };

function ProductionPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [active, setActive] = useState<ProductionBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    batch_no: "", batch_date: new Date().toISOString().slice(0, 10), location_id: "", notes: "",
  });
  const [formLines, setFormLines] = useState<FormLine[]>([{ item_id: "", quantity: "", unit_cost: "" }]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [b, l, it] = await Promise.all([
        fetchProductionBatches(),
        fetchLocations(),
        supabase.from("stock_items").select("id, name, sku, unit").order("name"),
      ]);
      setBatches(b); setLocations(l);
      setItems((it.data ?? []) as unknown as Item[]);
    } catch (e: any) { setError(e.message ?? "Could not load production batches"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "—";

  const openBatch = async (b: ProductionBatch) => {
    setActive(b);
    setLines(await fetchProductionLines(b.id));
  };

  const save = async () => {
    if (!form.batch_no.trim()) return toast.error("Give the batch a number");
    if (!form.location_id) return toast.error("Choose the location the stock goes into");
    const payload = formLines
      .filter((l) => l.item_id && Number(l.quantity) > 0)
      .map((l) => ({ item_id: l.item_id, quantity: Number(l.quantity), unit_cost: l.unit_cost ? Number(l.unit_cost) : null }));
    if (!payload.length) return toast.error("Add at least one product and quantity");
    setBusy(true);
    try {
      await createProductionBatch({
        batch_no: form.batch_no.trim(), batch_date: form.batch_date,
        location_id: form.location_id, notes: form.notes || undefined, lines: payload,
      });
      toast.success("Production batch recorded — stock is now in the location");
      setOpen(false);
      setForm({ batch_no: "", batch_date: new Date().toISOString().slice(0, 10), location_id: "", notes: "" });
      setFormLines([{ item_id: "", quantity: "", unit_cost: "" }]);
      load();
    } catch (e: any) { toast.error(e.message ?? "Could not save the batch"); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<ProductionBatch>[] = [
    { key: "batch_no", header: "Batch", sortable: true, sticky: true },
    { key: "batch_date", header: "Date", sortable: true },
    { key: "location_id", header: "Into location", cell: (r) => locName(r.location_id) },
    { key: "status", header: "Status", cell: (r) => <SifoStatusBadge status={r.status} /> },
    { key: "notes", header: "Notes" },
  ];

  const lineCols: DTColumn<ProductionLine>[] = [
    { key: "item", header: "Product", sticky: true, accessor: (r) => itemName(r.item_id), cell: (r) => itemName(r.item_id) },
    { key: "quantity", header: "Produced", align: "right" },
    { key: "unit_cost", header: "Unit cost", align: "right", cell: (r) => r.unit_cost ?? "—" },
  ];

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Production batches"
        description="Every production run is recorded against a warehouse, so stock can be traced from batch to transfer to sale."
        icon={Factory}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New batch</Button>
          </div>
        }
      />

      <DataTable
        tableId="production-batches"
        data={batches}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={openBatch}
        searchPlaceholder="Search batches…"
        empty="No production batches yet."
        toolbarRight={<ExportMenu rows={batches} filename="production-batches" title="Production batches" />}
      />

      {active && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Batch {active.batch_no} — {locName(active.location_id)}</h2>
            <Button variant="ghost" onClick={() => { setActive(null); setLines([]); }}>Close</Button>
          </div>
          <DataTable
            tableId="production-batch-lines"
            data={lines}
            columns={lineCols}
            searchPlaceholder="Search products…"
            toolbarRight={
              <ExportMenu
                rows={lines.map((l) => ({ product: itemName(l.item_id), produced: l.quantity, unit_cost: l.unit_cost ?? "" }))}
                filename={`batch-${active.batch_no}`}
                title={`Production batch ${active.batch_no}`}
              />
            }
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New production batch</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Batch number</Label>
              <Input value={form.batch_no} onChange={(e) => setForm((f) => ({ ...f, batch_no: e.target.value }))} placeholder="MKP-PROD-004" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.batch_date} onChange={(e) => setForm((f) => ({ ...f, batch_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Into location</Label>
              <Select value={form.location_id} onValueChange={(v) => setForm((f) => ({ ...f, location_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose warehouse" /></SelectTrigger>
                <SelectContent>
                  {locations.filter((l) => l.location_type !== "transit").map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Products produced</Label>
            {formLines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_120px_40px] items-center gap-2">
                <Select value={l.item_id} onValueChange={(v) => setFormLines((p) => p.map((x, i) => i === idx ? { ...x, item_id: v } : x))}>
                  <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                  <SelectContent>
                    {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Qty" value={l.quantity}
                  onChange={(e) => setFormLines((p) => p.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                <Input type="number" placeholder="Unit cost" value={l.unit_cost}
                  onChange={(e) => setFormLines((p) => p.map((x, i) => i === idx ? { ...x, unit_cost: e.target.value } : x))} />
                <Button variant="ghost" size="icon" onClick={() => setFormLines((p) => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setFormLines((p) => [...p, { item_id: "", quantity: "", unit_cost: "" }])}>
              <Plus className="mr-2 h-4 w-4" />Add product
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>Record batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
