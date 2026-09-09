import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BedDouble, CalendarCheck, CheckCircle2, ClipboardCheck, CreditCard, GraduationCap, House, Search, Users, WalletCards } from "lucide-react";

type Kind = "hotel" | "school";

type ScreenConfig = {
  title: string;
  subtitle: string;
  kpis: [string, string, string][];
  columns: string[];
  rows: string[][];
  action: string;
  actionHint: string;
};

const hotelNav = [
  ["Reservations", "/hotel/reservations", CalendarCheck], ["Room Rack", "/hotel/room-rack", BedDouble], ["Front Desk", "/hotel/front-desk", House],
  ["Housekeeping", "/hotel/housekeeping", ClipboardCheck], ["Guests", "/hotel/guests", Users], ["Folios", "/hotel/folios", CreditCard],
];
const schoolNav = [
  ["Admissions", "/school/admissions", Users], ["Students", "/school/students", GraduationCap], ["Academics", "/school/academics", ClipboardCheck],
  ["Attendance", "/school/attendance", CalendarCheck], ["Exams", "/school/exams", CheckCircle2], ["Fees", "/school/fees", WalletCards],
];

const hotelScreens: Record<string, ScreenConfig> = {
  "/hotel/reservations": {
    title: "Reservations", subtitle: "Create, confirm and manage the full guest reservation lifecycle.",
    kpis: [["Today's arrivals", "12", "Guest stays starting today"], ["Pending deposits", "7", "Reservations needing deposit"], ["Booked value", "K 28,000", "Current reservation value"]],
    columns: ["Reference", "Guest", "Room type", "Check-in", "Check-out", "Status", "Value"],
    rows: [["RES-2026-1048", "Thabo Banda", "Deluxe King", "10 Sep", "13 Sep", "Confirmed", "K 8,400"], ["RES-2026-1049", "Mwamba Phiri", "Executive Twin", "10 Sep", "12 Sep", "Checked in", "K 5,600"], ["RES-2026-1050", "Sarah Tembo", "Standard Queen", "11 Sep", "15 Sep", "Pending deposit", "K 7,200"], ["RES-2026-1051", "David Chanda", "Suite", "12 Sep", "14 Sep", "Confirmed", "K 6,800"]],
    action: "New reservation", actionHint: "Guest → room type → rate → deposit → confirmation",
  },
  "/hotel/room-rack": {
    title: "Room Rack", subtitle: "See live room readiness, occupancy and maintenance status by room.",
    kpis: [["Occupied", "64", "Rooms currently in house"], ["Available", "18", "Ready for sale"], ["Needs attention", "7", "Dirty or maintenance"]],
    columns: ["Room", "Type", "Floor", "Status", "Guest / task", "Next action"],
    rows: [["101", "Standard", "1", "Clean", "—", "Sell"], ["102", "Deluxe", "1", "Occupied", "Thabo Banda", "View stay"], ["203", "Executive", "2", "Dirty", "Mwamba Phiri", "Housekeeping"], ["305", "Suite", "3", "Maintenance", "AC fault", "Assign engineer"], ["402", "Deluxe", "4", "Reserved", "Sarah Tembo", "Hold"]],
    action: "Update room status", actionHint: "Available → reserved → occupied → dirty → clean",
  },
  "/hotel/front-desk": {
    title: "Front Desk", subtitle: "Run arrivals, departures and in-house guest actions from one desk.",
    kpis: [["Arrivals", "12", "Expected today"], ["Departures", "9", "Expected today"], ["In-house", "64", "Current guests"]],
    columns: ["Guest", "Room", "Stay", "Balance", "Status", "Action"],
    rows: [["Thabo Banda", "102", "10–13 Sep", "K 2,800", "Arriving", "Check in"], ["Mwamba Phiri", "203", "10–12 Sep", "K 0", "In-house", "View folio"], ["Sarah Tembo", "402", "11–15 Sep", "K 7,200", "Reserved", "Collect deposit"], ["David Chanda", "305", "12–14 Sep", "K 6,800", "Reserved", "View booking"]],
    action: "Open front-desk action", actionHint: "Check-in/out, room move, payment and folio",
  },
  "/hotel/housekeeping": {
    title: "Housekeeping", subtitle: "Assign cleaning, inspection and room-readiness tasks.",
    kpis: [["Rooms to clean", "7", "Open cleaning tasks"], ["In progress", "4", "Currently being serviced"], ["Inspection", "3", "Awaiting supervisor"]],
    columns: ["Room", "Priority", "Task", "Assigned", "Status", "Due"],
    rows: [["203", "High", "Checkout clean", "Martha", "In progress", "11:00"], ["305", "High", "Maintenance follow-up", "Engineering", "Open", "12:00"], ["402", "Normal", "Stayover service", "Grace", "Inspection", "14:00"], ["101", "Normal", "Deep clean", "Peter", "Open", "15:00"]],
    action: "Assign housekeeping", actionHint: "Task → staff → priority → inspection → ready",
  },
  "/hotel/guests": {
    title: "Guests & Profiles", subtitle: "Maintain guest profiles, stay history, preferences and billing links.",
    kpis: [["Active guests", "64", "Currently in-house"], ["Profiles", "2,486", "Guest records"], ["VIP guests", "18", "Priority profiles"]],
    columns: ["Guest", "Contact", "Last stay", "Preference", "Profile", "Billing"],
    rows: [["Thabo Banda", "097•••214", "10 Sep", "King / quiet", "Complete", "Folio"], ["Mwamba Phiri", "096•••873", "10 Sep", "Twin", "Complete", "Folio"], ["Sarah Tembo", "095•••441", "11 Sep", "Late checkout", "Complete", "Deposit"], ["David Chanda", "097•••902", "12 Sep", "Suite", "Complete", "Folio"]],
    action: "Create guest profile", actionHint: "Identity → preferences → history → billing",
  },
  "/hotel/folios": {
    title: "Guest Folios", subtitle: "Manage room charges, POS charges, payments, transfers and invoices.",
    kpis: [["Open folios", "42", "Guest accounts"], ["Outstanding", "K 182,400", "Receivables"], ["Today's charges", "K 86,420", "Posted operating charges"]],
    columns: ["Folio", "Guest", "Room", "Charges", "Payments", "Balance"],
    rows: [["FOL-1048", "Thabo Banda", "102", "K 8,400", "K 5,600", "K 2,800"], ["FOL-1049", "Mwamba Phiri", "203", "K 5,600", "K 5,600", "K 0"], ["FOL-1050", "Sarah Tembo", "402", "K 7,200", "K 0", "K 7,200"], ["FOL-1051", "David Chanda", "305", "K 6,800", "K 0", "K 6,800"]],
    action: "Post folio transaction", actionHint: "Charge/payment → existing SifoBooks ledger → receipt/invoice",
  },
};

