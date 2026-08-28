import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { TABLE_STATUSES, statusTone, toneClass, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/tables")({
  head: () => ({
    meta: [
      { title: "Table & Floor Plan Management — SifoBooks" },
      { name: "description", content: "Visual restaurant floor plan: table status, guests, server, time occupied and the open check on every table." },
      { property: "og:title", content: "Table & Floor Plan Management — SifoBooks" },
      { property: "og:description", content: "Seat guests, transfer checks and clear tables from a live floor plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tables,
});

const db: any = supabase;

function Tables() {
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", area: "Main", seats: 4, shape: "square" });
  const [area, setArea] = useState("All");

  const load = async () => {
    setLoading(true);
    const u = await uid();
    if (!u) return setLoading(false);
    const [t, o] = await Promise.all([
      db.from("restaurant_tables").select("*").eq("user_id", u).order("area").order("name"),
      db.from("restaurant_orders").select("*").eq("user_id", u).in("status", ["open", "held"]),
    ]);
    setTables(t.data ?? []);
    setOrders(o.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name.trim()) return toast.error("Give the table a name");
    const u = await uid();
    const { error } = await db.from("restaurant_tables").insert({ user_id: u, ...form, status: "available" });
    if (error) return toast.error(error.message);
    toast.success(`Table ${form.name} added`);
    setForm({ ...form, name: "" });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "available") { patch.occupied_since = null; patch.current_order_id = null; patch.server_name = null; }
    if (status === "occupied") patch.occupied_since = new Date().toISOString();
    const { error } = await db.from("restaurant_tables").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setTables((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    toast.success(`Table marked ${status}`);
  };

  const remove = async (id: string) => {
    const { error } = await db.from("restaurant_tables").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTables((l) => l.filter((t) => t.id !== id));
    toast.success("Table removed");
  };

  const areas = ["All", ...Array.from(new Set(tables.map((t) => t.area)))];
  const shown = tables.filter((t) => area === "All" || t.area === area);
  const orderFor = (t: any) => orders.find((o) => o.table_id === t.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Floor plan</h1>
          <p className="text-sm text-muted-foreground">{tables.length} tables · {tables.filter((t) => t.status === "occupied").length} occupied</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-5">
        <Input placeholder="Table name (e.g. T12)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
        <Input type="number" placeholder="Seats" value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
        <Select value={form.shape} onValueChange={(v) => setForm({ ...form, shape: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["square", "round", "booth", "bar"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add table</Button>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {areas.map((a) => (
          <button key={a} onClick={() => setArea(a)}
            className={cn("rounded-xl px-3 py-1.5 text-sm border", area === a ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {a}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading floor plan…</p> :
        shown.length === 0 ? (
          <Card className="p-10 rounded-2xl text-center text-sm text-muted-foreground">
            No tables yet — add your first table above.
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
            {shown.map((t) => {
              const o = orderFor(t);
              const mins = t.occupied_since ? Math.round((Date.now() - new Date(t.occupied_since).getTime()) / 60000) : null;
              return (
                <Card key={t.id} className={cn(
                  "p-3 rounded-2xl border-2 transition-all hover:shadow-md",
                  toneClass[statusTone(t.status)],
                  t.shape === "round" && "rounded-full aspect-square flex flex-col justify-center",
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-[11px] uppercase">{t.status}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-80">{t.seats} seats · {t.area}</div>
                  {o && <div className="text-xs mt-1 font-medium">{o.order_no} · {fmtMoney(Number(o.total))}</div>}
                  {mins !== null && <div className="text-xs opacity-80">{mins} min</div>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Select value={t.status} onValueChange={(v) => setStatus(t.id, v)}>
                      <SelectTrigger className="h-7 text-xs bg-background/70"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TABLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
