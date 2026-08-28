import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { today, uid } from "@/lib/restaurant";
import { Layers, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/combos")({
  head: () => ({
    meta: [
      { title: "Combos & Meal Deals — SifoBooks Restaurant" },
      { name: "description", content: "Build restaurant combos and meal deals by grouping menu items, and see the bundle price against the sum of its components." },
      { property: "og:title", content: "Combos & Meal Deals — SifoBooks Restaurant" },
      { property: "og:description", content: "Group menu items into combos and compare bundle price to component value." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Combos,
});

const db: any = supabase;

function Combos() {
  const [items, setItems] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [combo, setCombo] = useState({ name: "", price: 0, category: "Combos" });
  const [pick, setPick] = useState<Record<string, string>>({});

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [i, l] = await Promise.all([
      db.from("restaurant_menu_items").select("*").eq("user_id", u).order("name"),
      db.from("restaurant_menu_item_groups").select("*").eq("user_id", u),
    ]);
    setItems(i.data ?? []); setLinks(l.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const combos = useMemo(() => items.filter((i) => (i.category || "").toLowerCase() === "combos"), [items]);
  const components = (comboId: string) => links.filter((l) => l.group_id === comboId);

  const createCombo = async () => {
    if (!combo.name.trim()) return toast.error("Name the combo");
    const u = await uid();
    const { error } = await db.from("restaurant_menu_items").insert({
      user_id: u, name: combo.name.trim(), price: Number(combo.price || 0), category: "Combos", active: true,
    });
    if (error) return toast.error(error.message);
    setCombo({ name: "", price: 0, category: "Combos" });
    toast.success("Combo created"); load();
  };

  const addComponent = async (comboId: string) => {
    const itemId = pick[comboId];
    if (!itemId) return toast.error("Pick a menu item");
    const u = await uid();
    const { error } = await db.from("restaurant_menu_item_groups").insert({ user_id: u, group_id: comboId, menu_item_id: itemId });
    if (error) return toast.error(error.message);
    setPick({ ...pick, [comboId]: "" });
    load();
  };

  const removeComponent = async (id: string) => {
    await db.from("restaurant_menu_item_groups").delete().eq("id", id);
    load();
  };

  const componentValue = (comboId: string) =>
    components(comboId).reduce((s, l) => s + Number(byId.get(l.menu_item_id)?.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Combos & meal deals</h1>

      <Card className="p-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Combo name e.g. Family Bucket" value={combo.name} onChange={(e) => setCombo({ ...combo, name: e.target.value })} />
        <Input type="number" placeholder="Bundle price" value={combo.price} onChange={(e) => setCombo({ ...combo, price: Number(e.target.value) })} />
        <Button onClick={createCombo}>Create combo</Button>
      </Card>

      <div className="flex justify-end">
        <ExportMenu filename={`combos-${today()}`} title="Combos & meal deals" rows={combos.map((c) => ({
          Combo: c.name, "Bundle price": Number(c.price), Components: components(c.id).length,
          "Component value": componentValue(c.id), Saving: componentValue(c.id) - Number(c.price),
        }))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {combos.map((c) => {
          const value = componentValue(c.id);
          const saving = value - Number(c.price || 0);
          return (
            <Card key={c.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Bundle {fmtMoney(Number(c.price))} · components {fmtMoney(value)} ·{" "}
                    <span className={saving >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {saving >= 0 ? "saves" : "over"} {fmtMoney(Math.abs(saving))}
                    </span>
                  </div>
                </div>
              </div>

              <ul className="space-y-1 text-sm">
                {components(c.id).map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5">
                    <span>{byId.get(l.menu_item_id)?.name ?? "Removed item"}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{fmtMoney(Number(byId.get(l.menu_item_id)?.price ?? 0))}</span>
                      <button onClick={() => removeComponent(l.id)} aria-label="Remove component" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
                {!components(c.id).length && <li className="text-muted-foreground text-xs">No components yet.</li>}
              </ul>

              <div className="flex gap-2">
                <Select value={pick[c.id] ?? ""} onValueChange={(v) => setPick({ ...pick, [c.id]: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Add menu item" /></SelectTrigger>
                  <SelectContent>
                    {items.filter((i) => i.id !== c.id && (i.category || "").toLowerCase() !== "combos")
                      .map((i) => <SelectItem key={i.id} value={i.id}>{i.name} — {fmtMoney(Number(i.price))}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => addComponent(c.id)}>Add</Button>
              </div>
            </Card>
          );
        })}
        {!combos.length && <Card className="p-6 text-center text-muted-foreground">No combos yet — create one above. Combos appear on the POS under the “Combos” category.</Card>}
      </div>
    </div>
  );
}