const schoolScreens: Record<string, ScreenConfig> = {
  "/school/admissions": {
    title: "Admissions & Enrolment", subtitle: "Process applications from document submission through approved enrolment.",
    kpis: [["Applications", "38", "Current intake"], ["To review", "14", "Admissions queue"], ["Approved", "9", "Ready to enrol"]],
    columns: ["Application", "Applicant", "Class", "Date", "Stage", "Documents"],
    rows: [["APP-2027-0041", "Chanda Mulenga", "Grade 8", "10 Sep", "New", "4/6"], ["APP-2027-0042", "Naledi Phiri", "Grade 5", "10 Sep", "Review", "6/6"], ["APP-2027-0043", "Moses Banda", "Grade 10", "11 Sep", "Interview", "5/6"], ["APP-2027-0044", "Ruth Tembo", "Grade 7", "12 Sep", "Approved", "6/6"]],
    action: "New application", actionHint: "Applicant → documents → assessment → approval → enrolment",
  },
  "/school/students": {
    title: "Students", subtitle: "Manage learner profiles, guardians, classes, status and academic history.",
    kpis: [["Active learners", "1,248", "Current register"], ["New this term", "86", "Recent enrolments"], ["Profile exceptions", "23", "Records needing review"]],
    columns: ["Student", "Student ID", "Class", "Guardian", "Status", "Profile"],
    rows: [["Chanda Mulenga", "STU-24081", "Grade 8A", "M. Mulenga", "Active", "Complete"], ["Naledi Phiri", "STU-24082", "Grade 5B", "P. Phiri", "Active", "Complete"], ["Moses Banda", "STU-24083", "Grade 10A", "J. Banda", "Active", "Complete"], ["Ruth Tembo", "STU-24084", "Grade 7C", "A. Tembo", "Active", "Review"]],
    action: "Add student", actionHint: "Learner → guardian → class → documents → enrolment",
  },
  "/school/academics": {
    title: "Academics", subtitle: "Organise classes, subjects, teachers, curriculum and academic periods.",
    kpis: [["Classes", "42", "Active classes"], ["Subjects", "31", "Curriculum subjects"], ["Teachers", "78", "Teaching staff"]],
    columns: ["Class", "Level", "Form teacher", "Subjects", "Learners", "Status"],
    rows: [["Grade 5B", "Primary", "Mrs Phiri", "8", "31", "Active"], ["Grade 8A", "Junior Secondary", "Mr Banda", "10", "34", "Active"], ["Grade 10A", "Secondary", "Ms Tembo", "12", "29", "Active"], ["Grade 12A", "Senior Secondary", "Mr Chanda", "6", "27", "Active"]],
    action: "Configure academics", actionHint: "Academic year → classes → subjects → teachers → curriculum",
  },
  "/school/attendance": {
    title: "Attendance", subtitle: "Capture daily attendance, exceptions, follow-up and attendance reporting.",
    kpis: [["Attendance", "94.2%", "Today"], ["Absent", "61", "Learners absent"], ["Alerts", "23", "Follow-up required"]],
    columns: ["Class", "Present", "Absent", "Late", "Rate", "Action"],
    rows: [["Grade 5B", "29", "1", "1", "93.5%", "Review"], ["Grade 8A", "32", "1", "1", "94.1%", "Review"], ["Grade 10A", "28", "1", "0", "96.6%", "View"], ["Grade 12A", "25", "2", "0", "92.6%", "Follow up"]],
    action: "Capture attendance", actionHint: "Class → present/absent/late → exception → follow-up",
  },
  "/school/exams": {
    title: "Examinations & Results", subtitle: "Set assessments, enter marks, apply grading and publish results.",
    kpis: [["Assessments", "16", "Open or scheduled"], ["Marks pending", "184", "Entries outstanding"], ["Results ready", "6", "Ready to publish"]],
    columns: ["Assessment", "Class", "Subject", "Date", "Marks", "Status"],
    rows: [["Mid Term 1", "Grade 8A", "Mathematics", "16 Sep", "28/34", "In progress"], ["Mid Term 1", "Grade 8A", "English", "17 Sep", "34/34", "Ready"], ["Mock Exam", "Grade 12A", "Biology", "20 Sep", "18/27", "In progress"], ["CAT 2", "Grade 10A", "Physics", "22 Sep", "29/29", "Published"]],
    action: "Enter marks", actionHint: "Assessment → marks → validation → grading → publish",
  },
  "/school/fees": {
    title: "Fees & Billing", subtitle: "Manage fee structures, invoices, balances, discounts and collections.",
    kpis: [["Collected", "K 428,600", "Current period"], ["Outstanding", "K 182,400", "Learner balances"], ["Scholarships", "K 36,800", "Discounts and awards"]],
    columns: ["Student", "Class", "Invoice", "Billed", "Paid", "Balance"],
    rows: [["Chanda Mulenga", "Grade 8A", "INV-88041", "K 8,500", "K 8,500", "K 0"], ["Naledi Phiri", "Grade 5B", "INV-88042", "K 7,200", "K 5,000", "K 2,200"], ["Moses Banda", "Grade 10A", "INV-88043", "K 9,800", "K 4,800", "K 5,000"], ["Ruth Tembo", "Grade 7C", "INV-88044", "K 8,100", "K 8,100", "K 0"]],
    action: "Create fee invoice", actionHint: "Fee structure → invoice → collection → receipt → existing ledger",
  },
};

