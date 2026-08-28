import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { Bike } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/dispatch")({
  head: () => ({
    meta: [
      { title: "Delivery Dispatch — SifoBooks Restaurant" },
      { name: "description", content: "Assign drivers to delivery orders, dispatch them by zone, and track out-for-delivery and delivered times in real time." },
      { property: "og:title", content: "Delivery Dispatch — SifoBooks Restaurant" },
      { property: "og:description", content: "Driver assignment, zone fees, out-for-delivery and delivered tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dispatch,
});

const db: any = supabase;

function Dispatch() {
  const [orders, setOrders] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [driver, setDriver] = useState<Record<string, { name: string; phone: string }>>({});

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [o, z] = await Promise.all([
      db.from("restaurant_orders").select("*").eq("user_id", u).ilike("order_type", "%DELIVERY%")
        .order("opened_at", { ascending: false }).limit(100),
      db.from("restaurant_delivery_zones").select("*").eq("user_id", u).eq("active", true),
    ]);
    setOrders(o.data ?? []); setZones(z.data ?? []);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const zoneName = (id: string | null) => zones.find((z) => z.id === id)?.name ?? "—";

  const stage = (o: any) => (o.delivered_at ? "delivered" : o.dispatched_at ? "out for delivery" : o.driver_name ? "assigned" : "waiting");

  const buckets = useMemo(() => ({
    waiting: orders.filter((o) => stage(o) === "waiting" && o.status !== "void"),
    assigned: orders.filter((o) => stage(o) === "assigned"),
    out: orders.filter((o) => stage(o) === "out for delivery"),
    delivered: orders.filter((o) => stage(o) === "delivered" && o.business_date === today()),
  }), [orders]);

  const assign = async (o: any) => {
    const d = driver[o.id];
    if (!d?.name?.trim()) return toast.error("Enter a driver name");
    const { error } = await db.from("restaurant_orders").update({ driver_name: d.name.trim(), driver_phone: d.phone || null }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success(`Assigned to ${d.name}`); load();
  };

  const dispatchOrder = async (o: any) => {
    const { error } = await db.from("restaurant_orders").update({ dispatched_at: new Date().toISOString() }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Out for delivery"); load();
  };

  const markDelivered = async (o: any) => {
    const { error } = await db.from("restaurant_orders").update({ delivered_at: new Date().toISOString() }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Delivered"); load();
  };

  const Row = ({ o }: { o: any }) => {
    const s = stage(o);
    return (
      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium text-sm">{o.order_no ?? o.id.slice(0, 8)} · {fmtMoney(Number(o.total))}</div>
            <div className="text-xs text-muted-foreground">
              {o.customer_name ?? "Walk-in"} {o.customer_phone ? `· ${o.customer_phone}` : ""} · {zoneName(o.delivery_zone_id)}
            </div>
            <div className="text-xs text-muted-foreground">{o.delivery_address ?? "No address"}</div>
          </div>
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] capitalize", toneClass[statusTone(s === "delivered" ? "completed" : s === "waiting" ? "pending" : "open")])}>{s}</span>
        </div>

        {s === "waiting" && (
          <div className="flex flex-wrap gap-2">
            <Input className="h-8 w-32" placeholder="Driver" value={driver[o.id]?.name ?? ""} onChange={(e) => setDriver({ ...driver, [o.id]: { name: e.target.value, phone: driver[o.id]?.phone ?? "" } })} />
            <Input className="h-8 w-32" placeholder="Phone" value={driver[o.id]?.phone ?? ""} onChange={(e) => setDriver({ ...driver, [o.id]: { name: driver[o.id]?.name ?? "", phone: e.target.value } })} />
            <Button size="sm" onClick={() => assign(o)}>Assign</Button>
          </div>
        )}
        {s === "assigned" && (
          <div className="flex items-center justify-between text-xs">
            <span>{o.driver_name} {o.driver_phone ? `· ${o.driver_phone}` : ""}</span>
            <Button size="sm" onClick={() => dispatchOrder(o)}>Dispatch</Button>
          </div>
        )}
        {s === "out for delivery" && (
          <div className="flex items-center justify-between text-xs">
            <span>{o.driver_name} · left {new Date(o.dispatched_at).toLocaleTimeString()}</span>
            <Button size="sm" variant="outline" onClick={() => markDelivered(o)}>Mark delivered</Button>
          </div>
        )}
        {s === "delivered" && (
          <div className="text-xs text-muted-foreground">{o.driver_name} · delivered {new Date(o.delivered_at).toLocaleTimeString()}</div>
        )}
      </Card>
    );
  };

  const Column = ({ title, list }: { title: string; list: any[] }) => (
    <div className="space-y-2">
      <div className="text-sm font-semibold flex items-center justify-between">
        <span>{title}</span><span className="text-muted-foreground">{list.length}</span>
      </div>
      {list.map((o) => <Row key={o.id} o={o} />)}
      {!list.length && <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Nothing here.</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Bike className="h-5 w-5 text-primary" /> Delivery dispatch</h1>
        <ExportMenu filename={`delivery-dispatch-${today()}`} title="Delivery dispatch" rows={orders.map((o) => ({
          Order: o.order_no ?? o.id.slice(0, 8), Date: o.business_date, Customer: o.customer_name ?? "—",
          Phone: o.customer_phone ?? "—", Zone: zoneName(o.delivery_zone_id), Address: o.delivery_address ?? "—",
          Driver: o.driver_name ?? "—", Stage: stage(o), Fee: Number(o.delivery_fee || 0), Total: Number(o.total || 0),
        }))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Column title="Waiting" list={buckets.waiting} />
        <Column title="Assigned" list={buckets.assigned} />
        <Column title="Out for delivery" list={buckets.out} />
        <Column title="Delivered today" list={buckets.delivered} />
      </div>
    </div>
  );
}
