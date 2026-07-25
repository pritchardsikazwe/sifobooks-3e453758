import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, RefreshCw, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ReportsHub,
});

type Tile = { title: string; to: string; span?: 1 | 2; coming?: boolean };
type Group = { title: string; color: "purple" | "orange" | "cyan" | "green"; tiles: Tile[] };

const GROUPS: Group[] = [
  {
    title: "Financial",
    color: "purple",
    tiles: [
      { title: "Income Statement", to: "/reports/pnl" },
      { title: "Income Statement Analysis", to: "/reports/pnl" },
      { title: "Balance Sheet", to: "/reports/balance-sheet", span: 2 },
      { title: "Cash Flow Statement", to: "/reports/cash-flow" },
      { title: "Trial Balance", to: "/reports/trial-balance" },
      { title: "Consolidated Reports", to: "/reports/accountant-pack", span: 2 },
      { title: "Annual Financial Statements", to: "/reports/afs", span: 2 },
    ],
  },
  {
    title: "Sales & Orders",
    color: "orange",
    tiles: [
      { title: "Invoices Report", to: "/reports/sales-by-customer", span: 2 },
      { title: "Quotes Report", to: "/quotes" },
      { title: "Orders Report", to: "/invoices" },
      { title: "Sales Invoice Payment", to: "/reports/customer-statement" },
      { title: "Transactions Report", to: "/reports/account-transactions" },
      { title: "Items Per Customer", to: "/reports/sales-by-customer" },
      { title: "Customer Sales Report", to: "/reports/sales-by-customer" },
    ],
  },
  {
    title: "Inventory & Receivables",
    color: "cyan",
    tiles: [
      { title: "Inventory Report", to: "/reports/inventory-valuation" },
      { title: "Item Sales Report", to: "/reports/sales-by-customer" },
      { title: "Salesperson Report", to: "/reports/sales-by-customer" },
      { title: "Unpaid Accounts Report", to: "/reports/aged-receivables", span: 2 },
      { title: "Accounts Payable Report", to: "/reports/aged-payables" },
      { title: "Payments Of Accounts Payable", to: "/reports/aged-payables", span: 2 },
      { title: "Accounts Receivable Aging Report", to: "/reports/aged-receivables", span: 2 },
      { title: "Customers Report", to: "/customers" },
    ],
  },
  {
    title: "Admin & Tax",
    color: "green",
    tiles: [
      { title: "Account Enquiry", to: "/reports/account-transactions" },
      { title: "Reconciliation Report", to: "/reconciliation-sessions" },
      { title: "Chart Of Accounts", to: "/chart-of-accounts" },
      { title: "Mileage Reports", to: "/expenses" },
      { title: "VAT/Sales Tax Report", to: "/reports/vat-return" },
      { title: "Budget and Variance Reports", to: "/budgets" },
      { title: "Customised Reports", to: "/reports/afs" },
      { title: "Payroll Schedules", to: "/reports/payroll-schedules" },
      { title: "Supplier Statement", to: "/reports/supplier-statement" },
      { title: "Customer Statement", to: "/reports/customer-statement" },
    ],
  },
];

const COLORS: Record<Group["color"], string> = {
  purple: "from-purple-600/90 to-purple-800/90 border-purple-400/30 hover:from-purple-500 hover:to-purple-700 shadow-purple-900/40",
  orange: "from-amber-500/90 to-orange-600/90 border-amber-400/30 hover:from-amber-400 hover:to-orange-500 shadow-orange-900/40",
  cyan: "from-cyan-500/90 to-sky-600/90 border-cyan-400/30 hover:from-cyan-400 hover:to-sky-500 shadow-cyan-900/40",
  green: "from-emerald-500/90 to-green-700/90 border-emerald-400/30 hover:from-emerald-400 hover:to-green-600 shadow-emerald-900/40",
};

function ReportsHub() {
  const [busy, setBusy] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Reports</h1>
              <p className="text-sm text-slate-400">Every report is one click away. Live figures from posted transactions.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={rebuild} disabled={!!busy} variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              <RefreshCw className={`mr-2 h-4 w-4 ${busy === "rebuild" ? "animate-spin" : ""}`} />Rebuild ledgers
            </Button>
            <Button onClick={automatch} disabled={!!busy} variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              <Link2 className={`mr-2 h-4 w-4 ${busy === "match" ? "animate-spin" : ""}`} />Auto-match bank
            </Button>
          </div>
        </header>

        {GROUPS.map(g => (
          <section key={g.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{g.title}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {g.tiles.map(t => (
                <Link
                  key={t.title + t.to}
                  to={t.to as any}
                  className={`group relative col-span-${t.span === 2 ? "2" : "1"} min-h-[110px] overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl ${COLORS[g.color]} ${t.span === 2 ? "sm:col-span-2" : ""}`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex h-full flex-col justify-end">
                    <div className="text-sm font-semibold leading-tight text-white drop-shadow-sm">{t.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
