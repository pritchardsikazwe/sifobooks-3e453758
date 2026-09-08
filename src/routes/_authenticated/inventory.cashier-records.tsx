import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { NotebookPen, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { ExportMenu } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import {
  fetchCashierRecords, fetchLocations, saveCashierRecord, addPriceHistory,
  type CashierRecord, type Location,
} from "@/lib/multi-location";

export const Route = createFileRoute("/_authenticated/inventory/cashier-records")({
  head: () => ({
    meta: [
      { title: "Cashier Control Records — SifoBooks" },
      { name: "description", content: "Capture handwritten shop control sheets: delivered, sold, remaining, selling price, sales value, physical count and variance per cashier and period." },
      { property: "og:title", content: "Cashier Control Records — SifoBooks" },
      { property: "og:description", content: "Historical shop control sheets stored as source documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CashierRecordsPage,
});

type Item = { id: string; name: string; unit: string };

const blank = {
  location_id: "", cashier_name: "", period_start: "", period_end: "", item_id: "",
  delivered_qty: "", sold_qty: "", remaining_qty: "", selling_price: "", sales_value: "",
  physical_count: "", notes: "", source_image_url: "",
};

function CashierRecordsPage() {
  const [rows, setRows] = useState<CashierRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ ...blank });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [r, l, it] = await Promise.all([
        fetchCashierRecords(),
        fetchLocations(),
        supabase.from("stock_items").select("id, name, unit").order("name"),
      ]);
      setRows(r); setLocations(l); setItems((it.data ?? []) as unknown as Item[]);
    } catch (e: any) { setError(e.message ?? "Could not load cashier records"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";
  const itemName = (id: string | null) => items.find((i) => i.id === id)?.name ?? "—";

  const num = (v: string) => (v === "" ? null : Number(v));

  const save = async () => {
    if (!form.location_id) return toast.error("Choose the shop");
    setBusy(true);
    try {
      const sold = Number(form.sold_qty || 0);
      const price = num(form.selling_price);
      await saveCashierRecord({
        location_id: form.location_id,
        cashier_name: form.cashier_name || null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        item_id: form.item_id || null,
        delivered_qty: Number(form.delivered_qty || 0),
        sold_qty: sold,
        remaining_qty: Number(form.remaining_qty || 0),
        selling_price: price,
        sales_value: num(form.sales_value) ?? (price ? price * sold : null),
        physical_count: num(form.physical_count),
        notes: form.notes || null,
        source_image_url: form.source_image_url || null,
      } as never);

      if (form.item_id && price) {
        await addPriceHistory({
          item_id: form.item_id, price, quantity: sold || null,
          effective_date: form.period_end || form.period_start || new Date().toISOString().slice(0, 10),
          location_id: form.location_id, cashier_name: form.cashier_name || null,
          note: "From cashier control sheet",
        });
      }
      toast.success("Cashier record saved");
      setOpen(false); setForm({ ...blank }); load();
    } catch (e: any) { toast.error(e.message ?? "Could not save the record"); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<CashierRecord>[] = [
    { key: "period_end", header: "Period", sortable: true, sticky: true, cell: (r) => `${r.period_start ?? "—"} → ${r.period_end ?? "—"}` },
    { key: "location_id", header: "Shop", cell: (r) => locName(r.location_id) },
    { key: "cashier_name", header: "Cashier" },
    { key: "item_id", header: "Product", cell: (r) => itemName(r.item_id) },
    { key: "delivered_qty", header: "Delivered", align: "right" },
    { key: "sold_qty", header: "Sold", align: "right" },
    { key: "remaining_qty", header: "Remaining", align: "right" },
    { key: "selling_price", header: "Price", align: "right", cell: (r) => (r.selling_price == null ? "—" : fmtMoney(r.selling_price)) },
    { key: "sales_value", header: "Sales value", align: "right", cell: (r) => (r.sales_value == null ? "—" : fmtMoney(r.sales_value)) },
    { key: "physical_count", header: "Physical", align: "right", cell: (r) => r.physical_count ?? "—" },
    {
      key: "variance", header: "Variance", align: "right",
      cell: (r) => r.physical_count == null
        ? <span className="text-muted-foreground">—</span>
        : <span className={r.variance === 0 ? "text-emerald-600" : "text-destructive"}>{r.variance === 0 ? "MATCHED" : r.variance}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Cashier control records"
        description="The handwritten shop sheets, stored as source documents alongside the stock ledger."
        icon={NotebookPen}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New record</Button>
          </div>
        }
      />

      <DataTable
        tableId="cashier-records"
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={load}
        searchPlaceholder="Search cashier records…"
        empty="No cashier sheets captured yet."
        toolbarRight={<ExportMenu rows={rows} filename="cashier-records" title="Cashier control records" />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Capture cashier sheet</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Shop</Label>
              <Select value={form.location_id} onValueChange={(v) => setForm((f) => ({ ...f, location_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose shop" /></SelectTrigger>
                <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cashier</Label>
              <Input value={form.cashier_name} onChange={(e) => setForm((f) => ({ ...f, cashier_name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm((f) => ({ ...f, item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
                <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Period from</Label>
              <Input type="date" value={form.period_start} onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Period to</Label>
              <Input type="date" value={form.period_end} onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Delivered</Label>
              <Input type="number" value={form.delivered_qty} onChange={(e) => setForm((f) => ({ ...f, delivered_qty: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Sold</Label>
              <Input type="number" value={form.sold_qty} onChange={(e) => setForm((f) => ({ ...f, sold_qty: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Remaining</Label>
              <Input type="number" value={form.remaining_qty} onChange={(e) => setForm((f) => ({ ...f, remaining_qty: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Selling price</Label>
              <Input type="number" value={form.selling_price} onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Sales value</Label>
              <Input type="number" value={form.sales_value} onChange={(e) => setForm((f) => ({ ...f, sales_value: e.target.value }))} placeholder="Auto from price × sold" /></div>
            <div className="space-y-2"><Label>Physical count</Label>
              <Input type="number" value={form.physical_count} onChange={(e) => setForm((f) => ({ ...f, physical_count: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Source sheet image link</Label>
              <Input value={form.source_image_url} onChange={(e) => setForm((f) => ({ ...f, source_image_url: e.target.value }))} placeholder="https://…" /></div>
            <div className="space-y-2 sm:col-span-3"><Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>Save record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
