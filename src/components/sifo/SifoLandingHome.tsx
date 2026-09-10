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
      <section id="industry-demos" className="border-b border-white/10 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-amber-300">Demo · sample data only</div>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">Explore SifoBooks by industry</h2>
            <p className="mt-4 text-lg text-slate-400">Click through three complete sample businesses — a hotel, a school and a restaurant. Every figure is invented for the demo, and no real business data is involved.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { slug: "hotel", name: "SifoHotel", blurb: "Reservations, front desk, housekeeping, folios and the night audit that closes the day.", points: ["48-room sample property", "Guest folios & room charges", "Occupancy, ADR & RevPAR"] },
              { slug: "school", name: "SifoSchool", blurb: "Admissions, classes, attendance, exams, fee billing, receipts and arrears follow-up.", points: ["640 sample learners", "Fees, receipts & aging", "Exams and report cards"] },
              { slug: "restaurant", name: "SifoRestaurant", blurb: "Floor plan, kitchen display, split bills, recipe costing, wastage and shift cash-up.", points: ["Live table & course board", "Recipe cost and margin", "Cash-up with variance control"] },
            ].map((d) => (
              <div key={d.slug} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.04] p-6">
                <h3 className="text-xl font-bold">{d.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{d.blurb}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-500">{d.points.map((p) => <li key={p}>✓ {p}</li>)}</ul>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link to="/demo/$industry" params={{ industry: d.slug }} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0e8f4a] px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5">View demo <ArrowRight className="h-4 w-4" /></Link>
                  <Link to="/auth" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Start your own</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
            <div className="flex-1 min-w-[16rem]">
              <p className="text-sm font-bold text-amber-200">Demo access — no login required</p>
              <p className="mt-1 text-sm text-slate-400">The demos open straight away, so there are no shared demo passwords to hand out. Demo screens are read-only sample data and are completely separate from live company accounts.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/demo/$industry" params={{ industry: "hotel" }} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Hotel demo</Link>
              <Link to="/demo/$industry" params={{ industry: "school" }} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">School demo</Link>
              <Link to="/demo/$industry" params={{ industry: "restaurant" }} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Restaurant demo</Link>
              <Link to="/auth" className="rounded-xl bg-[#0e8f4a] px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5">Create your SifoBooks account</Link>
            </div>
          </div>
        </div>
      </section>
      <div id="whiteboard"><SifoLandingPresentation /></div>
    </main>
  );
}
