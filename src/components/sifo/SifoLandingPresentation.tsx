import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Banknote,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileSearch,
  Globe2,
  Landmark,
  Play,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";

const MODULES = [
  { key: "accounting", name: "Accounting", icon: Landmark, tone: "#0e8f4a", summary: "Turn transactions into a controlled, audit-ready ledger.", steps: ["Capture invoices, bills and receipts", "Post balanced entries automatically", "Review GL, trial balance and statements"] },
  { key: "sales", name: "Sales", icon: ReceiptText, tone: "#2563eb", summary: "Move from quotation to invoice to payment without losing the trail.", steps: ["Create quotations and invoices", "Track receivables and customer statements", "Follow every sale into inventory and the GL"] },
  { key: "purchases", name: "Purchases", icon: FileSearch, tone: "#f39200", summary: "Compare suppliers and control the purchase-to-pay journey.", steps: ["Request and compare quotations", "Raise purchase orders and receive goods", "Match supplier bills and payments"] },
  { key: "inventory", name: "Inventory", icon: Boxes, tone: "#7c3aed", summary: "Know what you have, where it is and how it moved.", steps: ["Manage warehouses, stores and outlets", "Trace transfers, receipts and adjustments", "Reconcile quantities and stock value"] },
  { key: "banking", name: "Banking", icon: Wallet, tone: "#0891b2", summary: "Bring bank activity into the accounting workflow.", steps: ["Import statements", "Smart-match transactions", "Review exceptions and reconcile"] },
  { key: "payroll", name: "Payroll & HR", icon: Users, tone: "#db2777", summary: "Manage people, payroll and statutory calculations together.", steps: ["Maintain employee records", "Calculate PAYE, NAPSA and NHIMA", "Review, approve, post and pay payroll"] },
  { key: "reports", name: "Reports", icon: BarChart3, tone: "#475569", summary: "See the business from transaction level to management level.", steps: ["Explore operational reports", "Drill into transactions and exceptions", "Export management and audit packs"] },
  { key: "compliance", name: "Compliance", icon: ShieldCheck, tone: "#dc2626", summary: "Keep statutory obligations visible and controlled.", steps: ["Track filing obligations", "Review deadlines and liabilities", "Prepare filing-ready information"] },
];

const PUBLIC = [
  { name: "Public Jobs", icon: BriefcaseBusiness, text: "Publish vacancies and receive applications without exposing private company data." },
  { name: "Supplier Quotations", icon: FileCheck2, text: "Give suppliers a controlled channel to submit quotations for evaluation." },
  { name: "Customer Services", icon: Globe2, text: "Connect customers to secure requests, verification and service workflows." },
];

