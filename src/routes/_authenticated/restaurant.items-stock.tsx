import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, Boxes, ChevronRight, Edit3, Eye, MoreHorizontal, PackageCheck, Plus, RefreshCw, SlidersHorizontal, Trash2, UtensilsCrossed, Warehouse as WarehouseIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "@/lib/restaurant";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/restaurant/items-stock")({
  head: () => ({ meta: [
    { title: "Items & Stock — SifoBooks Restaurant" },
    { name: "description", content: "Restaurant menu items, warehouse stock, recipes and POS availability." },
  ] }),
  component: RestaurantItemsStock,
});

type MenuItem = Record<string, any>;
type StockItem = Record<string, any>;
type Warehouse = Record<string, any>;

const money = (n: any) => fmtMoney(Number(n || 0));
const num = (n: any) => Number(n || 0);

function statusFor(qty: number, reorder: number) {
  if (qty <= 0) return { label: "Out of Stock", cls: "bg-red-100 text-red-700 border-red-200" };
  if (reorder > 0 && qty <= reorder) return { label: "Low Stock", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Good", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

function RestaurantItemsStock() {
  const [tab, setTab] = useState<"items" | "warehouse" | "recipes">("items");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [editForm, setEditForm] = useState({ name: "", category: "", station: "", price: "", cost: "", active: true });

  const load = async () => {
    setLoading(true);
    const u = await uid();
    if (!u) { setLoading(false); return; }
    const [i, s, w, r] = await Promise.all([
      supabase.from("restaurant_menu_items").select("*").eq("user_id", u).order("category").order("name"),
      supabase.from("stock_items").select("*").eq("user_id", u).order("name"),
      supabase.from("warehouses").select("id, code, name, location, is_active").eq("user_id", u).order("name"),
      supabase.from("restaurant_recipes").select("*").eq("user_id", u),
    ]);
    if (i.error) toast.error(i.error.message);
    if (s.error) toast.error(s.error.message);
    if (w.error) toast.error(w.error.message);
    setItems(i.data ?? []);
    setStock(s.data ?? []);
    setWarehouses(w.data ?? []);
    setRecipes(r.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map(x => String(x.category || "Other"))))], [items]);

  const recipeAvailability = (menuItemId: string) => {
    const rs = recipes.filter(r => r.menu_item_id === menuItemId);
    if (!rs.length) return null;
    const possible = rs.map(r => {
      const ingredient = stock.find(s => s.id === r.stock_item_id);
      const required = num(r.quantity);
      return required > 0 ? Math.floor(num(ingredient?.quantity_on_hand) / required) : Infinity;
    });
    return Math.max(0, Math.min(...possible));
  };

  const shownItems = useMemo(() => items.filter(i => {
    const text = `${i.name} ${i.category} ${i.station}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesCategory = category === "All" || i.category === category;
    const available = recipeAvailability(i.id);
    const matchesStatus = status === "All" || (status === "Out of Stock" ? available === 0 : status === "Low Stock" ? available !== null && available > 0 && available <= 5 : available === null || available > 5);
    return matchesQuery && matchesCategory && matchesStatus;
  }), [items, query, category, status, recipes, stock]);

  const shownStock = useMemo(() => stock.filter(s => {
    const text = `${s.name} ${s.sku || ""}`.toLowerCase();
    const wh = warehouses.find(w => w.id === s.warehouse_id);
    const st = statusFor(num(s.quantity_on_hand), num(s.reorder_level)).label;
    return (!query || text.includes(query.toLowerCase()))
      && (warehouseFilter === "All" || s.warehouse_id === warehouseFilter)
      && (status === "All" || st === status);
  }), [stock, warehouses, query, warehouseFilter, status]);

  const stats = useMemo(() => ({
    menu: items.length,
    active: items.filter(i => i.active !== false).length,
    ingredients: stock.length,
    low: stock.filter(s => num(s.reorder_level) > 0 && num(s.quantity_on_hand) <= num(s.reorder_level) && num(s.quantity_on_hand) > 0).length,
    out: stock.filter(s => num(s.quantity_on_hand) <= 0).length,
    value: stock.reduce((a, s) => a + num(s.quantity_on_hand) * num(s.cost_price), 0),
  }), [items, stock]);

  const openEdit = (item: MenuItem) => {
    setSelected(item);
    setEditForm({ name: item.name || "", category: item.category || "Mains", station: item.station || "Kitchen", price: String(item.price ?? 0), cost: String(item.cost ?? 0), active: item.active !== false });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected || !editForm.name.trim()) return toast.error("Item name is required");
    const patch = { name: editForm.name.trim(), category: editForm.category.trim() || "Mains", station: editForm.station.trim() || "Kitchen", price: num(editForm.price), cost: num(editForm.cost), active: editForm.active };
    const { error } = await supabase.from("restaurant_menu_items").update(patch).eq("id", selected.id);
    if (error) return toast.error(error.message);
    setItems(v => v.map(x => x.id === selected.id ? { ...x, ...patch } : x));
    setEditOpen(false);
    toast.success("Menu item updated");
  };

  const deleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("restaurant_menu_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    setItems(v => v.filter(x => x.id !== item.id));
    toast.success("Menu item deleted");
  };

  const saveAdjustment = async () => {
    if (!adjustItem) return;
    const next = Number(adjustQty);
    if (!Number.isFinite(next) || next < 0) return toast.error("Enter a valid quantity");
    const previous = num(adjustItem.quantity_on_hand);
    const delta = next - previous;
    const u = await uid();
    const { error } = await supabase.from("stock_items").update({ quantity_on_hand: next, updated_at: new Date().toISOString() }).eq("id", adjustItem.id);
    if (error) return toast.error(error.message);
    if (u && delta !== 0) {
      await supabase.from("stock_movements").insert({
        id: crypto.randomUUID(), user_id: u, item_id: adjustItem.id,
        movement_type: delta > 0 ? "adjustment_in" : "adjustment_out",
        quantity: Math.abs(delta), unit_cost: num(adjustItem.cost_price),
        reference: "Restaurant stock adjustment", note: `Adjusted from ${previous} to ${next}`,
        location_id: adjustItem.warehouse_id || null,
      });
    }
    setStock(v => v.map(x => x.id === adjustItem.id ? { ...x, quantity_on_hand: next } : x));
    setAdjustOpen(false);
    toast.success("Stock adjusted");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700"><UtensilsCrossed className="h-4 w-4" /> RESTAURANT MANAGEMENT</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#173b3a]">Items & Stock</h1>
          <p className="text-sm text-muted-foreground">Manage menu items, ingredients, warehouse quantities and POS availability.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        <Button onClick={() => { setTab("items"); setSelected(null); setEditForm({ name: "", category: "Mains", station: "Kitchen", price: "0", cost: "0", active: true }); setEditOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Menu Items", stats.menu, "text-[#173b3a]"], ["Active", stats.active, "text-emerald-700"], ["Ingredients", stats.ingredients, "text-[#173b3a]"],
          ["Low Stock", stats.low, "text-amber-700"], ["Out of Stock", stats.out, "text-red-700"], ["Stock Value", money(stats.value), "text-[#173b3a]"],
        ].map(([label, value, cls]) => <div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-semibold text-muted-foreground">{label}</div><div className={`mt-1 text-xl font-black tabular-nums ${cls}`}>{value}</div></div>)}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b bg-[#f7faf9] p-3">
          {[
            ["items", "Menu Items", PackageCheck], ["warehouse", "Warehouse Items", WarehouseIcon], ["recipes", "Recipes", UtensilsCrossed],
          ].map(([key, label, Icon]) => <button key={String(key)} onClick={() => setTab(key as any)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${tab === key ? "bg-[#073b38] text-white shadow-sm" : "text-[#49605e] hover:bg-[#eaf2ef]"}`}><Icon className="h-4 w-4" />{label}</button>)}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative"><SlidersHorizontal className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "warehouse" ? "Search ingredients…" : "Search menu items…"} className="h-9 w-[220px] pl-9" /></div>
            {tab !== "recipes" && <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="All">All status</SelectItem><SelectItem value="Good">Good</SelectItem><SelectItem value="Low Stock">Low stock</SelectItem><SelectItem value="Out of Stock">Out of stock</SelectItem></SelectContent></Select>}
          </div>
        </div>

        {tab === "items" && <div className="p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}><SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c === "All" ? "All categories" : c}</SelectItem>)}</SelectContent></Select>
            <Badge variant="outline">{shownItems.length} items</Badge>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-[#073b38] text-white"><tr>{["Item","Category","Station","Selling Price","Cost","POS Stock","Status","Actions"].map(h => <th key={h} className={`px-3 py-3 text-left text-xs font-bold ${h === "Actions" || h.includes("Price") || h === "Cost" || h === "POS Stock" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {shownItems.map((i, idx) => {
                  const available = recipeAvailability(i.id); const st = available === null ? { label: "No Recipe", cls: "bg-slate-100 text-slate-600 border-slate-200" } : statusFor(available, 5);
                  return <tr key={i.id} className={`border-t hover:bg-[#f7faf9] ${idx % 2 ? "bg-[#fcfdfd]" : "bg-white"}`}>
                    <td className="px-3 py-3"><div className="font-bold text-[#173b3a]">{i.name}</div><div className="text-[11px] text-muted-foreground">{i.description || "Restaurant menu item"}</div></td>
                    <td className="px-3 py-3">{i.category}</td><td className="px-3 py-3">{i.station}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">{money(i.price)}</td><td className="px-3 py-3 text-right tabular-nums">{money(i.cost)}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">{available === null ? "—" : available}</td>
                    <td className="px-3 py-3"><Badge className={`border ${st.cls}`}>{st.label}</Badge></td>
                    <td className="px-3 py-3"><div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(i)}><Edit3 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="View stock" onClick={() => { setSelected(i); setTab("items"); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="Recipe" onClick={() => setTab("recipes")}><UtensilsCrossed className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="Delete" onClick={() => void deleteItem(i)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div></td>
                  </tr>;
                })}
                {!shownItems.length && <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No menu items match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>}

        {tab === "warehouse" && <div className="p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}><SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Warehouse" /></SelectTrigger><SelectContent><SelectItem value="All">All warehouses</SelectItem>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" variant="outline" onClick={() => window.location.assign("/stock")}><Boxes className="mr-2 h-4 w-4" /> Full Inventory</Button>
            <Badge variant="outline">{shownStock.length} ingredients</Badge>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-[#073b38] text-white"><tr>{["Ingredient","SKU","Warehouse","Unit","On Hand","Reorder","Cost","Stock Value","Status","Actions"].map(h => <th key={h} className={`px-3 py-3 text-left text-xs font-bold ${["On Hand","Reorder","Cost","Stock Value","Actions"].includes(h) ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {shownStock.map((s, idx) => {
                  const st=statusFor(num(s.quantity_on_hand), num(s.reorder_level)); const wh=warehouses.find(w=>w.id===s.warehouse_id);
                  return <tr key={s.id} className={`border-t hover:bg-[#f7faf9] ${idx % 2 ? "bg-[#fcfdfd]" : "bg-white"}`}>
                    <td className="px-3 py-3"><div className="font-bold">{s.name}</div>{s.brand && <div className="text-[11px] text-muted-foreground">{s.brand}</div>}</td>
                    <td className="px-3 py-3 font-mono text-xs">{s.sku || "—"}</td><td className="px-3 py-3">{wh?.name || "Unassigned"}</td><td className="px-3 py-3">{s.unit}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">{num(s.quantity_on_hand).toLocaleString()}</td><td className="px-3 py-3 text-right tabular-nums">{num(s.reorder_level).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(s.cost_price)}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{money(num(s.quantity_on_hand)*num(s.cost_price))}</td>
                    <td className="px-3 py-3"><Badge className={`border ${st.cls}`}>{st.label}</Badge></td>
                    <td className="px-3 py-3"><div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Adjust stock" onClick={() => { setAdjustItem(s); setAdjustQty(String(s.quantity_on_hand ?? 0)); setAdjustOpen(true); }}><SlidersHorizontal className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="View stock movements" onClick={() => window.location.assign(`/stock?item=${encodeURIComponent(s.id)}`)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="Warehouse assignment" onClick={() => toast.info("Use Inventory → Warehouses for warehouse transfers and assignments.")}><WarehouseIcon className="h-4 w-4" /></Button>
                    </div></td>
                  </tr>;
                })}
                {!shownStock.length && <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">No warehouse stock matches your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>}

        {tab === "recipes" && <div className="p-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map(i => {
              const rs=recipes.filter(r=>r.menu_item_id===i.id);
              const cost=rs.reduce((a,r)=>a+num(r.quantity)*num(stock.find(s=>s.id===r.stock_item_id)?.cost_price),0);
              return <div key={i.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><div><div className="font-black">{i.name}</div><div className="text-xs text-muted-foreground">{rs.length} ingredients</div></div><Badge variant="outline">{money(cost)} cost</Badge></div><div className="mt-3 space-y-1.5">{rs.map(r=><div key={r.id} className="flex justify-between rounded-lg bg-[#f7faf9] px-3 py-2 text-xs"><span>{stock.find(s=>s.id===r.stock_item_id)?.name || "Ingredient"}</span><span className="font-bold">{r.quantity} {r.unit || ""}</span></div>)}{!rs.length&&<div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No recipe defined.</div>}</div></div>;
            })}
          </div>
        </div>}
      </div>

      {selected && tab === "items" && <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4">
        <div><div className="text-xs text-muted-foreground">Selected item</div><div className="font-black">{selected.name}</div></div>
        <div><div className="text-xs text-muted-foreground">Recipe stock</div><div className="font-black">{recipeAvailability(selected.id) ?? "No recipe"} portions</div></div>
        <div><div className="text-xs text-muted-foreground">Price / Cost</div><div className="font-black">{money(selected.price)} / {money(selected.cost)}</div></div>
        <div className="flex items-end justify-end"><Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button></div>
      </div>}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>{selected ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Item name" value={editForm.name} onChange={e=>setEditForm(v=>({...v,name:e.target.value}))} />
            <Input placeholder="Category" value={editForm.category} onChange={e=>setEditForm(v=>({...v,category:e.target.value}))} />
            <Input placeholder="Kitchen station" value={editForm.station} onChange={e=>setEditForm(v=>({...v,station:e.target.value}))} />
            <Input type="number" placeholder="Selling price" value={editForm.price} onChange={e=>setEditForm(v=>({...v,price:e.target.value}))} />
            <Input type="number" placeholder="Cost price" value={editForm.cost} onChange={e=>setEditForm(v=>({...v,cost:e.target.value}))} />
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button><Button onClick={saveEdit}>{selected ? "Save Changes" : "Create Item"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent><DialogHeader><DialogTitle>Adjust Stock — {adjustItem?.name}</DialogTitle></DialogHeader>
          <div className="rounded-xl bg-[#f7faf9] p-4"><div className="text-xs text-muted-foreground">Current quantity</div><div className="text-2xl font-black">{num(adjustItem?.quantity_on_hand).toLocaleString()} {adjustItem?.unit}</div></div>
          <Input type="number" min="0" step="0.01" value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} placeholder="New quantity" />
          <DialogFooter><Button variant="outline" onClick={()=>setAdjustOpen(false)}>Cancel</Button><Button onClick={()=>void saveAdjustment()}>Save Adjustment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