export function SifoIndustryWorkspace({ kind, screen }: { kind: Kind; screen: string }) {
  const hotel = kind === "hotel";
  const nav = hotel ? hotelNav : schoolNav;
  const fallback = hotel ? hotelScreens["/hotel/reservations"] : schoolScreens["/school/admissions"];
  const config = (hotel ? hotelScreens[screen] : schoolScreens[screen]) ?? fallback;
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => config.rows.filter(row => row.join(" ").toLowerCase().includes(query.toLowerCase())), [config.rows, query]);

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">SifoBooks {hotel ? "Hotel ERP" : "School ERP"}</div><h1 className="mt-1 text-2xl font-bold">{config.title}</h1><p className="mt-1 text-sm text-slate-500">{config.subtitle}</p></div><Link to={hotel ? "/hotel" : "/school"} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Workspace dashboard</Link></div>
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">{nav.map(([label, to, Icon]) => <Link key={label as string} to={to as string} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${screen === to ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{label as string}</Link>)}</nav>
    </div></header>
    <section className="mx-auto max-w-7xl px-6 py-7">
      <div className="grid gap-4 md:grid-cols-3">{config.kpis.map(([label, value, hint]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold">{value}</div><div className="mt-1 text-xs text-slate-400">{hint}</div></div>)}</div>
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5"><div><h2 className="font-bold">{hotel ? "Operational board" : "Operational register"}</h2><p className="text-xs text-slate-500">Demo operational data until the sector schema is connected.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className="w-40 bg-transparent text-sm outline-none" /></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4"><div><div className="text-sm font-semibold">{config.action}</div><div className="text-xs text-slate-500">{config.actionHint}</div></div><button type="button" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Open workflow</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{config.columns.map(h => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{filtered.map((row, i) => <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">{row.map((cell, j) => <td key={j} className={`px-5 py-4 ${j >= row.length - 2 ? "font-semibold" : ""}`}>{cell}</td>)}</tr>)}</tbody></table></div>
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No records match your search.</div>}
      </div>
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Integration rule:</strong> hotel and school operational actions will post through existing SifoBooks accounting, inventory, POS, payroll, receipts and reporting services. No duplicate finance engine is introduced.</div>
    </section></main>;
}
