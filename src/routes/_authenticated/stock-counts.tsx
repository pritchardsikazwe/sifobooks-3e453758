import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { SifoFormPage, SifoFormSection } from "@/components/sifo/SifoFormPage";
import { ExportMenu } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { fetchInventory, type InvItem } from "@/lib/inventory";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock-counts")({
  head: () => ({
    meta: [
      { title: "Stock Counts — SifoBooks" },
      { name: "description", content: "Physical stock counts with expected vs counted variance and posting to stock movements." },
      { property: "og:title", content: "Stock Counts — SifoBooks" },
      { property: "og:description", content: "Physical stock counts with variance posting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockCountsPage,
});

type CountRow = {
  id: string; count_number: string | null; count_date: string; status: string;
  warehouse_id: string | null; notes: string | null; posted_at: string | null;
};

type LineRow = { id: string; item_id: string; expected_qty: number; counted_qty: number | null; variance: number; note: string | null };

function StockCountsPage() {
  const [rows, setRows] = useState<CountRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "new" | "sheet">("list");
  const [active, setActive] = useState<CountRow | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [form, setForm] = useState({ count_number: "", count_date: new Date().toISOString().slice(0, 10), warehouse_id: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ data, error }, inv] = await Promise.all([
        supabase.from("stock_counts").select("*").order("count_date", { ascending: false }),
        fetchInventory(),
      ]);
      if (error) throw error;
      setRows((data ?? []) as CountRow[]);
      setItems(inv.items);
      setWarehouses(inv.warehouses);
    } catch (e: any) { setError(e.message ?? "Failed to load stock counts"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const whName = (id: string | null) => warehouses.find(w => w.id === id)?.name ?? "All warehouses";
  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? "—";

  const openSheet = async (row: CountRow) => {
    setActive(row); setMode("sheet");
    const { data } = await supabase.from("stock_count_lines").select("*").eq("count_id", row.id);
    setLines((data ?? []) as LineRow[]);
  };

  const createCount = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.from("stock_counts").insert({
        count_number: form.count_number || `SC-${Date.now().toString().slice(-6)}`,
        count_date: form.count_date,
        warehouse_id: form.warehouse_id || null,
        notes: form.notes || null,
      }).select().single();
      if (error) throw error;

      const scoped = form.warehouse_id ? items.filter(i => i.warehouse_id === form.warehouse_id) : items;
      if (scoped.length) {
        const { error: le } = await supabase.from("stock_count_lines").insert(
          scoped.map(i => ({ count_id: data.id, item_id: i.id, expected_qty: i.quantity_on_hand })),
        );
        if (le) throw le;
      }
      toast.success(`Count sheet created with ${scoped.length} items`);
      await load();
      await openSheet(data as CountRow);
    } catch (e: any) { toast.error(e.message ?? "Could not create count"); }
    finally { setBusy(false); }
  };

  const saveLine = async (line: LineRow, counted: string) => {
    const qty = counted === "" ? null : Number(counted);
    setLines(prev => prev.map(l => l.id === line.id ? { ...l, counted_qty: qty, variance: (qty ?? 0) - l.expected_qty } : l));
    await supabase.from("stock_count_lines").update({ counted_qty: qty }).eq("id", line.id);
  };

  const postCount = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("post_stock_count", { _count_id: active.id });
      if (error) throw error;
      const res = data as any;
      if (res?.ok === false) toast.info(res.message ?? "Nothing to post");
      else toast.success(`Posted — ${res?.lines_applied ?? 0} variance line(s) applied to stock`);
      await load();
      setMode("list"); setActive(null);
    } catch (e: any) { toast.error(e.message ?? "Posting failed"); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<CountRow>[] = useMemo(() => [
    { key: "count_number", header: "Count #", sortable: true, sticky: true },
    { key: "count_date", header: "Date", sortable: true },
    { key: "warehouse_id", header: "Warehouse", cell: r => whName(r.warehouse_id) },
    { key: "status", header: "Status", cell: r => <SifoStatusBadge status={r.status} /> },
    { key: "notes", header: "Notes" },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [warehouses]);

  if (mode === "new") {
    return (
      <SifoFormPage
        module="inventory"
        title="New stock count"
        subtitle="Generates a count sheet from current on-hand quantities."
        onCancel={() => setMode("list")}
        onSave={createCount}
        saving={busy}
      >
        <SifoFormSection title="Count details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Count number</Label>
              <Input value={form.count_number} onChange={e => setForm(f => ({ ...f, count_number: e.target.value }))} placeholder="Auto" />
            </div>
            <div className="space-y-2">
              <Label>Count date</Label>
              <Input type="date" value={form.count_date} onChange={e => setForm(f => ({ ...f, count_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={form.warehouse_id || "__all"} onValueChange={v => setForm(f => ({ ...f, warehouse_id: v === "__all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="All warehouses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All warehouses</SelectItem>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </SifoFormSection>
      </SifoFormPage>
    );
  }

  if (mode === "sheet" && active) {
    const posted = active.status === "posted";
    const lineCols: DTColumn<LineRow>[] = [
      { key: "item", header: "Item", sticky: true, accessor: r => itemName(r.item_id), cell: r => itemName(r.item_id) },
      { key: "expected_qty", header: "Expected", align: "right" },
      {
        key: "counted_qty", header: "Counted", align: "right",
        cell: r => posted ? (r.counted_qty ?? "—") : (
          <Input
            className="h-8 w-24 text-right"
            type="number"
            defaultValue={r.counted_qty ?? ""}
            onBlur={e => saveLine(r, e.target.value)}
          />
        ),
      },
      {
        key: "variance", header: "Variance", align: "right",
        cell: r => {
          const v = (r.counted_qty ?? 0) - r.expected_qty;
          if (r.counted_qty == null) return <span className="text-muted-foreground">—</span>;
          return <span className={v === 0 ? "" : v > 0 ? "text-emerald-600" : "text-destructive"}>{v > 0 ? `+${v}` : v}</span>;
        },
      },
    ];
    return (
      <div className="space-y-4">
        <SifoModuleHeader
          module="inventory"
          title={`Count ${active.count_number ?? ""}`}
          description={`${active.count_date} · ${whName(active.warehouse_id)}`}
          icon={ClipboardList}
          breadcrumbs={[{ label: "Stock counts", to: "/stock-counts" }]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setMode("list"); setActive(null); }}>Back</Button>
              {!posted && <Button onClick={postCount} disabled={busy}><Check className="mr-2 h-4 w-4" />Post variances</Button>}
            </div>
          }
        />
        <DataTable
          tableId="stock-count-lines"
          data={lines}
          columns={lineCols}
          searchPlaceholder="Search items…"
          pageSize={50}
          toolbarRight={<ExportMenu rows={lines.map(l => ({ item: itemName(l.item_id), expected: l.expected_qty, counted: l.counted_qty, variance: (l.counted_qty ?? 0) - l.expected_qty }))} filename={`stock-count-${active.count_number ?? active.id}`} title="Stock count" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Stock counts"
        description="Physical counts with expected vs counted variance, posted straight to stock."
        icon={ClipboardList}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={() => setMode("new")}><Plus className="mr-2 h-4 w-4" />New count</Button>
          </div>
        }
      />
      <DataTable
        tableId="stock-counts"
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={openSheet}
        searchPlaceholder="Search counts…"
        empty="No stock counts yet. Start one to reconcile physical stock."
        toolbarRight={<ExportMenu rows={rows} filename="stock-counts" title="Stock counts" />}
      />
    </div>
  );
}
