import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can } from "@/lib/pos-permissions";

export const Route = createFileRoute("/_worker/w/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen Display — SifoBooks Kitchen" },
      { name: "description", content: "Kitchen display system with order tickets, timers, priority and ready status." },
      { property: "og:title", content: "Kitchen Display — SifoBooks Kitchen" },
      { property: "og:description", content: "New, preparing, ready and completed tickets on one screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerKitchen,
});

const FLOW = ["queued", "cooking", "ready", "served"] as const;

function since(ts: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function WorkerKitchen() {
  const ctx = usePosContext();
  const [orders, setOrders] = useState<any[]>([]);
  const [, tick] = useState(0);
  const [filter, setFilter] = useState<string>("active");

  useEffect(() => {
    if (!ctx?.tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("restaurant_orders")
        .select("id,order_no,order_type,status,priority,opened_at,restaurant_order_items(id,item_name,qty,notes,kds_status,station)")
        .eq("user_id", ctx.tenantId)
        .eq("business_date", new Date().toISOString().slice(0, 10))
        .order("opened_at", { ascending: true });
      setOrders(data ?? []);
    };
    load();
    const l = setInterval(load, 10000);
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(l); clearInterval(t); };
  }, [ctx?.tenantId]);

  if (!can(ctx, "kitchen_display")) return <div className="p-10 text-center text-slate-400">Kitchen display is not available for your role.</div>;

  const advance = async (order: any) => {
    const items = order.restaurant_order_items ?? [];
    const cur = items[0]?.kds_status ?? "queued";
    const next = FLOW[Math.min(FLOW.indexOf(cur as any) + 1, FLOW.length - 1)];
    await supabase.from("restaurant_order_items").update({ kds_status: next }).eq("order_id", order.id);
    setOrders((os) => os.map((o) => o.id === order.id
      ? { ...o, restaurant_order_items: items.map((i: any) => ({ ...i, kds_status: next })) } : o));
  };

  const stateOf = (o: any) => o.restaurant_order_items?.[0]?.kds_status ?? "queued";
  const shown = orders.filter((o) => filter === "all" ? true : stateOf(o) !== "served");

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">SifoBooks Kitchen</h1>
        <div className="ml-auto flex gap-2">
          {["active", "all"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {shown.map((o) => {
          const st = stateOf(o);
          const border = st === "ready" ? "border-emerald-500" : st === "cooking" ? "border-amber-500" : "border-slate-700";
          return (
            <div key={o.id} className={`rounded-2xl border-2 ${border} bg-slate-900/70 p-4 flex flex-col`}>
              <div className="flex items-center justify-between">
                <div className="font-bold uppercase text-sm">{o.order_type} #{o.order_no}</div>
                {o.priority && <span className="text-[10px] rounded bg-rose-500 px-1.5 py-0.5 text-slate-950 font-bold">RUSH</span>}
              </div>
              <ul className="mt-3 space-y-1 text-sm flex-1">
                {(o.restaurant_order_items ?? []).map((i: any) => (
                  <li key={i.id}>
                    <span className="font-semibold">{i.qty}×</span> {i.item_name}
                    {i.notes && <div className="text-xs text-amber-400 pl-5">↳ {i.notes}</div>}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-lg">{since(o.opened_at)}</span>
                <span className="text-xs uppercase tracking-wide text-slate-400">{st}</span>
              </div>
              <button onClick={() => advance(o)}
                className="mt-3 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-slate-950">
                {st === "queued" ? "Start preparing" : st === "cooking" ? "Mark ready" : st === "ready" ? "Complete" : "Recall"}
              </button>
            </div>
          );
        })}
        {!shown.length && <div className="col-span-full text-slate-500 text-sm">No kitchen tickets right now.</div>}
      </div>
    </div>
  );
}
