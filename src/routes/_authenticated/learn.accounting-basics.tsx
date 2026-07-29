import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, BookOpen, Scale, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/accounting-basics")({
  head: () => ({
    meta: [
      { title: "Accounting Basics — SifoBooks" },
      { name: "description", content: "Learn debits, credits, double-entry and the Zambian statutory framework used across SifoBooks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountingBasicsPage,
});

const DR_CR_RULES: { type: string; increases: "Debit" | "Credit"; decreases: "Debit" | "Credit"; example: string }[] = [
  { type: "Asset", increases: "Debit", decreases: "Credit", example: "Cash, Bank, Receivables, Vehicles" },
  { type: "Expense", increases: "Debit", decreases: "Credit", example: "Rent, Salaries, Fuel" },
  { type: "Liability", increases: "Credit", decreases: "Debit", example: "Payables, PAYE Payable, Loans" },
  { type: "Equity", increases: "Credit", decreases: "Debit", example: "Capital, Retained Earnings" },
  { type: "Revenue", increases: "Credit", decreases: "Debit", example: "Sales, Grant Income" },
];

const SCENARIOS = [
  { title: "You issue an invoice for K10,000", dr: "Accounts Receivable  K10,000", cr: "Sales Revenue  K10,000", note: "Customer owes you (asset ↑) and you have earned income (revenue ↑)." },
  { title: "The customer pays you K10,000", dr: "Bank  K10,000", cr: "Accounts Receivable  K10,000", note: "Cash comes in (asset ↑) and the receivable clears (asset ↓)." },
  { title: "You pay salaries K25,000", dr: "Salaries Expense  K25,000", cr: "Bank  K25,000", note: "Expense increases and bank decreases." },
  { title: "PAYE withheld K3,500 to remit later", dr: "Salaries Expense  K3,500", cr: "PAYE Payable  K3,500", note: "You owe ZRA until the 14th (liability ↑)." },
];

const ZAMBIAN = [
  { name: "PAYE", detail: "Progressive bands. Employer withholds & remits to ZRA by the 14th." },
  { name: "NAPSA", detail: "5% employer + 5% employee, capped monthly. Remit to NAPSA by the 10th." },
  { name: "NHIMA", detail: "1% employer + 1% employee. Remit to NHIMA by the 10th." },
  { name: "Skills Dev. Levy", detail: "0.5% of gross wages (employer)." },
  { name: "Workers' Comp.", detail: "1.5% of gross wages (employer)." },
  { name: "VAT (Standard)", detail: "16% output tax on sales, less input tax on purchases. VAT 3 return monthly." },
  { name: "Turnover Tax", detail: "5% on gross turnover for eligible small businesses (not VAT-registered)." },
];

function AccountingBasicsPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Accounting Basics</h1>
          <p className="text-sm text-slate-500">Learn how SifoBooks records every transaction — the same way a professional accountant would.</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2"><Scale className="h-4 w-4 text-emerald-600" /><h2 className="font-semibold text-slate-900">Double-entry, in one sentence</h2></div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Every business transaction affects at least two accounts, and the total <strong>Debits</strong> must always equal the total <strong>Credits</strong>.
          SifoBooks does this for you automatically — but knowing the rules helps you post correctly and read the reports.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><BookOpen className="h-4 w-4 text-emerald-600" /><h2 className="font-semibold text-slate-900">Debit / Credit rules</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase border-b">
              <tr><th className="text-left py-2">Account type</th><th className="text-left">Increases with</th><th className="text-left">Decreases with</th><th className="text-left">Examples</th></tr>
            </thead>
            <tbody className="divide-y">
              {DR_CR_RULES.map(r => (
                <tr key={r.type}>
                  <td className="py-2 font-medium text-slate-900">{r.type}</td>
                  <td><Badge variant="secondary" className={r.increases === "Debit" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>{r.increases}</Badge></td>
                  <td><Badge variant="secondary" className={r.decreases === "Debit" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>{r.decreases}</Badge></td>
                  <td className="text-slate-600 text-xs">{r.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">Tip: open the <Link to="/chart-of-accounts" className="text-emerald-700 hover:underline">Chart of Accounts</Link> and click the info icon next to any account to see its purpose and normal balance.</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Common scenarios</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map(s => (
            <div key={s.title} className="rounded-lg border p-3">
              <div className="font-medium text-slate-900 text-sm mb-2">{s.title}</div>
              <div className="text-xs font-mono text-slate-700"><span className="text-blue-700">Dr</span>  {s.dr}</div>
              <div className="text-xs font-mono text-slate-700"><span className="text-emerald-700">Cr</span>  {s.cr}</div>
              <p className="text-xs text-slate-500 mt-2">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Try these live in the <Link to="/posting-wizard" className="text-emerald-700 hover:underline">Smart Posting Wizard</Link> — it previews the debits and credits before you save.</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><ShieldCheck className="h-4 w-4 text-emerald-600" /><h2 className="font-semibold text-slate-900">Zambian statutory framework</h2></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ZAMBIAN.map(z => (
            <div key={z.name} className="rounded border p-3">
              <div className="text-sm font-medium text-slate-900">{z.name}</div>
              <div className="text-xs text-slate-600 mt-1">{z.detail}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          SifoBooks is Zambia-focused accounting software aligned with applicable financial reporting frameworks and configurable statutory compliance rules.
          Rates are configurable and should be verified against current ZRA, NAPSA and NHIMA guidance.
        </p>
      </Card>
    </div>
  );
}
