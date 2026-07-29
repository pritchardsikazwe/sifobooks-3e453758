import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket, CheckCircle2, ArrowRight, Building2, ListChecks, ReceiptText, Landmark, Banknote, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/quick-start")({
  head: () => ({
    meta: [
      { title: "Quick Start — SifoBooks Learn" },
      { name: "description", content: "Get productive in SifoBooks in 10 minutes: company setup, chart of accounts, first invoice, first receipt and first report." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickStart,
});

const STEPS = [
  { n: 1, mins: 1, icon: Building2, title: "Set up your company", body: "Open Settings → Company. Add trading name, TPIN, VAT/Turnover Tax election, address and logo. This drives every document header and every statutory report.", cta: { to: "/company-setup", label: "Open Company Setup" } },
  { n: 2, mins: 2, icon: ListChecks, title: "Choose or import your Chart of Accounts", body: "Pick an industry preset (General, NGO, Mining, School) or import your own. You can rename, group and add accounts any time.", cta: { to: "/chart-of-accounts", label: "Open Chart of Accounts" } },
  { n: 3, mins: 1, icon: Landmark, title: "Add your bank & mobile money accounts", body: "Each account becomes a live cashbook. You'll import statements here and let rules auto-match transactions.", cta: { to: "/bank-accounts", label: "Add Bank Accounts" } },
  { n: 4, mins: 2, icon: ReceiptText, title: "Issue your first invoice", body: "Add a customer, pick your tax scheme (VAT / TOT / WHT), add line items. The journal posts automatically — no manual debits and credits.", cta: { to: "/invoices/new", label: "Create Invoice" } },
  { n: 5, mins: 1, icon: Banknote, title: "Record the receipt", body: "When the customer pays, log a receipt against the invoice. Cash goes up, receivables go down — instantly.", cta: { to: "/receipts", label: "Record a Receipt" } },
  { n: 6, mins: 3, icon: BarChart3, title: "Open your live reports", body: "Head to Reports → Profit & Loss and Balance Sheet. You should already see your invoice, receipt and any expenses reflected in real time.", cta: { to: "/reports", label: "Open Reports Hub" } },
];

function QuickStart() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/learn" className="hover:text-foreground">Learn Centre</Link>
        <span>/</span>
        <span className="text-foreground">Quick Start</span>
      </div>

      <header className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 to-transparent p-8">
        <Badge variant="secondary" className="mb-3">10-minute walkthrough</Badge>
        <div className="flex items-start gap-4">
          <div className="hidden sm:grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Rocket className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">From zero to your first report</h1>
            <p className="mt-2 text-muted-foreground">Six focused steps. Do them in order and you'll have a live-posting accounting system by the end.</p>
          </div>
        </div>
      </header>

      <ol className="space-y-4">
        {STEPS.map((s) => {
          const I = s.icon;
          return (
            <li key={s.n}>
              <Card className="p-5 md:p-6 border-border">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold ring-1 ring-primary/20">
                    {s.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <I className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
                      <span className="text-xs text-muted-foreground">~{s.mins} min</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                    <Link to={s.cta.to} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                      {s.cta.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="p-6 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-semibold text-foreground">You're done. Now what?</div>
            <p className="text-sm text-muted-foreground mt-1">
              Explore <Link to="/learn/payroll" className="text-primary font-semibold hover:underline">Payroll</Link>,{" "}
              <Link to="/learn/vat-zra" className="text-primary font-semibold hover:underline">VAT & ZRA</Link>, and{" "}
              <Link to="/learn/bank-reconciliation" className="text-primary font-semibold hover:underline">Bank Reconciliation</Link> next.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
