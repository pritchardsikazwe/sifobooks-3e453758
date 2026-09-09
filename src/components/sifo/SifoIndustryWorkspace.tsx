import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BedDouble, CalendarCheck, CheckCircle2, ClipboardCheck, CreditCard, GraduationCap, House, Search, Users, WalletCards } from "lucide-react";

type Kind = "hotel" | "school";
type Screen = string;

const hotelNav = [
  ["Reservations", "/hotel/reservations", CalendarCheck], ["Room Rack", "/hotel/room-rack", BedDouble], ["Front Desk", "/hotel/front-desk", House],
  ["Housekeeping", "/hotel/housekeeping", ClipboardCheck], ["Guests", "/hotel/guests", Users], ["Folios", "/hotel/folios", CreditCard],
];
const schoolNav = [
  ["Admissions", "/school/admissions", Users], ["Students", "/school/students", GraduationCap], ["Academics", "/school/academics", ClipboardCheck],
  ["Attendance", "/school/attendance", CalendarCheck], ["Exams", "/school/exams", CheckCircle2], ["Fees", "/school/fees", WalletCards],
];

const hotelRows = [
  ["RES-2026-1048", "Thabo Banda", "Deluxe King", "10 Sep", "13 Sep", "Confirmed", "K 8,400"],
  ["RES-2026-1049", "Mwamba Phiri", "Executive Twin", "10 Sep", "12 Sep", "Checked in", "K 5,600"],
  ["RES-2026-1050", "Sarah Tembo", "Standard Queen", "11 Sep", "15 Sep", "Pending deposit", "K 7,200"],
  ["RES-2026-1051", "David Chanda", "Suite", "12 Sep", "14 Sep", "Confirmed", "K 6,800"],
];
const schoolRows = [
  ["APP-2027-0041", "Chanda Mulenga", "Grade 8", "10 Sep", "New", "Documents 4/6"],
  ["APP-2027-0042", "Naledi Phiri", "Grade 5", "10 Sep", "Review", "Documents 6/6"],
  ["APP-2027-0043", "Moses Banda", "Grade 10", "11 Sep", "Interview", "Documents 5/6"],
  ["APP-2027-0044", "Ruth Tembo", "Grade 7", "12 Sep", "Approved", "Enrolment ready"],
];

export function SifoIndustryWorkspace({ kind, screen }: { kind: Kind; screen: Screen }) {
  const hotel = kind === "hotel";
  const nav = hotel ? hotelNav : schoolNav;
  const [query, setQuery] = useState("");
  const rows = hotel ? hotelRows : schoolRows;
  const filtered = useMemo(() => rows.filter(row => row.join(" ").toLowerCase().includes(query.toLowerCase())), [query, rows]);
  const title = hotel ? "Reservations & Front Office" : "Admissions & Enrolment";
  const subtitle = hotel ? "Manage availability, guest stays, deposits and the front-office lifecycle." : "Manage applications, document checks, approvals and learner enrolment.";
  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-6 py-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">SifoBooks {hotel ? "Hotel ERP" : "School ERP"}</div><h1 className="mt-1 text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><Link to={hotel ? "/hotel" : "/school"} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Workspace dashboard</Link></div>
    <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">{nav.map(([label, to, Icon]) => <Link key={label as string} to={to as string} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${screen === to ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{label as string}</Link>)}</nav></div></header>
    <section className="mx-auto max-w-7xl px-6 py-7"><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-semibold text-slate-500">{hotel ? "Today's arrivals" : "Applications to review"}</div><div className="mt-2 text-2xl font-bold">{hotel ? "12" : "14"}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-semibold text-slate-500">{hotel ? "Pending action" : "Document exceptions"}</div><div className="mt-2 text-2xl font-bold">{hotel ? "7" : "5"}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-semibold text-slate-500">{hotel ? "Today's value" : "Application fees"}</div><div className="mt-2 text-2xl font-bold">{hotel ? "K 86,420" : "K 18,600"}</div></div></div>
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5"><div><h2 className="font-bold">{hotel ? "Reservation board" : "Application pipeline"}</h2><p className="text-xs text-slate-500">Demo operational data until the sector schema is connected.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className="w-40 bg-transparent text-sm outline-none" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{(hotel ? ["Reference","Guest","Room type","Check-in","Check-out","Status","Value"] : ["Application","Applicant","Class","Date","Stage","Documents"]).map(h => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{filtered.map((row, i) => <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">{row.map((cell, j) => <td key={j} className={`px-5 py-4 ${j === row.length - 2 ? "font-semibold" : ""}`}>{cell}</td>)}</tr>)}</tbody></table></div>
      </div>
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Integration rule:</strong> operational actions will post through existing SifoBooks accounting, inventory, POS, payroll and reporting services. No duplicate finance engine is introduced.</div>
    </section></main>;
}
