import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Warehouse as WarehouseIcon, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExportMenu } from "@/components/ExportMenu";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/warehouses")({
  head: () => ({ meta: [{ title: "Warehouses — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: WarehousesPage,
});

type Row = Record<string, any>;

function num(v: any) { return Number(v ?? 0); }

function WarehousesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selecting a warehouse inspects it. Creation is a separate, explicit action.
  const [selected, setSelected] = useState<Row | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [movements, setMovements] = useState<Row[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", location: "", manager: "" });

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("warehouses")
      .select("id, code, name, location, manager, is_active, created_at")
      .order("name");
    if (error) setError(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  // Real stock held in the selected warehouse — never a creation screen.
  useEffect(() => {
    if (!selected) { setItems([]); setMovements([]); return; }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      const { data: stockItems, error: itemsError } = await supabase.from("stock_items")
        .select("id, name, sku, unit, quantity_on_hand, reserved_qty, cost_price, sell_price, reorder_level, is_active")
        .eq("warehouse_id", selected.id)
        .order("name");
      if (cancelled) return;
      if (itemsError) toast.error(itemsError.message);
      const list = stockItems ?? [];
      setItems(list);

      if (list.length > 0) {
        const { data: moves } = await supabase.from("stock_movements")
          .select("id, item_id, movement_type, quantity, unit_cost, reference, note, transaction_date, created_at")
          .in("item_id", list.map(i => i.id))
          .order("created_at", { ascending: false })
          .limit(25);
        if (!cancelled) setMovements(moves ?? []);
      } else {
        setMovements([]);
      }
      if (!cancelled) setDetailLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const totals = useMemo(() => {
    const onHand = items.reduce((a, i) => a + num(i.quantity_on_hand), 0);
    const reserved = items.reduce((a, i) => a + num(i.reserved_qty), 0);
    const value = items.reduce((a, i) => a + num(i.quantity_on_hand) * num(i.cost_price), 0);
    return { onHand, reserved, available: onHand - reserved, value };
  }, [items]);

  const columns: DTColumn<Row>[] = [
    { key: "code", header: "Code", className: "font-mono text-xs" },
    { key: "name", header: "Name", cell: r => <span className="font-medium">{r.name}</span> },
    { key: "location", header: "Location" },
    { key: "manager", header: "Manager" },
    {
      key: "is_active", header: "Status",
      cell: r => <Badge variant={r.is_active === false ? "outline" : "secondary"}>{r.is_active === false ? "Inactive" : "Active"}</Badge>,
    },
  ];

  const createWarehouse = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const { error } = await supabase.from("warehouses").insert({
      user_id: u.user.id,
      code: form.code.trim() || null,
      name: form.name.trim(),
      location: form.location.trim() || null,
      manager: form.manager.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${form.name.trim()} created`);
    setCreateOpen(false);
    setForm({ code: "", name: "", location: "", manager: "" });
    void load();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <SifoModuleHeader
        module="inventory"
        icon={WarehouseIcon}
        title="Warehouses"
        description="Select a warehouse to see what is actually held there. Creating one is a separate action."
        breadcrumbs={[{ label: "Inventory", to: "/inventory" }, { label: "Warehouses" }]}
        showTabs={false}
        actions={
          <>
            <ExportMenu
              rows={rows.map(r => ({
                Code: r.code ?? "", Name: r.name, Location: r.location ?? "",
                Manager: r.manager ?? "", Active: r.is_active === false ? "No" : "Yes",
              }))}
              filename="warehouses"
              title="Warehouses"
            />
            <Button size="sm" variant="save" className="h-9" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Warehouse
            </Button>
          </>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        tableId="warehouses"
        searchPlaceholder="Search by code, name, location or manager…"
        onRowClick={r => setSelected(r)}
        empty={
          <div className="space-y-2 text-center">
            <div className="text-sm text-muted-foreground">No warehouses found for this company.</div>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Create warehouse
            </Button>
          </div>
        }
      />

      <DetailDrawer
        open={!!selected}
        onOpenChange={v => !v && setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={[selected?.code, selected?.location].filter(Boolean).join(" · ") || "Warehouse"}
        meta={
          <>
            <Badge variant="secondary">{selected?.is_active === false ? "Inactive" : "Active"}</Badge>
            {selected?.manager && <Badge variant="outline">Manager: {selected.manager}</Badge>}
          </>
        }
      >
        {detailLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading stock held here…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DrawerField label="Items">{items.length}</DrawerField>
              <DrawerField label="On hand">{totals.onHand.toLocaleString()}</DrawerField>
              <DrawerField label="Reserved">{totals.reserved.toLocaleString()}</DrawerField>
              <DrawerField label="Available">{totals.available.toLocaleString()}</DrawerField>
            </div>

            <DrawerSection title="Stock value (at cost)">
              <div className="text-lg font-semibold tabular-nums">{fmtMoney(totals.value)}</div>
            </DrawerSection>

            <DrawerSection title="Stock on hand">
              {items.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No stock items are assigned to this warehouse.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left font-medium">Item</th>
                        <th className="p-2 text-right font-medium">On hand</th>
                        <th className="p-2 text-right font-medium">Reserved</th>
                        <th className="p-2 text-right font-medium">Available</th>
                        <th className="p-2 text-right font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(i => (
                        <tr key={i.id} className="border-t">
                          <td className="p-2">
                            <div className="font-medium">{i.name}</div>
                            {i.sku && <div className="font-mono text-[11px] text-muted-foreground">{i.sku}</div>}
                          </td>
                          <td className="p-2 text-right tabular-nums">{num(i.quantity_on_hand).toLocaleString()}</td>
                          <td className="p-2 text-right tabular-nums">{num(i.reserved_qty).toLocaleString()}</td>
                          <td className="p-2 text-right tabular-nums">
                            {(num(i.quantity_on_hand) - num(i.reserved_qty)).toLocaleString()}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {fmtMoney(num(i.quantity_on_hand) * num(i.cost_price))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DrawerSection>

            <DrawerSection title="Recent movements">
              {movements.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No stock movements recorded for these items yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left font-medium">Date</th>
                        <th className="p-2 text-left font-medium">Item</th>
                        <th className="p-2 text-left font-medium">Type</th>
                        <th className="p-2 text-right font-medium">Qty</th>
                        <th className="p-2 text-left font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(m => (
                        <tr key={m.id} className="border-t">
                          <td className="p-2 whitespace-nowrap">
                            {String(m.transaction_date ?? m.created_at ?? "").slice(0, 10)}
                          </td>
                          <td className="p-2">{items.find(i => i.id === m.item_id)?.name ?? "—"}</td>
                          <td className="p-2 capitalize">{String(m.movement_type ?? "").replaceAll("_", " ")}</td>
                          <td className="p-2 text-right tabular-nums">{num(m.quantity).toLocaleString()}</td>
                          <td className="p-2 text-xs text-muted-foreground">{m.reference ?? m.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DrawerSection>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New warehouse</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Code</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>Name *</Label>
                <Input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1"><Label>Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Manager</Label>
              <Input value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="save" onClick={createWarehouse} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
