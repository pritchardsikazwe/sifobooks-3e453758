import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, CheckCircle2, Database, FileText, Loader2, Package, Receipt, ShoppingCart, Utensils, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/demo-centre")({
  head: () => ({
    meta: [
      { title: "SifoDemo Centre — SifoBooks" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoCentre,
});

const sections = [
  { icon: Wallet, title: "Accounting & Posting", text: "Chart of accounts, journals, invoices, receipts, bills, expenses and balanced postings.", links: ["/journal-entries", "/invoices", "/bills", "/expenses", "/reports"] },
  { icon: ShoppingCart, title: "Retail & POS", text: "Products, stock locations, till, cashier, shift, cash/card/MoMo and POS sales.", links: ["/stock", "/pos", "/reports"] },
  { icon: Utensils, title: "Restaurant", text: "Tables, menu, modifiers, kitchen station, orders, reservations, loyalty and cash-up.", links: ["/restaurant", "/restaurant/orders", "/restaurant/reports"] },
  { icon: Users, title: "Payroll & HR", text: "Employee, grade, allowance, deduction, payroll run, payslip and statutory sample data.", links: ["/employees", "/payroll", "/reports/payroll-summary"] },
  { icon: Database, title: "Banking & Inventory", text: "Bank account, transactions, reconciliation, warehouse, store and stock movements.", links: ["/banking", "/reconciliation", "/stock"] },
  { icon: FileText, title: "Compliance & ZRA", text: "VAT, compliance obligations, Smart Invoice configuration and demo ZRA queue.", links: ["/compliance", "/zra"] },
  { icon: BarChart3, title: "Reports", text: "Seeded figures allow reports and dashboards to be checked against real transactions.", links: ["/reports", "/reports/pnl", "/reports/trial-balance"] },
  { icon: Receipt, title: "Controls & Workflow", text: "Approvals, audit trail, support ticket, customer complaint and project workflow samples.", links: ["/approval-centre", "/audit-logs", "/projects"] },
];

function DemoCentre() {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadDemo = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("load_demo_data");
    setLoading(false);
    if (error) {
      toast.error(error.message || "Unable to load SifoDemo data");
      return;
    }
    setLoaded(true);
    if (data?.alreadyLoaded) {
      toast.success("SifoDemo data is already loaded.");
    } else {
      toast.success("SifoDemo data loaded successfully.");
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">SifoDemo</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Integrated Demo & Test Centre</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Load realistic sample transactions into the current company so every core workflow can be tested from creation through posting and reporting.
            </p>
          </div>
          <Button onClick={loadDemo} disabled={loading || loaded} className="h-12 rounded-xl px-5">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {loading ? "Loading demo..." : loaded ? "Demo Loaded" : "Load SifoDemo Data"}
          </Button>
        </div>

        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-5 text-sm">
            <b>Safe demo dataset:</b> sample-only names, references and ZRA configuration are used. No production credentials or real customer records are created.
            The dataset is loaded once per company so repeated clicks do not duplicate the demo.
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(({ icon: Icon, title, text, links }) => (
            <Card key={title} className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {links.map((link) => (
                    <Link key={link} to={link as any} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                      Open {link.replace("/","").replaceAll("-"," ")}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>After loading, test <b>Create → Post → Stock → Ledger → Report</b> for each workflow and record any broken screen/table.</span>
        </div>
      </div>
    </div>
  );
}
