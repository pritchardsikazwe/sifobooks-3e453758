import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { ensureStandaloneDemo } from "@/lib/standalone-demo";
import { StandaloneReports } from "@/components/industry/StandaloneReports";
import { SifoStandaloneFrame } from "@/components/sifo/SifoStandaloneFrame";
import { summarise, today } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UtensilsCrossed, LayoutGrid, CalendarClock, ChefHat, BookOpen, Boxes, Users,
  Banknote, BarChart3, Wallet, TrendingUp, Receipt, AlertTriangle, Timer, Settings, ShieldCheck, Printer,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/")({
  head: () => ({
    meta: [
      { title: "Restaurant Command Centre — SifoBooks" },
      { name: "description", content: "Live restaurant dashboard: today's sales, open checks, tables occupied, kitchen queue, reservations and cash position." },
      { property: "og:title", content: "Restaurant Command Centre — SifoBooks" },
      { property: "og:description", content: "Track service in real time and post every sale straight to your books." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const db: any = supabase;

const QUICK = [
  { to: "/restaurant/pos", label: "Open POS", icon: UtensilsCrossed },
  { to: "/restaurant/tables", label: "Tables", icon: LayoutGrid },
  { to: "/restaurant/reservations", label: "Reservations", icon: CalendarClock },
  { to: "/restaurant/kitchen", label: "Kitchen", icon: ChefHat },
  { to: "/restaurant/menu", label: "Menu", icon: BookOpen },
  { to: "/stock", label: "Inventory", icon: Boxes },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/restaurant/cash", label: "Cash", icon: Banknote },
  { to: "/restaurant/reports", label: "Reports", icon: BarChart3 },
  { to: "/dashboard", label: "Accounting", icon: Wallet },
  { to: "/manager/cashiers", label: "Cashiers", icon: Users },
  { to: "/printing-settings", label: "Printing", icon: Receipt },
  { to: "/restaurant/settings", label: "Restaurant settings", icon: Settings },
] as { to: string; label: string; icon: any }[];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setLoading(false);
      const uid = u.user.id;
      void ensureStandaloneDemo("restaurant").catch((e) => console.error("[standalone-demo:restaurant]", e));
      const [o, t, r, d, s, l, b] = await Promise.all([
        db.from("restaurant_orders").select("*").eq("user_id", uid).eq("business_date", today()),
        db.from("restaurant_tables").select("*").eq("user_id", uid).order("name"),
        db.from("restaurant_reservations").select("*").eq("user_id", uid).eq("reserved_date", today()).order("reserved_time"),
        db.from("restaurant_cash_drawers").select("*").eq("user_id", uid).eq("status", "open"),
        db.from("stock_items").select("*").eq("user_id", uid),
        db.from("inventory_locations").select("id,name,location_type").eq("user_id", uid).eq("is_active", true).order("name"),
        db.from("stock_balances").select("item_id,location_id,quantity").eq("user_id", uid),
      ]);
      const os = o.data ?? [];
      setOrders(os);
      setTables(t.data ?? []);
      setReservations(r.data ?? []);
      setDrawers(d.data ?? []);
      setLowStock((s.data ?? []).filter((x: any) => Number(x.quantity_on_hand) <= Number(x.reorder_level ?? 0)));
      setLocations(l.data ?? []); setBalances(b.data ?? []);
      if (os.length) {
        const { data: oi } = await db.from("restaurant_order_items").select("*").in("order_id", os.map((x: any) => x.id));
        setItems(oi ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const t = useMemo(() => summarise(orders), [orders]);
  const open = orders.filter((o) => o.status === "open" || o.status === "held");
  const occupied = tables.filter((x) => (x.status || "").toLowerCase() === "occupied");
  const kitchenQueue = items.filter((i) => i.kds_status === "queued" || i.kds_status === "cooking");
  const delivery = orders.filter((o) => o.order_type === "DELIVERY");
  const avgTicket = t.orders ? t.net / t.orders : 0;
  const stockValue = lowStock.reduce((s, x) => s + Number(x.quantity_on_hand || 0) * Number(x.cost_price || 0), 0);
  const cashPosition = drawers.reduce(
    (s, d) => s + Number(d.opening_float || 0) + Number(d.cash_sales || 0) - Number(d.cash_payouts || 0) - Number(d.cash_drops || 0),
    0,
  );

  const byHour = useMemo(() => {
    const m = new Map<number, number>();
    orders.filter((o) => o.status !== "void").forEach((o) => {
      const h = new Date(o.opened_at).getHours();
      m.set(h, (m.get(h) ?? 0) + Number(o.total || 0));
    });
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [orders]);
  const peak = Math.max(1, ...byHour.map(([, v]) => v));

  const topItems = useMemo(() => {
    const m = new Map<string, { qty: number; value: number }>();
    items.forEach((i) => {
      const e = m.get(i.item_name) ?? { qty: 0, value: 0 };
      e.qty += Number(i.qty || 0);
      e.value += Number(i.qty || 0) * Number(i.price || 0);
      m.set(i.item_name, e);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].value - a[1].value).slice(0, 6);
  }, [items]);

  const alerts: { tone: string; text: string }[] = [];
  if (kitchenQueue.length > 8) alerts.push({ tone: "warning", text: `${kitchenQueue.length} items waiting in the kitchen` });
  if (lowStock.length) alerts.push({ tone: "warning", text: `${lowStock.length} ingredient(s) at or below reorder level` });
  if (!drawers.length) alerts.push({ tone: "info", text: "No cash drawer is open for today" });
  open.forEach((o) => {
    const mins = (Date.now() - new Date(o.opened_at).getTime()) / 60000;
    if (mins > 90) alerts.push({ tone: "danger", text: `Check ${o.order_no} has been open ${Math.round(mins)} minutes` });
  });

  if (loading) {
    return <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }

  const kpis = [
    { label: "Today's sales", value: fmtMoney(t.net), icon: TrendingUp },
    { label: "Orders", value: String(t.orders), icon: Receipt },
    { label: "Average ticket", value: fmtMoney(avgTicket), icon: BarChart3 },
    { label: "Tables occupied", value: `${occupied.length}/${tables.length}`, icon: LayoutGrid },
    { label: "Open checks", value: String(open.length), icon: UtensilsCrossed },
    { label: "Kitchen queue", value: String(kitchenQueue.length), icon: ChefHat },
    { label: "Delivery orders", value: String(delivery.length), icon: Timer },
    { label: "Cash position", value: fmtMoney(cashPosition), icon: Banknote },
    { label: "Low-stock value", value: fmtMoney(stockValue), icon: Boxes },
  ];

  return (
    <SifoStandaloneFrame product="Restaurant" title="Restaurant Operations Centre" subtitle="POS, tables, kitchen, reservations, cash, stock and service control in one dedicated workspace." nav={[{label:"Dashboard",to:"/restaurant",active:true},{label:"Restaurant POS",to:"/restaurant/pos"},{label:"Tables",to:"/restaurant/tables"},{label:"Kitchen",to:"/restaurant/kitchen"},{label:"Menu",to:"/restaurant/menu"},{label:"Reservations",to:"/restaurant/reservations"},{label:"Inventory",to:"/stock"},{label:"Stock Transfers",to:"/inventory/transfers"},{label:"Reports",to:"/restaurant/reports"}]} actions={<Link to="/restaurant/pos" className="inline-flex h-10 items-center rounded-xl bg-[#07834F] px-4 text-sm font-bold text-white">Open POS</Link>}>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Restaurant command centre</h1>
        <p className="text-sm text-muted-foreground">Live service today — every settled check posts to your ledger automatically.</p>
      </div>

      <Card className="rounded-2xl border-[#cfe0db] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[.16em] text-[#07834f]">Manager controls</div>
            <div className="text-sm text-muted-foreground">Run the restaurant from one place — people, stock, tills, printing and close-of-day.</div>
          </div>
          {[
            ["/manager/cashiers", "Cashiers", Users],
            ["/stock", "Stock", Boxes],
            ["/printing-settings", "Printing", Printer],
            ["/restaurant/end-of-day", "Close day", ShieldCheck],
            ["/restaurant/settings", "Settings", Settings],
            ["/admin", "Administration", ShieldCheck],
          ].map(([to, label, Icon]: any) => (
            <Link key={String(to)} to={to as never} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d7e4e0] bg-[#f7faf8] px-3 text-xs font-bold text-[#173b3a] hover:border-[#07834f] hover:bg-[#edf7f2]">
              <Icon className="h-4 w-4 text-[#07834f]" /> {label}
            </Link>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border-[#cfe0db] bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-2"><div className="mr-auto"><div className="text-sm font-semibold">Restaurant stock network</div><div className="text-xs text-muted-foreground">Warehouse → stores → kitchen/bar/branch POS. Quantities are location-specific.</div></div><Link to="/inventory/locations" className="rounded-lg border px-3 py-2 text-xs font-bold">Locations</Link><Link to="/inventory/transfers" className="rounded-lg border px-3 py-2 text-xs font-bold">Transfers</Link><Link to="/stock" className="rounded-lg border px-3 py-2 text-xs font-bold">Item master</Link></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{locations.map((l:any) => { const mine=balances.filter((b:any)=>b.location_id===l.id); const units=mine.reduce((n:number,b:any)=>n+Number(b.quantity||0),0); const skus=mine.filter((b:any)=>Number(b.quantity||0)>0).length; return <div key={l.id} className="rounded-xl border bg-[#f7faf8] p-3"><div className="text-xs font-black uppercase text-[#07834f]">{l.location_type}</div><div className="font-semibold">{l.name}</div><div className="mt-1 text-xs text-muted-foreground">{skus} items · {units} units</div></div>; })}{!locations.length && <div className="text-xs text-muted-foreground">Create warehouse/POS/kitchen locations in Inventory → Locations.</div>}</div></Card>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 rounded-2xl border-border/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
              {k.label}
              <k.icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xl font-semibold tabular-nums">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {QUICK.map((q) => (
          <Link key={q.label} to={q.to as never} className="group">
            <Card className="p-4 rounded-2xl flex items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all">
              <span className="rounded-xl bg-primary/10 text-primary p-2 group-hover:scale-105 transition-transform">
                <q.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{q.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 rounded-2xl lg:col-span-2">
          <div className="text-sm font-semibold mb-3">Sales by hour</div>
          {byHour.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales recorded yet today.</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {byHour.map(([h, v]) => (
                <div key={h} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-primary/70 transition-all" style={{ height: `${(v / peak) * 100}%` }} title={fmtMoney(v)} />
                  <span className="text-[10px] text-muted-foreground">{h}:00</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 rounded-2xl">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Operational alerts
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">All clear — no delays, stock or cash issues.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {alerts.slice(0, 6).map((a, i) => <li key={i} className="rounded-lg border px-3 py-2">{a.text}</li>)}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 rounded-2xl">
          <div className="text-sm font-semibold mb-3">Live orders</div>
          {open.length === 0 ? <p className="text-sm text-muted-foreground">No open checks.</p> : (
            <ul className="space-y-2 text-sm">
              {open.slice(0, 8).map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>{o.order_no} · {o.order_type}</span>
                  <span className="tabular-nums">{fmtMoney(Number(o.total))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 rounded-2xl">
          <div className="text-sm font-semibold mb-3">Top selling items</div>
          {topItems.length === 0 ? <p className="text-sm text-muted-foreground">Nothing sold yet today.</p> : (
            <ul className="space-y-2 text-sm">
              {topItems.map(([name, v]) => (
                <li key={name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="truncate">{name} <span className="text-muted-foreground">×{v.qty}</span></span>
                  <span className="tabular-nums">{fmtMoney(v.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 rounded-2xl">
          <div className="text-sm font-semibold mb-3">Reservations today</div>
          {reservations.length === 0 ? <p className="text-sm text-muted-foreground">No reservations booked.</p> : (
            <ul className="space-y-2 text-sm">
              {reservations.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>{String(r.reserved_time).slice(0, 5)} · {r.guest_name}</span>
                  <span className="text-muted-foreground">{r.guests} guests</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 rounded-2xl">
          <div className="text-sm font-semibold mb-3">Sales by order type</div>
          <ul className="space-y-2 text-sm">
            {Object.entries(t.byType).length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            {Object.entries(t.byType).map(([k, v]) => (
              <li key={k} className="flex justify-between rounded-lg border px-3 py-2"><span>{k}</span><span className="tabular-nums">{fmtMoney(v)}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="p-4 rounded-2xl">
          <div className="text-sm font-semibold mb-3">Payment methods</div>
          <ul className="space-y-2 text-sm">
            {Object.entries(t.byMethod).length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            {Object.entries(t.byMethod).map(([k, v]) => (
              <li key={k} className="flex justify-between rounded-lg border px-3 py-2"><span className="capitalize">{k}</span><span className="tabular-nums">{fmtMoney(v)}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
    </SifoStandaloneFrame>
  );
}
