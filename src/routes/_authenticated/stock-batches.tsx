import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { SifoFormPage, SifoFormSection } from "@/components/sifo/SifoFormPage";
import { ExportMenu } from "@/lib/exports";
import { fmtMoney } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { fetchInventory, type InvItem } from "@/lib/inventory";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock-batches")({
  head: () => ({
    meta: [
      { title: "Batches & Expiry — SifoBooks" },
      { name: "description", content: "Track stock batches, lot numbers, quantities and expiry dates across warehouses." },
      { property: "og:title", content: "Batches & Expiry — SifoBooks" },
      { property: "og:description", content: "Batch and expiry tracking for inventory." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BatchesPage,
});

type Batch = {
  id: string; item_id: string; warehouse_id: string | null; batch_no: string;
  quantity: number; unit_cost: number; manufactured_date: string | null;
  expiry_date: string | null; status: string; note: string | null;
};

const emptyForm = {
  item_id: "", warehouse_id: "", batch_no: "", quantity: "0", unit_cost: "0",
  manufactured_date: "", expiry_date: "", note: "",
};

function expiryState(d: string | null) {
  if (!d) return { label: "No expiry", tone: "neutral" as const, days: null as number | null };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Expired", tone: "destructive" as const, days };
  if (days <= 30) return { label: `${days}d left`, tone: "warning" as const, days };
  return { label: `${days}d left`, tone: "success" as const, days };
}

function BatchesPage() {
  const [rows, setRows] = useState<Batch[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ data, error }, inv] = await Promise.all([
        supabase.from("stock_batches").select("*").order("expiry_date", { ascending: true, nullsFirst: false }),
        fetchInventory(),
      ]);
      if (error) throw error;
      setRows((data ?? []) as Batch[]);
      setItems(inv.items); setWarehouses(inv.warehouses);
    } catch (e: any) { setError(e.message ?? "Failed to load batches"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? "—";
  const whName = (id: string | null) => warehouses.find(w => w.id === id)?.name ?? "—";

  const startNew = () => { setEditing(null); setForm({ ...emptyForm }); setMode("form"); };
  const startEdit = (b: Batch) => {
    setEditing(b);
    setForm({
      item_id: b.item_id, warehouse_id: b.warehouse_id ?? "", batch_no: b.batch_no,
      quantity: String(b.quantity), unit_cost: String(b.unit_cost),
      manufactured_date: b.manufactured_date ?? "", expiry_date: b.expiry_date ?? "", note: b.note ?? "",
    });
    setMode("form");
  };

  const save = async () => {
    if (!form.item_id || !form.batch_no) { toast.error("Item and batch number are required"); return; }
    setBusy(true);
    try {
      const payload = {
        item_id: form.item_id,
        warehouse_id: form.warehouse_id || null,
        batch_no: form.batch_no,
        quantity: Number(form.quantity || 0),
        unit_cost: Number(form.unit_cost || 0),
        manufactured_date: form.manufactured_date || null,
        expiry_date: form.expiry_date || null,
        note: form.note || null,
      };
      const { error } = editing
        ? await supabase.from("stock_batches").update(payload).eq("id", editing.id)
        : await supabase.from("stock_batches").insert(payload);
      if (error) throw error;
      toast.success(editing ? "Batch updated" : "Batch added");
      setMode("list"); await load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<Batch>[] = useMemo(() => [
    { key: "batch_no", header: "Batch / Lot", sticky: true, sortable: true },
    { key: "item_id", header: "Item", accessor: r => itemName(r.item_id), cell: r => itemName(r.item_id), sortable: true },
    { key: "warehouse_id", header: "Warehouse", cell: r => whName(r.warehouse_id) },
    { key: "quantity", header: "Qty", align: "right", sortable: true },
    { key: "unit_cost", header: "Unit cost", align: "right", cell: r => fmtMoney(r.unit_cost) },
    { key: "value", header: "Value", align: "right", accessor: r => r.quantity * r.unit_cost, cell: r => fmtMoney(r.quantity * r.unit_cost) },
    { key: "manufactured_date", header: "Manufactured", defaultHidden: true },
    { key: "expiry_date", header: "Expiry", sortable: true },
    {
      key: "expiry_state", header: "Shelf life",
      cell: r => { const s = expiryState(r.expiry_date); return <SifoStatusBadge status={s.label} tone={s.tone as any} />; },
    },
    { key: "note", header: "Note", defaultHidden: true },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [items, warehouses]);

  const expiring = rows.filter(r => { const s = expiryState(r.expiry_date); return s.days != null && s.days <= 30; });

  if (mode === "form") {
    return (
      <SifoFormPage
        module="inventory"
        title={editing ? `Edit batch ${editing.batch_no}` : "New batch"}
        subtitle="Lot / batch tracking with expiry control."
        onCancel={() => setMode("list")}
        onSave={save}
        saving={busy}
      >
        <SifoFormSection title="Batch details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={form.item_id} onValueChange={v => setForm(f => ({ ...f, item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch / lot number *</Label>
              <Input value={form.batch_no} onChange={e => setForm(f => ({ ...f, batch_no: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={form.warehouse_id || "__none"} onValueChange={v => setForm(f => ({ ...f, warehouse_id: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Unit cost</Label>
              <Input type="number" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Manufactured</Label>
              <Input type="date" value={form.manufactured_date} onChange={e => setForm(f => ({ ...f, manufactured_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Expiry</Label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
        </SifoFormSection>
      </SifoFormPage>
    );
  }

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Batches & expiry"
        description="Lot tracking, batch valuation and shelf-life alerts."
        icon={Layers}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" />New batch</Button>
          </div>
        }
      />
      {expiring.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>{expiring.length} batch(es) expired or expiring within 30 days.</span>
        </div>
      )}
      <DataTable
        tableId="stock-batches"
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={startEdit}
        searchPlaceholder="Search batches…"
        empty="No batches recorded yet."
        totals={r => ({ value: fmtMoney(r.reduce((s, b) => s + b.quantity * b.unit_cost, 0)), quantity: r.reduce((s, b) => s + Number(b.quantity), 0) })}
        toolbarRight={<ExportMenu rows={rows.map(r => ({ ...r, item: itemName(r.item_id), warehouse: whName(r.warehouse_id) }))} filename="stock-batches" title="Batches & expiry" />}
      />
    </div>
  );
}
