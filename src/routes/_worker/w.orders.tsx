import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can } from "@/lib/pos-permissions";
import { money } from "@/lib/worker-pos";

export const Route = createFileRoute("/_worker/w/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — SifoBooks POS" },
      { name: "description", content: "Open, held and settled orders for the current business day at this terminal." },
      { property: "og:title", content: "My Orders — SifoBooks POS" },
      { property: "og:description", content: "Track order status from sent to kitchen through to paid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerOrders,
});

function WorkerOrders() {
  const ctx = usePosContext();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!ctx?.tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("restaurant_orders")
        .select("id,order_no,order_type,status,total,server_name,opened_at,guests")
        .eq("user_id", ctx.tenantId)
        .eq("business_date", new Date().toISOString().slice(0, 10))
        .order("opened_at", { ascending: false })
        .limit(200);
      setRows(data ?? []);
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [ctx?.tenantId]);

  if (!can(ctx, "pos_sales")) return <div className="p-10 text-center text-slate-400">No order access for your role.</div>;

  const mine = ctx?.isOwner ? rows : rows.filter((r) => !r.server_name || r.server_name === ctx?.displayName);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-bold">Today's orders</h1>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400 sticky top-0">
            <tr>
              {["Order", "Type", "Guests", "Server", "Status", "Total"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mine.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-semibold">{r.order_no}</td>
                <td className="px-3 py-2 capitalize">{r.order_type}</td>
                <td className="px-3 py-2">{r.guests}</td>
                <td className="px-3 py-2">{r.server_name ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2 text-right">{money(r.total)}</td>
              </tr>
            ))}
            {!mine.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No orders yet today.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
