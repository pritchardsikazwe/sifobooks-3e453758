import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ArrowRight, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/reports")({
  head: () => ({
    meta: [
      { title: "Reading Your Reports — SifoBooks Learn" },
      { name: "description", content: "How to read Profit & Loss, Balance Sheet, Trial Balance and Cash Flow — and what to look for as a Zambian business owner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsLearn,
});

const REPORTS = [
  {
    icon: TrendingUp,
    title: "Profit & Loss (Income Statement)",
    q: "Am I making money?",
    body: "Shows revenue less expenses over a period. Top line is what customers paid; bottom line is what's left after every cost. Watch gross margin (revenue − cost of sales ÷ revenue) — it's your pricing health check.",
    to: "/reports/profit-loss",
  },
  {
    icon: Scale,
    title: "Balance Sheet",
    q: "What do I own and owe today?",
    body: "A snapshot of assets, liabilities and equity at one point in time. Assets = Liabilities + Equity, always. Watch working capital (current assets − current liabilities) — it tells you if you can pay next month's bills.",
    to: "/reports/balance-sheet",
  },
  {
    icon: BarChart3,
    title: "Trial Balance",
    q: "Are my books balanced?",
    body: "Every account with its debit or credit balance. Total debits must equal total credits — if they don't, something is wrong at the journal level (SifoBooks prevents this by design).",
    to: "/reports/trial-balance",
  },
  {
    icon: TrendingDown,
    title: "Cash Flow Statement",
    q: "Where did the cash actually go?",
    body: "Profit is an opinion, cash is a fact. Groups movement into Operating, Investing and Financing activities so you can see whether the business generates cash — or just profit on paper.",
    to: "/reports/cash-flow",
  },
];

function ReportsLearn() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/learn" className="hover:text-foreground">Learn Centre</Link>
        <span>/</span><span className="text-foreground">Reading Your Reports</span>
      </div>

      <header className="rounded-3xl border border-teal-500/30 bg-gradient-to-br from-teal-500/15 to-transparent p-8">
        <Badge variant="secondary" className="mb-3">Intermediate · 12 min</Badge>
        <div className="flex items-start gap-4">
          <div className="hidden sm:grid h-12 w-12 place-items-center rounded-2xl bg-teal-500 text-white"><BarChart3 className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Reading Your Reports</h1>
            <p className="mt-2 text-muted-foreground">Four financial statements answer four different questions. Here's what each one really tells you.</p>
          </div>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {REPORTS.map((r) => {
          const I = r.icon;
          return (
            <Card key={r.title} className="p-5 border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><I className="h-5 w-5" /></div>
                <div>
                  <div className="font-bold text-foreground">{r.title}</div>
                  <div className="text-xs text-primary font-semibold">"{r.q}"</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
              <Link to={r.to} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open report <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 border-primary/30 bg-primary/5">
        <div className="font-semibold text-foreground mb-2">Rules of thumb for Zambian SMEs</div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Gross margin below 25%? Revisit pricing or supplier terms.</li>
          <li>• Receivables older than 60 days? Chase them — cash beats profit.</li>
          <li>• Payroll + statutory more than 40% of revenue? Reassess headcount vs output.</li>
          <li>• Bank balance not moving in line with profit? Investigate stock or receivables build-up.</li>
        </ul>
      </Card>
    </div>
  );
}
