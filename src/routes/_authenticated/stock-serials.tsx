import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Barcode, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { SifoFormPage, SifoFormSection } from "@/components/sifo/SifoFormPage";
import { ExportMenu } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { fetchInventory, type InvItem } from "@/lib/inventory";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock-serials")({
  head: () => ({
    meta: [
      { title: "Serial Numbers — SifoBooks" },
      { name: "description", content: "Serial-number tracking for inventory items, from receipt through sale and warranty." },
      { property: "og:title", content: "Serial Numbers — SifoBooks" },
      { property: "og:description", content: "Serialised inventory tracking in SifoBooks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SerialsPage,
});

type Serial = {
  id: string; item_id: string; batch_id: string | null; warehouse_id: string | null;
  serial_no: string; status: string; received_date: string | null; sold_date: string | null;
  reference: string | null; note: string | null;
};

const STATUSES = ["in_stock", "reserved", "sold", "returned", "scrapped"];

function SerialsPage() {
  const [rows, setRows] = useState<Serial[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; batch_no: string; item_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Serial | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    item_id: "", batch_id: "", warehouse_id: "", serials: "", status: "in_stock",
    received_date: new Date().toISOString().slice(0, 10), reference: "", note: "",
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ data, error }, inv, b] = await Promise.all([
        supabase.from("stock_serials").select("*").order("created_at", { ascending: false }),
        fetchInventory(),
        supabase.from("stock_batches").select("id,batch_no,item_id"),
      ]);
      if (error) throw error;
      setRows((data ?? []) as Serial[]);
      setItems(inv.items); setWarehouses(inv.warehouses);
      setBatches((b.data ?? []) as any[]);
    } catch (e: any) { setError(e.message ?? "Failed to load serials"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? "—";
  const whName = (id: string | null) => warehouses.find(w => w.id === id)?.name ?? "—";
  const batchNo = (id: string | null) => batches.find(b => b.id === id)?.batch_no ?? "—";

  const startNew = () => {
    setEditing(null);
    setForm({ item_id: "", batch_id: "", warehouse_id: "", serials: "", status: "in_stock", received_date: new Date().toISOString().slice(0, 10), reference: "", note: "" });
    setMode("form");
  };
  const startEdit = (s: Serial) => {
    setEditing(s);
    setForm({
      item_id: s.item_id, batch_id: s.batch_id ?? "", warehouse_id: s.warehouse_id ?? "",
      serials: s.serial_no, status: s.status, received_date: s.received_date ?? "",
      reference: s.reference ?? "", note: s.note ?? "",
    });
    setMode("form");
  };

  const save = async () => {
    const list = form.serials.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    if (!form.item_id || !list.length) { toast.error("Item and at least one serial number are required"); return; }
    setBusy(true);
    try {
      const base = {
        item_id: form.item_id,
        batch_id: form.batch_id || null,
        warehouse_id: form.warehouse_id || null,
        status: form.status,
        received_date: form.received_date || null,
        reference: form.reference || null,
        note: form.note || null,
      };
      if (editing) {
        const { error } = await supabase.from("stock_serials").update({ ...base, serial_no: list[0], sold_date: form.status === "sold" ? (editing.sold_date ?? new Date().toISOString().slice(0, 10)) : null }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Serial updated");
      } else {
        const { error } = await supabase.from("stock_serials").insert(list.map(sn => ({ ...base, serial_no: sn })));
        if (error) throw error;
        toast.success(`${list.length} serial(s) registered`);
      }
      setMode("list"); await load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<Serial>[] = useMemo(() => [
    { key: "serial_no", header: "Serial", sticky: true, sortable: true },
    { key: "item_id", header: "Item", accessor: r => itemName(r.item_id), cell: r => itemName(r.item_id), sortable: true },
    { key: "batch_id", header: "Batch", cell: r => batchNo(r.batch_id) },
    { key: "warehouse_id", header: "Warehouse", cell: r => whName(r.warehouse_id) },
    { key: "status", header: "Status", cell: r => <SifoStatusBadge status={r.status} /> },
    { key: "received_date", header: "Received", sortable: true },
    { key: "sold_date", header: "Sold", defaultHidden: true },
    { key: "reference", header: "Reference", defaultHidden: true },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [items, warehouses, batches]);

  const itemBatches = batches.filter(b => b.item_id === form.item_id);

  if (mode === "form") {
    return (
      <SifoFormPage
        module="inventory"
        title={editing ? `Edit serial ${editing.serial_no}` : "Register serial numbers"}
        subtitle="Paste one serial per line to register many at once."
        onCancel={() => setMode("list")}
        onSave={save}
        saving={busy}
      >
        <SifoFormSection title="Serial details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={form.item_id} onValueChange={v => setForm(f => ({ ...f, item_id: v, batch_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={form.batch_id || "__none"} onValueChange={v => setForm(f => ({ ...f, batch_id: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No batch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No batch</SelectItem>
                  {itemBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.batch_no}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Received date</Label>
              <Input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="GRN / invoice no." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{editing ? "Serial number *" : "Serial numbers * (one per line)"}</Label>
              <Textarea rows={editing ? 1 : 6} value={form.serials} onChange={e => setForm(f => ({ ...f, serials: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
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
        title="Serial numbers"
        description="Serialised tracking from receipt through sale, return or scrap."
        icon={Barcode}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" />Register serials</Button>
          </div>
        }
      />
      <DataTable
        tableId="stock-serials"
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={startEdit}
        searchPlaceholder="Scan or search a serial…"
        empty="No serial numbers registered yet."
        toolbarRight={<ExportMenu rows={rows.map(r => ({ ...r, item: itemName(r.item_id), warehouse: whName(r.warehouse_id), batch: batchNo(r.batch_id) }))} filename="stock-serials" title="Serial numbers" />}
      />
    </div>
  );
}
