import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import { today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { ExportMenu } from "@/lib/exports";
import { StandaloneReports } from "@/components/industry/StandaloneReports";
import {
  BarChart3, CalendarDays, Download, FileBarChart, FileSpreadsheet, Printer,
  RefreshCw, TrendingUp, UtensilsCrossed, WalletCards, Users2, Clock3, Boxes,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/restaurant/reports")({
  head: () => ({
    meta: [
      { title: "Restaurant Reports — SifoBooks" },
      { name: "description", content: "SifoBooks Restaurant 2026 reporting command centre with branded management, sales, payment, menu, inventory and end-of-day reports." },
    ],
  }),
  component: RestaurantReports,
});

const db: any = supabase;

const REPORTS = [
  { id: "dashboard", title: "Restaurant Performance", group: "Management", icon: BarChart3, description: "Executive dashboard with sales, orders, margin, food cost and customers." },
  { id: "daily-sales", title: "Daily Sales", group: "Sales", icon: FileBarChart, description: "Daily sales, orders, VAT and net takings." },
  { id: "hourly-sales", title: "Hourly Sales", group: "Sales", icon: Clock3, description: "Trading-hour performance and peak service windows." },
  { id: "order-type", title: "Sales by Order Type", group: "Sales", icon: UtensilsCrossed, description: "Dine-in, takeaway, delivery, pickup and other channels." },
  { id: "payments", title: "Payment Methods", group: "Cashier", icon: WalletCards, description: "Cash, card, MTN Money, Airtel Money and other tenders." },
  { id: "menu-items", title: "Top Menu Items", group: "Menu", icon: TrendingUp, description: "Units sold, sales value, cost and gross margin by item." },
  { id: "category", title: "Sales by Category", group: "Menu", icon: FileSpreadsheet, description: "Category contribution to restaurant sales." },
  { id: "cashier", title: "Cashier / Server Sales", group: "Staff", icon: Users2, description: "Sales by server or cashier for accountability." },
  { id: "food-cost", title: "Food Cost & Profitability", group: "Inventory", icon: TrendingUp, description: "Recipe and line cost against selling value." },
  { id: "end-of-day", title: "End of Day / Z-Report", group: "Compliance", icon: FileBarChart, description: "Close-of-day totals, tenders, refunds and exceptions." },
  { id: "stock-reports", title: "Stock & Inventory Reports", group: "Inventory", icon: Boxes, description: "Stock list, movement, usage, valuation, low stock, wastage and recipe costing." },
] as const;

type ReportId = typeof REPORTS[number]["id"];

function RestaurantReports() {
  return <StandaloneReports edition="restaurant" />;
}

