import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Banknote, Boxes, BriefcaseBusiness, CheckCircle2,
  ChevronRight, FileSearch, FileText, Globe2, Landmark, Play, ReceiptText,
  ShieldCheck, Sparkles, Wallet, Workflow, X,
} from "lucide-react";

const MODULES = [
  { id: "accounting", name: "Accounting", icon: Wallet, tone: "#15803D", summary: "Books, journals, ledgers and period close", items: ["Chart of accounts", "Journals & recurring entries", "Cashbook", "General ledger", "Period close"] },
  { id: "sales", name: "Sales", icon: ReceiptText, tone: "#0D9488", summary: "Quote-to-cash with customer control", items: ["Quotations", "Invoices & VAT", "Receipts & allocations", "Customer statements", "Receivables"] },
  { id: "purchases", name: "Purchases", icon: FileText, tone: "#EA580C", summary: "Procure, compare, receive and pay", items: ["Purchase orders", "Quotation comparison", "Goods receipts", "Supplier bills", "Payables"] },
  { id: "inventory", name: "Inventory", icon: Boxes, tone: "#CA8A04", summary: "Know what you have and where it is", items: ["Multi-location stock", "Transfers", "Stock takes", "Valuation", "Inventory audit"] },
  { id: "banking", name: "Banking", icon: Landmark, tone: "#2563EB", summary: "Import, match and reconcile", items: ["Statement import", "Smart matching", "Allocations", "Reconciliation", "Audit trail"] },
  { id: "payroll", name: "Payroll & HR", icon: Banknote, tone: "#7C3AED", summary: "Payroll, people and statutory schedules", items: ["PAYE", "NAPSA & NHIMA", "Payslips", "Leave & timesheets", "Jobs & recruitment"] },
  { id: "reports", name: "Reports", icon: BarChart3, tone: "#4F46E5", summary: "Live management and financial reporting", items: ["P&L", "Balance sheet", "Cash flow", "Management packs", "PDF / Excel / CSV"] },
  { id: "compliance", name: "Compliance", icon: ShieldCheck, tone: "#DC2626", summary: "Stay ahead of statutory obligations", items: ["VAT", "PAYE", "Filing calendar", "Compliance health", "Audit controls"] },
];

const PUBLIC_TOOLS = [
  { name: "Public Jobs", icon: BriefcaseBusiness, text: "Share a vacancy link and receive applications into the private recruitment workspace." },
  { name: "Quotation Submission", icon: FileSearch, text: "Let suppliers submit quotations digitally for internal comparison." },
  { name: "Customer Services", icon: Globe2, text: "Publish controlled onboarding, service, catalogue and document experiences." },
];

const FLOW = [
  { title: "Capture", text: "Invoice, bill, sale, purchase order, stock movement or bank statement." },
  { title: "Process", text: "Rules, approvals, matching and validation keep the transaction controlled." },
  { title: "Post", text: "The accounting and inventory effects stay connected to the source document." },
  { title: "Control", text: "Reconcile, review exceptions, audit activity and lock completed periods." },
  { title: "Report", text: "Turn live transactions into financial, management and compliance reports." },
];

