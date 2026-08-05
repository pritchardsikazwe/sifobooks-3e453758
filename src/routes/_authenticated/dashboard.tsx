import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Landmark, Receipt, Users, FileText, Package, CreditCard,
  ShoppingCart, PiggyBank, ArrowUpRight, ArrowDownRight, Banknote, BookText, Truck, Boxes, ClipboardList,
  LayoutGrid, Check, Eye, RotateCcw, Plus,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from "@dnd-kit/sortable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SortableWidget } from "@/components/dashboard/SortableWidget";
import { useDashboardLayout } from "@/components/dashboard/useDashboardLayout";
import { SifoModuleStrip, SifoKpiCard, SifoQuickAction } from "@/components/sifo";
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

  const defaultWidgets = ["quick-bar", "kpis", "sales-chart", "income-vs-expenses", "cash-flow", "revenue-categories", "quick-actions", "snapshot", "recent-activity"];
  const { layout, ready, move, hide, show, reset } = useDashboardLayout(defaultWidgets);
  const [editMode, setEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(String(e.active.id), String(e.over.id));
  };

  const spans: Record<string, string> = {
    "quick-bar": "col-span-12",
    "kpis": "col-span-12",
    "sales-chart": "col-span-12 lg:col-span-5",
    "income-vs-expenses": "col-span-12 lg:col-span-4",
    "cash-flow": "col-span-12 lg:col-span-3",
    "revenue-categories": "col-span-12 lg:col-span-4",
    "quick-actions": "col-span-12 lg:col-span-4",
    "snapshot": "col-span-12 lg:col-span-4",
    "recent-activity": "col-span-12",
  };

  const WIDGET_LABELS: Record<string, string> = {
    "quick-bar": "Quick action bar",
    "kpis": "KPI strip",
    "sales-chart": "Sales by month",
    "income-vs-expenses": "Income vs Expenses",
    "cash-flow": "Cash flow",
    "revenue-categories": "Revenue categories",
    "quick-actions": "Quick actions",
    "snapshot": "Module snapshot",
    "recent-activity": "Recent activity",
  };

  const widgetContent: Record<string, React.ReactNode> = {
    "quick-bar": (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">What do you want to do?</div>
            <div className="text-[11px] text-muted-foreground">One-click accounting actions</div>
          </div>
          <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:inline">Press ⌘K</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <SifoQuickAction to="/invoices/new" icon={FileText} label="Record Sale" module="sales" hint="Raise a customer invoice" />
          <SifoQuickAction to="/bills" icon={ShoppingCart} label="Record Purchase" module="purchases" hint="Enter a supplier bill" />
          <SifoQuickAction to="/expenses" icon={Receipt} label="Record Expense" module="purchases" hint="Capture a business expense" />
          <SifoQuickAction to="/receipts" icon={CreditCard} label="Receive Money" module="sales" hint="Log money received" />
          <SifoQuickAction to="/bill-payments" icon={Wallet} label="Pay Money" module="purchases" hint="Pay a supplier" />
          <SifoQuickAction to="/reconciliation" icon={Landmark} label="Bank Reconcile" module="banking" hint="Match bank to ledger" />
          <SifoQuickAction to="/payroll" icon={Banknote} label="Run Payroll" module="payroll" hint="Process a pay run" />
          <SifoQuickAction to="/reports" icon={FileText} label="Reports" module="reports" hint="Open the reports centre" />
        </div>
      </div>
    ),
    "kpis": (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SifoKpiCard label="Revenue MTD" value={money(stats.revenue)} delta={stats.revDelta} icon={TrendingUp} module="sales" series={monthlySeries.map(m => m.income)} to="/reports/pnl" />
        <SifoKpiCard label="Expenses MTD" value={money(stats.expenses)} delta={stats.expDelta} icon={Receipt} module="purchases" series={monthlySeries.map(m => m.expenses)} positive={false} to="/expenses" />
        <SifoKpiCard label="Net Profit MTD" value={money(stats.netProfit)} delta={stats.netDelta} icon={PiggyBank} module="accounting" series={monthlySeries.map(m => m.net)} positive={stats.netProfit >= 0} to="/reports/pnl" />
        <SifoKpiCard label="Cash at Bank" value={money(stats.cashAtBank)} icon={Landmark} module="banking" series={cashFlowSeries.map(c => c.balance)} positive={stats.cashAtBank >= 0} hint="All bank accounts" to="/banking" />
        <SifoKpiCard label="Receivables" value={money(receivables)} icon={ArrowUpRight} module="sales" hint="Owed to you" to="/reports/aged-receivables" />
        <SifoKpiCard label="Payables" value={money(payables)} icon={ArrowDownRight} module="purchases" hint="You owe" to="/reports/aged-payables" />
        <SifoKpiCard label="Outstanding Invoices" value={String(invoiceCount)} icon={FileText} module="sales" hint="Open documents" to="/invoices" />
        <SifoKpiCard label="Inventory Value" value={money(stockValue)} icon={Package} module="inventory" hint="At sell price" to="/stock" />
      </div>
    ),

    "sales-chart": (
      <Panel title="Sales by Month" subtitle="Last 12 months">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="label" stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
            <Bar dataKey="income" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    ),
    "income-vs-expenses": (
      <Panel title="Income vs Expenses" subtitle="12-month trend">
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
    ),
    "cash-flow": (
      <Panel title="Cash Flow" subtitle="Cumulative">
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
    ),
    "revenue-categories": (
      <Panel title="Revenue Categories" subtitle="Top 5">
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
    ),
    "quick-actions": (
      <Panel title="Quick Actions" subtitle="Post transactions">
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
    ),
    "snapshot": (
      <Panel title="Snapshot" subtitle="Key modules">
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
    ),
    "recent-activity": (
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
    ),
  };

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Compact header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between"
        >
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {greeting}, <span className="text-primary">{firstName || "there"}</span> 👋
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {companyName || "SifoBooks"} · {dateLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode(v => !v)}
              className="h-9"
            >
              {editMode ? <><Check className="h-4 w-4 mr-1.5" /> Done</> : <><LayoutGrid className="h-4 w-4 mr-1.5" /> Customize</>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Plus className="h-4 w-4 mr-1.5" /> Widgets
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Hidden widgets</DropdownMenuLabel>
                {layout.hidden.length === 0 && (
                  <DropdownMenuItem disabled className="text-xs italic">All widgets visible</DropdownMenuItem>
                )}
                {layout.hidden.map(id => (
                  <DropdownMenuItem key={id} onClick={() => show(id)}>
                    <Eye className="h-4 w-4 mr-2" /> {WIDGET_LABELS[id] ?? id}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset layout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild variant="outline" size="sm" className="h-9 border-border"><Link to="/reports">Reports</Link></Button>
            <Button asChild size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/posting-wizard"><Plus className="mr-1.5 h-4 w-4" /> New Transaction</Link></Button>
          </div>
        </motion.div>

        {/* Colour-coded module strip */}
        <SifoModuleStrip />



        {ready && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={layout.order} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-12 gap-4">
                {layout.order.map(id => (
                  <SortableWidget
                    key={id}
                    id={id}
                    span={spans[id] ?? "col-span-12 lg:col-span-4"}
                    editMode={editMode}
                    onHide={() => hide(id)}
                  >
                    {widgetContent[id] ?? null}
                  </SortableWidget>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

const DONUT_COLORS = [
  "var(--color-mod-sales)", "var(--color-mod-accounting)", "var(--color-mod-reports)",
  "var(--color-state-pending)", "var(--color-mod-tax)",
];
const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};


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
