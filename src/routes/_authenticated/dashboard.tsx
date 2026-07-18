import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Wallet, Landmark, Receipt, Users, FileText, Package, CreditCard,
  ShoppingCart, PiggyBank, ArrowUpRight, ArrowDownRight, Plus, Search, Bell,
  Settings as SettingsIcon, Banknote, BookText, Truck, Boxes, ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [stockCount, setStockCount] = useState(0);
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
      setStockCount((stk ?? []).length);
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
    // MoM deltas
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

  // 12-month series
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
    <div className="min-h-screen bg-[oklch(0.14_0.02_240)] text-slate-100 -m-0">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[oklch(0.16_0.02_240)]/80 border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-bold">S</div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{greeting}, {firstName || "there"} 👋</div>
              <div className="text-[11px] text-white/50 truncate">{companyName || "SifoBooks"} · {new Date().toLocaleDateString("en-ZM", { day:"numeric", month:"short", year:"numeric" })}</div>
            </div>
          </div>
          <div className="flex-1 min-w-[180px] max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input placeholder="Search invoices, customers, accounts…" className="pl-9 h-9 bg-white/5 border-white/10 text-slate-100 placeholder:text-white/30" />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20"><Link to="/invoices/new"><Plus className="h-4 w-4 mr-1" /> New</Link></Button>
            <Button asChild size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-white"><Link to="/notifications"><Bell className="h-4 w-4" /></Link></Button>
            <Button asChild size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-white"><Link to="/setup"><SettingsIcon className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
          <GradientKpi label="Revenue" value={money(stats.revenue)} delta={stats.revDelta} icon={TrendingUp} gradient="from-emerald-400 to-teal-600" />
          <GradientKpi label="Expenses" value={money(stats.expenses)} delta={stats.expDelta} icon={Receipt} gradient="from-rose-400 to-pink-600" invert />
          <GradientKpi label="Net Profit" value={money(stats.netProfit)} delta={stats.netDelta} icon={PiggyBank} gradient="from-violet-400 to-indigo-600" />
          <GradientKpi label="Cash at Bank" value={money(stats.cashAtBank)} delta={null} icon={Landmark} gradient="from-sky-400 to-blue-600" />
          <GradientKpi label="Receivables" value={money(receivables)} delta={null} icon={ArrowUpRight} gradient="from-amber-400 to-orange-600" invert />
          <GradientKpi label="Payables" value={money(payables)} delta={null} icon={ArrowDownRight} gradient="from-fuchsia-400 to-purple-600" invert />
          <GradientKpi label="Customers" value={String(customerCount)} delta={null} icon={Users} gradient="from-cyan-400 to-sky-600" />
          <GradientKpi label="Inventory" value={money(stockValue)} delta={null} icon={Package} gradient="from-lime-400 to-green-600" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <GlassCard className="lg:col-span-5" title="Sales by Month" subtitle="Last 12 months">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlySeries}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Bar dataKey="income" fill="url(#gRev)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard className="lg:col-span-4" title="Income vs Expenses" subtitle="Trend">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }} />
                <Line type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard className="lg:col-span-3" title="Cash Flow" subtitle="Cumulative balance">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashFlowSeries}>
                <defs>
                  <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                <Area type="monotone" dataKey="balance" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gCash)" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <GlassCard className="lg:col-span-4" title="Revenue Categories" subtitle="Top 5">
            {categoryData.length === 0 ? (
              <EmptyState label="No categorised income yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          <GlassCard className="lg:col-span-4" title="Quick Actions" subtitle="Post transactions">
            <div className="grid grid-cols-2 gap-2">
              <QuickTile to="/invoices/new" icon={FileText} label="Invoice" gradient="from-emerald-500 to-teal-600" />
              <QuickTile to="/quotes/new" icon={ClipboardList} label="Quote" gradient="from-sky-500 to-blue-600" />
              <QuickTile to="/receipts" icon={CreditCard} label="Receipt" gradient="from-violet-500 to-indigo-600" />
              <QuickTile to="/expenses" icon={Receipt} label="Expense" gradient="from-rose-500 to-pink-600" />
              <QuickTile to="/bills" icon={FileText} label="Bill" gradient="from-amber-500 to-orange-600" />
              <QuickTile to="/purchase-orders" icon={ShoppingCart} label="PO" gradient="from-fuchsia-500 to-purple-600" />
              <QuickTile to="/banking" icon={Landmark} label="Deposit" gradient="from-cyan-500 to-sky-600" />
              <QuickTile to="/journal-entries" icon={BookText} label="Journal" gradient="from-lime-500 to-green-600" />
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-4" title="Summary" subtitle="Modules">
            <div className="space-y-2">
              <SummaryRow icon={Landmark} label="Banking" value={money(stats.cashAtBank)} to="/banking" tint="text-sky-400" />
              <SummaryRow icon={ArrowUpRight} label="Receivables" value={money(receivables)} to="/reports/aged-receivables" tint="text-amber-400" />
              <SummaryRow icon={ArrowDownRight} label="Payables" value={money(payables)} to="/reports/aged-payables" tint="text-rose-400" />
              <SummaryRow icon={Boxes} label="Inventory" value={money(stockValue)} to="/stock" tint="text-lime-400" />
              <SummaryRow icon={Banknote} label="Payroll" value="Manage" to="/payroll" tint="text-violet-400" />
              <SummaryRow icon={Truck} label="Suppliers" value={String(supplierCount)} to="/suppliers" tint="text-fuchsia-400" />
              <SummaryRow icon={Wallet} label="Invoices" value={String(invoiceCount)} to="/invoices" tint="text-emerald-400" />
            </div>
          </GlassCard>
        </div>

        {/* Recent activity */}
        <GlassCard title="Recent Activity" subtitle="Latest bank transactions" action={<Link to="/banking" className="text-xs text-emerald-400 hover:underline">View all</Link>}>
          {loading ? <div className="py-8 text-center text-white/40">Loading…</div>
          : recent.length === 0 ? <EmptyState label="No transactions yet. Import a bank statement to get started." cta="Import statement" to="/banking" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-widest text-white/40 border-b border-white/10">
                  <tr><th className="text-left py-2 pr-3">Date</th><th className="text-left py-2 pr-3">Description</th><th className="text-left py-2 pr-3">Reference</th><th className="text-left py-2 pr-3">Category</th><th className="text-right py-2">Amount</th></tr>
                </thead>
                <tbody>
                  {recent.map(t => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-3 text-white/60 whitespace-nowrap">{new Date(t.txn_date).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}</td>
                      <td className="py-2.5 pr-3 font-medium truncate max-w-xs">{t.description}</td>
                      <td className="py-2.5 pr-3 text-white/50 text-xs">{t.reference || "—"}</td>
                      <td className="py-2.5 pr-3 text-white/60 text-xs">{t.category || "—"}</td>
                      <td className={`py-2.5 text-right font-semibold whitespace-nowrap ${t.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.amount >= 0 ? "+" : "-"}{money(Math.abs(t.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

const DONUT_COLORS = ["#34d399", "#38bdf8", "#a78bfa", "#fbbf24", "#fb7185"];
const tooltipStyle = { background: "oklch(0.2 0.02 240)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 };

function GradientKpi({ label, value, delta, icon: Icon, gradient, invert }: { label: string; value: string; delta: number | null; icon: any; gradient: string; invert?: boolean }) {
  const up = delta != null && delta >= 0;
  const good = invert ? !up : up;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 shadow-lg transition-transform hover:scale-[1.03] hover:shadow-2xl cursor-default`}>
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <span className="text-[10px] uppercase tracking-widest text-white/80 font-semibold">{label}</span>
          <div className="h-8 w-8 grid place-items-center rounded-lg bg-white/20 backdrop-blur-sm"><Icon className="h-4 w-4 text-white" /></div>
        </div>
        <div className="mt-3 text-xl sm:text-2xl font-bold text-white truncate">{value}</div>
        {delta !== null && (
          <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${good ? "bg-white/25 text-white" : "bg-black/30 text-white"}`}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}% <span className="text-white/70 font-normal">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GlassCard({ children, className = "", title, subtitle, action }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Card className={`bg-white/5 border-white/10 backdrop-blur-xl text-slate-100 shadow-xl ${className}`}>
      {title && (
        <div className="flex items-start justify-between p-4 pb-2">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {subtitle && <div className="text-[11px] text-white/50 mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4 pt-2">{children}</div>
    </Card>
  );
}

function QuickTile({ to, icon: Icon, label, gradient }: { to: string; icon: any; label: string; gradient: string }) {
  return (
    <Link to={to} className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-3 text-white shadow-md transition-transform hover:scale-[1.05] hover:shadow-lg`}>
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
      <div className="relative flex flex-col items-center gap-1.5">
        <Icon className="h-5 w-5" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
    </Link>
  );
}

function SummaryRow({ icon: Icon, label, value, to, tint }: { icon: any; label: string; value: string; to: string; tint: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-white/5 transition-colors">
      <div className={`h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-white/5 ${tint}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
      </div>
      <div className="text-sm font-bold text-white/90 whitespace-nowrap">{value}</div>
    </Link>
  );
}

function EmptyState({ label, cta, to }: { label: string; cta?: string; to?: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-white/40 mb-3">{label}</p>
      {cta && to && <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"><Link to={to}>{cta}</Link></Button>}
    </div>
  );
}
