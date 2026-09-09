import { Link } from "@tanstack/react-router";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { SifoLandingPresentation } from "@/components/sifo/SifoLandingPresentation";

export function SifoLandingHome() {
  return (
    <main className="min-h-screen bg-[#06110c] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(14,143,74,.28),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,.14),transparent_30%)] py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7dd3a5]/25 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#7dd3a5]"><Sparkles className="h-4 w-4" /> Business management, visually connected</div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">One platform for the way your business actually works.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">Accounting, sales, purchases, inventory, banking, payroll, compliance and business operations — connected from the first transaction to the final report.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-[#0e8f4a] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#0e8f4a]/20 transition hover:-translate-y-0.5">Start with SifoBooks <ArrowRight className="h-4 w-4" /></Link>
              <a href="#whiteboard" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"><Play className="h-4 w-4" /> Explore the whiteboard</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-500"><span>✓ Multi-company</span><span>✓ Zambia-ready compliance</span><span>✓ Role-based access</span><span>✓ Audit trail</span></div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[.04] p-5 shadow-2xl shadow-black/30">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1f16] p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">Live business map</span><span className="rounded-full bg-[#0e8f4a]/15 px-3 py-1 text-[10px] font-bold text-[#7dd3a5]">CONNECTED</span></div>
              <div className="grid grid-cols-2 gap-3 py-5 md:grid-cols-4">{["Sales","Purchases","Inventory","Banking","Payroll","Compliance","Reports","Accounting"].map((x) => <div key={x} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-center text-xs font-bold text-slate-300">{x}</div>)}</div>
              <div className="rounded-xl border border-dashed border-[#0e8f4a]/40 bg-[#0e8f4a]/10 p-4 text-center text-sm font-bold text-[#b7f2cd]">Every workflow feeds one controlled business record.</div>
            </div>
          </div>
        </div>
      </section>
      <div id="whiteboard"><SifoLandingPresentation /></div>
    </main>
  );
}
