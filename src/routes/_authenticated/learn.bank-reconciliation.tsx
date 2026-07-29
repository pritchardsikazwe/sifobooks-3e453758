import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, ArrowRight, Upload, Wand2, SplitSquareHorizontal, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/bank-reconciliation")({
  head: () => ({
    meta: [
      { title: "Bank Reconciliation — SifoBooks Learn" },
      { name: "description", content: "Import statements, apply rules, split allocations across accounts and reconcile in minutes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BankLearn,
});

const STEPS = [
  { icon: Upload, title: "Import your statement", body: "CSV, Excel or PDF (with OCR). SifoBooks fingerprints every line so duplicate imports are skipped automatically." },
  { icon: Wand2, title: "Let rules do the work", body: "Create match rules on description keywords, amounts or references. Each match auto-allocates to the right GL account or invoice." },
  { icon: SplitSquareHorizontal, title: "Split when needed", body: "A single bank line can be split across multiple accounts, projects or cost centres — SifoBooks tracks the running unallocated balance." },
  { icon: Check, title: "Reconcile the session", body: "Open a formal reconciliation session, tick off cleared items, and lock the period when statement + ledger match." },
];

function BankLearn() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/learn" className="hover:text-foreground">Learn Centre</Link>
        <span>/</span><span className="text-foreground">Bank Reconciliation</span>
      </div>

      <header className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-transparent p-8">
        <Badge variant="secondary" className="mb-3">Beginner · 8 min</Badge>
        <div className="flex items-start gap-4">
          <div className="hidden sm:grid h-12 w-12 place-items-center rounded-2xl bg-violet-500 text-white"><Landmark className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Bank Reconciliation, done right</h1>
            <p className="mt-2 text-muted-foreground">The four-step workflow SifoBooks uses to keep every bank and mobile money account tied out — no month-end panic.</p>
          </div>
        </div>
      </header>

      <ol className="space-y-4">
        {STEPS.map((s, i) => {
          const I = s.icon;
          return (
            <li key={s.title}>
              <Card className="p-5 border-border flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-500 font-bold ring-1 ring-violet-500/20">{i + 1}</div>
                <div>
                  <div className="flex items-center gap-2"><I className="h-4 w-4 text-primary" /><h3 className="font-bold text-foreground">{s.title}</h3></div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <section className="grid sm:grid-cols-3 gap-3">
        <Link to="/banking" className="rounded-xl border border-border p-4 hover:border-primary/50 transition"><div className="font-semibold text-foreground">Banking</div><div className="text-sm text-muted-foreground mt-1">Import statements and allocate.</div><span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-semibold">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>
        <Link to="/bank-rules" className="rounded-xl border border-border p-4 hover:border-primary/50 transition"><div className="font-semibold text-foreground">Bank Rules</div><div className="text-sm text-muted-foreground mt-1">Auto-match by keyword or amount.</div><span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-semibold">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>
        <Link to="/reconciliation-sessions" className="rounded-xl border border-border p-4 hover:border-primary/50 transition"><div className="font-semibold text-foreground">Reconciliation</div><div className="text-sm text-muted-foreground mt-1">Formal, lockable sessions.</div><span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-semibold">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>
      </section>
    </div>
  );
}
