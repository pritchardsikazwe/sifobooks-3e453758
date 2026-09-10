import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { TABLE_STATUSES, statusTone, toneClass, uid } from "@/lib/restaurant";
import { StatGrid } from "@/components/industry/IndustryKit";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";

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

const LEGEND: { status: string; label: string }[] = [
  { status: "available", label: "Available" },
  { status: "occupied", label: "Occupied" },
  { status: "reserved", label: "Reserved" },
  { status: "payment pending", label: "Awaiting payment" },
  { status: "dirty", label: "Needs clearing" },
];

function Tables() {
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", area: "Main", seats: 4, shape: "square" });
  const [area, setArea] = useState("All");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

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
    setAddOpen(false);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "available") { patch.occupied_since = null; patch.current_order_id = null; patch.server_name = null; }
    if (status === "occupied") patch.occupied_since = new Date().toISOString();
    const { error } = await db.from("restaurant_tables").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setTables((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelected((s: any) => (s && s.id === id ? { ...s, ...patch } : s));
    toast.success(`Table marked ${status}`);
  };

  const remove = async (id: string) => {
    const { error } = await db.from("restaurant_tables").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTables((l) => l.filter((t) => t.id !== id));
    setSelected(null);
    toast.success("Table removed");
  };

  const areas = ["All", ...Array.from(new Set(tables.map((t) => t.area)))];
  const shown = tables.filter(
    (t) => (area === "All" || t.area === area) && `${t.name} ${t.area}`.toLowerCase().includes(q.toLowerCase()),
  );
  const orderFor = (t: any) => orders.find((o) => o.table_id === t.id);

  const counts = useMemo(() => {
    const by = (s: string) => tables.filter((t) => (t.status || "").toLowerCase() === s).length;
    return { occupied: by("occupied"), reserved: by("reserved"), free: by("available") };
  }, [tables]);
  const openValue = orders.reduce((s, o) => s + Number(o.total || 0), 0);

  const byArea = useMemo(() => {
    const m = new Map<string, any[]>();
    shown.forEach((t) => m.set(t.area ?? "Floor", [...(m.get(t.area ?? "Floor") ?? []), t]));
    return Array.from(m.entries());
  }, [shown]);

  const selectedOrder = selected ? orderFor(selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Floor &amp; tables</h1>
          <p className="text-sm text-muted-foreground">Tap an existing table to open it — adding tables is a setup action.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a table…" className="w-36 bg-transparent text-sm outline-none" />
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary"><Plus className="mr-1 h-4 w-4" /> Add table</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a table to the floor plan</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Table name (e.g. T12)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              <Input type="number" placeholder="Seats" value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
              <Select value={form.shape} onValueChange={(v) => setForm({ ...form, shape: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["square", "round", "booth", "bar"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={add}>Add table</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <StatGrid items={[
        { label: "Tables", value: String(tables.length) },
        { label: "Occupied", value: String(counts.occupied) },
        { label: "Reserved", value: String(counts.reserved) },
        { label: "Open check value", value: fmtMoney(openValue), hint: `${orders.length} open checks` },
      ]} />

      <div className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <button key={a} onClick={() => setArea(a)}
            className={cn("rounded-xl border px-3 py-1.5 text-sm", area === a ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {a}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading floor plan…</p> :
        shown.length === 0 ? (
          <Card className="rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No tables match. Existing tables appear here once they are set up.
          </Card>
        ) : (
          <div className="space-y-5">
            {byArea.map(([areaName, list]) => (
              <div key={areaName}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{areaName}</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                  {list.map((t: any) => {
                    const o = orderFor(t);
                    const mins = t.occupied_since ? Math.round((Date.now() - new Date(t.occupied_since).getTime()) / 60000) : null;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelected(t)}
                        className={cn(
                          "rounded-2xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                          toneClass[statusTone(t.status)],
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{t.name}</span>
                          <span className="text-[10px] font-semibold uppercase">{t.status}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs opacity-80">
                          <Users className="h-3 w-3" /> {t.seats} seats
                        </div>
                        {o ? <div className="mt-2 text-sm font-semibold tabular-nums">{fmtMoney(Number(o.total))}</div> : null}
                        {o ? <div className="text-[11px] opacity-80">{o.order_no}</div> : null}
                        {mins !== null ? <div className="text-[11px] opacity-80">{mins} min</div> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      <div className="flex flex-wrap gap-2">
        {LEGEND.map((l) => (
          <span key={l.status} className={cn("rounded-full border px-3 py-1 text-xs font-medium", toneClass[statusTone(l.status)])}>{l.label}</span>
        ))}
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>Table {selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Area</div><div className="font-medium">{selected.area ?? "—"}</div></div>
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Seats</div><div className="font-medium">{selected.seats}</div></div>
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Shape</div><div className="font-medium">{selected.shape ?? "—"}</div></div>
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Server</div><div className="font-medium">{selected.server_name ?? "—"}</div></div>
                </div>

                {selectedOrder ? (
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Open check</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-medium">{selectedOrder.order_no}</span>
                      <span className="font-semibold tabular-nums">{fmtMoney(Number(selectedOrder.total))}</span>
                    </div>
                    <Link to="/restaurant/orders" className="mt-2 inline-flex text-sm text-primary hover:underline">Open the check</Link>
                  </div>
                ) : (
                  <div className="rounded-xl border p-3 text-muted-foreground">No open check on this table.</div>
                )}

                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Table status</div>
                  <Select value={selected.status} onValueChange={(v) => setStatus(selected.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TABLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Link to="/restaurant/pos" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Take an order</Link>
                  <Link to="/restaurant/reservations" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted">Reservations</Link>
                  <Button variant="ghost" className="ml-auto text-destructive" onClick={() => remove(selected.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Remove table
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
