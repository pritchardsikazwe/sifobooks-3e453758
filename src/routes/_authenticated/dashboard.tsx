import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Landmark, Receipt, Users, FileText, Package, CreditCard,
  ShoppingCart, PiggyBank, ArrowUpRight, ArrowDownRight, Banknote, BookText, Truck, Boxes, ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

type Txn = { id: string; txn_date: string; description: string; amount: number; reference: string | null; category: string | null };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function DashboardPage() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("Good day");
  const [firstName, setFirstName] = useState("");
  const [currency, setCurrency] = useState("ZMW");
  const [companyName, setCompanyName] = useState("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [stockValue, setStockValue] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [receivables, setReceivables] = useState(0);
  const [payables, setPayables] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: prof }, { data: comp }, { data: tx }, { data: stk },
             { count: custCount }, { count: suppCount }, { data: invs }, { data: bills }] = await Promise.all([
        supabase.from("profiles").select("full_name, onboarded").eq("id", u.user.id).maybeSingle(),
        supabase.from("companies").select("name, trading_name, base_currency").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("bank_transactions").select("id, txn_date, description, amount, reference, category").order("txn_date", { ascending: false }).limit(1000),
        supabase.from("stock_items").select("quantity_on_hand, sell_price"),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("total, balance_due, status"),
        supabase.from("bills").select("total, balance_due, status"),
      ]);
      if (!prof?.onboarded) { navigate({ to: "/onboarding" }); return; }
      setFirstName((prof?.full_name || u.user.email || "").split(" ")[0].split("@")[0]);
      if (comp) { setCurrency(comp.base_currency || "ZMW"); setCompanyName(comp.trading_name || comp.name); }
      setTxns((tx ?? []) as Txn[]);
      setStockValue((stk ?? []).reduce((s, x: any) => s + Number(x.quantity_on_hand || 0) * Number(x.sell_price || 0), 0));
      setCustomerCount(custCount ?? 0);
      setSupplierCount(suppCount ?? 0);
      setInvoiceCount((invs ?? []).length);
      setReceivables((invs ?? []).reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0));
      setPayables((bills ?? []).reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0));
      setLoading(false);
    })();
  }, [navigate]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthTx = txns.filter(t => t.txn_date >= monthStart);
    const revenue = monthTx.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
    const expenses = monthTx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const netProfit = revenue - expenses;
    const cashAtBank = txns.reduce((s, t) => s + Number(t.amount), 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lm = txns.filter(t => { const d = new Date(t.txn_date); return d >= lastMonthStart && d <= lastMonthEnd; });
    const lmRev = lm.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
    const lmExp = lm.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const pct = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / prev) * 100;
    return { revenue, expenses, netProfit, cashAtBank,
      revDelta: pct(revenue, lmRev), expDelta: pct(expenses, lmExp),
      netDelta: pct(netProfit, lmRev - lmExp) };
  }, [txns]);

  const monthlySeries = useMemo(() => {
    const now = new Date();
    const arr = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], income: 0, expenses: 0, net: 0 };
    });
    const map = new Map(arr.map(a => [a.key, a]));
    txns.forEach(t => {
      const d = new Date(t.txn_date); const k = `${d.getFullYear()}-${d.getMonth()}`;
      const b = map.get(k); if (!b) return;
      if (t.amount > 0) b.income += Number(t.amount); else b.expenses += Math.abs(Number(t.amount));
    });
    arr.forEach(a => { a.net = a.income - a.expenses; });
    return arr;
  }, [txns]);

  const cashFlowSeries = useMemo(() => {
    let bal = 0;
    return monthlySeries.map(m => { bal += m.net; return { label: m.label, balance: bal, in: m.income, out: m.expenses }; });
  }, [monthlySeries]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    txns.filter(t => t.amount > 0).forEach(t => {
      const k = t.category || "Uncategorized";
      map.set(k, (map.get(k) || 0) + Number(t.amount));
    });
    return Array.from(map.entries()).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [txns]);

  const money = (n: number) => fmtMoney(n, currency);
  const recent = txns.slice(0, 8);

  const dateLabel = new Date().toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">
              {greeting}, <span className="text-primary">{firstName || "there"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {companyName || "SifoBooks"} · {dateLabel}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-border"><Link to="/reports">Reports</Link></Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground"><Link to="/invoices/new">New invoice</Link></Button>
          </div>
        </motion.div>

        {/* KPI grid — compact professional cards with sparklines */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Revenue MTD" value={money(stats.revenue)} delta={stats.revDelta} icon={TrendingUp} series={monthlySeries.map(m => m.income)} positive to="/reports/pnl" />
          <Kpi label="Expenses MTD" value={money(stats.expenses)} delta={stats.expDelta} icon={Receipt} series={monthlySeries.map(m => m.expenses)} positive={false} to="/expenses" />
          <Kpi label="Net Profit MTD" value={money(stats.netProfit)} delta={stats.netDelta} icon={PiggyBank} series={monthlySeries.map(m => m.net)} positive={stats.netProfit >= 0} to="/reports/pnl" />
          <Kpi label="Cash at Bank" value={money(stats.cashAtBank)} delta={null} icon={Landmark} series={cashFlowSeries.map(c => c.balance)} positive={stats.cashAtBank >= 0} to="/banking" />
          <Kpi label="Receivables" value={money(receivables)} delta={null} icon={ArrowUpRight} series={[]} to="/reports/aged-receivables" />
          <Kpi label="Payables" value={money(payables)} delta={null} icon={ArrowDownRight} series={[]} to="/reports/aged-payables" />
          <Kpi label="Outstanding Invoices" value={String(invoiceCount)} delta={null} icon={FileText} series={[]} to="/invoices" />
          <Kpi label="Inventory value" value={money(stockValue)} delta={null} icon={Package} series={[]} to="/stock" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Panel className="lg:col-span-5" title="Sales by Month" subtitle="Last 12 months">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySeries}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary-rgb, 0 0 0))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--primary-rgb, 0 0 0))" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Bar dataKey="income" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel className="lg:col-span-4" title="Income vs Expenses" subtitle="12-month trend">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="income" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel className="lg:col-span-3" title="Cash Flow" subtitle="Cumulative">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashFlowSeries}>
                <defs>
                  <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Area type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#gCash)" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Panel className="lg:col-span-4" title="Revenue Categories" subtitle="Top 5">
            {categoryData.length === 0 ? (
              <EmptyState label="No categorised income yet" />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel className="lg:col-span-4" title="Quick Actions" subtitle="Post transactions">
            <div className="grid grid-cols-2 gap-2">
              <QuickTile to="/invoices/new" icon={FileText} label="Invoice" />
              <QuickTile to="/quotes/new" icon={ClipboardList} label="Quote" />
              <QuickTile to="/receipts" icon={CreditCard} label="Receipt" />
              <QuickTile to="/expenses" icon={Receipt} label="Expense" />
              <QuickTile to="/bills" icon={FileText} label="Bill" />
              <QuickTile to="/purchase-orders" icon={ShoppingCart} label="PO" />
              <QuickTile to="/banking" icon={Landmark} label="Deposit" />
              <QuickTile to="/journal-entries" icon={BookText} label="Journal" />
            </div>
          </Panel>

          <Panel className="lg:col-span-4" title="Snapshot" subtitle="Key modules">
            <div className="space-y-1">
              <Row icon={Landmark} label="Banking" value={money(stats.cashAtBank)} to="/banking" />
              <Row icon={ArrowUpRight} label="Receivables" value={money(receivables)} to="/reports/aged-receivables" />
              <Row icon={ArrowDownRight} label="Payables" value={money(payables)} to="/reports/aged-payables" />
              <Row icon={Boxes} label="Inventory" value={money(stockValue)} to="/stock" />
              <Row icon={Banknote} label="Payroll" value="Manage" to="/payroll" />
              <Row icon={Truck} label="Suppliers" value={String(supplierCount)} to="/suppliers" />
              <Row icon={Wallet} label="Invoices" value={String(invoiceCount)} to="/invoices" />
            </div>
          </Panel>
        </div>

        {/* Recent activity */}
        <Panel title="Recent Activity" subtitle="Latest bank transactions" action={<Link to="/banking" className="text-xs text-primary hover:underline font-semibold">View all →</Link>}>
          {loading ? <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          : recent.length === 0 ? <EmptyState label="No transactions yet. Import a bank statement to get started." cta="Import statement" to="/banking" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-widest text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-3 font-semibold">Date</th>
                    <th className="text-left py-2 pr-3 font-semibold">Description</th>
                    <th className="text-left py-2 pr-3 font-semibold">Reference</th>
                    <th className="text-left py-2 pr-3 font-semibold">Category</th>
                    <th className="text-right py-2 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(t => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">{new Date(t.txn_date).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}</td>
                      <td className="py-2.5 pr-3 font-medium truncate max-w-xs">{t.description}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{t.reference || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{t.category || "—"}</td>
                      <td className={cn("py-2.5 text-right font-semibold whitespace-nowrap num", t.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {t.amount >= 0 ? "+" : "-"}{money(Math.abs(t.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

const DONUT_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e"];
const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

function Kpi({ label, value, delta, icon: Icon, series, positive = true, to }: {
  label: string; value: string; delta: number | null; icon: any; series: number[]; positive?: boolean; to?: string;
}) {
  const up = delta != null && delta >= 0;
  const good = positive ? up : !up;
  const content = (
    <div className="group relative rounded-lg border border-border bg-card p-3.5 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</div>
          <div className="mt-1 text-lg sm:text-xl font-bold text-foreground num truncate">{value}</div>
        </div>
        <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {delta != null ? (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded",
            good ? "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10"
                 : "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10",
          )}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : <span />}
        {series.length > 1 && <Sparkline data={series} positive={good} />}
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 60, h = 20;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        fill="none"
        stroke={positive ? "var(--color-primary)" : "#f43f5e"}
        strokeWidth={1.5}
        points={points}
      />
    </svg>
  );
}

function Panel({ children, title, subtitle, action, className }: { children: React.ReactNode; title?: string; subtitle?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-3">
          <div>
            {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
            {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function QuickTile({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2 rounded-md border border-border bg-card hover:bg-primary/5 hover:border-primary/30 px-3 py-2.5 transition-all">
      <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center text-primary shrink-0 group-hover:scale-105 transition-transform">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Link>
  );
}

function Row({ icon: Icon, label, value, to }: { icon: any; label: string; value: string; to: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-muted-foreground num">{value}</span>
    </Link>
  );
}

function EmptyState({ label, cta, to }: { label: string; cta?: string; to?: string }) {
  return (
    <div className="py-8 text-center">
      <div className="text-sm text-muted-foreground">{label}</div>
      {cta && to && (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link to={to}>{cta}</Link>
        </Button>
      )}
    </div>
  );
}
