import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap, BookOpen, Banknote, Landmark, ReceiptText, BarChart3,
  ShieldCheck, Sparkles, ArrowRight, PlayCircle, HelpCircle, Rocket, ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/")({
  head: () => ({
    meta: [
      { title: "Learn Centre — SifoBooks" },
      { name: "description", content: "Master SifoBooks: quick start, accounting basics, Zambian payroll, VAT & ZRA compliance, and bank reconciliation — with live examples." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LearnHub,
});

type Topic = {
  to: string;
  title: string;
  blurb: string;
  minutes: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  icon: any;
  tint: string;
};

const TOPICS: Topic[] = [
  { to: "/learn/new-company", title: "New to a Company? Start Here", blurb: "First-90-days checklist: what to collect, which source documents to file, and the order to capture them.", minutes: 14, level: "Beginner", icon: ClipboardList, tint: "from-indigo-500/25 to-indigo-500/5" },
  { to: "/learn/quick-start", title: "Quick Start (10 minutes)", blurb: "Set up your company, chart of accounts, tax profile and issue your first invoice.", minutes: 10, level: "Beginner", icon: Rocket, tint: "from-emerald-500/25 to-emerald-500/5" },
  { to: "/learn/accounting-basics", title: "Accounting Basics", blurb: "Debits, credits, double-entry and the Zambian statutory framework — plain English.", minutes: 12, level: "Beginner", icon: BookOpen, tint: "from-sky-500/25 to-sky-500/5" },
  { to: "/learn/payroll", title: "Zambian Payroll", blurb: "PAYE 2026 bands, NAPSA, NHIMA, WCF, SDL — with worked examples and payslips.", minutes: 15, level: "Intermediate", icon: Banknote, tint: "from-amber-500/25 to-amber-500/5" },
  { to: "/learn/vat-zra", title: "VAT & ZRA Compliance", blurb: "Standard-rated, zero-rated, exempt sales; input vs output VAT; VAT 3 filing timing.", minutes: 10, level: "Intermediate", icon: ShieldCheck, tint: "from-red-500/25 to-red-500/5" },
  { to: "/learn/bank-reconciliation", title: "Bank Reconciliation", blurb: "Import statements, apply rules, split allocations, reconcile in minutes.", minutes: 8, level: "Beginner", icon: Landmark, tint: "from-violet-500/25 to-violet-500/5" },
  { to: "/learn/reports", title: "Reading Your Reports", blurb: "How to read the P&L, Balance Sheet, Trial Balance and Cash Flow — and what to look for.", minutes: 12, level: "Intermediate", icon: BarChart3, tint: "from-teal-500/25 to-teal-500/5" },
];

const FAQS = [
  { q: "Do I need an accountant to use SifoBooks?", a: "No. The system posts journals automatically when you record invoices, receipts, bills or bank allocations. You just need to classify — SifoBooks handles the debits and credits." },
  { q: "Are the 2026 tax rates already loaded?", a: "Yes. PAYE bands, NAPSA & NHIMA caps, WCF (1.5%) and SDL (0.5%) are shipped, and Super Admin can override rates per financial year." },
  { q: "Can I import my old data?", a: "Use the Opening Balances wizard for balances, and CSV/Excel imports for customers, suppliers, inventory, and bank statements." },
  { q: "Does it work offline?", a: "Yes — invoices, receipts, expenses and CRUD forms queue on your device and sync automatically when you're back online." },
  { q: "How is multi-company handled?", a: "One login, unlimited companies. Switch from the sidebar; every module respects the active company and its role-based permissions." },
];

function LearnHub() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 md:p-12">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-start gap-5">
          <div className="hidden sm:grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <Badge variant="secondary" className="mb-3">SifoBooks Academy</Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Learn SifoBooks the fast way</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Short, practical guides written for Zambian owners, bookkeepers and accountants.
              Real examples, real ZMW, no fluff.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/learn/quick-start" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:shadow-lg transition">
                <PlayCircle className="h-4 w-4" /> Start the 10-minute walkthrough
              </Link>
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition">
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Topic grid */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Topics</h2>
            <p className="text-sm text-muted-foreground">Pick a lesson. Everything opens inside the app.</p>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">{TOPICS.length} guides · ~1 hour total</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => {
            const I = t.icon;
            return (
              <Link key={t.to} to={t.to} className="group">
                <Card className={`relative h-full overflow-hidden border-border bg-gradient-to-br ${t.tint} p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg`}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/60 backdrop-blur ring-1 ring-border">
                      <I className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{t.level}</Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{t.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t.blurb}</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.minutes} min read</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:gap-2 transition-all">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tips strip */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Sparkles, title: "Use ⌘K anywhere", body: "The command palette jumps to any module, action or record instantly." },
          { icon: ReceiptText, title: "Every doc auto-posts", body: "Invoices, receipts and bills create balanced journals automatically." },
          { icon: HelpCircle, title: "Hover the ? icons", body: "In-app help tooltips explain every field, tax code and status." },
        ].map((tip) => {
          const I = tip.icon;
          return (
            <Card key={tip.title} className="p-5 border-border">
              <I className="h-5 w-5 text-primary mb-3" />
              <div className="font-semibold text-foreground">{tip.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{tip.body}</div>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Frequently asked</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-xl border border-border bg-card p-4 open:shadow-sm">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                <span className="font-semibold text-foreground">{f.q}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
