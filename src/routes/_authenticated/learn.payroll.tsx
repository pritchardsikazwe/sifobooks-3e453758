import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, ArrowRight, Calculator, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/payroll")({
  head: () => ({
    meta: [
      { title: "Zambian Payroll — SifoBooks Learn" },
      { name: "description", content: "PAYE 2026 bands, NAPSA, NHIMA, WCF and SDL explained with worked examples in ZMW." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayrollLearn,
});

const BANDS_2026 = [
  { range: "0 – 5,100", rate: "0%", note: "Tax-free threshold" },
  { range: "5,101 – 7,100", rate: "20%", note: "First taxable band" },
  { range: "7,101 – 9,200", rate: "30%", note: "Middle band" },
  { range: "Above 9,200", rate: "37%", note: "Top band" },
];

const STATUTORY = [
  { name: "NAPSA", er: "5%", ee: "5%", cap: "Capped monthly (K1,342.40 in 2026)", due: "10th of following month" },
  { name: "NHIMA", er: "1%", ee: "1%", cap: "Uncapped, on basic salary", due: "10th of following month" },
  { name: "WCF", er: "1.5%", ee: "—", cap: "Employer-only, on gross wages", due: "Annual return" },
  { name: "SDL", er: "0.5%", ee: "—", cap: "Employer-only, on gross wages", due: "14th of following month" },
  { name: "PAYE", er: "—", ee: "per bands", cap: "Withheld from employee", due: "14th of following month" },
];

function PayrollLearn() {
  // Worked example: K10,000 basic
  const gross = 10000;
  const napsa = Math.min(gross * 0.05, 1342.40);
  const nhima = gross * 0.01;
  const taxable = gross; // NAPSA is not deductible from taxable pay under current Zambian rules
  const paye =
    Math.max(0, Math.min(taxable, 7100) - 5100) * 0.20 +
    Math.max(0, Math.min(taxable, 9200) - 7100) * 0.30 +
    Math.max(0, taxable - 9200) * 0.37;
  const net = gross - napsa - nhima - paye;
  const wcf = gross * 0.015;
  const sdl = gross * 0.005;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/learn" className="hover:text-foreground">Learn Centre</Link>
        <span>/</span><span className="text-foreground">Zambian Payroll</span>
      </div>

      <header className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-transparent p-8">
        <Badge variant="secondary" className="mb-3">Intermediate · 15 min</Badge>
        <div className="flex items-start gap-4">
          <div className="hidden sm:grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-white"><Banknote className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Zambian Payroll — 2026 Ready</h1>
            <p className="mt-2 text-muted-foreground">Every rate SifoBooks uses to compute your payroll, with a worked example you can verify by hand.</p>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">PAYE bands (monthly, ZMW)</h2>
        <Card className="overflow-hidden border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr><th className="text-left p-3">Monthly income band</th><th className="text-left p-3">Rate</th><th className="text-left p-3">Note</th></tr>
            </thead>
            <tbody>
              {BANDS_2026.map((b) => (
                <tr key={b.range} className="border-t border-border">
                  <td className="p-3 font-mono tabular-nums">{b.range}</td>
                  <td className="p-3 font-semibold text-primary">{b.rate}</td>
                  <td className="p-3 text-muted-foreground">{b.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">Statutory contributions at a glance</h2>
        <Card className="overflow-hidden border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr><th className="text-left p-3">Scheme</th><th className="text-left p-3">Employer</th><th className="text-left p-3">Employee</th><th className="text-left p-3">Basis</th><th className="text-left p-3">Due</th></tr>
            </thead>
            <tbody>
              {STATUTORY.map((s) => (
                <tr key={s.name} className="border-t border-border">
                  <td className="p-3 font-semibold text-foreground">{s.name}</td>
                  <td className="p-3">{s.er}</td>
                  <td className="p-3">{s.ee}</td>
                  <td className="p-3 text-muted-foreground">{s.cap}</td>
                  <td className="p-3 text-muted-foreground">{s.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Worked example — K10,000 basic</h2>
        <Card className="p-6 border-border space-y-2 font-mono tabular-nums text-sm">
          {[
            ["Gross pay", gross],
            ["− NAPSA (5%, capped)", napsa],
            ["− NHIMA (1%)", nhima],
            ["− PAYE (per bands)", paye],
          ].map(([l, v]) => (
            <div key={String(l)} className="flex justify-between border-b border-border/60 py-1.5">
              <span className="text-muted-foreground">{l}</span>
              <span className="text-foreground">K {(v as number).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 text-base">
            <span className="font-semibold text-foreground">Net pay to employee</span>
            <span className="font-bold text-primary">K {net.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="pt-4 border-t border-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Employer also pays</div>
            <div className="flex justify-between py-1"><span>NAPSA (5%, capped)</span><span>K {napsa.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between py-1"><span>NHIMA (1%)</span><span>K {nhima.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between py-1"><span>WCF (1.5%)</span><span>K {wcf.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between py-1"><span>SDL (0.5%)</span><span>K {sdl.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}</span></div>
          </div>
        </Card>
        <Card className="mt-3 p-4 border-primary/30 bg-primary/5 flex gap-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>SifoBooks does this automatically for every employee, every run. Rates are configurable per financial year by Super Admin.</span>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">Try it in the app</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/employees" className="rounded-xl border border-border p-4 hover:border-primary/50 transition"><div className="font-semibold text-foreground">1. Add employees</div><div className="text-sm text-muted-foreground mt-1">Basic pay, TPIN, NAPSA & NHIMA numbers.</div><span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-semibold">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>
          <Link to="/payroll" className="rounded-xl border border-border p-4 hover:border-primary/50 transition"><div className="font-semibold text-foreground">2. Run a payroll</div><div className="text-sm text-muted-foreground mt-1">One click — payslips, ZRA schedules and bank files generated.</div><span className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-semibold">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>
        </div>
      </section>

      <Card className="p-5 border-primary/30 bg-primary/5 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Next up: <Link to="/learn/vat-zra" className="text-primary font-semibold hover:underline">VAT & ZRA compliance</Link>.
        </div>
      </Card>
    </div>
  );
}
