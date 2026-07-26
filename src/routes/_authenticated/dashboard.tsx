import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Wallet, Landmark, Receipt, Users, FileText, Package, CreditCard,
  ShoppingCart, PiggyBank, ArrowUpRight, ArrowDownRight, Banknote, BookText, Truck, Boxes, ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";

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

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Greeting header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {greeting}, <span className="text-emerald-700">{firstName || "there"}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {companyName || "SifoBooks"} · {new Date().toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-slate-300"><Link to="/reports">Reports</Link></Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white"><Link to="/invoices/new">New invoice</Link></Button>
          </div>
        </motion.div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Kpi delay={0.00} label="Revenue MTD" value={money(stats.revenue)} delta={stats.revDelta} icon={TrendingUp} tint="emerald" />
          <Kpi delay={0.05} label="Expenses MTD" value={money(stats.expenses)} delta={stats.expDelta} icon={Receipt} tint="rose" invert />
          <Kpi delay={0.10} label="Net Profit MTD" value={money(stats.netProfit)} delta={stats.netDelta} icon={PiggyBank} tint="indigo" />
          <Kpi delay={0.15} label="Cash at Bank" value={money(stats.cashAtBank)} delta={null} icon={Landmark} tint="sky" />
          <Kpi delay={0.20} label="Receivables" value={money(receivables)} delta={null} icon={ArrowUpRight} tint="amber" />
          <Kpi delay={0.25} label="Payables" value={money(payables)} delta={null} icon={ArrowDownRight} tint="fuchsia" invert />
          <Kpi delay={0.30} label="Customers" value={String(customerCount)} delta={null} icon={Users} tint="cyan" />
          <Kpi delay={0.35} label="Inventory value" value={money(stockValue)} delta={null} icon={Package} tint="lime" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Panel className="lg:col-span-5" title="Sales by Month" subtitle="Last 12 months">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySeries}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Bar dataKey="income" fill="url(#gRev)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel className="lg:col-span-4" title="Income vs Expenses" subtitle="12-month trend">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#475569" }} />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel className="lg:col-span-3" title="Cash Flow" subtitle="Cumulative">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashFlowSeries}>
                <defs>
                  <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Area type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gCash)" />
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
                  <Legend wrapperStyle={{ fontSize: 11, color: "#475569" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel className="lg:col-span-4" title="Quick Actions" subtitle="Post transactions">
            <div className="grid grid-cols-2 gap-2">
              <QuickTile to="/invoices/new" icon={FileText} label="Invoice" tint="emerald" />
              <QuickTile to="/quotes/new" icon={ClipboardList} label="Quote" tint="sky" />
              <QuickTile to="/receipts" icon={CreditCard} label="Receipt" tint="indigo" />
              <QuickTile to="/expenses" icon={Receipt} label="Expense" tint="rose" />
              <QuickTile to="/bills" icon={FileText} label="Bill" tint="amber" />
              <QuickTile to="/purchase-orders" icon={ShoppingCart} label="PO" tint="fuchsia" />
              <QuickTile to="/banking" icon={Landmark} label="Deposit" tint="cyan" />
              <QuickTile to="/journal-entries" icon={BookText} label="Journal" tint="lime" />
            </div>
          </Panel>

          <Panel className="lg:col-span-4" title="Modules" subtitle="Snapshot">
            <div className="space-y-1">
              <Row icon={Landmark} label="Banking" value={money(stats.cashAtBank)} to="/banking" tint="sky" />
              <Row icon={ArrowUpRight} label="Receivables" value={money(receivables)} to="/reports/aged-receivables" tint="amber" />
              <Row icon={ArrowDownRight} label="Payables" value={money(payables)} to="/reports/aged-payables" tint="rose" />
              <Row icon={Boxes} label="Inventory" value={money(stockValue)} to="/stock" tint="lime" />
              <Row icon={Banknote} label="Payroll" value="Manage" to="/payroll" tint="indigo" />
              <Row icon={Truck} label="Suppliers" value={String(supplierCount)} to="/suppliers" tint="fuchsia" />
              <Row icon={Wallet} label="Invoices" value={String(invoiceCount)} to="/invoices" tint="emerald" />
            </div>
          </Panel>
        </div>

        {/* Recent activity */}
        <Panel title="Recent Activity" subtitle="Latest bank transactions" action={<Link to="/banking" className="text-xs text-emerald-700 hover:underline font-semibold">View all →</Link>}>
          {loading ? <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
          : recent.length === 0 ? <EmptyState label="No transactions yet. Import a bank statement to get started." cta="Import statement" to="/banking" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <tr><th className="text-left py-2 pr-3 font-semibold">Date</th><th className="text-left py-2 pr-3 font-semibold">Description</th><th className="text-left py-2 pr-3 font-semibold">Reference</th><th className="text-left py-2 pr-3 font-semibold">Category</th><th className="text-right py-2 font-semibold">Amount</th></tr>
                </thead>
                <tbody>
                  {recent.map(t => (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{new Date(t.txn_date).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}</td>
                      <td className="py-2.5 pr-3 font-medium text-slate-800 truncate max-w-xs">{t.description}</td>
                      <td className="py-2.5 pr-3 text-slate-400 text-xs">{t.reference || "—"}</td>
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">{t.category || "—"}</td>
                      <td className={`py-2.5 text-right font-semibold whitespace-nowrap ${t.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{t.amount >= 0 ? "+" : "-"}{money(Math.abs(t.amount))}</td>
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
const tooltipStyle = { background: "white", border: "1px solid rgb(226,232,240)", borderRadius: 8, color: "#0f172a", fontSize: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" };

const TINTS: Record<string, { icon: string; ring: string; delta: string }> = {
  emerald: { icon: "bg-emerald-50 text-emerald-600", ring: "ring-emerald-100", delta: "text-emerald-700 bg-emerald-50" },
  rose:    { icon: "bg-rose-50 text-rose-600",       ring: "ring-rose-100",    delta: "text-rose-700 bg-rose-50" },
  indigo:  { icon: "bg-indigo-50 text-indigo-600",   ring: "ring-indigo-100",  delta: "text-indigo-700 bg-indigo-50" },
  sky:     { icon: "bg-sky-50 text-sky-600",         ring: "ring-sky-100",     delta: "text-sky-700 bg-sky-50" },
  amber:   { icon: "bg-amber-50 text-amber-600",     ring: "ring-amber-100",   delta: "text-amber-700 bg-amber-50" },
  fuchsia: { icon: "bg-fuchsia-50 text-fuchsia-600", ring: "ring-fuchsia-100", delta: "text-fuchsia-700 bg-fuchsia-50" },
  cyan:    { icon: "bg-cyan-50 text-cyan-600",       ring: "ring-cyan-100",    delta: "text-cyan-700 bg-cyan-50" },
  lime:    { icon: "bg-lime-50 text-lime-700",       ring: "ring-lime-100",    delta: "text-lime-700 bg-lime-50" },
};

function Kpi({ label, value, delta, icon: Icon, tint, invert, delay = 0 }: { label: string; value: string; delta: number | null; icon: any; tint: keyof typeof TINTS; invert?: boolean; delay?: number }) {
  const t = TINTS[tint];
  const up = delta != null && delta >= 0;
  const good = invert ? !up : up;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={`relative rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow ring-1 ${t.ring}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</span>
        <div className={`h-8 w-8 grid place-items-center rounded-lg ${t.icon}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 text-xl sm:text-2xl font-bold text-slate-900 truncate">{value}</div>
      {delta !== null && (
        <div className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${good ? t.delta : "bg-slate-100 text-slate-600"}`}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}% <span className="text-slate-500 font-normal">vs last mo</span>
        </div>
      )}
    </motion.div>
  );
}

function Panel({ children, className = "", title, subtitle, action }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-md transition-shadow h-full">
        {title && (
          <div className="flex items-start justify-between p-4 pb-2">
            <div>
              <div className="text-sm font-bold text-slate-900">{title}</div>
              {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
            </div>
            {action}
          </div>
        )}
        <div className="p-4 pt-2">{children}</div>
      </Card>
    </motion.div>
  );
}

function QuickTile({ to, icon: Icon, label, tint }: { to: string; icon: any; label: string; tint: keyof typeof TINTS }) {
  const t = TINTS[tint];
  return (
    <Link to={to} className={`group flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white p-3 hover:shadow-sm transition`}>
      <div className={`h-9 w-9 grid place-items-center rounded-lg ${t.icon} group-hover:scale-110 transition-transform`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </Link>
  );
}

function Row({ icon: Icon, label, value, to, tint }: { icon: any; label: string; value: string; to: string; tint: keyof typeof TINTS }) {
  const t = TINTS[tint];
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 transition">
      <div className={`h-8 w-8 shrink-0 grid place-items-center rounded-lg ${t.icon}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0 text-sm font-medium text-slate-700 truncate">{label}</div>
      <div className="text-sm font-bold text-slate-900 whitespace-nowrap">{value}</div>
    </Link>
  );
}

function EmptyState({ label, cta, to }: { label: string; cta?: string; to?: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-slate-500 mb-3">{label}</p>
      {cta && to && <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"><Link to={to}>{cta}</Link></Button>}
    </div>
  );
}
