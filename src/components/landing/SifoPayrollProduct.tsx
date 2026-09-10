import { Link } from "@tanstack/react-router";
import { ArrowRight, Banknote, ShieldCheck, Users, FileText } from "lucide-react";
import { SectionHead } from "@/components/landing/SifoBrand";

const POINTS = [
  { icon: Users, title: "Employees and pay components", body: "Register, grades, allowances, overtime, loans and once-off items — set up once, used every month." },
  { icon: Banknote, title: "Gross to net, reviewed before payday", body: "Calculate the run, catch missing bank or statutory details, then approve. Whoever prepared it cannot approve it." },
  { icon: ShieldCheck, title: "PAYE, NAPSA and NHIMA", body: "Returns prepared, validated and reconciled to the run, with rates held by effective date rather than hard-coded." },
  { icon: FileText, title: "Payslips and payments", body: "Branded, password-protected payslips and a bank or mobile-money payment batch that ties back to the approved run." },
];

/**
 * SifoPayroll as a standalone product. Payroll can be bought on its own; the
 * ledger is only involved once Accounting is switched on.
 */
export function SifoPayrollProduct() {
  return (
    <section id="payroll" className="relative border-t border-sifo-line/60 bg-sifo-ink-2 py-16 sifo-edge md:py-24">
      <div className="pointer-events-none absolute inset-0 sifo-ledger opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHead
          eyebrow="SifoPayroll"
          title="Buy payroll on its own"
          lede="You do not need the whole system to pay your staff properly. SifoPayroll runs as a standalone product — employees, payslips and Zambian statutory returns — and connects to the books later if you ever want it to."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {POINTS.map((p) => (
            <article key={p.title} className="rounded-2xl border border-sifo-line/70 bg-sifo-ink p-5 md:p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sifo-mint/12 text-sifo-mint">
                <p.icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold tracking-tight text-white">{p.title}</h3>
              <p className="mt-1.5 text-[13px] leading-6 text-sifo-haze">{p.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <Link to="/auth" search={{ tab: "signup" }} className="sifo-btn sifo-btn-primary">
            Start with Payroll <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/demo/$industry" params={{ industry: "payroll" }} className="sifo-btn sifo-btn-ghost">
            Try the Payroll demo
          </Link>
        </div>

        <p className="mt-5 max-w-3xl text-[12.5px] leading-6 text-sifo-haze">
          Payroll-only companies calculate pay, produce payslips and prepare statutory returns without an accounting
          ledger. Switch Accounting on whenever you are ready and payroll starts posting to the same books — nothing is
          re-entered. Statutory filing uses your own ZRA and NAPSA credentials.
        </p>
      </div>
    </section>
  );
}
