import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, FileText, TrendingUp, Wallet, Users, Truck, Package, Banknote, Scale, BookOpenCheck, FileDown, Receipt, Sparkles, RefreshCw, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ReportsHub,
});

const GROUPS = [
  {
    title: "Financial",
    items: [
      { title: "Profit & Loss", desc: "Revenue, expenses, net profit", icon: TrendingUp, to: "/reports/pnl" },
      { title: "Balance Sheet", desc: "Assets, liabilities, equity", icon: Scale, to: "/reports/balance-sheet" },
      { title: "Trial Balance", desc: "All accounts DR / CR totals", icon: BookOpenCheck, to: "/reports/trial-balance" },
      { title: "Cash Flow (simple)", desc: "Bank movements by month", icon: Wallet, to: "/reports/cash-flow" },
      { title: "Accountant Pack (PDF)", desc: "P&L + Trial Balance + Balance Sheet", icon: FileDown, to: "/reports/accountant-pack" },
      { title: "Annual Financial Statements", desc: "IFRS-SME AFS pack + AI narrative", icon: Sparkles, to: "/reports/afs" },
    ],
  },
  {
    title: "Receivables & Payables",
    items: [
      { title: "Aged Receivables", desc: "Outstanding customer invoices", icon: Users, to: "/reports/aged-receivables" },
      { title: "Aged Payables", desc: "Outstanding supplier bills", icon: Truck, to: "/reports/aged-payables" },
      { title: "Customer Statement", desc: "Per-customer ledger + PDF", icon: Users, to: "/reports/customer-statement" },
      { title: "Supplier Statement", desc: "Per-supplier ledger + PDF", icon: Truck, to: "/reports/supplier-statement" },
    ],
  },
  {
    title: "Sales & Inventory",
    items: [
      { title: "Sales by Customer", desc: "Revenue per customer", icon: FileText, to: "/reports/sales-by-customer" },
      { title: "Inventory Valuation", desc: "Stock on hand × cost", icon: Package, to: "/reports/inventory-valuation" },
    ],
  },
  {
    title: "Tax & Compliance",
    items: [
      { title: "VAT Return (VAT 3)", desc: "Input / Output registers + net payable", icon: Receipt, to: "/reports/vat-return" },
      { title: "Tax Summary (VAT)", desc: "Output vs Input VAT — ZRA ready", icon: Receipt, to: "/reports/tax-summary" },
      { title: "Income Tax Computation", desc: "PBT → taxable → CIT (30% / mining)", icon: Receipt, to: "/reports/income-tax" },
      { title: "Turnover Tax", desc: "5% of gross turnover (below VAT threshold)", icon: Receipt, to: "/reports/turnover-tax" },
    ],
  },
  {
    title: "HR",
    items: [
      { title: "Payroll Summary", desc: "PAYE, NAPSA, NHIMA, net pay", icon: Banknote, to: "/reports/payroll-summary" },
      { title: "Payroll Schedules", desc: "Register, Bank, PAYE, NAPSA, NHIMA, OT, Leave", icon: Banknote, to: "/reports/payroll-schedules" },
    ],
  },
];

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
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
            <p className="text-sm text-slate-500">Live figures from posted transactions — export any report to CSV.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={rebuild} disabled={!!busy} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${busy==="rebuild"?"animate-spin":""}`} />Rebuild ledgers
          </Button>
          <Button onClick={automatch} disabled={!!busy} variant="outline" size="sm">
            <Link2 className={`h-4 w-4 mr-2 ${busy==="match"?"animate-spin":""}`} />Auto-match bank
          </Button>
        </div>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title}>
          <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-2">{g.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            {g.items.map((r) => (
              <Link key={r.title} to={r.to as any} className="block">
                <Card className="p-4 hover:shadow-md hover:border-emerald-400 transition-all h-full">
                  <r.icon className="h-6 w-6 text-emerald-600 mb-2" />
                  <div className="font-semibold text-slate-900">{r.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{r.desc}</div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