/* Legacy report implementation retained below for reference while the standalone workspace is active.
function RestaurantReportsLegacy() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<ReportId>("dashboard");
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    const u = await uid();
    if (!u) return;
    setBusy(true);
    try {
      const { data: os, error } = await db.from("restaurant_orders")
        .select("*").eq("user_id", u)
        .gte("business_date", from).lte("business_date", to)
        .order("opened_at", { ascending: true });
      if (error) {
        toastError(error.message);
        return;
      }
      const rows = os ?? [];
      setOrders(rows);
      const ids = rows.map((o: any) => o.id);
      const [{ data: oi }, { data: ps }, { data: mi }] = await Promise.all([
        ids.length ? db.from("restaurant_order_items").select("*").in("order_id", ids) : Promise.resolve({ data: [] }),
        ids.length ? db.from("restaurant_payments").select("*").in("order_id", ids) : Promise.resolve({ data: [] }),
        db.from("restaurant_menu_items").select("id,name,category").eq("user_id", u),
      ]);
      setItems(oi ?? []);
      setPayments(ps ?? []);
      setMenuItems(mi ?? []);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [from, to]);

  const liveOrders = useMemo(
    () => orders.filter((o) => o.status !== "void" && o.status !== "refunded"),
    [orders],
  );

  const paidOrders = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);

  const totals = useMemo(() => {
    const gross = liveOrders.reduce((s, o) => s + Number(o.subtotal || 0), 0);
    const discount = liveOrders.reduce((s, o) => s + Number(o.discount || 0), 0);
    const tax = liveOrders.reduce((s, o) => s + Number(o.tax || 0), 0);
    const net = liveOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const liveIds = new Set(liveOrders.map((o) => o.id));
    const cost = items.filter((i) => liveIds.has(i.order_id))
      .reduce((s, i) => s + Number(i.unit_cost || 0) * Number(i.qty || 0), 0);
    return { gross, discount, tax, net, cost, margin: net - tax - cost };
  }, [liveOrders, items]);

  const orderType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of liveOrders) {
      const k = String(o.order_type || "Other");
      m[k] = (m[k] || 0) + Number(o.total || 0);
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [liveOrders]);

  const paymentMix = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of payments) {
      const k = String(p.method || "other").toUpperCase();
      m[k] = (m[k] || 0) + Number(p.amount || 0);
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const daily = useMemo(() => {
    const m: Record<string, { sales: number; orders: number }> = {};
    for (const o of liveOrders) {
      const d = String(o.business_date || "").slice(5) || "—";
      if (!m[d]) m[d] = { sales: 0, orders: 0 };
      m[d].sales += Number(o.total || 0);
      m[d].orders += 1;
    }
    return Object.entries(m).map(([name, v]) => ({ name, ...v }));
  }, [liveOrders]);

  const hourly = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of liveOrders) {
      const h = new Date(o.opened_at || o.created_at || Date.now()).getHours();
      const label = `${String(h).padStart(2, "0")}:00`;
      m[label] = (m[label] || 0) + Number(o.total || 0);
    }
    return Array.from({ length: 24 }, (_, h) => {
      const label = `${String(h).padStart(2, "0")}:00`;
      return { name: label, sales: m[label] || 0 };
    });
  }, [liveOrders]);

  const byStaff = useMemo(() => {
    const m: Record<string, { sales: number; orders: number }> = {};
    for (const o of liveOrders) {
      const k = o.server_name || "Unassigned";
      if (!m[k]) m[k] = { sales: 0, orders: 0 };
      m[k].sales += Number(o.total || 0);
      m[k].orders += 1;
    }
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales);
  }, [liveOrders]);

  const menuPerformance = useMemo(() => {
    const m: Record<string, { name: string; category: string; units: number; sales: number; cost: number }> = {};
    const menuMap = new Map(menuItems.map((x) => [x.id, x]));
    for (const i of items) {
      const menu = menuMap.get(i.menu_item_id);
      const name = i.item_name || i.name || menu?.name || "Item";
      if (!m[name]) m[name] = { name, category: menu?.category || i.category || "Uncategorised", units: 0, sales: 0, cost: 0 };
      const qty = Number(i.qty || 0);
      m[name].units += qty;
      m[name].sales += Number(i.price || 0) * qty;
      m[name].cost += Number(i.unit_cost || 0) * qty;
    }
    return Object.values(m)
      .map((x) => ({ ...x, margin: x.sales - x.cost }))
      .filter((x) => !q || x.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.sales - a.sales);
  }, [items, menuItems, q]);

  const categories = useMemo(() => {
    const m: Record<string, number> = {};
    for (const x of menuPerformance) m[x.category] = (m[x.category] || 0) + x.sales;
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [menuPerformance]);

  const exceptions = useMemo(() => ({
    voids: orders.filter((o) => o.status === "void").length,
    refunds: orders.filter((o) => o.status === "refunded").length,
    open: orders.filter((o) => o.status === "open" || o.status === "held").length,
  }), [orders]);

  const selected = REPORTS.find((r) => r.id === report) ?? REPORTS[0];

  const exportRows = useMemo(() => {
    if (report === "menu-items" || report === "food-cost") {
      return menuPerformance.map((x) => ({ Item: x.name, Category: x.category, Units: x.units, Sales: x.sales, Cost: x.cost, "Gross Margin": x.margin }));
    }
    if (report === "payments") return paymentMix.map((x) => ({ Method: x.name, Amount: x.value }));
    if (report === "order-type") return orderType.map((x) => ({ "Order Type": x.name, Sales: x.value }));
    if (report === "cashier") return byStaff.map((x) => ({ Server: x.name, Orders: x.orders, Sales: x.sales }));
    if (report === "hourly-sales") return hourly.map((x) => ({ Hour: x.name, Sales: x.sales }));
    if (report === "daily-sales") return daily.map((x) => ({ Day: x.name, Orders: x.orders, Sales: x.sales }));
    if (report === "category") return categories.map((x) => ({ Category: x.name, Sales: x.value }));
    return [
      { Metric: "Orders", Value: liveOrders.length },
      { Metric: "Gross sales", Value: totals.gross },
      { Metric: "Discounts", Value: totals.discount },
      { Metric: "VAT", Value: totals.tax },
      { Metric: "Net sales", Value: totals.net },
      { Metric: "Cost of sales", Value: totals.cost },
      { Metric: "Gross margin", Value: totals.margin },
      { Metric: "Voids", Value: exceptions.voids },
      { Metric: "Refunds", Value: exceptions.refunds },
      { Metric: "Open checks", Value: exceptions.open },
    ];
  }, [report, menuPerformance, paymentMix, orderType, byStaff, hourly, daily, categories, liveOrders.length, totals, exceptions]);

  return (
    <div className="space-y-5 print:bg-white">
      <section className="rounded-[28px] overflow-hidden bg-[#073b38] text-white shadow-xl print:hidden">
        <div className="p-5 lg:p-7 flex flex-wrap items-end gap-4">
          <div className="mr-auto">
            <div className="flex items-center gap-2 text-[#e5b83f] text-[11px] font-black tracking-[.2em] uppercase">
              <BarChart3 className="h-4 w-4" /> SifoBooks Restaurant 2026
            </div>
            <h1 className="mt-2 text-3xl lg:text-4xl font-black tracking-tight">Reports & Intelligence</h1>
            <p className="mt-1 text-sm text-white/70">Management reports, sales analysis, cashier control and profitability — in one branded workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-[#e5b83f]" />
              <Input type="date" className="h-8 w-36 border-0 bg-transparent p-0 text-white" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <span className="text-xs text-white/60">to</span>
              <Input type="date" className="h-8 w-36 border-0 bg-transparent p-0 text-white" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <Button onClick={() => void load()} disabled={busy} className="h-12 rounded-xl bg-[#e5b83f] px-4 font-black text-[#173b3a] hover:bg-[#f0ca58]">
              <RefreshCw className={cn("mr-2 h-4 w-4", busy && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>
      </section>

      <div className="hidden print:block border-b-2 border-[#073b38] pb-3">
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#087b4b]">SifoBooks Restaurant 2026</div>
        <div className="text-2xl font-black text-[#173b3a]">{selected.title}</div>
        <div className="text-xs text-gray-500">{from} to {to} · Generated {new Date().toLocaleString()}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
        <Card className="rounded-2xl border-[#dbe5e2] bg-white p-3 shadow-sm print:hidden">
          <div className="px-2 pb-2 text-[11px] font-black uppercase tracking-[.18em] text-[#087b4b]">Report centre</div>
          <div className="space-y-1">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              return (
                <button key={r.id} onClick={() => r.id === "stock-reports" ? window.location.assign("/restaurant/stock-reports") : setReport(r.id)}
                  className={cn("w-full rounded-xl p-3 text-left transition", report === r.id ? "bg-[#073b38] text-white shadow-md" : "hover:bg-[#f1f6f4] text-[#173b3a]")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", report === r.id ? "bg-[#e5b83f] text-[#173b3a]" : "bg-[#e5b83f]/15 text-[#087b4b]")}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0"><span className="block text-sm font-bold">{r.title}</span><span className={cn("block text-[10px]", report === r.id ? "text-white/60" : "text-muted-foreground")}>{r.group}</span></span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-[#f4f7f6] p-3 text-xs text-[#5d7370]">
            <b className="text-[#173b3a]">2026 report standard</b><br />
            Emerald + gold branding, clear filters, management KPIs, printable layout and export-ready data.
          </div>
        </Card>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#087b4b]">{selected.group}</div>
              <h2 className="text-2xl font-black text-[#173b3a]">{selected.title}</h2>
              <p className="text-sm text-muted-foreground">{selected.description} · {from} to {to}</p>
            </div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search report data" className="w-52 print:hidden" />
            <Button variant="outline" onClick={downloadCsv(exportRows, report, from, to)}><Download className="mr-2 h-4 w-4" /> CSV</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Kpi label="Total Sales" value={fmtMoney(totals.net)} icon={TrendingUp} />
            <Kpi label="Orders" value={String(liveOrders.length)} icon={FileBarChart} />
            <Kpi label="Avg Order" value={fmtMoney(liveOrders.length ? totals.net / liveOrders.length : 0)} icon={UtensilsCrossed} />
            <Kpi label="Gross Profit" value={fmtMoney(totals.margin)} icon={TrendingUp} />
            <Kpi label="Food Cost" value={totals.net ? `${((totals.cost / totals.net) * 100).toFixed(1)}%` : "0.0%"} icon={FileSpreadsheet} />
            <Kpi label="Customers" value={String(liveOrders.reduce((s, o) => s + Number(o.guests || 1), 0))} icon={Users2} />
          </div>

          {report === "dashboard" && <Dashboard daily={daily} orderType={orderType} paymentMix={paymentMix} menuItems={menuPerformance} totals={totals} />}
          {report === "daily-sales" && <DailyReport data={daily} totals={totals} />}
          {report === "hourly-sales" && <HourlyReport data={hourly} />}
          {report === "order-type" && <OrderTypeReport data={orderType} />}
          {report === "payments" && <PaymentReport data={paymentMix} total={totals.net} />}
          {report === "menu-items" && <MenuReport data={menuPerformance} />}
          {report === "category" && <CategoryReport data={categories} />}
          {report === "cashier" && <StaffReport data={byStaff} />}
          {report === "food-cost" && <FoodCostReport data={menuPerformance} totals={totals} />}
          {report === "end-of-day" && <ZReport totals={totals} paymentMix={paymentMix} exceptions={exceptions} orders={paidOrders.length} />}
        </main>
      </div>
    </div>
  );
}

function downloadCsv(rows: Record<string, any>[], report: string, from: string, to: string) {
  return () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers, ...rows.map((r) => headers.map((h) => r[h]))]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sifobooks-${report}-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
}

function toastError(message: string) {
  console.error(message);
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return <Card className="rounded-2xl border-[#dbe5e2] bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#738682]">{label}</span><Icon className="h-4 w-4 text-[#e5b83f]" /></div>
    <div className="mt-2 text-xl font-black tabular-nums text-[#173b3a]">{value}</div>
  </Card>;
}

function ChartCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <Card className={cn("rounded-2xl border-[#dbe5e2] bg-white p-4 shadow-sm", className)}>
    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black text-[#173b3a]">{title}</h3><span className="h-1 w-8 rounded-full bg-[#e5b83f]" /></div>
    {children}
  </Card>;
}

function Dashboard({ daily, orderType, paymentMix, menuItems, totals }: any) {
  return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title="Sales by Day" className="lg:col-span-2">
      <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `K${Math.round(Number(v) / 1000)}k`} /><Tooltip formatter={(v: any) => fmtMoney(Number(v))} /><Line type="monotone" dataKey="sales" stroke="#07834f" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
    </ChartCard>
    <ChartCard title="Sales by Order Type">
      <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={orderType}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: any) => fmtMoney(Number(v))} /><Bar dataKey="value" fill="#07834f" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>
    </ChartCard>
    <ChartCard title="Payment Methods">
      <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} label>{paymentMix.map((_: any, i: number) => <Cell key={i} fill={i % 2 ? "#e5b83f" : "#07834f"} />)}</Pie><Tooltip formatter={(v: any) => fmtMoney(Number(v))} /></PieChart></ResponsiveContainer></div>
    </ChartCard>
    <ChartCard title="Top Menu Items" className="lg:col-span-2">
      <div className="space-y-2">{menuItems.slice(0, 7).map((x: any, i: number) => <div key={x.name} className="grid grid-cols-[24px_minmax(0,1fr)_100px_100px] items-center gap-2 text-sm"><span className="font-black text-[#e5b83f]">{String(i+1).padStart(2,"0")}</span><span className="font-semibold truncate">{x.name}</span><span className="text-right text-muted-foreground">{x.units} sold</span><span className="text-right font-bold tabular-nums">{fmtMoney(x.sales)}</span></div>)}</div>
    </ChartCard>
    <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
      <MiniReport title="Daily Sales" value={fmtMoney(totals.net)} />
      <MiniReport title="Food Cost" value={totals.net ? `${(totals.cost/totals.net*100).toFixed(1)}%` : "0.0%"} />
      <MiniReport title="Gross Profit" value={fmtMoney(totals.margin)} />
      <MiniReport title="Cost of Sales" value={fmtMoney(totals.cost)} />
    </div>
  </div>;
}

function MiniReport({ title, value }: { title: string; value: string }) {
  return <Card className="rounded-2xl border-[#dbe5e2] bg-[#f8faf9] p-4"><div className="text-xs font-black uppercase tracking-wider text-[#738682]">{title}</div><div className="mt-2 text-xl font-black text-[#173b3a]">{value}</div></Card>;
}

function DailyReport({ data, totals }: any) {
  return <ChartCard title="Daily Sales / X-Report"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-[#f4f7f6] text-left text-[11px] uppercase tracking-wide text-[#58706c]"><th className="p-3">Day</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Sales</th></tr></thead><tbody>{data.map((x:any)=><tr key={x.name} className="border-b last:border-0"><td className="p-3 font-semibold">{x.name}</td><td className="p-3 text-right">{x.orders}</td><td className="p-3 text-right font-bold tabular-nums">{fmtMoney(x.sales)}</td></tr>)}</tbody><tfoot><tr className="bg-[#073b38] text-white font-black"><td className="p-3">TOTAL</td><td className="p-3 text-right">{data.reduce((s:number,x:any)=>s+x.orders,0)}</td><td className="p-3 text-right">{fmtMoney(totals.net)}</td></tr></tfoot></table></div></ChartCard>;
}

function HourlyReport({ data }: any) {
  return <ChartCard title="Hourly Sales Heatmap / Best Trading Hours"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={1} /><YAxis /><Tooltip formatter={(v:any)=>fmtMoney(Number(v))}/><Bar dataKey="sales" fill="#07834f" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></ChartCard>;
}

function OrderTypeReport({ data }: any) {
  return <ChartCard title="Sales by Order Type"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-[#f4f7f6] text-[11px] uppercase"><th className="p-3 text-left">Order Type</th><th className="p-3 text-right">Sales</th></tr></thead><tbody>{data.map((x:any)=><tr key={x.name} className="border-b"><td className="p-3 font-semibold">{x.name}</td><td className="p-3 text-right font-bold">{fmtMoney(x.value)}</td></tr>)}</tbody></table></div></ChartCard>;
}

function PaymentReport({ data, total }: any) {
  return <ChartCard title="Payment Methods"><div className="grid gap-3 sm:grid-cols-2">{data.map((x:any)=><div key={x.name} className="rounded-xl border p-4"><div className="text-xs font-black uppercase text-[#738682]">{x.name}</div><div className="mt-1 text-xl font-black text-[#173b3a]">{fmtMoney(x.value)}</div><div className="mt-2 h-2 rounded-full bg-[#edf2f0]"><div className="h-2 rounded-full bg-[#07834f]" style={{ width: `${total ? Math.min(100, x.value / total * 100) : 0}%` }} /></div><div className="mt-1 text-xs text-muted-foreground">{total ? (x.value/total*100).toFixed(1) : "0.0"}%</div></div>)}</div></ChartCard>;
}

function MenuReport({ data }: any) {
  return <ChartCard title="Top Menu Items / Menu Performance"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-[#f4f7f6] text-[11px] uppercase"><th className="p-3 text-left">Item</th><th className="p-3 text-left">Category</th><th className="p-3 text-right">Units</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Gross Margin</th></tr></thead><tbody>{data.map((x:any)=><tr key={x.name} className="border-b"><td className="p-3 font-semibold">{x.name}</td><td className="p-3">{x.category}</td><td className="p-3 text-right">{x.units}</td><td className="p-3 text-right">{fmtMoney(x.sales)}</td><td className="p-3 text-right">{fmtMoney(x.cost)}</td><td className="p-3 text-right font-bold text-[#087b4b]">{fmtMoney(x.margin)}</td></tr>)}</tbody></table></div></ChartCard>;
}

function CategoryReport({ data }: any) {
  return <ChartCard title="Sales by Category"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="name" width={100}/><Tooltip formatter={(v:any)=>fmtMoney(Number(v))}/><Bar dataKey="value" fill="#e5b83f" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div></ChartCard>;
}

function StaffReport({ data }: any) {
  return <ChartCard title="Cashier / Waiter / Server Sales"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-[#f4f7f6] text-[11px] uppercase"><th className="p-3 text-left">Staff</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Sales</th></tr></thead><tbody>{data.map((x:any)=><tr key={x.name} className="border-b"><td className="p-3 font-semibold">{x.name}</td><td className="p-3 text-right">{x.orders}</td><td className="p-3 text-right font-bold">{fmtMoney(x.sales)}</td></tr>)}</tbody></table></div></ChartCard>;
}

function FoodCostReport({ data, totals }: any) {
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><MiniReport title="Cost of Sales" value={fmtMoney(totals.cost)} /><MiniReport title="Net Sales" value={fmtMoney(totals.net)} /><MiniReport title="Food Cost %" value={totals.net ? `${(totals.cost/totals.net*100).toFixed(1)}%` : "0.0%"} /></div><MenuReport data={data} /></div>;
}

function ZReport({ totals, paymentMix, exceptions, orders }: any) {
  return <div className="space-y-4"><ChartCard title="SifoBooks Z-Report / End of Day"><div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-[#073b38] p-5 text-white"><div className="text-xs uppercase tracking-wider text-white/60">Net takings</div><div className="mt-1 text-3xl font-black">{fmtMoney(totals.net)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>Paid orders</span><b className="text-right">{orders}</b><span>VAT</span><b className="text-right">{fmtMoney(totals.tax)}</b><span>Cost of sales</span><b className="text-right">{fmtMoney(totals.cost)}</b><span>Gross profit</span><b className="text-right text-[#e5b83f]">{fmtMoney(totals.margin)}</b></div></div><div className="rounded-xl border p-5"><div className="text-sm font-black">Tender reconciliation</div>{paymentMix.map((x:any)=><div key={x.name} className="mt-2 flex justify-between text-sm"><span>{x.name}</span><b>{fmtMoney(x.value)}</b></div>)}</div></div></ChartCard><div className="grid gap-3 sm:grid-cols-3"><MiniReport title="Voids" value={String(exceptions.voids)} /><MiniReport title="Refunds" value={String(exceptions.refunds)} /><MiniReport title="Open Checks" value={String(exceptions.open)} /></div></div>;
}
