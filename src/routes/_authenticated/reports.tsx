import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, FileText, TrendingUp, Wallet, Users, Truck, Package, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ReportsPage,
});

const REPORTS = [
  { title: "Profit & Loss", desc: "Revenue, expenses and net profit", icon: TrendingUp, to: "/dashboard" },
  { title: "Balance Sheet", desc: "Assets, liabilities and equity", icon: FileText, to: "/chart-of-accounts" },
  { title: "Trial Balance", desc: "All account debit/credit totals", icon: BarChart3, to: "/journal-entries" },
  { title: "Cash Flow", desc: "Operating, investing, financing", icon: Wallet, to: "/banking" },
  { title: "Aged Receivables", desc: "Outstanding customer invoices", icon: Users, to: "/invoices" },
  { title: "Aged Payables", desc: "Outstanding supplier bills", icon: Truck, to: "/bills" },
  { title: "Inventory Valuation", desc: "Stock on hand by item & warehouse", icon: Package, to: "/stock" },
  { title: "Payroll Summary", desc: "PAYE, NAPSA, NHIMA breakdown", icon: Banknote, to: "/payroll" },
];

function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORTS.map(r => (
          <Link key={r.title} to={r.to as any} className="block">
            <Card className="p-5 hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer h-full">
              <r.icon className="h-8 w-8 text-emerald-600 mb-3" />
              <div className="font-semibold">{r.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
