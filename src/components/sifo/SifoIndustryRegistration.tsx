import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, HardHat, Hotel, Sparkles } from "lucide-react";

const industries = [
  {
    name: "Hotel Management",
    eyebrow: "SifoHotel",
    description: "Reservations, front desk, rooms, housekeeping, restaurant POS, guest folios, payments, inventory and hotel accounting.",
    features: ["Reservations & front desk", "Rooms & housekeeping", "Hotel POS & folios", "Night audit & accounting"],
    icon: Hotel,
    tone: "#2563eb",
  },
  {
    name: "School Management",
    eyebrow: "SifoSchool",
    description: "Admissions, students, academics, fees, payments, attendance, exams, report cards, boarding, transport and portals.",
    features: ["Admissions & student records", "Fees & payments", "Academics & exams", "Parent & student portals"],
    icon: GraduationCap,
    tone: "#7c3aed",
  },
  {
    name: "Mining Management",
    eyebrow: "SifoMining",
    description: "Mining operations, production, stock, mineral trading, permits, buyers, suppliers, costs, logistics and accounting.",
    features: ["Mining operations & production", "Mineral stock & traceability", "Trading & buyer management", "Permits, logistics & finance"],
    icon: HardHat,
    tone: "#d97706",
  },
] as const;

export function SifoIndustryRegistration() {
  return (
    <section className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.18em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Industry software
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Choose the SifoBooks solution built for your industry.</h2>
          <p className="mt-4 text-base leading-7 text-slate-400 sm:text-lg">Start with the software your organisation needs. Your account can grow into the full SifoBooks business platform as your operations expand.</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {industries.map(({ name, eyebrow, description, features, icon: Icon, tone }) => (
            <article key={name} className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[.04] p-6 shadow-2xl transition duration-200 hover:-translate-y-1 hover:bg-white/[.07]">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: `${tone}22`, color: tone }}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{eyebrow}</span>
              </div>
              <h3 className="mt-5 text-xl font-black">{name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
                {features.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition group-hover:bg-emerald-50">
                Register now <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-5 text-center sm:flex-row sm:text-left">
          <div>
            <div className="font-black">Ready to run your business on SifoBooks?</div>
            <div className="mt-1 text-sm text-slate-400">Register once and configure the modules your organisation needs.</div>
          </div>
          <Link to="/auth" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5">
            Create your SifoBooks account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
