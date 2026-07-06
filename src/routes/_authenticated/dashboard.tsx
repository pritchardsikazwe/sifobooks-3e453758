import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Landmark, Receipt, Users, ArrowUpRight, ArrowDownRight, FileText, Package, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Summary — SifoBooks Operations" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

type Txn = { id: string; txn_date: string; description: string; amount: number; reference: string | null; category: string | null };

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: prof }, { data: comp }, { data: tx }, { data: stk }, { count: custCount }] = await Promise.all([
        supabase.from("profiles").select("full_name, onboarded").eq("id", u.user.id).maybeSingle(),
        supabase.from("companies").select("name, trading_name, base_currency").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("bank_transactions").select("id, txn_date, description, amount, reference, category").order("txn_date", { ascending: false }).limit(500),
        supabase.from("stock_items").select("quantity_on_hand, sell_price"),
        supabase.from("customers").select("*", { count: "exact", head: true }),
      ]);
      if (!prof?.onboarded) { navigate({ to: "/onboarding" }); return; }
      setFirstName((prof?.full_name || u.user.email || "").split(" ")[0].split("@")[0]);
      if (comp) { setCurrency(comp.base_currency || "ZMW"); setCompanyName(comp.trading_name || comp.name); }
      setTxns((tx ?? []) as Txn[]);
      setStockCount((stk ?? []).length);
      setStockValue((stk ?? []).reduce((s, x: any) => s + Number(x.quantity_on_hand || 0) * Number(x.sell_price || 0), 0));
      setCustomerCount(custCount ?? 0);
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
    return { revenue, expenses, netProfit, cashAtBank };
  }, [txns]);

  const chart = useMemo(() => {
    // 12 buckets across current month, cumulative-in vs cumulative-out per bucket
    const now = new Date();
    const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const buckets = 12;
    const bucketSize = daysIn / buckets;
    const data = Array.from({ length: buckets }, (_, i) => ({ label: `${Math.round((i + 1) * bucketSize)}`, in: 0, out: 0 }));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    txns.forEach(t => {
      const d = new Date(t.txn_date);
      if (d < monthStart) return;
      const day = d.getDate();
      const idx = Math.min(buckets - 1, Math.floor((day - 1) / bucketSize));
      if (Number(t.amount) > 0) data[idx].in += Number(t.amount);
      else data[idx].out += Math.abs(Number(t.amount));
    });
    return data;
  }, [txns]);

  const maxChart = Math.max(1, ...chart.map(c => Math.max(c.in, c.out)));
  const recent = txns.slice(0, 6);
  const money = (n: number) => fmtMoney(n, currency);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {greeting}, {firstName || "there"} <span>👋</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{companyName ? `${companyName} — here's how your business is doing.` : "Here's how your business is doing."}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            {new Date().toLocaleDateString("en-ZM", { month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Revenue" value={money(stats.revenue)} delta={null} icon={TrendingUp} tint="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard label="Expenses" value={money(stats.expenses)} delta={null} icon={Receipt} tint="text-rose-600" bg="bg-rose-50" />
        <KpiCard label="Net Profit" value={money(stats.netProfit)} delta={null} icon={TrendingUp} tint={stats.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"} bg={stats.netProfit >= 0 ? "bg-emerald-50" : "bg-rose-50"} />
        <KpiCard label="Cash at Bank" value={money(stats.cashAtBank)} delta={null} icon={Landmark} tint="text-sky-600" bg="bg-sky-50" />
        <KpiCard label="Receivables" value={money(0)} delta={null} icon={ArrowUpRight} tint="text-amber-600" bg="bg-amber-50" />
        <KpiCard label="Payables" value={money(0)} delta={null} icon={ArrowDownRight} tint="text-violet-600" bg="bg-violet-50" />
      </div>

      {/* Row: Cash Flow + Income/Expense donut + Bank Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-6">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Cash Flow Overview</CardTitle>
            <span className="text-xs text-slate-500">This Month</span>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-end gap-1.5">
              {chart.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-0.5 items-center h-full">
                  <div className="w-full bg-emerald-500/80 rounded-t-sm transition-all" style={{ height: `${(c.in / maxChart) * 80}%` }} title={`In: ${money(c.in)}`} />
                  <div className="w-full bg-rose-400/80 rounded-t-sm transition-all" style={{ height: `${(c.out / maxChart) * 80}%` }} title={`Out: ${money(c.out)}`} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Cash In</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400" /> Cash Out</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base font-semibold">Income & Expense</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <Donut revenue={stats.revenue} expenses={stats.expenses} />
            <div className="mt-4 w-full space-y-2 text-sm">
              <Row dot="bg-emerald-500" label="Revenue" value={money(stats.revenue)} />
              <Row dot="bg-rose-500" label="Expenses" value={money(stats.expenses)} />
              <Row dot="bg-sky-500" label="Net" value={money(stats.netProfit)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Bank Accounts</CardTitle>
            <Link to="/banking" className="text-xs text-emerald-600 hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : txns.length === 0 ? (
              <EmptyMini label="No bank data yet" cta="Import statement" to="/banking" />
            ) : (
              <div className="space-y-3">
                <BankRow name="Primary Account" balance={money(stats.cashAtBank)} status="Reconciled" />
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-sm font-medium">Total Balance</span>
                  <span className="text-sm font-bold">{money(stats.cashAtBank)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row: Aged Receivables + Aged Payables + Top Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <AgedCard title="Aged Receivables" empty />
        <AgedCard title="Aged Payables" empty />
        <Card className="lg:col-span-4">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Top Expenses</CardTitle>
            <span className="text-xs text-slate-500">This Month</span>
          </CardHeader>
          <CardContent>
            <TopExpenses txns={txns} money={money} />
          </CardContent>
        </Card>
      </div>

      {/* Row: Recent Transactions + Business Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <Link to="/banking" className="text-xs text-emerald-600 hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="px-0">
            {recent.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-slate-500">No transactions yet.</p>
                <Button asChild size="sm" variant="outline" className="mt-3"><Link to="/banking">Import bank statement</Link></Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 border-b">
                  <tr><th className="text-left font-medium px-6 py-2">Date</th><th className="text-left font-medium py-2">Reference</th><th className="text-left font-medium py-2">Description</th><th className="text-left font-medium py-2">Type</th><th className="text-right font-medium px-6 py-2">Amount</th></tr>
                </thead>
                <tbody>
                  {recent.map(t => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-6 py-2.5 text-slate-600">{new Date(t.txn_date).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="py-2.5 text-slate-600">{t.reference || "—"}</td>
                      <td className="py-2.5 font-medium text-slate-800">{t.description}</td>
                      <td className="py-2.5"><Badge variant="outline" className={t.amount >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>{t.amount >= 0 ? "In" : "Out"}</Badge></td>
                      <td className={`px-6 py-2.5 text-right font-semibold ${t.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(Math.abs(t.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader><CardTitle className="text-base font-semibold">Business Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Snap icon={FileText} label="Invoices" value="0" tint="bg-emerald-50 text-emerald-600" />
            <Snap icon={CreditCard} label="Payments In" value={money(stats.revenue)} tint="bg-sky-50 text-sky-600" small />
            <Snap icon={Package} label="Stock Items" value={String(stockCount)} tint="bg-amber-50 text-amber-600" />
            <Snap icon={Users} label="Customers" value={String(customerCount)} tint="bg-violet-50 text-violet-600" />
            <Snap icon={TrendingDown} label="Stock Value" value={money(stockValue)} tint="bg-rose-50 text-rose-600" small />
            <Snap icon={TrendingUp} label="Net Profit" value={money(stats.netProfit)} tint={stats.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"} small />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tint, bg }: { label: string; value: string; delta: string | null; icon: any; tint: string; bg: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
          <span className={`inline-grid h-7 w-7 place-items-center rounded-md ${bg} ${tint}`}><Icon className="h-3.5 w-3.5" /></span>
        </div>
        <div className={`mt-2 text-lg font-bold tracking-tight ${tint}`}>{value}</div>
        <div className="mt-1 text-[11px] text-slate-400">This month</div>
      </CardContent>
    </Card>
  );
}

function Donut({ revenue, expenses }: { revenue: number; expenses: number }) {
  const total = Math.max(1, revenue + expenses);
  const rev = (revenue / total) * 100;
  const net = revenue - expenses;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.94 0.02 20)" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.65 0.18 145)" strokeWidth="3.5" strokeDasharray={`${rev} 100`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[10px] text-slate-500">Net</div>
          <div className={`text-sm font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{net >= 0 ? "+" : ""}{Math.round((net / Math.max(1, revenue)) * 100)}%</div>
        </div>
      </div>
    </div>
  );
}

function Row({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function BankRow({ name, balance, status }: { name: string; balance: string; status: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="text-sm font-medium text-slate-800">{name}</div>
        <div className="text-xs text-slate-500 mt-0.5">{balance}</div>
      </div>
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">{status}</Badge>
    </div>
  );
}

function EmptyMini({ label, cta, to }: { label: string; cta: string; to: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <Button asChild size="sm" variant="outline"><Link to={to}>{cta}</Link></Button>
    </div>
  );
}

function AgedCard({ title, empty }: { title: string; empty: boolean }) {
  const buckets = [
    { label: "0 - 30 Days", tint: "bg-emerald-500" },
    { label: "31 - 60 Days", tint: "bg-amber-500" },
    { label: "61 - 90 Days", tint: "bg-orange-500" },
    { label: "90+ Days", tint: "bg-rose-500" },
  ];
  return (
    <Card className="lg:col-span-4">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <span className="text-xs text-emerald-600 cursor-default">View Report</span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-xs">
          {buckets.map(b => (
            <div key={b.label}>
              <div className="text-slate-500 mb-1">{b.label}</div>
              <div className="font-semibold text-slate-700">{empty ? "—" : ""}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
          {buckets.map(b => <div key={b.label} className={`${b.tint} opacity-30`} style={{ width: "25%" }} />)}
        </div>
        {empty && <p className="text-xs text-slate-400 mt-3">No open invoices yet.</p>}
      </CardContent>
    </Card>
  );
}

function TopExpenses({ txns, money }: { txns: Txn[]; money: (n: number) => string }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const grouped = new Map<string, number>();
  txns.filter(t => t.amount < 0 && t.txn_date >= monthStart).forEach(t => {
    const k = t.category || t.description.split(" ").slice(0, 2).join(" ");
    grouped.set(k, (grouped.get(k) || 0) + Math.abs(Number(t.amount)));
  });
  const rows = [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(1, ...rows.map(r => r[1]));
  if (rows.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">No expenses this month.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className="text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-700 truncate max-w-[60%]">{k}</span>
            <span className="font-semibold text-slate-800">{money(v)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-sky-500" style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Snap({ icon: Icon, label, value, tint, small }: { icon: any; label: string; value: string; tint: string; small?: boolean }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className={`inline-grid h-7 w-7 place-items-center rounded-md ${tint} mb-2`}><Icon className="h-3.5 w-3.5" /></div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`font-bold text-slate-800 ${small ? "text-sm" : "text-lg"}`}>{value}</div>
    </div>
  );
}