export function SifoLandingWhiteboard() {
  const [active, setActive] = useState(MODULES[0].id);
  const [presentation, setPresentation] = useState(false);
  const selected = useMemo(() => MODULES.find((m) => m.id === active) ?? MODULES[0], [active]);

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900">
      <section className="relative overflow-hidden border-b bg-white">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#dbe7df_1px,transparent_1px),linear-gradient(90deg,#dbe7df_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" /> SifoBooks Business OS
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                One visual workspace for the whole business.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Explore the SifoBooks ecosystem like a whiteboard: every department, workflow and public service connected to the same controlled business records.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-800">Start with SifoBooks <ArrowRight className="h-4 w-4" /></Link>
                <button onClick={() => setPresentation(true)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-6 py-3.5 font-bold transition hover:-translate-y-0.5 hover:border-emerald-300"><Play className="h-4 w-4" /> Launch presentation</button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Accounting connected</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Zambia-focused</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Public/private boundary</span>
              </div>
            </div>

            <div className="relative rounded-[2rem] border-2 border-slate-200 bg-[#fffef7] p-5 shadow-2xl shadow-slate-300/40 rotate-[0.4deg]">
              <div className="flex items-center justify-between border-b border-dashed pb-4">
                <div className="flex items-center gap-2 font-bold"><Workflow className="h-5 w-5 text-emerald-700" /> Business flow</div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Live model</span>
              </div>
              <div className="py-5">
                {FLOW.map((step, i) => (
                  <div key={step.title} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < FLOW.length - 1 && <div className="absolute left-4 top-9 h-full border-l-2 border-dashed border-slate-300" />}
                    <div className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-emerald-600 bg-white text-xs font-black text-emerald-700">{i + 1}</div>
                    <div><div className="font-bold">{step.title}</div><p className="mt-0.5 text-sm leading-6 text-slate-500">{step.text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><div className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Interactive whiteboard</div><h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Click a department. See the system behind it.</h2></div>
          <div className="rounded-full border bg-white px-4 py-2 text-xs font-semibold text-slate-500">8 core modules · connected workflows</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            {MODULES.map((m) => {
              const Icon = m.icon; const on = m.id === active;
              return <button key={m.id} onClick={() => setActive(m.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${on ? "-translate-y-0.5 shadow-md" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`} style={on ? { borderColor: `${m.tone}55`, background: `${m.tone}0d` } : undefined}>
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: m.tone, background: `${m.tone}15` }}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-bold">{m.name}</span><span className="block truncate text-xs text-slate-500">{m.summary}</span></span><ChevronRight className="h-4 w-4 text-slate-300" />
              </button>;
            })}
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-slate-200 bg-[#fffef7] p-6 shadow-xl md:p-9">
            <div className="absolute right-5 top-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">SifoBooks module map</div>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl"><div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ color: selected.tone, background: `${selected.tone}16` }}><selected.icon className="h-7 w-7" /></div><h3 className="mt-5 text-3xl font-black">{selected.name}</h3><p className="mt-2 text-slate-600">{selected.summary}. This module is designed to connect operational work to controlled records, approvals, audit and reporting.</p></div>
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm"><div className="font-bold">Connected to</div><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1">Ledger</span><span className="rounded-full bg-slate-100 px-2.5 py-1">Audit</span><span className="rounded-full bg-slate-100 px-2.5 py-1">Reports</span></div></div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {selected.items.map((item, i) => <div key={item} className="group rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 transition hover:-translate-y-1 hover:border-slate-400"><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-black text-white" style={{ background: selected.tone }}>{i + 1}</span><span className="font-semibold">{item}</span></div><div className="mt-3 h-px w-full bg-slate-100" /><div className="mt-2 text-[11px] text-slate-400">Operational record → control → reporting</div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-2xl"><div className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Beyond accounting</div><h2 className="mt-2 text-3xl font-black md:text-4xl">Public tools bring the outside world into controlled workflows.</h2><p className="mt-3 text-slate-600">Customers, suppliers and applicants can interact with a company without entering its private SifoBooks workspace.</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PUBLIC_TOOLS.map((tool) => { const Icon = tool.icon; return <div key={tool.name} className="rounded-2xl border bg-[#fffef7] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></div><h3 className="mt-4 font-black">{tool.name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{tool.text}</p></div>; })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] bg-slate-950 p-7 text-white md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">The SifoBooks idea</div><h2 className="mt-3 text-3xl font-black md:text-4xl">Capture once. Control everywhere. Report from the same truth.</h2><p className="mt-3 max-w-2xl leading-7 text-slate-400">The landing experience now presents SifoBooks as a connected business platform rather than a collection of isolated accounting screens.</p></div><Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold transition hover:bg-emerald-500">Explore SifoBooks <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      {presentation && <div className="fixed inset-0 z-[100] bg-slate-950/80 p-4 backdrop-blur-md md:p-8" role="dialog" aria-modal="true"><div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#fffef7] shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><div className="text-xs font-black uppercase tracking-widest text-emerald-700">SifoBooks whiteboard presentation</div><div className="font-bold">{selected.name} · module overview</div></div><button onClick={() => setPresentation(false)} aria-label="Close presentation" className="grid h-9 w-9 place-items-center rounded-full border hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="grid flex-1 overflow-auto lg:grid-cols-[240px_1fr]"><div className="border-r bg-white p-3">{MODULES.map((m) => <button key={m.id} onClick={() => setActive(m.id)} className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"><m.icon className="h-4 w-4" style={{ color: m.tone }} />{m.name}</button>)}</div><div className="relative p-6 md:p-10"><div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(#dbe7df_1px,transparent_1px),linear-gradient(90deg,#dbe7df_1px,transparent_1px)] [background-size:36px_36px]" /><div className="relative max-w-4xl"><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Presentation board</div><h3 className="mt-2 text-4xl font-black">{selected.name}</h3><p className="mt-3 max-w-2xl text-slate-600">{selected.summary}. The presentation board maps the operational capabilities that belong in this module and the controls that keep them connected.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{selected.items.map((item, i) => <div key={item} className="rounded-2xl border-2 border-dashed bg-white/90 p-5 shadow-sm"><div className="text-xs font-bold uppercase tracking-widest" style={{ color: selected.tone }}>Capability {i + 1}</div><div className="mt-2 text-lg font-black">{item}</div><div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><span>Input</span><ChevronRight className="h-3 w-3" /><span>Control</span><ChevronRight className="h-3 w-3" /><span>Output</span></div></div>)}</div><div className="mt-8 flex flex-wrap gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Connected ledger</span><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Audit trail</span><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">Reports</span></div></div></div></div></div></div>}
    </div>
  );
}
