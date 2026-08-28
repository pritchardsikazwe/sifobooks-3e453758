import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { summarise, today, uid } from "@/lib/restaurant";
import { CalendarCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/end-of-day")({
  head: () => ({
    meta: [
      { title: "End of Day Close — SifoBooks Restaurant" },
      { name: "description", content: "Close the business day: settle open checks, reconcile drawers, review sales by type, method and server, then archive and post." },
      { property: "og:title", content: "End of Day Close — SifoBooks Restaurant" },
      { property: "og:description", content: "Z-read totals, drawer variance and manager sign-off, posted straight to the ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EndOfDay,
});

const db: any = supabase;

function EndOfDay() {
  const [date, setDate] = useState(today());
  const [orders, setOrders] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [closed, setClosed] = useState<any | null>(null);
  const [manager, setManager] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [o, d, e] = await Promise.all([
      db.from("restaurant_orders").select("*").eq("user_id", u).eq("business_date", date),
      db.from("restaurant_cash_drawers").select("*").eq("user_id", u).eq("business_date", date),
      db.from("restaurant_end_of_day").select("*").eq("user_id", u).eq("business_date", date).maybeSingle(),
    ]);
    setOrders(o.data ?? []); setDrawers(d.data ?? []); setClosed(e.data ?? null);
  };
  useEffect(() => { load(); }, [date]);

  const t = useMemo(() => summarise(orders), [orders]);
  const openChecks = orders.filter((o) => o.status === "open" || o.status === "held");
  const voids = orders.filter((o) => o.status === "void");
  const variance = drawers.reduce((s, d) => s + Number(d.variance || 0), 0);
  const openDrawers = drawers.filter((d) => d.status === "open");

  const byServer = useMemo(() => {
    const m: Record<string, number> = {};
    orders.filter((o) => o.status !== "void").forEach((o) => {
      m[o.server_name || "Unassigned"] = (m[o.server_name || "Unassigned"] ?? 0) + Number(o.total || 0);
    });
    return m;
  }, [orders]);

  const close = async () => {
    if (openChecks.length) return toast.error(`${openChecks.length} check(s) still open — settle or void them first.`);
    if (openDrawers.length) return toast.error("Close and count every cash drawer first.");
    if (!manager.trim()) return toast.error("Manager approval name is required");
    setBusy(true);
    const u = await uid();
    const { error } = await db.from("restaurant_end_of_day").insert({
      user_id: u, business_date: date, orders_count: t.orders, gross_sales: t.gross,
      discounts: t.discounts, tax: t.tax, service_charge: t.service, gratuity: t.gratuity,
      delivery_fees: t.delivery, net_sales: t.net, cash_variance: variance,
      by_method: t.byMethod, by_type: t.byType, voids: voids.length,
      approved_by: manager, closed_at: new Date().toISOString(), status: "closed",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Business day closed and posted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> End of day</h1>
          <p className="text-sm text-muted-foreground">{closed ? `Closed by ${closed.approved_by}` : "Day still trading"}</p>
        </div>
        <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        <ExportMenu filename={`z-read-${date}`} title={`Z-Read ${date}`} rows={[
          { Metric: "Orders", Value: t.orders },
          { Metric: "Gross sales", Value: t.gross },
          { Metric: "Discounts", Value: t.discounts },
          { Metric: "Tax", Value: t.tax },
          { Metric: "Service charge", Value: t.service },
          { Metric: "Gratuity", Value: t.gratuity },
          { Metric: "Delivery fees", Value: t.delivery },
          { Metric: "Net takings", Value: t.net },
          { Metric: "Cash variance", Value: variance },
          ...Object.entries(t.byMethod).map(([k, v]) => ({ Metric: `Payment — ${k}`, Value: v })),
          ...Object.entries(t.byType).map(([k, v]) => ({ Metric: `Order type — ${k}`, Value: v })),
          ...Object.entries(byServer).map(([k, v]) => ({ Metric: `Server — ${k}`, Value: v })),
        ]} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Orders" value={String(t.orders)} />
        <Kpi label="Net takings" value={fmtMoney(t.net)} />
        <Kpi label="Open checks" value={String(openChecks.length)} />
        <Kpi label="Cash variance" value={fmtMoney(variance)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 rounded-2xl space-y-1">
          <div className="text-sm font-semibold mb-1">Sales summary</div>
          <Row label="Gross sales" v={t.gross} />
          <Row label="Discounts" v={-t.discounts} />
          <Row label="Tax" v={t.tax} />
          <Row label="Service charge" v={t.service} />
          <Row label="Gratuity" v={t.gratuity} />
          <Row label="Delivery fees" v={t.delivery} />
          <Row label="Net takings" v={t.net} bold />
          <div className="text-xs text-muted-foreground pt-1">{voids.length} voided check(s) excluded.</div>
        </Card>

        <Card className="p-4 rounded-2xl space-y-1">
          <div className="text-sm font-semibold mb-1">By payment method</div>
          {Object.entries(t.byMethod).map(([k, v]) => <Row key={k} label={k} v={v} />)}
          <div className="text-sm font-semibold pt-3">By order type</div>
          {Object.entries(t.byType).map(([k, v]) => <Row key={k} label={k} v={v} />)}
        </Card>

        <Card className="p-4 rounded-2xl space-y-1">
          <div className="text-sm font-semibold mb-1">By server</div>
          {Object.entries(byServer).map(([k, v]) => <Row key={k} label={k} v={v} />)}
          <div className="text-sm font-semibold pt-3">Drawers</div>
          {drawers.map((d) => <Row key={d.id} label={`${d.name} (${d.status})`} v={Number(d.variance || 0)} />)}
          {drawers.length === 0 && <p className="text-xs text-muted-foreground">No drawers opened.</p>}
        </Card>
      </div>

      <Card className="p-4 rounded-2xl flex flex-wrap items-center gap-2">
        {closed ? (
          <div className="text-sm flex items-center gap-2"><Lock className="h-4 w-4" /> Day closed at {new Date(closed.closed_at).toLocaleString()} — historical checks remain available in Orders.</div>
        ) : (
          <>
            <Input className="w-64" placeholder="Manager approval name" value={manager} onChange={(e) => setManager(e.target.value)} />
            <Button disabled={busy} onClick={close}>{busy ? "Closing…" : "Close business day"}</Button>
            <span className="text-xs text-muted-foreground">Settled checks have already posted to the ledger; this archives the day and locks the Z-read.</span>
          </>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 rounded-2xl">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

function Row({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm capitalize ${bold ? "font-semibold border-t pt-1" : ""}`}>
      <span>{label}</span><span className="tabular-nums">{fmtMoney(v)}</span>
    </div>
  );
}
