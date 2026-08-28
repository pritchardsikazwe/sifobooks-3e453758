import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ORDER_TYPES, uid, VAT_RATE } from "@/lib/restaurant";
import { Plus, Settings as Cog, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/settings")({
  head: () => ({
    meta: [
      { title: "Restaurant Settings — SifoBooks" },
      { name: "description", content: "Configure tax, service charge, gratuity, order types, kitchen stations and delivery zones for your restaurant." },
      { property: "og:title", content: "Restaurant Settings — SifoBooks" },
      { property: "og:description", content: "Tax, tips, stations, order types and delivery zones in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RestaurantSettings;
});

const db: any = supabase;

function RestaurantSettings() {
  const [settings, setSettings] = useState<any>({
    tax_rate: VAT_RATE, service_charge_rate: 0, default_gratuity_rate: 0,
    auto_post_sales: true, deplete_ingredients: true, receipt_footer: "",
  });
  const [types, setTypes] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [newStation, setNewStation] = useState({ name: "", categories: "" });
  const [newZone, setNewZone] = useState({ name: "", fee: 0, min_order: 0 });

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [s, t, k, z] = await Promise.all([
      db.from("restaurant_settings").select("*").eq("user_id", u).maybeSingle(),
      db.from("restaurant_order_types").select("*").eq("user_id", u).order("label"),
      db.from("restaurant_kitchen_stations").select("*").eq("user_id", u).order("name"),
      db.from("restaurant_delivery_zones").select("*").eq("user_id", u).order("name"),
    ]);
    if (s.data) setSettings(s.data);
    setTypes(t.data ?? []); setStations(k.data ?? []); setZones(z.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    const u = await uid();
    const payload = { user_id: u, ...settings };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = settings.id
      ? await db.from("restaurant_settings").update(payload).eq("id", settings.id)
      : await db.from("restaurant_settings").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    load();
  };

  const seedTypes = async () => {
    const u = await uid();
    const existing = new Set(types.map((t) => t.key));
    const rows = ORDER_TYPES.filter((o) => !existing.has(o.key)).map((o) => ({
      user_id: u, key: o.key, label: o.label, enabled: true,
      requires_table: !!o.requiresTable, requires_customer: !!o.requiresCustomer,
      requires_address: !!o.requiresAddress,
    }));
    if (!rows.length) return toast.info("All order types already configured");
    const { error } = await db.from("restaurant_order_types").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Order types added");
    load();
  };

  const toggleType = async (t: any, enabled: boolean) => {
    await db.from("restaurant_order_types").update({ enabled }).eq("id", t.id);
    setTypes((l) => l.map((x) => (x.id === t.id ? { ...x, enabled } : x)));
  };

  const addStation = async () => {
    if (!newStation.name.trim()) return toast.error("Station name is required");
    const u = await uid();
    const { error } = await db.from("restaurant_kitchen_stations").insert({
      user_id: u, name: newStation.name,
      categories: newStation.categories.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (error) return toast.error(error.message);
    setNewStation({ name: "", categories: "" });
    toast.success("Station added");
    load();
  };

  const addZone = async () => {
    if (!newZone.name.trim()) return toast.error("Zone name is required");
    const u = await uid();
    const { error } = await db.from("restaurant_delivery_zones").insert({ user_id: u, ...newZone });
    if (error) return toast.error(error.message);
    setNewZone({ name: "", fee: 0, min_order: 0 });
    toast.success("Delivery zone added");
    load();
  };

  const del = async (table: string, id: string, after: () => void) => {
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    after();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Cog className="h-5 w-5" /> Restaurant settings</h1>
        <p className="text-sm text-muted-foreground">Tax, tips, order types, kitchen routing and delivery.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="types">Order types</TabsTrigger>
          <TabsTrigger value="kitchen">Kitchen stations</TabsTrigger>
          <TabsTrigger value="delivery">Delivery zones</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="p-4 rounded-2xl grid gap-3 md:grid-cols-2">
            <label className="text-sm">VAT rate (e.g. 0.16)
              <Input type="number" step="0.01" value={settings.tax_rate ?? 0}
                onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) })} />
            </label>
            <label className="text-sm">Service charge rate
              <Input type="number" step="0.01" value={settings.service_charge_rate ?? 0}
                onChange={(e) => setSettings({ ...settings, service_charge_rate: Number(e.target.value) })} />
            </label>
            <label className="text-sm">Default gratuity rate
              <Input type="number" step="0.01" value={settings.default_gratuity_rate ?? 0}
                onChange={(e) => setSettings({ ...settings, default_gratuity_rate: Number(e.target.value) })} />
            </label>
            <label className="text-sm">Receipt footer
              <Input value={settings.receipt_footer ?? ""}
                onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })} />
            </label>
            <label className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
              Post settled checks to the ledger automatically
              <Switch checked={!!settings.auto_post_sales} onCheckedChange={(v) => setSettings({ ...settings, auto_post_sales: v })} />
            </label>
            <label className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
              Deplete recipe ingredients on sale
              <Switch checked={!!settings.deplete_ingredients} onCheckedChange={(v) => setSettings({ ...settings, deplete_ingredients: v })} />
            </label>
            <Button className="md:col-span-2" onClick={saveSettings}>Save settings</Button>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-3">
          <Button variant="outline" onClick={seedTypes}><Plus className="h-4 w-4 mr-1" /> Add standard order types</Button>
          <div className="grid gap-2 md:grid-cols-2">
            {types.map((t) => (
              <Card key={t.id} className="p-3 rounded-2xl flex items-center gap-3">
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {[t.requires_table && "table", t.requires_customer && "customer", t.requires_address && "address"]
                      .filter(Boolean).join(" · ") || "no requirements"}
                  </div>
                </div>
                <Switch className="ml-auto" checked={!!t.enabled} onCheckedChange={(v) => toggleType(t, v)} />
              </Card>
            ))}
            {types.length === 0 && <p className="text-sm text-muted-foreground">No order types configured yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="kitchen" className="space-y-3">
          <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-3">
            <Input placeholder="Station name (Grill, Bar…)" value={newStation.name} onChange={(e) => setNewStation({ ...newStation, name: e.target.value })} />
            <Input placeholder="Categories, comma separated" value={newStation.categories} onChange={(e) => setNewStation({ ...newStation, categories: e.target.value })} />
            <Button onClick={addStation}><Plus className="h-4 w-4 mr-1" /> Add station</Button>
          </Card>
          <div className="grid gap-2 md:grid-cols-3">
            {stations.map((s) => (
              <Card key={s.id} className="p-3 rounded-2xl flex items-center gap-2">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{(s.categories ?? []).join(", ") || "all categories"}</div>
                </div>
                <Button size="icon" variant="ghost" className="ml-auto"
                  onClick={() => del("restaurant_kitchen_stations", s.id, () => setStations((l) => l.filter((x) => x.id !== s.id)))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
            {stations.length === 0 && <p className="text-sm text-muted-foreground">No stations yet — items route to the default kitchen screen.</p>}
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-3">
          <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-4">
            <Input placeholder="Zone name" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} />
            <Input type="number" placeholder="Delivery fee" value={newZone.fee} onChange={(e) => setNewZone({ ...newZone, fee: Number(e.target.value) })} />
            <Input type="number" placeholder="Minimum order" value={newZone.min_order} onChange={(e) => setNewZone({ ...newZone, min_order: Number(e.target.value) })} />
            <Button onClick={addZone}><Plus className="h-4 w-4 mr-1" /> Add zone</Button>
          </Card>
          <div className="grid gap-2 md:grid-cols-3">
            {zones.map((z) => (
              <Card key={z.id} className="p-3 rounded-2xl flex items-center gap-2">
                <div>
                  <div className="font-medium">{z.name}</div>
                  <div className="text-xs text-muted-foreground">fee {fmtMoney(Number(z.fee || 0))} · min {fmtMoney(Number(z.min_order || 0))}</div>
                </div>
                <Button size="icon" variant="ghost" className="ml-auto"
                  onClick={() => del("restaurant_delivery_zones", z.id, () => setZones((l) => l.filter((x) => x.id !== z.id)))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
            {zones.length === 0 && <p className="text-sm text-muted-foreground">No delivery zones yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
