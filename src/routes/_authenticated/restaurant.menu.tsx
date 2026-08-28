import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { ORDER_TYPES, uid } from "@/lib/restaurant";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/menu")({
  head: () => ({
    meta: [
      { title: "Menu, Modifiers & Recipes — SifoBooks" },
      { name: "description", content: "Build the menu: categories, per-order-type pricing, modifier groups, 86 items, kitchen routing and ingredient recipes." },
      { property: "og:title", content: "Menu, Modifiers & Recipes — SifoBooks" },
      { property: "og:description", content: "Price by channel, route to stations and cost every plate from your stock items." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Menu,
});

const db: any = supabase;

function Menu() {
  const [items, setItems] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [mods, setMods] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const [item, setItem] = useState({ name: "", category: "Mains", price: 0, cost: 0, station: "Kitchen" });
  const [group, setGroup] = useState({ name: "", required: false, min_select: 0, max_select: 1 });
  const [mod, setMod] = useState({ group_id: "", name: "", price: 0 });
  const [rec, setRec] = useState({ menu_item_id: "", stock_item_id: "", quantity: 1, unit: "" });

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [i, g, m, r, s] = await Promise.all([
      db.from("restaurant_menu_items").select("*").eq("user_id", u).order("category").order("name"),
      db.from("restaurant_modifier_groups").select("*").eq("user_id", u).order("name"),
      db.from("restaurant_modifiers").select("*").eq("user_id", u).order("name"),
      db.from("restaurant_recipes").select("*").eq("user_id", u),
      db.from("stock_items").select("*").eq("user_id", u).order("name"),
    ]);
    setItems(i.data ?? []); setGroups(g.data ?? []); setMods(m.data ?? []);
    setRecipes(r.data ?? []); setStock(s.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addItem = async () => {
    if (!item.name.trim()) return toast.error("Item name is required");
    const u = await uid();
    const { error } = await db.from("restaurant_menu_items").insert({ user_id: u, ...item, active: true });
    if (error) return toast.error(error.message);
    setItem({ ...item, name: "", price: 0, cost: 0 });
    toast.success("Menu item added");
    load();
  };

  const patchItem = async (id: string, patch: any) => {
    const { error } = await db.from("restaurant_menu_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setItems((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const setChannelPrice = async (row: any, key: string, value: number) => {
    const prices = { ...(row.prices ?? {}) };
    if (value > 0) prices[key] = value; else delete prices[key];
    await patchItem(row.id, { prices });
    toast.success(`${key} price updated`);
  };

  const removeItem = async (id: string) => {
    const { error } = await db.from("restaurant_menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((l) => l.filter((x) => x.id !== id));
  };

  const addGroup = async () => {
    if (!group.name.trim()) return toast.error("Group name is required");
    const u = await uid();
    const { error } = await db.from("restaurant_modifier_groups").insert({ user_id: u, ...group });
    if (error) return toast.error(error.message);
    setGroup({ name: "", required: false, min_select: 0, max_select: 1 });
    toast.success("Modifier group added");
    load();
  };

  const addMod = async () => {
    if (!mod.group_id || !mod.name.trim()) return toast.error("Pick a group and name the modifier");
    const u = await uid();
    const { error } = await db.from("restaurant_modifiers").insert({ user_id: u, ...mod });
    if (error) return toast.error(error.message);
    setMod({ ...mod, name: "", price: 0 });
    toast.success("Modifier added");
    load();
  };

  const addRecipe = async () => {
    if (!rec.menu_item_id || !rec.stock_item_id) return toast.error("Pick a menu item and an ingredient");
    const u = await uid();
    const { error } = await db.from("restaurant_recipes").insert({ user_id: u, ...rec });
    if (error) return toast.error(error.message);
    setRec({ ...rec, quantity: 1 });
    toast.success("Ingredient added to recipe");
    load();
  };

  const removeRecipe = async (id: string) => {
    await db.from("restaurant_recipes").delete().eq("id", id);
    setRecipes((l) => l.filter((r) => r.id !== id));
  };

  const shown = useMemo(
    () => items.filter((i) => !q || `${i.name} ${i.category} ${i.station}`.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  const recipeCost = (menuItemId: string) =>
    recipes.filter((r) => r.menu_item_id === menuItemId).reduce((s, r) => {
      const si = stock.find((x) => x.id === r.stock_item_id);
      return s + Number(r.quantity || 0) * Number(si?.cost_price || 0);
    }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Menu management</h1>
          <p className="text-sm text-muted-foreground">{items.length} items · {groups.length} modifier groups</p>
        </div>
        <Input placeholder="Search menu" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
        <ExportMenu filename="menu" title="Menu" rows={items.map((i) => ({
          Item: i.name, Category: i.category, Station: i.station, Price: Number(i.price),
          Cost: Number(i.cost), "Recipe cost": recipeCost(i.id), Available: i.is_86 ? "86'd" : "Yes",
        }))} />
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-3">
          <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-6">
            <Input placeholder="Item name" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
            <Input placeholder="Category" value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })} />
            <Input placeholder="Station" value={item.station} onChange={(e) => setItem({ ...item, station: e.target.value })} />
            <Input type="number" placeholder="Price" value={item.price} onChange={(e) => setItem({ ...item, price: Number(e.target.value) })} />
            <Input type="number" placeholder="Cost" value={item.cost} onChange={(e) => setItem({ ...item, cost: Number(e.target.value) })} />
            <Button onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
          </Card>

          {shown.map((i) => (
            <Card key={i.id} className="p-3 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{i.name}</span>
                <span className="text-sm text-muted-foreground">{i.category} · {i.station}</span>
                <span className="tabular-nums text-sm">{fmtMoney(Number(i.price))}</span>
                <span className="text-xs text-muted-foreground">plate cost {fmtMoney(recipeCost(i.id) || Number(i.cost))}</span>
                <label className="ml-auto flex items-center gap-2 text-xs">
                  86 this item
                  <Switch checked={!!i.is_86} onCheckedChange={(v) => patchItem(i.id, { is_86: v })} />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  Active
                  <Switch checked={!!i.active} onCheckedChange={(v) => patchItem(i.id, { active: v })} />
                </label>
                <Button size="icon" variant="ghost" onClick={() => removeItem(i.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                {ORDER_TYPES.slice(0, 4).map((ot) => (
                  <label key={ot.key} className="text-xs text-muted-foreground">
                    {ot.label} price
                    <Input type="number" className="h-8 mt-1"
                      defaultValue={(i.prices ?? {})[ot.key] ?? ""}
                      placeholder={String(i.price)}
                      onBlur={(e) => setChannelPrice(i, ot.key, Number(e.target.value))} />
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="modifiers" className="space-y-3">
          <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-5">
            <Input placeholder="Group name (e.g. Burger toppings)" value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">Required <Switch checked={group.required} onCheckedChange={(v) => setGroup({ ...group, required: v })} /></label>
            <Input type="number" placeholder="Min" value={group.min_select} onChange={(e) => setGroup({ ...group, min_select: Number(e.target.value) })} />
            <Input type="number" placeholder="Max" value={group.max_select} onChange={(e) => setGroup({ ...group, max_select: Number(e.target.value) })} />
            <Button onClick={addGroup}><Plus className="h-4 w-4 mr-1" /> Add group</Button>
          </Card>

          <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-4">
            <Select value={mod.group_id} onValueChange={(v) => setMod({ ...mod, group_id: v })}>
              <SelectTrigger><SelectValue placeholder="Modifier group" /></SelectTrigger>
              <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Modifier (e.g. Extra cheese)" value={mod.name} onChange={(e) => setMod({ ...mod, name: e.target.value })} />
            <Input type="number" placeholder="Extra price" value={mod.price} onChange={(e) => setMod({ ...mod, price: Number(e.target.value) })} />
            <Button onClick={addMod}><Plus className="h-4 w-4 mr-1" /> Add modifier</Button>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.id} className="p-3 rounded-2xl">
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-muted-foreground">{g.required ? "Required" : "Optional"} · choose {g.min_select}–{g.max_select}</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {mods.filter((m) => m.group_id === g.id).map((m) => (
                    <li key={m.id} className="flex justify-between rounded-lg border px-2 py-1">
                      <span>{m.name}</span><span className="tabular-nums">{fmtMoney(Number(m.price))}</span>
                    </li>
                  ))}
                  {mods.filter((m) => m.group_id === g.id).length === 0 && <li className="text-xs text-muted-foreground">No modifiers yet.</li>}
                </ul>
              </Card>
            ))}
            {groups.length === 0 && <p className="text-sm text-muted-foreground">No modifier groups yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-3">
          <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-5">
            <Select value={rec.menu_item_id} onValueChange={(v) => setRec({ ...rec, menu_item_id: v })}>
              <SelectTrigger><SelectValue placeholder="Menu item" /></SelectTrigger>
              <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={rec.stock_item_id} onValueChange={(v) => setRec({ ...rec, stock_item_id: v })}>
              <SelectTrigger><SelectValue placeholder="Ingredient" /></SelectTrigger>
              <SelectContent>{stock.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" step="0.01" value={rec.quantity} onChange={(e) => setRec({ ...rec, quantity: Number(e.target.value) })} />
            <Input placeholder="Unit" value={rec.unit} onChange={(e) => setRec({ ...rec, unit: e.target.value })} />
            <Button onClick={addRecipe}><Plus className="h-4 w-4 mr-1" /> Add ingredient</Button>
          </Card>
          <p className="text-xs text-muted-foreground">Selling an item automatically issues its recipe ingredients out of stock and posts cost of sales.</p>

          <div className="grid gap-3 md:grid-cols-2">
            {items.filter((i) => recipes.some((r) => r.menu_item_id === i.id)).map((i) => (
              <Card key={i.id} className="p-3 rounded-2xl">
                <div className="flex justify-between">
                  <span className="font-medium">{i.name}</span>
                  <span className="text-sm tabular-nums">plate cost {fmtMoney(recipeCost(i.id))}</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {recipes.filter((r) => r.menu_item_id === i.id).map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-lg border px-2 py-1">
                      <span>{stock.find((s) => s.id === r.stock_item_id)?.name ?? "Ingredient"} — {r.quantity} {r.unit ?? ""}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeRecipe(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
            {recipes.length === 0 && <p className="text-sm text-muted-foreground">No recipes defined yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
