import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { ChefHat, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen Display System — SifoBooks" },
      { name: "description", content: "Live kitchen and bar display: order tickets routed by station, with start, ready and served bumping." },
      { property: "og:title", content: "Kitchen Display System — SifoBooks" },
      { property: "og:description", content: "Route tickets to grill, bar, kitchen and dessert screens in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Kitchen,
});

const db: any = supabase;

function Kitchen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [station, setStation] = useState("All");
  const [tick, setTick] = useState(0);

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const { data: os } = await db.from("restaurant_orders").select("*").eq("user_id", u)
      .eq("business_date", today()).in("status", ["open", "held", "paid"]).order("opened_at");
    const list = os ?? [];
    setOrders(list);
    if (list.length) {
      const { data: oi } = await db.from("restaurant_order_items").select("*").in("order_id", list.map((o: any) => o.id));
      setItems(oi ?? []);
    } else setItems([]);
  };

  useEffect(() => { load(); }, []);

  // Live refresh: realtime pushes plus a lightweight clock for ticket ageing.
  useEffect(() => {
    const channel = supabase.channel("kds")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_order_items" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_orders" }, () => load())
      .subscribe();
    const t = setInterval(() => setTick((x) => x + 1), 20000);
    return () => { supabase.removeChannel(channel); clearInterval(t); };
  }, []);

  const stations = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.station || "Kitchen")))], [items]);

  const tickets = useMemo(() => orders.map((o) => ({
    order: o,
    lines: items.filter((i) => i.order_id === o.id && (station === "All" || (i.station || "Kitchen") === station)),
  })).filter((t) => t.lines.length && t.lines.some((l) => l.kds_status !== "served")), [orders, items, station, tick]);

  const bump = async (line: any, next: string) => {
    const { error } = await db.from("restaurant_order_items").update({ kds_status: next }).eq("id", line.id);
    if (error) return toast.error(error.message);
    setItems((l) => l.map((x) => (x.id === line.id ? { ...x, kds_status: next } : x)));
  };

  const bumpTicket = async (t: any, next: string) => {
    await db.from("restaurant_order_items").update({ kds_status: next }).in("id", t.lines.map((l: any) => l.id));
    toast.success(`Ticket ${t.order.order_no} → ${next}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ChefHat className="h-5 w-5" /> Kitchen display</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} active tickets · updates live</p>
        </div>
        {stations.map((s) => (
          <button key={s} onClick={() => setStation(s)}
            className={cn("rounded-xl px-3 py-1.5 text-sm border", station === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {s}
          </button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <Card className="p-10 rounded-2xl text-center text-sm text-muted-foreground">No tickets waiting — the pass is clear.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {tickets.map((t) => {
            const mins = Math.round((Date.now() - new Date(t.order.opened_at).getTime()) / 60000);
            const late = mins > 20;
            return (
              <Card key={t.order.id} className={cn("rounded-2xl overflow-hidden border-2", late ? "border-rose-500/50" : "border-border")}>
                <div className={cn("px-3 py-2 flex items-center justify-between text-sm font-semibold",
                  late ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary")}>
                  <span>{t.order.order_no}</span>
                  <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" />{mins}m</span>
                </div>
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {t.order.order_type}{t.order.table_id ? " · table check" : ""}{t.order.server_name ? ` · ${t.order.server_name}` : ""}
                </div>
                <ul className="px-3 pb-2 space-y-1.5">
                  {t.lines.map((l: any) => (
                    <li key={l.id} className="rounded-lg border p-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{l.qty} × {l.item_name}</span>
                        <span className={cn("text-[10px] uppercase rounded-full border px-2", toneClass[statusTone(l.kds_status)])}>{l.kds_status}</span>
                      </div>
                      {l.notes && <p className="text-xs text-amber-600 mt-1">{l.notes}</p>}
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bump(l, "cooking")}>Start</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bump(l, "ready")}>Ready</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bump(l, "served")}>Served</Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t p-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => bumpTicket(t, "ready")}>All ready</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => bumpTicket(t, "served")}>Bump</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
