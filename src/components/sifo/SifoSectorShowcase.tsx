import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, BedDouble, BookOpen, Bus, CalendarCheck, CreditCard, GraduationCap, Hotel, House, ReceiptText, School, Sparkles, Users, UtensilsCrossed } from "lucide-react";

const SECTORS = [
  {
    key: "hotel",
    label: "Hotel & Hospitality",
    icon: Hotel,
    eyebrow: "Hospitality ERP",
    title: "Run rooms, guests, restaurants and finance from one workspace.",
    description: "A modern hotel operating layer connected to SifoBooks accounting, inventory and POS.",
    features: [
      ["Room Rack", "Live room status, occupancy and availability", BedDouble],
      ["Reservations", "Bookings, deposits, cancellations and guest profiles", CalendarCheck],
      ["Front Desk", "Fast check-in, check-out and folio management", House],
      ["Housekeeping", "Room cleaning boards, inspections and task status", Sparkles],
      ["Restaurant & Bar", "Table service and hotel POS linked to guest folios", UtensilsCrossed],
      ["Night Audit", "Daily close, revenue checks and exception control", BarChart3],
    ],
    links: [["Open Hotel Dashboard", "/hotel"], ["Hotel Reports", "/hotel/reports"]],
  },
  {
    key: "school",
    label: "School Management",
    icon: School,
    eyebrow: "Education ERP",
    title: "Connect admissions, learners, academics, fees and parents.",
    description: "A complete school management workspace with financial control powered by SifoBooks.",
    features: [
      ["Admissions", "Applications, enrolment, student records and onboarding", GraduationCap],
      ["Academics", "Classes, subjects, teachers, timetable and curriculum", BookOpen],
      ["Attendance", "Student and staff attendance with alerts and history", CalendarCheck],
      ["Exams & Results", "Assessment, grading, report cards and transcripts", BarChart3],
      ["Fees", "Fee structures, invoices, collections, balances and receipts", CreditCard],
      ["Parent Portal", "Secure communication, results, attendance and balances", Users],
    ],
    links: [["Open School Dashboard", "/school"], ["School Reports", "/school/reports"]],
  },
];

export function SifoSectorShowcase() {
  const [active, setActive] = useState("hotel");
  const sector = SECTORS.find((item) => item.key === active) ?? SECTORS[0];
  const Icon = sector.icon;

  return (
    <section id="sectors" className="relative overflow-hidden bg-white py-20 text-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Industry Workspaces</div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">One platform. Built for different businesses.</h2>
            <p className="mt-4 text-lg text-slate-600">Switch from core accounting into purpose-built hotel and school workflows without losing your financial control.</p>
          </div>
          <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {SECTORS.map((item) => {
              const ItemIcon = item.icon;
              const selected = item.key === active;
              return (
                <button key={item.key} type="button" onClick={() => setActive(item.key)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${selected ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-white"}`}>
                  <ItemIcon className="h-4 w-4" />{item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.6fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-2xl">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Icon className="h-7 w-7" /></div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{sector.eyebrow}</div>
            <h3 className="mt-3 text-3xl font-bold leading-tight">{sector.title}</h3>
            <p className="mt-4 leading-7 text-slate-300">{sector.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {sector.links.map(([label, to]) => <Link key={to} to={to} className="inline-flex items-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5">{label}</Link>)}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sector.features.map(([title, description, FeatureIcon]) => {
              const FIcon = FeatureIcon;
              return (
                <div key={title} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FIcon className="h-5 w-5" /></div>
                    <span className="text-xs font-bold text-slate-400">{sector.key === "hotel" ? "HOTEL" : "SCHOOL"}</span>
                  </div>
                  <h4 className="mt-5 text-lg font-bold">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
