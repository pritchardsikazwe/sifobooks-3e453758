import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, Boxes, Calculator, CreditCard, FileText, Landmark, Package, Receipt, RefreshCw, ShoppingBag, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireModule } from "@/components/RequireModule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { ensureStandaloneDemo } from "@/lib/standalone-demo";

export const Route = createFileRoute("/_authenticated/retail")({
  head: () => ({
    meta: [
      { title: "Retail Dashboard — SifoBooks" },
      { name: "description", content: "Retail business dashboard for sales, expenses, cash, stock and core accounting." },
    ],
  }),
  component: () => <RequireModule moduleKey="retail_pos"><RetailDashboard /></RequireModule>,
});

function RetailDashboard() {
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const day = new Date(now); day.setHours(0, 0, 0, 0);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    const [s, e, i, sh] = await Promise.all([
      supabase.from("pos_sales").select("id,total,status,refund_of,sold_at").gte("sold_at", month.toISOString()).order("sold_at", { ascending: false }).limit(1000),
      supabase.from("expenses").select("id,total,status,expense_date,category").gte("expense_date", month.toISOString().slice(0, 10)).order("expense_date", { ascending: false }).limit(1000),
      supabase.from("stock_items").select("id,name,quantity_on_hand,cost_price,sell_price,is_active").eq("is_active", true).limit(3000),
      supabase.from("pos_shifts").select("id,status,opening_float,cash_in,cash_out,expected_cash,actual_cash,opened_at").eq("status", "open").limit(100),
    ]);

    if (s.error) toast.error(s.error.message);
    if (e.error) toast.error(e.error.message);
    if (i.error) toast.error(i.error.message);
    if (sh.error) toast.error(sh.error.message);

    setSales(s.data ?? []);
    setExpenses(e.data ?? []);
    setItems(i.data ?? []);
    setShifts(sh.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); void ensureStandaloneDemo("retail").catch((e) => console.error("[standalone-demo:retail]", e)); }, [refresh]);

  const metrics = useMemo(() => {
    const completed = sales.filter(x => x.status === "completed" && !x.refund_of);
    const refunds = sales.filter(x => x.refund_of || x.status === "refunded");
    const todaySales = completed.filter(x => new Date(x.sold_at) >= new Date(new Date().setHours(0,0,0,0)));
    const revenue = completed.reduce((n, x) => n + Number(x.total || 0), 0);
    const todayRevenue = todaySales.reduce((n, x) => n + Number(x.total || 0), 0);
    const expenseTotal = expenses.filter(x => x.status !== "reversed").reduce((n, x) => n + Number(x.total || 0), 0);
    const stockCost = items.reduce((n, x) => n + Number(x.quantity_on_hand || 0) * Number(x.cost_price || 0), 0);
    const stockRetail = items.reduce((n, x) => n + Number(x.quantity_on_hand || 0) * Number(x.sell_price || 0), 0);
    const cashExpected = shifts.reduce((n, x) => n + Number(x.expected_cash || 0), 0);
    return {
      revenue, todayRevenue, transactions: completed.length, todayTransactions: todaySales.length,
      expenseTotal, netBeforeStockCost: revenue - expenseTotal, refunds: refunds.length,
      stockCost, stockRetail, lowStock: items.filter(x => Number(x.quantity_on_hand || 0) <= 0).length,
      openShifts: shifts.length, cashExpected,
    };
  }, [sales, expenses, items, shifts]);

  const actions = [
    { title: "Retail POS", text: "Open the selling terminal.", to: "/pos", icon: ShoppingBag },
    { title: "Sales History", text: "Review receipts, refunds and voids.", to: "/pos-sales", icon: Receipt },
    { title: "Expenses", text: "Record and post business expenses.", to: "/expenses", icon: Wallet },
    { title: "Chart of Accounts", text: "View and manage the ledger structure.", to: "/chart-of-accounts", icon: BookOpen },
    { title: "Banking", text: "Cash, bank activity and reconciliation.", to: "/banking", icon: Landmark },
    { title: "Journal Entries", text: "Post and review double-entry journals.", to: "/journal-entries", icon: FileText },
    { title: "Products & Stock", text: "Items, costs, prices and quantities.", to: "/stock", icon: Boxes },
    { title: "Reports", text: "Financial, sales and inventory reporting.", to: "/reports", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#F5FAF8] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-[28px] border border-[#D7E7E1] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white shadow-[0_18px_50px_rgba(12,74,55,.14)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-200">SifoBooks Retail · Business dashboard</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Retail Operations</h1>
              <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">A real retail management dashboard — sales, expenses, cash, stock and accounting — with the POS kept as a separate selling terminal.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="rounded-xl"><Link to="/pos"><ShoppingBag className="mr-2 h-4 w-4" />Open POS</Link></Button>
              <Button variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setRefresh(x => x + 1)}><RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Refresh</Button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Sales this month" value={fmtMoney(metrics.revenue)} hint={`${metrics.transactions} completed transactions`} icon={ShoppingBag} />
          <Metric title="Sales today" value={fmtMoney(metrics.todayRevenue)} hint={`${metrics.todayTransactions} transactions today`} icon={Receipt} />
          <Metric title="Expenses this month" value={fmtMoney(metrics.expenseTotal)} hint="Posted expenses, excluding reversals" icon={Wallet} />
          <Metric title="Stock at cost" value={fmtMoney(metrics.stockCost)} hint={`${metrics.lowStock} items at zero stock`} icon={Package} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="rounded-3xl border-[#D7E7E1] shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-emerald-700" />Core accounting</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <QuickLink title="Expenses" text="Record operating costs and post them to the ledger." to="/expenses" icon={Wallet} />
              <QuickLink title="Chart of Accounts" text="Cash, bank, assets, liabilities, income and expenses." to="/chart-of-accounts" icon={BookOpen} />
              <QuickLink title="Banking" text="Manage bank and cash activity." to="/banking" icon={Landmark} />
              <QuickLink title="Journal Entries" text="Double-entry accounting postings." to="/journal-entries" icon={FileText} />
              <QuickLink title="Trial Balance" text="Check debit and credit balances." to="/reports/trial-balance" icon={Calculator} />
              <QuickLink title="Financial Statements" text="Open the financial statements centre." to="/reports/afs" icon={BarChart3} />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-[#D7E7E1] shadow-sm">
            <CardHeader><CardTitle>Retail control</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Summary label="Open cash shifts" value={String(metrics.openShifts)} />
              <Summary label="Expected cash in open shifts" value={fmtMoney(metrics.cashExpected)} />
              <Summary label="Stock at retail value" value={fmtMoney(metrics.stockRetail)} />
              <Summary label="Refunds this month" value={String(metrics.refunds)} />
              <Summary label="Sales less posted expenses" value={fmtMoney(metrics.netBeforeStockCost)} />
              <p className="text-[11px] leading-5 text-muted-foreground">The last figure is a simple revenue-minus-expense management measure; it is not a statutory profit figure until cost of sales and the full ledger are included.</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div><h2 className="text-xl font-black text-[#173b3a]">Retail workspaces</h2><p className="text-sm text-muted-foreground">Open each area directly — no POS screen masquerading as the dashboard.</p></div>
            <Badge variant="outline">{actions.length} workspaces</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map(a => <QuickLink key={a.to} title={a.title} text={a.text} to={a.to} icon={a.icon} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ title, value, hint, icon: Icon }: { title: string; value: string; hint: string; icon: any }) {
  return <Card className="rounded-3xl border-[#D7E7E1] shadow-sm"><CardContent className="p-5"><Icon className="h-5 w-5 text-emerald-700" /><div className="mt-3 text-2xl font-black tracking-tight">{value}</div><div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</div><div className="mt-1 text-xs text-muted-foreground">{hint}</div></CardContent></Card>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-2xl border bg-white p-3"><span className="text-sm text-muted-foreground">{label}</span><span className="font-black tabular-nums">{value}</span></div>;
}

function QuickLink({ title, text, to, icon: Icon }: { title: string; text: string; to: string; icon: any }) {
  return <Link to={to} className="group rounded-2xl border border-[#D7E7E1] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="font-black">{title}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{text}</div></div><ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1" /></div></Link>;
}
