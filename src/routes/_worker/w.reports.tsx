import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can } from "@/lib/pos-permissions";
import { money } from "@/lib/worker-pos";

export const Route = createFileRoute("/_worker/w/reports")({
  head: () => ({
    meta: [
      { title: "Shift Reports — SifoBooks POS" },
      { name: "description", content: "Sales by order type and payment method for the business day, plus end-of-day close." },
      { property: "og:title", content: "Shift Reports — SifoBooks POS" },
      { property: "og:description", content: "Operational sales reporting for supervisors and managers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerReports,
});

function WorkerReports() {
  const ctx = usePosContext();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!ctx?.tenantId) return;
    supabase.from("restaurant_orders")
      .select("id,order_type,status,total,tax,payment_method")
      .eq("user_id", ctx.tenantId).eq("business_date", date)
      .then(({ data }) => setOrders(data ?? []));
  }, [ctx?.tenantId, date]);

  if (!can(ctx, "reports")) return <div className="p-10 text-center text-slate-400">Reports are not available for your role.</div>;

  const paid = orders.filter((o) => o.status === "paid");
  const group = (key: string) => paid.reduce<Record<string, { n: number; total: number }>>((a, o) => {
    const k = o[key] ?? "—";
    a[k] = { n: (a[k]?.n ?? 0) + 1, total: (a[k]?.total ?? 0) + Number(o.total ?? 0) };
    return a;
  }, {});

  const gross = paid.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const vat = paid.reduce((s, o) => s + Number(o.tax ?? 0), 0);

  const endOfDay = async () => {
    if (!can(ctx, "end_of_day")) return toast.error("Only a manager can close the day");
    const { error } = await supabase.from("restaurant_end_of_day").insert({
      user_id: ctx!.tenantId, business_date: date, gross_sales: gross, tax_total: vat,
      orders_count: paid.length, status: "closed", closed_by: ctx!.displayName,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Business day closed — accounting already has the journals");
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Shift reports</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="ml-auto rounded-lg bg-slate-800 px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Orders", String(paid.length)], ["Gross sales", money(gross)], ["VAT", money(vat)], ["Net", money(gross - vat)]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">{l}</div>
            <div className="text-lg font-bold">{v}</div>
          </div>
        ))}
      </div>

      {[["Order type", "order_type"], ["Payment method", "payment_method"]].map(([label, key]) => (
        <div key={key} className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-900/80 px-3 py-2 text-sm font-semibold">{label}</div>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(group(key)).map(([k, v]) => (
                <tr key={k} className="border-t border-slate-800">
                  <td className="px-3 py-2 capitalize">{k}</td>
                  <td className="px-3 py-2 text-slate-400">{v.n} orders</td>
                  <td className="px-3 py-2 text-right">{money(v.total)}</td>
                </tr>
              ))}
              {!paid.length && <tr><td className="px-3 py-6 text-center text-slate-500">No settled orders.</td></tr>}
            </tbody>
          </table>
        </div>
      ))}

      {can(ctx, "end_of_day") && (
        <Button className="bg-emerald-500 text-slate-950 h-12 px-8 font-bold" onClick={endOfDay}>Close business day</Button>
      )}
      <p className="text-xs text-slate-500">
        Every settled order posts its own journal (Cash/Card ⇢ Sales + VAT, Cost of sales ⇢ Inventory) into SifoBooks accounting automatically.
      </p>
    </div>
  );
}
