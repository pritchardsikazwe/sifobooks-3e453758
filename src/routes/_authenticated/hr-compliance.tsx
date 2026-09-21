import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ShieldCheck, UsersRound, AlertTriangle, ClipboardCheck, Scale, BookOpen, ArrowRight } from "lucide-react";

const templates = [
  { code: "PERMANENT", name: "Permanent Employment Contract", type: "Permanent", tone: "bg-emerald-50 text-emerald-700" },
  { code: "FIXED_TERM", name: "Fixed-Term Employment Contract", type: "Fixed Term", tone: "bg-violet-50 text-violet-700" },
  { code: "CASUAL", name: "Casual / Short-Term Employment Contract", type: "Casual", tone: "bg-amber-50 text-amber-700" },
  { code: "INTERNSHIP", name: "Internship / Attachment Agreement", type: "Intern", tone: "bg-cyan-50 text-cyan-700" },
  { code: "VARIATION", name: "Contract Variation / Addendum", type: "Addendum", tone: "bg-blue-50 text-blue-700" },
  { code: "PROBATION", name: "Probation Confirmation / Extension", type: "Probation", tone: "bg-slate-100 text-slate-700" },
  { code: "PROMOTION", name: "Promotion / Salary Change Letter", type: "Change", tone: "bg-indigo-50 text-indigo-700" },
  { code: "TERMINATION", name: "Termination / Separation Letter", type: "Separation", tone: "bg-rose-50 text-rose-700" },
];

const checks = [
  ["WRITTEN_CONTRACT", "Written employment contract", "Employment Code Act — minimum particulars"],
  ["CONTRACT_ATTESTATION", "Contract attestation", "Track applicable MLSS attestation status"],
  ["PAYSLIPS", "Monthly payslips", "Issue and retain payslip evidence"],
  ["MINIMUM_WAGE", "Minimum wage", "Check against the applicable statutory instrument"],
  ["EMPLOYMENT_POLICIES", "HR policies", "Code of conduct, grievance, harassment, health/wellness"],
  ["LABOUR_STATISTICS", "Labour statistics", "Track required MLSS submissions"],
  ["WORKERS_COMP", "Workers' Compensation", "Registration and workplace incident controls"],
  ["NATIONAL_PENSION", "NAPSA", "Employee membership and payroll contribution controls"],
  ["HEALTH_INSURANCE", "NHIMA", "Employee membership and payroll contribution controls"],
];

export const Route = createFileRoute("/_authenticated/hr-compliance")({
  head: () => ({ meta: [{ title: "HR & Labour Compliance — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-full bg-slate-50/70 p-4 sm:p-6">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Zambia HR control centre
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Human Resources & Labour Compliance</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Manage employee contracts, HR documents, labour-law checklists and statutory evidence without changing the existing payroll workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/employees" className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"><UsersRound className="h-4 w-4" /> Employees</Link>
              <Link to="/payroll" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Payroll <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Contracts", "8", "Templates ready", FileText],
            ["Compliance", "9", "Core controls", ShieldCheck],
            ["Employee files", "—", "Link to employee master", UsersRound],
            ["Attention", "—", "Due / missing evidence", AlertTriangle],
          ].map(([label, value, hint, Icon]) => (
            <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><Icon className="h-5 w-5 text-slate-400" /></div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
              <div className="mt-1 text-xs text-slate-500">{hint}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Contract template library</h2><p className="text-xs text-slate-500">Versioned templates based on the statutory minimum particulars.</p></div><FileText className="h-5 w-5 text-slate-400" /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <div key={t.code} className="rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${t.tone}`}>{t.type}</span><span className="text-[10px] font-mono text-slate-400">{t.code}</span></div>
                  <div className="mt-3 text-sm font-medium text-slate-800">{t.name}</div>
                  <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline" type="button">Use template <ArrowRight className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Labour compliance checklist</h2><p className="text-xs text-slate-500">Turn each requirement into evidence and a review date.</p></div><ClipboardCheck className="h-5 w-5 text-slate-400" /></div>
            <div className="mt-4 space-y-2">
              {checks.map(([code, name, ref]) => (
                <div key={code} className="flex items-center gap-3 rounded-xl border px-3 py-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100"><ShieldCheck className="h-4 w-4 text-slate-500" /></div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-800">{name}</div><div className="truncate text-[11px] text-slate-500">{ref}</div></div>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">Review</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Scale className="h-5 w-5 text-slate-500" /><h2 className="font-semibold text-slate-900">HR controls SifoBooks should enforce</h2></div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["Contract completeness", "Block finalisation when statutory minimum particulars are missing."],
              ["Attestation tracking", "Store submission, reference, status and evidence instead of relying on paper files."],
              ["Policy acknowledgement", "Record employee acknowledgement and policy version."],
              ["Payroll linkage", "Use the employee contract terms to validate pay, benefits and contract dates."],
              ["Expiry alerts", "Alert HR before fixed-term contracts, probation and key documents expire."],
              ["Audit trail", "Record who created, changed, approved or terminated an employment record."],
            ].map(([title, desc]) => <div key={title} className="rounded-xl bg-slate-50 p-4"><div className="text-sm font-medium text-slate-800">{title}</div><div className="mt-1 text-xs leading-5 text-slate-600">{desc}</div></div>)}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs leading-5 text-amber-900">
          <div className="flex gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Legal safeguard:</strong> These templates are compliance-oriented starting points, not legal advice. SifoBooks should display the applicable law/version and require the employer to confirm the final contract and any MLSS attestation requirements before signing.</div></div>
        </section>
      </div>
    </div>
  ),
});