export function SifoLandingPresentation() {
  const [active, setActive] = useState(0);
  const [presentation, setPresentation] = useState(false);
  const [step, setStep] = useState(0);
  const current = MODULES[active];

  const progress = useMemo(() => ((active + 1) / MODULES.length) * 100, [active]);

  const selectModule = (index: number) => {
    setActive(index);
    setStep(0);
  };

  const next = () => {
    if (step < current.steps.length - 1) setStep((v) => v + 1);
    else if (active < MODULES.length - 1) { setActive((v) => v + 1); setStep(0); }
  };

  const previous = () => {
    if (step > 0) setStep((v) => v - 1);
    else if (active > 0) { setActive((v) => v - 1); setStep(MODULES[active - 1].steps.length - 1); }
  };

  return (
    <section className="relative overflow-hidden bg-[#f7f7f2] py-24 text-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(#d7ddd6_1px,transparent_1px),linear-gradient(90deg,#d7ddd6_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.4fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0e8f4a]/25 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#0e8f4a] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Interactive business whiteboard
            </div>
            <h2 className="max-w-2xl text-4xl font-black tracking-tight md:text-6xl">See how the whole business connects.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">SifoBooks is more than an accounting screen. Follow the flow from the first business event to the final report — then open the module you want to explore.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-[#0e8f4a] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#0e8f4a]/20 transition hover:-translate-y-0.5">Start with SifoBooks <ArrowRight className="h-4 w-4" /></Link>
              <button onClick={() => setPresentation(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5"><Play className="h-4 w-4" /> Launch presentation</button>
            </div>
          </div>

          <div className="relative rounded-[2rem] border-2 border-slate-300 bg-white/90 p-4 shadow-[0_25px_80px_-45px_rgba(15,23,42,.45)] md:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-dashed border-slate-300 pb-4">
              <div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Business flow</div><div className="font-bold">Capture → Process → Control → Report</div></div>
              <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold sm:block">Whiteboard view</div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[{ t: "Capture", i: ReceiptText }, { t: "Process", i: Boxes }, { t: "Control", i: ShieldCheck }, { t: "Report", i: BarChart3 }].map((n, i) => (
                <div key={n.t} className="relative rounded-2xl border border-dashed border-slate-300 bg-[#fafaf7] p-4 text-center">
                  <n.i className="mx-auto mb-2 h-5 w-5 text-[#0e8f4a]" />
                  <div className="text-sm font-bold">{n.t}</div>
                  {i < 3 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 bg-white text-slate-400 sm:block" />}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Module journey</span><span>{active + 1} / {MODULES.length}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#0e8f4a] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl border-2 border-slate-300 bg-white/85 p-3 shadow-sm">
            <div className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-widest text-slate-400">Choose a module</div>
            <div className="grid gap-1.5">
              {MODULES.map((m, index) => {
                const Icon = m.icon;
                const selected = index === active;
                return <button key={m.key} onClick={() => selectModule(index)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected ? "bg-slate-100 shadow-sm" : "hover:bg-slate-50"}`}><span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${m.tone}16`, color: m.tone }}><Icon className="h-4 w-4" /></span><span className="flex-1 text-sm font-bold">{m.name}</span>{selected && <ArrowRight className="h-4 w-4" style={{ color: m.tone }} />}</button>;
              })}
            </div>
          </aside>

          <div className="rounded-[2rem] border-2 border-slate-300 bg-white/90 p-5 shadow-sm md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: `${current.tone}18`, color: current.tone }}><current.icon className="h-7 w-7" /></div>
                <div><div className="text-xs font-bold uppercase tracking-widest" style={{ color: current.tone }}>Module {active + 1}</div><h3 className="mt-1 text-3xl font-black">{current.name}</h3><p className="mt-2 max-w-2xl text-slate-600">{current.summary}</p></div>
              </div>
              <button onClick={() => setPresentation(true)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50">Present this module</button>
            </div>

            <div className="relative mt-8 grid gap-3 md:grid-cols-3">
              {current.steps.map((s, i) => <button key={s} onClick={() => setStep(i)} className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-300 ${i === step ? "border-slate-400 -translate-y-1 shadow-lg" : "border-dashed border-slate-200 hover:border-slate-300"}`}><div className="mb-3 flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-full text-xs font-black text-white" style={{ background: current.tone }}>{i + 1}</span>{i === step && <CheckCircle2 className="h-4 w-4" style={{ color: current.tone }} />}</div><div className="text-sm font-bold leading-6">{s}</div>{i < current.steps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 bg-white text-slate-300 md:block" />}</button>)}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-300 pt-5">
              <div className="flex items-center gap-2 text-xs text-slate-500"><Building2 className="h-4 w-4" /> Company-scoped • role-controlled • audit-ready</div>
              <div className="flex gap-2"><button disabled={active === 0 && step === 0} onClick={previous} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button onClick={next} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: current.tone }}>{active === MODULES.length - 1 && step === current.steps.length - 1 ? "Finish" : "Next"}<ChevronRight className="h-4 w-4" /></button></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PUBLIC.map((item) => <div key={item.name} className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5"><item.icon className="h-5 w-5 text-[#0e8f4a]" /><div className="mt-3 font-bold">{item.name}</div><p className="mt-1.5 text-sm leading-6 text-slate-500">{item.text}</p></div>)}
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400"><ArrowDown className="h-4 w-4" /> Every workflow ultimately feeds visibility, control and decisions.</div>
      </div>

      {presentation && <div className="fixed inset-0 z-[100] bg-slate-950/80 p-3 backdrop-blur-sm md:p-8">
        <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#f7f7f2] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-[#0e8f4a]">SifoBooks presentation</div><div className="font-black">{current.name}</div></div><button onClick={() => setPresentation(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"><X className="h-4 w-4" /></button></div>
          <div className="flex-1 overflow-auto p-5 md:p-10"><div className="mx-auto max-w-4xl"><div className="text-sm font-bold" style={{ color: current.tone }}>01 — {current.name}</div><h3 className="mt-2 text-4xl font-black md:text-6xl">{current.summary}</h3><div className="mt-10 grid gap-4 md:grid-cols-3">{current.steps.map((s, i) => <div key={s} className={`rounded-3xl border-2 bg-white p-6 transition ${i === step ? "-translate-y-1 border-slate-400 shadow-xl" : "border-slate-200"}`}><span className="grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white" style={{ background: current.tone }}>{i + 1}</span><p className="mt-5 font-bold leading-7">{s}</p></div>)}</div></div></div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-white/90 px-5 py-4"><button onClick={previous} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold"><ChevronLeft className="h-4 w-4" /> Previous</button><span className="text-xs font-bold text-slate-400">Module {active + 1} of {MODULES.length}</span><button onClick={next} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: current.tone }}>Next <ChevronRight className="h-4 w-4" /></button></div>
        </div>
      </div>}
    </section>
  );
}
