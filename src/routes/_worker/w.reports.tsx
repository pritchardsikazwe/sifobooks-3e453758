import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can, canFully } from "@/lib/pos-permissions";
import { money } from "@/lib/worker-pos";

export const Route = createFileRoute("/_worker/w/reports")({
  head: () => ({
    meta: [
      { title: "End of Day — SifoBooks POS" },
      { name: "description", content: "Your day at the till: sales, payment methods, refunds and the end-of-day close." },
      { property: "og:title", content: "End of Day — SifoBooks POS" },
      { property: "og:description", content: "Operational day summary for cashiers, supervisors and managers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerReports,
});

const today = () => new Date().toISOString().slice(0, 10);

function WorkerReports() {
  const ctx = usePosContext();
  const [date, setDate] = useState(today());

  const isRestaurant = ctx?.channel
    ? ctx.channel === "restaurant"
    : ["waiter", "kitchen"].includes(ctx?.role ?? "");

  if (!can(ctx, "reports")) {
    return <div className="p-10 text-center text-slate-400">End-of-day figures are not available for your role.</div>;
  }

  return isRestaurant
    ? <RestaurantDay ctx={ctx} date={date} setDate={setDate} />
    : <RetailDay ctx={ctx} date={date} setDate={setDate} />;
}

/* ------------------------------- shared UI -------------------------------- */

function Head({ title, note, date, setDate }: { title: string; note: string; date: string; setDate: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-slate-400">{note}</p>
      </div>
      <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)}
        className="ml-auto rounded-lg bg-slate-800 px-3 py-2 text-sm" />
    </div>
  );
}

function Stats({ cards }: { cards: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(([l, v]) => (
        <div key={l} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-400">{l}</div>
          <div className="text-lg font-bold">{v}</div>
        </div>
      ))}
    </div>
  );
}

function Breakdown({ label, rows }: { label: string; rows: [string, { n: number; total: number }][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <div className="bg-slate-900/80 px-3 py-2 text-sm font-semibold">{label}</div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-slate-800">
              <td className="px-3 py-2 capitalize">{k}</td>
              <td className="px-3 py-2 text-slate-400">{v.n}</td>
              <td className="px-3 py-2 text-right">{money(v.total)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td className="px-3 py-6 text-center text-slate-500">Nothing recorded for this day.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------- retail --------------------------------- */

function RetailDay({ ctx, date, setDate }: { ctx: any; date: string; setDate: (v: string) => void }) {
  const [sales, setSales] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* A cashier with limited reports only ever sees their own till. */
  const ownOnly = !canFully(ctx, "reports");

  useEffect(() => {
    if (!ctx?.tenantId) return;
    void (async () => {
      setLoading(true);
      const from = `${date}T00:00:00.000Z`;
      const to = `${date}T23:59:59.999Z`;
      let q = supabase
        .from("pos_sales")
        .select("id,sale_no,total,tax,discount,status,sold_at,created_by")
        .eq("user_id", ctx.tenantId)
        .gte("sold_at", from)
        .lte("sold_at", to);
      if (ownOnly && ctx.workerId) q = q.eq("created_by", ctx.workerId);
      const { data } = await q.order("sold_at", { ascending: false });
      const rows = (data ?? []) as any[];
      setSales(rows);
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const { data: p } = await supabase.from("pos_payments").select("sale_id,method,amount").in("sale_id", ids);
        setPays((p ?? []) as any[]);
      } else setPays([]);
      setLoading(false);
    })();
  }, [ctx?.tenantId, ctx?.workerId, date, ownOnly]);

  const done = sales.filter((s) => s.status === "completed");
  const refunded = sales.filter((s) => s.status === "refunded");
  const voided = sales.filter((s) => s.status === "voided");
  const gross = done.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const vat = done.reduce((s, r) => s + Number(r.tax ?? 0), 0);
  const doneIds = new Set(done.map((s) => s.id));

  const byMethod = useMemo(() => {
    const acc: Record<string, { n: number; total: number }> = {};
    for (const p of pays) {
      if (!doneIds.has(p.sale_id)) continue;
      const k = String(p.method ?? "—");
      acc[k] = { n: (acc[k]?.n ?? 0) + 1, total: (acc[k]?.total ?? 0) + Number(p.amount ?? 0) };
    }
    return Object.entries(acc);
  }, [pays, sales]);

  return (
    <div className="max-w-4xl space-y-5 p-4 md:p-6">
      <Head title="End of day" date={date} setDate={setDate}
        note={ownOnly ? "Your own till for the selected day." : "Every till in this company for the selected day."} />

      <Stats cards={[
        ["Sales", String(done.length)],
        ["Gross sales", money(gross)],
        ["VAT", money(vat)],
        ["Net", money(gross - vat)],
      ]} />

      <Breakdown label="Payment method" rows={byMethod} />

      <Stats cards={[
        ["Refunds", String(refunded.length)],
        ["Voids", String(voided.length)],
        ["Refunded value", money(refunded.reduce((s, r) => s + Number(r.total ?? 0), 0))],
        ["Discounts", money(sales.reduce((s, r) => s + Number(r.discount ?? 0), 0))],
      ]} />

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className="bg-slate-900/80 px-3 py-2 text-sm font-semibold">Sales for {date}</div>
        <table className="w-full text-sm">
          <tbody>
            {done.slice(0, 50).map((s) => (
              <tr key={s.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-semibold">{s.sale_no ?? s.id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-slate-400">
                  {new Date(s.sold_at).toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-3 py-2 text-right">{money(Number(s.total ?? 0))}</td>
              </tr>
            ))}
            {!done.length && (
              <tr><td className="px-3 py-6 text-center text-slate-500">
                {loading ? "Loading the day…" : "No completed sales for this day."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/w/cashup" className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950">
          Count cash and close my day
        </Link>
        <Link to="/w/shift" className="rounded-xl bg-slate-800 px-6 py-3 text-sm font-semibold">My shift</Link>
      </div>

      <p className="text-xs text-slate-500">
        These figures are read straight from completed sales. Nothing here posts or changes a sale — your day is only
        closed once you declare your cash and a manager approves any difference.
      </p>
    </div>
  );
}

/* ------------------------------- restaurant ------------------------------- */

function RestaurantDay({ ctx, date, setDate }: { ctx: any; date: string; setDate: (v: string) => void }) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!ctx?.tenantId) return;
    supabase.from("restaurant_orders")
      .select("id,order_type,status,total,tax,payment_method")
      .eq("user_id", ctx.tenantId).eq("business_date", date)
      .then(({ data }) => setOrders(data ?? []));
  }, [ctx?.tenantId, date]);

  const paid = orders.filter((o) => o.status === "paid");
  const group = (key: string): [string, { n: number; total: number }][] => Object.entries(
    paid.reduce<Record<string, { n: number; total: number }>>((a, o) => {
      const k = o[key] ?? "—";
      a[k] = { n: (a[k]?.n ?? 0) + 1, total: (a[k]?.total ?? 0) + Number(o.total ?? 0) };
      return a;
    }, {}),
  );

  const gross = paid.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const vat = paid.reduce((s, o) => s + Number(o.tax ?? 0), 0);

  const endOfDay = async () => {
    if (!can(ctx, "end_of_day")) return toast.error("Only a manager can close the day");
    const { error } = await supabase.from("restaurant_end_of_day").insert({
      user_id: ctx.tenantId, business_date: date, gross_sales: gross, tax: vat,
      orders_count: paid.length, net_total: gross - vat, status: "closed", approved_by: ctx.displayName,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Business day closed — accounting already has the journals");
  };

  return (
    <div className="max-w-4xl space-y-5 p-4 md:p-6">
      <Head title="End of day" note="Settled orders for the selected business day." date={date} setDate={setDate} />
      <Stats cards={[["Orders", String(paid.length)], ["Gross sales", money(gross)], ["VAT", money(vat)], ["Net", money(gross - vat)]]} />
      <Breakdown label="Order type" rows={group("order_type")} />
      <Breakdown label="Payment method" rows={group("payment_method")} />
      {can(ctx, "end_of_day") && (
        <Button className="h-12 bg-emerald-500 px-8 font-bold text-slate-950" onClick={endOfDay}>Close business day</Button>
      )}
      <p className="text-xs text-slate-500">
        Every settled order posts its own journal (Cash/Card ⇢ Sales + VAT, Cost of sales ⇢ Inventory) as it is paid.
      </p>
    </div>
  );
}
