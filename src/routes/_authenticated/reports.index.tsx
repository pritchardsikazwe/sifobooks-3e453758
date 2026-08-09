import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, RefreshCw, Link2, Star, Search, Clock, TrendingUp,
  Wallet, ShoppingCart, Landmark, Package, Users2, Receipt, FileBarChart,
  Building2, Calculator, ClipboardList, LineChart, Layers, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFavorites, toggleFavorite, getRecent, getLastGenerated } from "@/lib/reports/favorites";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports Centre — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ReportsCentre,
});

type Report = {
  id: string;
  name: string;
  description: string;
  to: string;
  icon: LucideIcon;
  category: string;
};

const CATS: { key: string; label: string; accent: string }[] = [
  { key: "financial", label: "Financial Statements", accent: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { key: "sales", label: "Sales", accent: "text-orange-700 bg-orange-50 border-orange-200" },
  { key: "purchases", label: "Purchases", accent: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  { key: "banking", label: "Banking & Cash", accent: "text-blue-700 bg-blue-50 border-blue-200" },
  { key: "inventory", label: "Inventory", accent: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  { key: "expenses", label: "Expenses", accent: "text-rose-700 bg-rose-50 border-rose-200" },
  { key: "payroll", label: "Payroll", accent: "text-purple-700 bg-purple-50 border-purple-200" },
  { key: "tax", label: "Tax & Compliance", accent: "text-red-700 bg-red-50 border-red-200" },
  { key: "customers", label: "Customers", accent: "text-amber-700 bg-amber-50 border-amber-200" },
  { key: "suppliers", label: "Suppliers", accent: "text-teal-700 bg-teal-50 border-teal-200" },
  { key: "management", label: "Management", accent: "text-slate-700 bg-slate-50 border-slate-200" },
];

const REPORTS: Report[] = [
  // Financial
  { id: "pnl", name: "Profit & Loss", description: "Revenue, expenses and net profit with monthly comparisons.", to: "/reports/pnl", icon: TrendingUp, category: "financial" },
  { id: "balance-sheet", name: "Balance Sheet", description: "Assets, liabilities and equity as of any date.", to: "/reports/balance-sheet", icon: Layers, category: "financial" },
  { id: "cash-flow", name: "Cash Flow Statement", description: "Operating, investing and financing cash movements.", to: "/reports/cash-flow", icon: LineChart, category: "financial" },
  { id: "trial-balance", name: "Trial Balance", description: "Debit and credit balances by account.", to: "/reports/trial-balance", icon: Calculator, category: "financial" },
  { id: "general-ledger", name: "General Ledger", description: "Full transaction ledger with running balances.", to: "/reports/general-ledger", icon: FileBarChart, category: "financial" },
  { id: "chart-of-accounts", name: "Chart of Accounts", description: "Complete account structure.", to: "/chart-of-accounts", icon: ClipboardList, category: "financial" },
  { id: "afs", name: "Annual Financial Statements", description: "IFRS for SMEs — full annual pack.", to: "/reports/afs", icon: FileBarChart, category: "financial" },
  { id: "account-transactions", name: "Account Enquiry", description: "Sage-style ledger view for any account.", to: "/reports/account-transactions", icon: Search, category: "financial" },
  { id: "accountant-pack", name: "Accountant Pack", description: "Consolidated year-end pack for review.", to: "/reports/accountant-pack", icon: FileBarChart, category: "financial" },

  // Sales
  { id: "sales-by-customer", name: "Sales by Customer", description: "Revenue grouped by customer with totals.", to: "/reports/sales-by-customer", icon: Users2, category: "sales" },
  { id: "customer-statement", name: "Customer Statements", description: "Invoices, receipts and running balances.", to: "/reports/customer-statement", icon: Receipt, category: "customers" },
  { id: "aged-receivables", name: "Aged Receivables", description: "Outstanding invoices bucketed by age.", to: "/reports/aged-receivables", icon: Wallet, category: "customers" },
  { id: "invoices", name: "Invoices Register", description: "All invoices with status and balance.", to: "/invoices", icon: Receipt, category: "sales" },
  { id: "quotes", name: "Quotations", description: "All quotes with status.", to: "/quotes", icon: ClipboardList, category: "sales" },

  // Purchases
  { id: "aged-payables", name: "Aged Payables", description: "Outstanding supplier bills bucketed by age.", to: "/reports/aged-payables", icon: Wallet, category: "suppliers" },
  { id: "supplier-statement", name: "Supplier Statements", description: "Bills, payments and running balances.", to: "/reports/supplier-statement", icon: Building2, category: "suppliers" },
  { id: "bills", name: "Bills Register", description: "All supplier bills with status and balance.", to: "/bills", icon: ShoppingCart, category: "purchases" },
  { id: "suppliers", name: "Suppliers", description: "Full supplier master list.", to: "/suppliers", icon: Building2, category: "suppliers" },

  // Banking
  { id: "bank-reconciliation", name: "Bank Reconciliation", description: "Session-based statement vs book reconciliation.", to: "/reports/bank-reconciliation", icon: Landmark, category: "banking" },
  { id: "reconciliation-sessions", name: "Reconciliation Sessions", description: "Formal reconciliation with audit locking.", to: "/reconciliation-sessions", icon: Landmark, category: "banking" },
  { id: "cashbook", name: "Cash Book", description: "Government-format cashbook with reconciliation footer.", to: "/cashbook", icon: Wallet, category: "banking" },
  { id: "bank-accounts", name: "Bank Accounts", description: "All bank accounts, opening and current balances.", to: "/bank-accounts", icon: Landmark, category: "banking" },

  // Inventory
  { id: "inventory-valuation", name: "Stock Valuation", description: "On-hand quantity × cost, per item.", to: "/reports/inventory-valuation", icon: Package, category: "inventory" },
  { id: "stock", name: "Stock Movement", description: "Stock in/out movements over time.", to: "/stock", icon: Package, category: "inventory" },

  // Expenses
  { id: "expenses", name: "Expense Register", description: "All expenses with category and supplier.", to: "/expenses", icon: Receipt, category: "expenses" },

  // Payroll
  { id: "payroll-summary", name: "Payroll Summary", description: "PAYE, NAPSA, NHIMA totals per run.", to: "/reports/payroll-summary", icon: Users2, category: "payroll" },
  { id: "payroll-schedules", name: "Payroll Schedules", description: "Bank/PAYE/NAPSA/NHIMA schedules per run.", to: "/reports/payroll-schedules", icon: ClipboardList, category: "payroll" },
  { id: "payroll-dashboard", name: "Payroll Dashboard", description: "Statutory totals and trends.", to: "/payroll-dashboard", icon: BarChart3, category: "payroll" },

  // Tax
  { id: "vat-return", name: "VAT Return", description: "Output VAT, input VAT and net payable.", to: "/reports/vat-return", icon: Calculator, category: "tax" },
  { id: "income-tax", name: "Income Tax", description: "Chargeable income and estimated tax.", to: "/reports/income-tax", icon: Calculator, category: "tax" },
  { id: "turnover-tax", name: "Turnover Tax", description: "Turnover-tax computation for small businesses.", to: "/reports/turnover-tax", icon: Calculator, category: "tax" },
  { id: "tax-summary", name: "Tax Summary", description: "Consolidated tax position.", to: "/reports/tax-summary", icon: Calculator, category: "tax" },

  // Management
  { id: "management-pack", name: "Monthly Management Pack", description: "KPIs, P&L, BS movement and AI insights.", to: "/reports/management-pack", icon: FileBarChart, category: "management" },
  { id: "budgets", name: "Budgets & Variance", description: "Budget vs actuals per line.", to: "/budgets", icon: BarChart3, category: "management" },
];

function ReportsCentre() {
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<string[]>([]);
  const [recent, setRecent] = useState<{ id: string; at: string }[]>([]);
  const [lastGen, setLastGen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { refresh(); }, []);
  const refresh = () => {
    setFavs(getFavorites());
    setRecent(getRecent());
    setLastGen(getLastGenerated());
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return REPORTS;
    const n = q.toLowerCase();
    return REPORTS.filter(r => `${r.name} ${r.description} ${r.category}`.toLowerCase().includes(n));
  }, [q]);

  const rebuild = async () => {
    setBusy("rebuild");
    const { data, error } = await supabase.rpc("rebuild_ledgers");
    setBusy(null);
    if (error) return toast.error(error.message);
    const d = data as any;
    toast.success(`Posted ${d?.bills_posted ?? 0} bills, ${d?.receipts_posted ?? 0} receipts, ${d?.expenses_posted ?? 0} expenses`);
  };
  const automatch = async () => {
    setBusy("match");
    const { data, error } = await supabase.rpc("auto_match_bank_transactions");
    setBusy(null);
    if (error) return toast.error(error.message);
    const d = data as any;
    toast.success(`Matched ${d?.invoice_matches ?? 0} invoices and ${d?.bill_matches ?? 0} bills from bank`);
  };

  const favReports = REPORTS.filter(r => favs.includes(r.id));
  const recentReports = recent
    .map(r => REPORTS.find(x => x.id === r.id))
    .filter(Boolean) as Report[];

  const relTime = (iso?: string) => {
    if (!iso) return null;
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-900/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports Centre</h1>
              <p className="text-sm text-muted-foreground">Every report — one click away. Live figures from posted transactions.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={rebuild} disabled={!!busy} variant="outline" size="sm">
              <RefreshCw className={cn("mr-2 h-4 w-4", busy === "rebuild" && "animate-spin")} /> Rebuild ledgers
            </Button>
            <Button onClick={automatch} disabled={!!busy} variant="outline" size="sm">
              <Link2 className={cn("mr-2 h-4 w-4", busy === "match" && "animate-spin")} /> Auto-match bank
            </Button>
          </div>
        </header>

        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search reports…"
            className="pl-10 h-11 bg-card border-border"
          />
        </div>

        <Tabs defaultValue="all" className="space-y-5">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 justify-start">
            <TabsTrigger value="all" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">All Reports</TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">
              <Star className="h-3.5 w-3.5 mr-1" /> Favorites {favReports.length > 0 && <Badge variant="secondary" className="ml-1.5">{favReports.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">
              <Clock className="h-3.5 w-3.5 mr-1" /> Recent
            </TabsTrigger>
            {CATS.map(c => (
              <TabsTrigger key={c.key} value={c.key} className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {CATS.map(c => {
              const items = filtered.filter(r => r.category === c.key);
              if (items.length === 0) return null;
              return <CategorySection key={c.key} label={c.label} accent={c.accent} items={items} favs={favs} lastGen={lastGen} onFav={id => { toggleFavorite(id); refresh(); }} relTime={relTime} />;
            })}
            {filtered.length === 0 && <EmptyState q={q} />}
          </TabsContent>

          <TabsContent value="favorites">
            {favReports.length ? (
              <Grid items={favReports} favs={favs} lastGen={lastGen} onFav={id => { toggleFavorite(id); refresh(); }} relTime={relTime} />
            ) : (
              <div className="text-sm text-muted-foreground py-16 text-center">
                No favourites yet. Click the <Star className="inline h-3.5 w-3.5" /> on any report to add it.
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            {recentReports.length ? (
              <Grid items={recentReports.slice(0, 12)} favs={favs} lastGen={lastGen} onFav={id => { toggleFavorite(id); refresh(); }} relTime={relTime} />
            ) : (
              <div className="text-sm text-muted-foreground py-16 text-center">No recently viewed reports.</div>
            )}
          </TabsContent>

          {CATS.map(c => (
            <TabsContent key={c.key} value={c.key}>
              <Grid items={filtered.filter(r => r.category === c.key)} favs={favs} lastGen={lastGen} onFav={id => { toggleFavorite(id); refresh(); }} relTime={relTime} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function CategorySection({
  label, accent, items, favs, lastGen, onFav, relTime,
}: {
  label: string; accent: string; items: Report[]; favs: string[]; lastGen: Record<string, string>;
  onFav: (id: string) => void; relTime: (iso?: string) => string | null;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("inline-block h-2 w-2 rounded-full bg-current", accent.split(" ")[0])} />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{label}</h2>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <Grid items={items} favs={favs} lastGen={lastGen} onFav={onFav} relTime={relTime} />
    </section>
  );
}

function Grid({
  items, favs, lastGen, onFav, relTime,
}: {
  items: Report[]; favs: string[]; lastGen: Record<string, string>;
  onFav: (id: string) => void; relTime: (iso?: string) => string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(r => {
        const Icon = r.icon;
        const isFav = favs.includes(r.id);
        const last = relTime(lastGen[r.id]);
        return (
          <div
            key={r.id}
            className="group relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <Link to={r.to as any} className="font-semibold text-foreground hover:text-emerald-700 transition-colors block truncate">
                    {r.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onFav(r.id)}
                className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                aria-label={isFav ? "Remove favourite" : "Add favourite"}
              >
                <Star className={cn("h-4 w-4", isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                {last ? <>Last generated <span className="text-foreground font-medium">{last}</span></> : "Not yet generated"}
              </div>
              <Link to={r.to as any}>
                <Button variant="save" size="sm" className="h-7 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" /> Generate
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm">No reports match "{q}".</p>
    </div>
  );
}
