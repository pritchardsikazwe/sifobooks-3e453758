import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/vat-zra")({
  head: () => ({
    meta: [
      { title: "VAT & ZRA Compliance — SifoBooks Learn" },
      { name: "description", content: "Standard-rated, zero-rated and exempt sales; input vs output VAT; VAT 3 filing timing for Zambian businesses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VatLearn,
});

const RATES = [
  { code: "VAT 16%", tint: "text-primary", use: "Standard-rated sales — most goods and services.", claim: "Yes, you charge output VAT and reclaim input VAT.", icon: CheckCircle2 },
  { code: "Zero-rated", tint: "text-sky-500", use: "Exports, certain foodstuffs, medicines.", claim: "You charge 0% but can still reclaim input VAT.", icon: CheckCircle2 },
  { code: "Exempt", tint: "text-amber-500", use: "Financial services, education, health, residential rent.", claim: "No VAT charged, and you cannot reclaim input VAT.", icon: XCircle },
  { code: "Turnover Tax 5%", tint: "text-violet-500", use: "Small businesses under the TOT threshold — not VAT-registered.", claim: "Flat 5% on gross turnover, no input recovery.", icon: AlertTriangle },
];

function VatLearn() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/learn" className="hover:text-foreground">Learn Centre</Link>
        <span>/</span><span className="text-foreground">VAT & ZRA</span>
      </div>

      <header className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/15 to-transparent p-8">
        <Badge variant="secondary" className="mb-3">Intermediate · 10 min</Badge>
        <div className="flex items-start gap-4">
          <div className="hidden sm:grid h-12 w-12 place-items-center rounded-2xl bg-red-500 text-white"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">VAT & ZRA Compliance</h1>
            <p className="mt-2 text-muted-foreground">The four ways your sales can be taxed in Zambia — and how SifoBooks handles each automatically.</p>
          </div>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 gap-4">
        {RATES.map((r) => {
          const I = r.icon;
          return (
            <Card key={r.code} className="p-5 border-border">
              <div className="flex items-center gap-3 mb-2">
                <I className={`h-5 w-5 ${r.tint}`} />
                <div className="font-bold text-foreground">{r.code}</div>
              </div>
              <div className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Use for:</span> {r.use}</div>
              <div className="text-sm text-muted-foreground mt-2"><span className="font-semibold text-foreground">Input VAT:</span> {r.claim}</div>
            </Card>
          );
        })}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">Output vs Input VAT — the basic idea</h2>
        <Card className="p-6 border-border space-y-3 text-sm text-muted-foreground">
          <p><span className="font-semibold text-foreground">Output VAT</span> is what you <em>collect</em> from customers when you sell.</p>
          <p><span className="font-semibold text-foreground">Input VAT</span> is what you <em>pay</em> to suppliers when you buy business inputs.</p>
          <div className="rounded-lg bg-muted/50 p-4 border border-border font-mono text-foreground">
            VAT payable to ZRA  =  Output VAT (sales)  −  Input VAT (purchases)
          </div>
          <p>If input exceeds output, you're in a refund/carry-forward position.</p>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">Filing calendar</h2>
        <Card className="overflow-hidden border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr><th className="text-left p-3">Return</th><th className="text-left p-3">Frequency</th><th className="text-left p-3">Due</th></tr>
            </thead>
            <tbody>
              {[
                ["VAT 3", "Monthly", "18th of the following month"],
                ["PAYE", "Monthly", "14th of the following month"],
                ["Turnover Tax", "Monthly", "14th of the following month"],
                ["WHT", "Monthly", "14th of the following month"],
                ["Provisional Income Tax", "Quarterly", "10 April / 10 July / 10 October / 10 January"],
                ["Annual Return", "Yearly", "21 June (of the following year)"],
              ].map(([r, f, d]) => (
                <tr key={r} className="border-t border-border">
                  <td className="p-3 font-semibold text-foreground">{r}</td>
                  <td className="p-3">{f}</td>
                  <td className="p-3 text-muted-foreground">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <Link to="/compliance" className="rounded-xl border border-border p-4 hover:border-primary/50 transition"><div className="font-semibold text-foreground">Open Compliance Centre</div><div className="text-sm text-muted-foreground mt-1">See what's due next and generate the return.</div><span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-semibold">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>
        <Link to="/reports" className="rounded-xl border border-border p-4 hover:border-primary/50 transition"><div className="font-semibold text-foreground">Open Reports Hub</div><div className="text-sm text-muted-foreground mt-1">VAT summary, output & input registers.</div><span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-semibold">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>
      </section>
    </div>
  );
}
