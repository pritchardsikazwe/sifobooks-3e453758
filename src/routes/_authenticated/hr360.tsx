import { createFileRoute, Link } from "@tanstack/react-router";
import { UsersRound, FileText, FolderOpen, CalendarDays, ShieldCheck, ClipboardList, ArrowRight, BriefcaseBusiness } from "lucide-react";

const modules=[
 ["Employee 360","Complete employee record, contracts, documents, leave, payroll and compliance.","/employees",UsersRound],
 ["Contracts","Generate, version, approve and track employment contracts.","/hr-compliance",FileText],
 ["Document Vault","Keep employee documents with issue/expiry dates and evidence.","/hr-compliance",FolderOpen],
 ["Leave & Absence","Requests, approvals, balances and payroll hand-off.","/leave",CalendarDays],
 ["Onboarding","Track statutory, HR, policy and induction tasks.","/hr-compliance",ClipboardList],
 ["Labour Controls","Monitor contract, wage, statutory and workplace obligations.","/hr-compliance",ShieldCheck],
];
export const Route=createFileRoute("/_authenticated/hr360")({
 head:()=>({meta:[{title:"HR 360 — SifoBooks"},{name:"robots",content:"noindex"}]}),
 component:()=>(
 <div className="min-h-full bg-slate-50/70 p-4 sm:p-6"><div className="mx-auto max-w-[1440px] space-y-5">
  <section className="rounded-3xl border bg-white p-6 shadow-sm">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div><div className="text-xs font-medium uppercase tracking-wider text-emerald-700">People workspace</div><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">HR 360</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">One employee record from recruitment and onboarding through contracts, leave, payroll and separation.</p></div>
    <div className="flex gap-2"><Link to="/employees" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50">Employees</Link><Link to="/payroll" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Payroll <ArrowRight className="ml-1 inline h-4 w-4"/></Link></div>
   </div>
  </section>
  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(([title,desc,url,Icon])=><Link key={String(title)} to={url as any} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Icon className="h-5 w-5 text-emerald-700"/><h2 className="mt-4 font-semibold text-slate-900">{String(title)}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{String(desc)}</p><span className="mt-4 inline-flex items-center text-xs font-medium text-emerald-700">Open <ArrowRight className="ml-1 h-3.5 w-3.5"/></span></Link>)}</section>
  <section className="grid gap-4 md:grid-cols-4">{[["Active employees","—"],["Contracts expiring","—"],["Missing documents","—"],["Compliance exceptions","—"]].map(([a,b])=><div className="rounded-2xl border bg-white p-5 shadow-sm" key={a}><div className="text-xs text-slate-500">{a}</div><div className="mt-2 text-2xl font-semibold">{b}</div></div>)}</section>
  <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-slate-500"/><h2 className="font-semibold">HR lifecycle</h2></div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs">{["Recruit","Onboard","Contract","Manage","Leave","Payroll","Review","Separate"].map((x,i)=><span key={x} className="rounded-full border bg-slate-50 px-3 py-2">{i+1}. {x}</span>)}</div></section>
 </div></div>
) });