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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportMenu } from "@/lib/exports";
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
  const [contextLoading, setContextLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Row[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [form, setForm] = useState({ code: "", name: "", location: "", manager: "", branchId: "" });

  const loadForBranch = async (selectedBranchId: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("warehouses")
      .select("id, code, name, location, manager, is_active, created_at, branch_id")
      .eq("branch_id", selectedBranchId)
      .order("name");
    if (error) setError(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  const loadContextAndWarehouses = async () => {
    setContextLoading(true);
    setLoading(true);
    setError(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setError("Not signed in");
      setContextLoading(false); setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from("profiles")
      .select("active_company_id").eq("id", u.user.id).maybeSingle();
    let cid = (profile?.active_company_id as string | null) ?? null;

    if (!cid) {
      const { data: owned } = await supabase.from("companies")
        .select("id").eq("user_id", u.user.id).order("created_at").limit(1);
      cid = owned?.[0]?.id ?? null;
    }
    if (!cid) {
      const { data: membership } = await supabase.from("company_members")
        .select("company_id").eq("user_id", u.user.id).order("created_at").limit(1);
      cid = membership?.[0]?.company_id ?? null;
    }

    if (!cid) {
      setCompanyId(null); setBranches([]); setRows([]);
      setError("No active company. Select or create a company first.");
      setContextLoading(false); setLoading(false);
      return;
    }

    setCompanyId(cid);
    const { data: branchRows, error: branchError } = await supabase.from("branches")
      .select("id, name, code, city").eq("company_id", cid).order("name");

    if (branchError) {
      setBranches([]); setRows([]); setError(branchError.message);
      setContextLoading(false); setLoading(false);
      return;
    }

    const nextBranches = (branchRows ?? []) as Row[];
    setBranches(nextBranches);
    const ids = nextBranches.map(b => b.id).filter(Boolean);

    if (!ids.length) {
      setBranchId(""); setRows([]);
      setError("No branch exists for this company. Create a branch before creating a warehouse.");
      setContextLoading(false); setLoading(false);
      return;
    }

    const currentBranch = branchId && ids.includes(branchId) ? branchId : ids[0];
    setBranchId(currentBranch);
    setForm(f => ({ ...f, branchId: currentBranch }));
    await loadForBranch(currentBranch);
    setContextLoading(false); setLoading(false);
  };

  useEffect(() => { void loadContextAndWarehouses(); }, []);
  // Real stock held in the selected warehouse — never a creation screen.
  useEffect(() => {
    if (!selected) { setItems([]); setMovements([]); return; }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      const { data: stockItems, error: itemsError } = await supabase.from("stock_items")
        .select("id, name, sku, unit, quantity_on_hand, reserved_stock, cost_price, sell_price, reorder_level, is_active")
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
    const reserved = items.reduce((a, i) => a + num(i.reserved_stock), 0);
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
    const selectedBranchId = form.branchId || branchId;
    if (!companyId) return toast.error("Select an active company first");
    if (!selectedBranchId) return toast.error("Select a branch first");
    if (!form.name.trim()) return toast.error("Name is required");

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }

    const row: Record<string, any> = {
      id: crypto.randomUUID(),
      user_id: u.user.id,
      company_id: companyId,
      branch_id: selectedBranchId,
      code: form.code.trim() || null,
      name: form.name.trim(),
      location: form.location.trim() || null,
      manager: form.manager.trim() || null,
      is_active: true,
    };

    let { error } = await supabase.from("warehouses").insert(row);
    if (error && /company_id/i.test(String(error.message ?? ""))) {
      const { company_id: _companyId, ...cloudRow } = row;
      ({ error } = await supabase.from("warehouses").insert(cloudRow));
    }

    setSaving(false);
    if (error) return toast.error(error.message);
    const branchName = branches.find(b => b.id === selectedBranchId)?.name ?? "selected branch";
    toast.success(form.name.trim() + " created in " + branchName);
    setCreateOpen(false);
    setForm({ code: "", name: "", location: "", manager: "", branchId: selectedBranchId });
    setBranchId(selectedBranchId);
    await loadForBranch(selectedBranchId);
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
            <div className="min-w-[190px]">
              <Select value={branchId} onValueChange={v => {
                setBranchId(v);
                setForm(f => ({ ...f, branchId: v }));
                setSelected(null);
                void loadForBranch(v);
              }} disabled={contextLoading || branches.length === 0}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}{b.code ? " · " + b.code : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                          <td className="p-2 text-right tabular-nums">{num(i.reserved_stock).toLocaleString()}</td>
                          <td className="p-2 text-right tabular-nums">
                            {(num(i.quantity_on_hand) - num(i.reserved_stock)).toLocaleString()}
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
            <div className="space-y-1">
              <Label>Branch *</Label>
              <Select value={form.branchId || branchId} onValueChange={v => setForm({ ...form, branchId: v })} disabled={branches.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}{b.code ? " · " + b.code : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
