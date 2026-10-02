import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment } from "react";
import { ArrowLeft, LogOut, Package, Plus, AlertTriangle, ArrowUpRight, ArrowDownRight, Sliders, Trash2, Loader2, Upload, Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZRA_HS_CODES, findHsCode } from "@/lib/zra-hs-codes";
import { toast } from "sonner";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { AccountSelector } from "@/components/selectors/AccountSelector";
import { useCoaAccounts } from "@/hooks/useCoaAccounts";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SifoWorkspaceShell } from "@/components/sifo/SifoWorkspaceShell";
import { SifoFilterBar, SifoKpiCard, SifoHubTabs, SifoModuleHeader, SifoPage } from "@/components/sifo";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Stock — SifoBooks" },
      { name: "description", content: "Manage items, products and stock levels in SifoBooks." },
      { property: "og:title", content: "Items and Products — SifoBooks" },
      { property: "og:description", content: "Manage items, products and stock levels in SifoBooks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockPage,
});

type Item = {
  id: string; name: string; sku: string | null; description: string | null;
  hs_code: string | null; tax_category: string; vat_rate: number;
  unit: string; cost_price: number; sell_price: number;
  quantity_on_hand: number; reorder_level: number;
};

function StockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("ZMW");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [moveFor, setMoveFor] = useState<Item | null>(null);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stock_items").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("profiles").select("currency, business_name").eq("id", u.user.id).maybeSingle();
      if (data?.currency) setCurrency(data.currency);
      if (data?.business_name) setBusinessName(data.business_name);
      await load();
    })();
  }, []);

  const money = (n: number) => `${currency} ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filtered = items.filter(i => {
    const matchesQ = !q || [i.name, i.sku ?? "", i.description ?? ""].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchesCategory = categoryFilter === "all" || (i.tax_category || "OTHER") === categoryFilter;
    const qty = Number(i.quantity_on_hand);
    const reorder = Number(i.reorder_level);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "in" && qty > 0 && (reorder <= 0 || qty > reorder)) ||
      (statusFilter === "low" && reorder > 0 && qty > 0 && qty <= reorder) ||
      (statusFilter === "out" && qty <= 0);
    return matchesQ && matchesCategory && matchesStatus;
  });
  const low = items.filter(i => i.reorder_level > 0 && Number(i.quantity_on_hand) <= Number(i.reorder_level));
  const stockValue = useMemo(() => items.reduce((s, i) => s + Number(i.cost_price) * Number(i.quantity_on_hand), 0), [items]);

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("stock_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Item deleted");
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };

  // Full-page record editors replace the dashboard while open.
  if (openNew) {
    return (
      <div className="p-4 sm:p-6">
        <NewItemForm onCancel={() => setOpenNew(false)} onCreated={() => { setOpenNew(false); load(); }} />
      </div>
    );
  }
  if (moveFor) {
    return (
      <div className="p-4 sm:p-6">
        <MovementForm item={moveFor} onCancel={() => setMoveFor(null)} onSaved={() => { setMoveFor(null); load(); }} />
      </div>
    );
  }

  const categories = Array.from(new Set(items.map(i => i.tax_category || "OTHER"))).filter(Boolean).sort();
  const outOfStock = items.filter(i => Number(i.quantity_on_hand) <= 0).length;
  const categoryCount = categories.length;

  return (
    <SifoPage>
      <SifoHubTabs hub="inventory" active="/stock" />
      <SifoModuleHeader
        module="inventory"
        icon={Package}
        title="Items"
        description="Product master data, pricing, stock tracking and ZRA tax setup."
        breadcrumbs={[{ label: "Inventory" }, { label: "Items" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/inventory/receive-stock"><ArrowDownRight className="mr-1.5 h-4 w-4" />Receive Stock</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/inventory/opening-stock"><ArrowUpRight className="mr-1.5 h-4 w-4" />Opening Stock</Link></Button>
            <ImportCsvDialog open={openImport} setOpen={setOpenImport} onImported={load} />
            <Button size="sm" variant="save" onClick={() => setOpenNew(true)}><Plus className="mr-1.5 h-4 w-4" />Add Item</Button>
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <SifoKpiCard module="inventory" label="Items" value={items.length.toLocaleString()} hint="Active product catalogue" icon={Package} />
        <SifoKpiCard module="inventory" label="Stock value" value={money(stockValue)} hint="Current inventory at cost" icon={ArrowUpRight} />
        <SifoKpiCard module="inventory" label="Low stock" value={low.length.toLocaleString()} hint="At or below reorder level" icon={AlertTriangle} positive={false} />
        <SifoKpiCard module="inventory" label="Out of stock" value={outOfStock.toLocaleString()} hint="Requires receiving or replenishment" icon={ArrowDownRight} positive={false} />
        <SifoKpiCard module="inventory" label="Categories" value={categoryCount.toLocaleString()} hint="Product categories" icon={Sliders} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b p-3 sm:p-4">
          <SifoFilterBar
            search={q}
            onSearchChange={setQ}
            searchPlaceholder="Search item, SKU, barcode or description…"
            className="border-0 p-0 shadow-none"
            filters={
              <>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm" aria-label="Category filter">
                  <option value="all">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm" aria-label="Stock status filter">
                  <option value="all">All stock</option>
                  <option value="in">In stock</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </>
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm">
            <div><span className="font-semibold">{filtered.length}</span> items</div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="ghost" size="sm"><Link to="/inventory/stock-card">Stock Card</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/inventory/transfers">Transfers</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/stock-counts">Stock Counts</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/stock-adjustments">Adjustments</Link></Button>
            </div>
          </div>
          <InventoryItemsTable items={filtered} money={money} onMove={setMoveFor} onDelete={removeItem} loading={loading} />
        </CardContent>
      </Card>
    </SifoPage>
  );
}

function InventoryItemsTable({
  items, money, onMove, onDelete, loading,
}: {
  items: Item[]; money: (n: number) => string;
  onMove: (i: Item) => void; onDelete: (id: string) => void;
  loading: boolean;
}) {
  const columns: DTColumn<Item>[] = [
    {
      key: "name", header: "Item", sticky: true, sortable: true,
      cell: i => <div><div className="font-medium">{i.name}</div>{i.sku && <div className="text-xs text-muted-foreground">{i.sku}</div>}</div>,
    },
    { key: "tax_category", header: "Category", cell: i => <Badge variant="outline" className="capitalize">{i.tax_category || "Other"}</Badge> },
    { key: "unit", header: "Unit", cell: i => i.unit || "each" },
    { key: "quantity_on_hand", header: "On hand", align: "right", sortable: true, cell: i => <span className={Number(i.quantity_on_hand) <= 0 ? "font-semibold text-destructive" : "font-semibold"}>{Number(i.quantity_on_hand).toLocaleString()}</span> },
    { key: "reorder_level", header: "Reorder", align: "right", sortable: true, cell: i => Number(i.reorder_level) || "—" },
    { key: "cost_price", header: "Cost", align: "right", sortable: true, cell: i => money(Number(i.cost_price)) },
    { key: "sell_price", header: "Selling", align: "right", sortable: true, cell: i => money(Number(i.sell_price)) },
    { key: "stock_value", header: "Value", align: "right", sortable: false, accessor: i => Number(i.cost_price) * Number(i.quantity_on_hand), cell: i => money(Number(i.cost_price) * Number(i.quantity_on_hand)) },
    { key: "vat_rate", header: "VAT", align: "right", cell: i => `${Number(i.vat_rate ?? 0)}%` },
    { key: "actions", header: "", sortable: false, sticky: true, cell: i => (
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" title="Stock movement" onClick={() => onMove(i)}><Sliders className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" title="Delete item" onClick={() => onDelete(i.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
      </div>
    )},
  ];

  return (
    <div className="overflow-x-auto">
      <DataTable
        tableId="inventory-items-2026"
        columns={columns}
        data={items}
        loading={loading}
        searchPlaceholder={null}
        empty={<div className="py-12 text-center text-sm text-muted-foreground">No items match your filters. Use Add Item, Receive Stock or Opening Stock to get started.</div>}
        className="rounded-none border-0"
      />
    </div>
  );
}

function NewItemForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [hsMode, setHsMode] = useState<"list" | "custom">("list");
  const [hsCode, setHsCode] = useState<string>("");
  const [customHs, setCustomHs] = useState<string>("");
  const [vatRate, setVatRate] = useState<number>(16);
  const [taxCategory, setTaxCategory] = useState<"standard" | "zero" | "exempt">("standard");
  const [unit, setUnit] = useState("each");
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(0);
  const [reorder, setReorder] = useState(0);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; is_default: boolean }>>([]);
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [itemType, setItemType] = useState("product");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [wholesale, setWholesale] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [maxStock, setMaxStock] = useState(0);
  const [supplierId, setSupplierId] = useState("none");
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [trackBatches, setTrackBatches] = useState(false);
  const [trackSerials, setTrackSerials] = useState(false);
  const [trackExpiry, setTrackExpiry] = useState(false);
  const { accounts, defaultFor } = useCoaAccounts();
  const [acct, setAcct] = useState<Record<string, string | null>>({});
  const isStock = itemType === "product";

  useEffect(() => {
    if (!accounts.length) return;
    setAcct(prev => ({
      sales: prev.sales ?? defaultFor("4000")?.id ?? null,
      cogs: prev.cogs ?? defaultFor("5000")?.id ?? null,
      inventory: prev.inventory ?? defaultFor("1300")?.id ?? null,
      purchase: prev.purchase ?? null,
    }));
  }, [accounts]);

  useEffect(() => {
    void supabase.from("suppliers").select("id,name").order("name").then(({ data }: any) => setSuppliers(data ?? []));
  }, []);

  useEffect(() => {
    void supabase.from("inventory_locations").select("id,name,is_default").eq("is_active", true).order("is_default", { ascending: false }).order("name").then(({ data }: any) => {
      const rows = data ?? [];
      setLocations(rows);
      setLocationId((current) => current || rows[0]?.id || "");
    });
  }, []);

  const pickHs = (code: string) => {
    setHsCode(code);
    const h = findHsCode(code);
    if (h) { setVatRate(h.vatRate); setTaxCategory(h.category); }
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("Name is required");
    if (isStock && qty > 0 && !locationId) return toast.error("Choose a stock location before recording opening stock");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const finalHs = hsMode === "list" ? (hsCode || null) : (customHs.trim() || null);
    const { data: created, error } = await supabase
      .from("stock_items")
      .insert({
        user_id: u.user.id,
        name: name.trim(),
        sku: sku.trim() || null,
        hs_code: finalHs,
        tax_category: taxCategory,
        vat_rate: vatRate,
        unit,
        sales_unit: unit,
        purchase_unit: unit,
        item_type: itemType,
        category: category.trim() || null,
        brand: brand.trim() || null,
        barcode: barcode.trim() || null,
        description: description.trim() || null,
        preferred_supplier_id: supplierId === "none" ? null : supplierId,
        sales_account_id: acct.sales ?? null,
        cogs_account_id: isStock ? acct.cogs ?? null : null,
        inventory_account_id: isStock ? acct.inventory ?? null : null,
        purchase_account_id: acct.purchase ?? null,
        wholesale_price: wholesale || null,
        min_stock: isStock ? minStock : 0,
        max_stock: isStock ? maxStock : 0,
        track_batches: isStock && trackBatches,
        track_serials: isStock && trackSerials,
        track_expiry: isStock && trackExpiry,
        cost_price: cost,
        sell_price: price,
        quantity_on_hand: 0,
        reorder_level: reorder,
      })
      .select("id")
      .single();
    if (error || !created) { setSaving(false); return toast.error(error?.message ?? "Item could not be added"); }
    if (isStock && qty > 0) {
      const reference = `OPEN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(created.id).slice(0, 8).toUpperCase()}`;
      const isLocalBackend = import.meta.env.VITE_SIFOBOOKS_BACKEND === "local";
      let openingError: any = null;

      if (isLocalBackend) {
        const { error } = await supabase.rpc("post_opening_stock" as any, {
          _uid: u.user.id,
          _company_id: null,
          _branch_id: null,
          _location_id: locationId,
          _warehouse_id: null,
          _opening_date: new Date().toISOString().slice(0, 10),
          _reference: reference,
          _items: [{ itemId: created.id, quantity: qty, unitCost: cost }],
        } as any);
        openingError = error;
      } else {
        const { error } = await supabase.from("stock_movements").insert({
          user_id: u.user.id, item_id: created.id, movement_type: "opening", quantity: qty,
          unit_cost: cost, total_cost: qty * cost, reference, note: "Opening stock", location_id: locationId,
          source_type: "opening_stock", source_id: created.id, created_by: u.user.id,
        });
        openingError = error;
      }

      if (openingError) {
        await supabase.from("stock_items").delete().eq("id", created.id);
        setSaving(false);
        return toast.error(`Opening stock was not recorded: ${openingError.message}`);
      }
    }
    setSaving(false);
    toast.success("Item added");
    onCreated();
  };

  return (
    <SifoFormPage
      module="inventory"
      icon={Package}
      title="Add stock item"
      subtitle="Tracked SKU with ZRA HS code and tax details"
      onCancel={onCancel}
      onSave={submit}
      saving={saving}
      saveLabel="Add item"
    >
      <SifoFormSection title="Item details">
        <SifoField label="Name" required wide><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Portland cement 50kg" /></SifoField>
        <SifoField label="SKU (optional)"><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="CEM-50" /></SifoField>
        <SifoField label="Item type" required>
          <Select value={itemType} onValueChange={setItemType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Stock item (tracked quantity)</SelectItem>
              <SelectItem value="non_stock">Non-stock item</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        </SifoField>
        <SifoField label="Unit">
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["each","pcs","kg","g","litre","ml","box","pack","carton","bag","dozen","metre","pair","hour","day"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              {!["each","pcs","kg","g","litre","ml","box","pack","carton","bag","dozen","metre","pair","hour","day"].includes(unit) && <SelectItem value={unit}>{unit}</SelectItem>}
            </SelectContent>
          </Select>
        </SifoField>
        <SifoField label="Category"><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Building materials" /></SifoField>
        <SifoField label="Brand"><Input value={brand} onChange={e => setBrand(e.target.value)} /></SifoField>
        <SifoField label="Barcode"><Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Scan or type" /></SifoField>
        <SifoField label="Preferred supplier">
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No preferred supplier</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </SifoField>
        <SifoField label="Description" wide><Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} /></SifoField>
      </SifoFormSection>

      <SifoFormSection title="Accounts">
        <AccountSelector label="Sales / income account" accounts={accounts} types={["revenue","income"]} value={acct.sales ?? null} onChange={v => setAcct(a => ({ ...a, sales: v }))} recentKey="item-sales" />
        <AccountSelector label="Purchase / expense account" accounts={accounts} types={["expense","cost_of_sales"]} value={acct.purchase ?? null} onChange={v => setAcct(a => ({ ...a, purchase: v }))} recentKey="item-purchase" />
        {isStock && <AccountSelector label="Inventory (asset) account" accounts={accounts} types={["asset"]} value={acct.inventory ?? null} onChange={v => setAcct(a => ({ ...a, inventory: v }))} recentKey="item-inventory" />}
        {isStock && <AccountSelector label="Cost of sales account" accounts={accounts} types={["expense","cost_of_sales"]} value={acct.cogs ?? null} onChange={v => setAcct(a => ({ ...a, cogs: v }))} recentKey="item-cogs" />}
      </SifoFormSection>

      <SifoFormSection title="ZRA HS code & tax">
        <SifoField label="Lookup mode" wide>
          <div className="text-xs">
            <button type="button" onClick={() => setHsMode("list")} className={`rounded px-2 py-0.5 ${hsMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Pick from list</button>
            <button type="button" onClick={() => setHsMode("custom")} className={`ml-1 rounded px-2 py-0.5 ${hsMode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Custom</button>
          </div>
        </SifoField>
        {hsMode === "list" ? (
          <SifoField label="HS code" wide>
            <Select value={hsCode} onValueChange={pickHs}>
              <SelectTrigger><SelectValue placeholder="Select an HS code…" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {ZRA_HS_CODES.map(h => (
                  <SelectItem key={h.code} value={h.code}>
                    <span className="font-mono text-xs">{h.code}</span> — {h.label} <span className="text-muted-foreground">({h.vatRate}%)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SifoField>
        ) : (
          <SifoField label="Custom HS code" wide><Input value={customHs} onChange={e => setCustomHs(e.target.value)} placeholder="e.g. 8471.30 or SVC-XXX" /></SifoField>
        )}
        <SifoField label="VAT rate (%)"><Input type="number" min={0} max={100} step="0.5" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} /></SifoField>
        <SifoField label="Tax category">
          <Select value={taxCategory} onValueChange={v => setTaxCategory(v as "standard" | "zero" | "exempt")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard-rated</SelectItem>
              <SelectItem value="zero">Zero-rated</SelectItem>
              <SelectItem value="exempt">Exempt</SelectItem>
            </SelectContent>
          </Select>
        </SifoField>
      </SifoFormSection>

      <SifoFormSection title="Pricing & stock">
        <SifoField label="Cost price"><Input type="number" min={0} step="0.01" value={cost} onChange={e => setCost(Number(e.target.value))} /></SifoField>
        <SifoField label="Sell price"><Input type="number" min={0} step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} /></SifoField>
        <SifoField label="Wholesale price"><Input type="number" min={0} step="0.01" value={wholesale} onChange={e => setWholesale(Number(e.target.value))} /></SifoField>
        {isStock && <SifoField label="Opening quantity"><Input type="number" min={0} step="1" value={qty} onChange={e => setQty(Number(e.target.value))} /></SifoField>}
        {isStock && qty > 0 && <SifoField label="Opening stock location" required><Select value={locationId} onValueChange={setLocationId}><SelectTrigger><SelectValue placeholder="Select store or warehouse" /></SelectTrigger><SelectContent>{locations.map(location => <SelectItem key={location.id} value={location.id}>{location.name}{location.is_default ? " (Default)" : ""}</SelectItem>)}</SelectContent></Select></SifoField>}
        {isStock && <SifoField label="Reorder level"><Input type="number" min={0} step="1" value={reorder} onChange={e => setReorder(Number(e.target.value))} /></SifoField>}
        {isStock && <SifoField label="Minimum stock"><Input type="number" min={0} value={minStock} onChange={e => setMinStock(Number(e.target.value))} /></SifoField>}
        {isStock && <SifoField label="Maximum stock"><Input type="number" min={0} value={maxStock} onChange={e => setMaxStock(Number(e.target.value))} /></SifoField>}
      </SifoFormSection>

      {isStock && (
        <SifoFormSection title="Tracking">
          <SifoField label="Track batches"><Switch checked={trackBatches} onCheckedChange={setTrackBatches} /></SifoField>
          <SifoField label="Track serial numbers"><Switch checked={trackSerials} onCheckedChange={setTrackSerials} /></SifoField>
          <SifoField label="Track expiry dates"><Switch checked={trackExpiry} onCheckedChange={setTrackExpiry} /></SifoField>
        </SifoFormSection>
      )}
    </SifoFormPage>
  );
}

function MovementForm({ item, onCancel, onSaved }: { item: Item; onCancel: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"in" | "out" | "adjust">("in");
  const [qty, setQty] = useState<number>(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (qty < 0) return toast.error("Quantity must be ≥ 0");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const { error } = await supabase.from("stock_movements").insert({
      user_id: u.user.id, item_id: item.id, movement_type: type, quantity: qty, note: note || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(type === "adjust" ? "Stock adjusted" : type === "in" ? "Stock added" : "Stock removed");
    onSaved();
  };

  return (
    <SifoFormPage
      module="inventory"
      icon={Sliders}
      title={`Stock movement — ${item.name}`}
      subtitle={`Current on hand: ${Number(item.quantity_on_hand)} ${item.unit}`}
      onCancel={onCancel}
      onSave={submit}
      saving={saving}
      saveLabel="Save movement"
    >
      <SifoFormSection title="Movement">
        <SifoField label="Movement type" wide>
          <Select value={type} onValueChange={v => setType(v as "in" | "out" | "adjust")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in"><ArrowUpRight className="h-3 w-3" /> Receive (in)</SelectItem>
              <SelectItem value="out"><ArrowDownRight className="h-3 w-3" /> Issue (out)</SelectItem>
              <SelectItem value="adjust"><Sliders className="h-3 w-3" /> Adjust to exact quantity</SelectItem>
            </SelectContent>
          </Select>
        </SifoField>
        <SifoField label={type === "adjust" ? "New quantity" : "Quantity"}><Input type="number" min={0} step="1" value={qty} onChange={e => setQty(Number(e.target.value))} /></SifoField>
        <SifoField label="Note (optional)" wide><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason, reference, supplier…" /></SifoField>
      </SifoFormSection>
    </SifoFormPage>
  );
}

// ---------- CSV bulk import ----------
type ParsedRow = {
  name: string; sku: string | null; hs_code: string | null;
  tax_category: "standard" | "zero" | "exempt"; vat_rate: number;
  unit: string; cost_price: number; sell_price: number;
  quantity_on_hand: number; reorder_level: number;
  _errors: string[];
};

const CSV_HEADERS = ["name","sku","hs_code","tax_category","vat_rate","unit","cost_price","sell_price","quantity_on_hand","reorder_level"];
const SAMPLE_CSV = `${CSV_HEADERS.join(",")}
Portland cement 50kg,CEM-50,2523.29,standard,16,bag,180,225,120,20
Mealie meal 25kg,MM-25,1101.00,zero,0,bag,140,175,80,15
Laptop - Dell Latitude,LAP-DL,8471.30,standard,16,each,14500,17900,6,2
Consulting hours,SVC-PRO,SVC-PRO,standard,16,hour,0,850,0,0`;

function parseCsv(text: string): ParsedRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const splitLine = (l: string): string[] => {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { if (inQ && l[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
      else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const header = splitLine(lines[0]).map(h => h.toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const errs: string[] = [];
    const get = (k: string) => (idx(k) >= 0 ? cols[idx(k)] ?? "" : "");
    const num = (k: string, def = 0) => {
      const v = get(k);
      if (v === "" || v == null) return def;
      const n = Number(v);
      if (Number.isNaN(n)) { errs.push(`${k} not a number`); return def; }
      return n;
    };
    const name = get("name");
    if (!name) errs.push("name required");
    const taxRaw = (get("tax_category") || "standard").toLowerCase();
    const tax = (["standard","zero","exempt"] as const).includes(taxRaw as any) ? (taxRaw as "standard"|"zero"|"exempt") : "standard";
    if (get("tax_category") && tax !== taxRaw) errs.push("tax_category must be standard|zero|exempt");
    rows.push({
      name, sku: get("sku") || null, hs_code: get("hs_code") || null,
      tax_category: tax, vat_rate: num("vat_rate", 16),
      unit: get("unit") || "each",
      cost_price: num("cost_price"), sell_price: num("sell_price"),
      quantity_on_hand: num("quantity_on_hand"), reorder_level: num("reorder_level"),
      _errors: errs,
    });
  }
  return rows;
}

function ImportCsvDialog({ open, setOpen, onImported }: { open: boolean; setOpen: (v: boolean) => void; onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const reset = () => { setRows([]); setFileName(""); };

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    if (parsed.length === 0) toast.error("No rows found in the CSV.");
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sifobooks-stock-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows.filter(r => r._errors.length === 0);
  const invalidRows = rows.length - validRows.length;

  const doImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setImporting(false); return toast.error("Not signed in"); }
    const payload = validRows.map(r => ({
      user_id: u.user!.id,
      name: r.name, sku: r.sku, hs_code: r.hs_code,
      tax_category: r.tax_category, vat_rate: r.vat_rate, unit: r.unit,
      base_unit: r.unit || "each", sales_unit: r.unit || "each", track_stock: 1,
      cost_price: r.cost_price, sell_price: r.sell_price,
      quantity_on_hand: r.quantity_on_hand, reorder_level: r.reorder_level,
    }));
    const { error } = await supabase.from("stock_items").insert(payload);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${validRows.length} item${validRows.length > 1 ? "s" : ""}`);
    reset(); setOpen(false); onImported();
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-9"><Upload className="h-4 w-4" /> Import CSV</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Bulk import stock items</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="font-medium">Expected columns</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground break-all">{CSV_HEADERS.join(", ")}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span><b>tax_category</b>: standard · zero · exempt</span>
              <span>·</span>
              <span><b>vat_rate</b>: 0–100 (percent)</span>
              <span>·</span>
              <span><b>hs_code</b>: e.g. 2523.29 or SVC-PRO</span>
            </div>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0" onClick={downloadTemplate}>
              <Download className="h-3 w-3" /> Download CSV template
            </Button>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:bg-muted/40">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">{fileName || "Click to choose a .csv file"}</div>
            <div className="text-xs text-muted-foreground">First row must be the header</div>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </label>

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div>
                  Parsed <b>{rows.length}</b> row{rows.length > 1 ? "s" : ""} — <span className="text-emerald-700">{validRows.length} ready</span>
                  {invalidRows > 0 && <span className="text-destructive"> · {invalidRows} with errors</span>}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Name</TableHead>
                      <TableHead>HS</TableHead>
                      <TableHead>VAT</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r._errors.length ? "bg-red-50/50" : ""}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{r.name || <em className="text-muted-foreground">—</em>}</div>
                          <div className="text-xs text-muted-foreground">{r.sku ?? ""}{r.sku ? " · " : ""}{r.unit}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.hs_code ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.vat_rate}% {r.tax_category}</TableCell>
                        <TableCell className="text-right text-xs">{r.sell_price}</TableCell>
                        <TableCell className="text-right text-xs">{r.quantity_on_hand}</TableCell>
                        <TableCell>
                          {r._errors.length === 0
                            ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">Ready</Badge>
                            : <span className="text-xs text-destructive">{r._errors.join(", ")}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="save" onClick={doImport} disabled={importing || validRows.length === 0}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {validRows.length > 0 ? `${validRows.length} item${validRows.length > 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
