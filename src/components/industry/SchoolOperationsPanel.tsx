import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { BarChart3, BedDouble, Bus, ClipboardCheck, FileText, GraduationCap, HeartPulse, Library, Megaphone, Users, Wallet, Home as HomeIcon } from "lucide-react";
import { fmtMoney } from "@/lib/format";

type Props={screen:string;data:Record<string,any[]>};

const TITLES:Record<string,string>={
 "/school/admissions":"Admissions & enrolment",
 "/school/attendance":"Attendance control",
 "/school/exams":"Examinations & results",
 "/school/report-cards":"Report cards",
 "/school/scholarships":"Scholarships & discounts",
 "/school/boarding":"Hostel & boarding",
 "/school/transport":"Transport",
 "/school/parent-portal":"Parent portal",
 "/school/student-portal":"Student portal",
};

export function SchoolOperationsPanel({screen,data}:Props){
 const students=data.students??[], fees=data.fees??[], payments=data.payments??[], classes=data.classes??[];
 const houses=data.boardingHouses??[], beds=data.boardingBeds??[], allocations=data.boardingAllocations??[];
 const discipline=data.discipline??[], health=data.health??[], loans=data.libraryLoans??[], transport=data.transport??[];
 const rooms=data.boardingRooms??[], leave=data.boardingLeave??[], visitors=data.boardingVisitors??[], mealPlans=data.boardingMealPlans??[], mealAssignments=data.boardingMealAssignments??[], boardingAttendance=data.boardingAttendance??[], boardingMaintenance=data.boardingMaintenance??[];
 const arrears=fees.reduce((n,x)=>n+Math.max(0,Number(x.balance??Number(x.amount_due||0)-Number(x.amount_paid||0))),0);
 const occupiedBeds=allocations.length;
 const title=TITLES[screen]??"School operations";
 const stat=(label:string,value:any,icon:any)=>{const Icon=icon;return <Card><CardContent className="p-4"><Icon className="h-5 w-5 text-primary"/><div className="mt-2 text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></CardContent></Card>};
 return <div className="space-y-4">
  <div className="rounded-3xl border bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 p-5"><h2 className="text-2xl font-bold">{title}</h2><p className="text-sm text-muted-foreground">Operational control centre using your school's live records. Empty records remain empty — no invented learners or results.</p></div>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
   {stat("Learners",students.length,GraduationCap)}
   {stat("Classes",classes.length,Users)}
   {stat("Fee arrears",fmtMoney(arrears),Wallet)}
   {stat("Boarding beds",beds.length,BedDouble)}
   {stat("Boarding allocated",occupiedBeds,ClipboardCheck)}
  </div>
  {screen==="/school/boarding"&&<div className="space-y-4">
   <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
    {stat("Houses",houses.length,BedDouble)}{stat("Rooms",rooms.length,HomeIcon)}{stat("Beds",beds.length,BedDouble)}{stat("Occupied",occupiedBeds,Users)}{stat("Leave requests",leave.filter((x:any)=>x.status==="pending").length,ClipboardCheck)}{stat("Visitors today",visitors.filter((x:any)=>String(x.visit_date)===new Date().toISOString().slice(0,10)).length,Users)}
   </div>
   <div className="grid gap-4 xl:grid-cols-3">
    <Card className="xl:col-span-2"><CardHeader><CardTitle>Boarding house room & bed map</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{houses.map((h:any)=>{const hr=rooms.filter((r:any)=>r.house_id===h.id);const hb=beds.filter((b:any)=>b.house_id===h.id||hr.some((r:any)=>r.id===b.room_id));const used=allocations.filter((a:any)=>hb.some((b:any)=>b.id===a.bed_id)).length;return <div key={h.id??h.name} className="rounded-2xl border bg-card p-4"><div className="flex items-start justify-between gap-2"><div><div className="font-semibold">{h.name??h.house_name??"Boarding house"}</div><div className="text-xs text-muted-foreground">{h.code??"—"} · {h.gender??"Mixed"} · {h.house_parent??"No house parent"}</div></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{used}/{hb.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{width:(hb.length?Math.min(100,used/hb.length*100):0)+"%"}}/></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span>{hr.length} rooms</span><span className="text-right">{Math.max(0,hb.length-used)} available</span></div></div>})}{!houses.length&&<p className="text-sm text-muted-foreground">No boarding houses configured yet.</p>}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Tonight's boarding control</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span>Present tonight</span><b>{boardingAttendance.filter((x:any)=>x.status==="present").length}</b></div><div className="flex justify-between"><span>Absent / missing</span><b className="text-rose-600">{boardingAttendance.filter((x:any)=>["absent","missing"].includes(x.status)).length}</b></div><div className="flex justify-between"><span>Meals assigned</span><b>{mealAssignments.length}</b></div><div className="flex justify-between"><span>Open maintenance</span><b>{boardingMaintenance.filter((x:any)=>x.status!=="closed").length}</b></div><div className="pt-2 text-xs text-muted-foreground">Use evening roll call, visitor register and leave approval as the daily boarding workflow.</div></CardContent></Card>
   </div>
   <div className="grid gap-4 lg:grid-cols-2">
    <Card><CardHeader><CardTitle>Leave & movement</CardTitle></CardHeader><CardContent><div className="space-y-2">{leave.slice(0,8).map((x:any)=><div key={x.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="font-medium">{students.find((s:any)=>s.id===x.student_id)?.first_name??"Student"} {students.find((s:any)=>s.id===x.student_id)?.last_name??""}</div><div className="text-xs text-muted-foreground">{x.leave_type} · {x.from_date} → {x.to_date} · {x.destination??"—"}</div></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{x.status}</span></div>)}{!leave.length&&<p className="text-sm text-muted-foreground">No leave requests.</p>}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Visitors & welfare</CardTitle></CardHeader><CardContent><div className="space-y-2">{visitors.slice(0,6).map((x:any)=><div key={x.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="font-medium">{x.visitor_name}</div><div className="text-xs text-muted-foreground">{x.relationship??"Visitor"} · {x.visit_date} · {x.purpose??"General visit"}</div></div><span className="text-xs font-semibold">{x.status}</span></div>)}{!visitors.length&&<p className="text-sm text-muted-foreground">No visitor records.</p>}</div></CardContent></Card>
   </div>
   <div className="grid gap-4 lg:grid-cols-3">
    <Card><CardHeader><CardTitle>Meal plans</CardTitle></CardHeader><CardContent className="space-y-2">{mealPlans.slice(0,6).map((m:any)=><div key={m.id} className="flex justify-between border-b py-2"><span>{m.name}</span><b>{fmtMoney(m.price)}</b></div>)}{!mealPlans.length&&<p className="text-sm text-muted-foreground">No meal plans configured.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Boarding maintenance</CardTitle></CardHeader><CardContent className="space-y-2">{boardingMaintenance.slice(0,6).map((m:any)=><div key={m.id} className="rounded-xl border p-3"><div className="font-medium">{m.description}</div><div className="text-xs text-muted-foreground">{m.category} · {m.priority} · {m.status}</div></div>)}{!boardingMaintenance.length&&<p className="text-sm text-muted-foreground">No boarding maintenance tickets.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Quick actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link to="/school/students" className="rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">Open learners</Link><Link to="/school/fees-billing" className="rounded-xl border px-3 py-2 text-sm">Boarding fees</Link><Link to="/school/reports" className="rounded-xl border px-3 py-2 text-sm">Reports</Link></CardContent></Card>
   </div>
  </div>
  {screen==="/school/attendance"&&<Card><CardHeader><CardTitle>Attendance readiness</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Use the learner register as the source for daily attendance. The workspace is ready for daily class registers, absentee follow-up and attendance reporting.</p><div className="mt-3 flex gap-2"><Link to="/school/students" className="rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">Open learners</Link><Link to="/school/reports" className="rounded-xl border px-3 py-2 text-sm">School reports</Link></div></CardContent></Card>}
  {screen==="/school/exams"&&<Card><CardHeader><CardTitle>Examinations & gradebook</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Keep assessment records linked to the class and learner register, then use report-card output for parent-facing results.</p><div className="mt-3 flex gap-2"><Link to="/school/academics" className="rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">Open classes</Link></div></CardContent></Card>}
  {screen==="/school/report-cards"&&<Card><CardHeader><CardTitle>Report-card preparation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Learner, class and fee records are already connected. This workspace is the control point for results, comments, attendance and printable report-card workflows.</p></CardContent></Card>}
  {screen==="/school/scholarships"&&<Card><CardHeader><CardTitle>Scholarship & discount control</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Review fee balances before applying concessions so discounts remain traceable and do not silently alter the underlying fee structure.</p><div className="mt-3 font-semibold">Current fee exposure: {fmtMoney(arrears)}</div></CardContent></Card>}
  {screen==="/school/transport"&&<Card><CardHeader><CardTitle>Transport register</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{transport.length} transport records loaded. Use this workspace for routes, vehicles, subscriptions, charges and learner assignments.</p><Bus className="mt-3 h-8 w-8 text-primary"/></CardContent></Card>}
  {screen==="/school/parent-portal"&&<Card><CardHeader><CardTitle>Parent communication readiness</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Guardian details are linked to learner records. {students.filter((s:any)=>s.guardian_phone||s.guardian_email).length} learners have a contact channel recorded.</p><Megaphone className="mt-3 h-8 w-8 text-primary"/></CardContent></Card>}
  {screen==="/school/student-portal"&&<Card><CardHeader><CardTitle>Student portal readiness</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Learner identity, class, fee and academic records are the foundation for a student self-service portal.</p><GraduationCap className="mt-3 h-8 w-8 text-primary"/></CardContent></Card>}
  {screen==="/school/admissions"&&<Card><CardHeader><CardTitle>Admissions pipeline</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Admissions should move from application → assessment → offer → enrolment → class placement → fee structure. Current enrolled learner count: {students.length}.</p></CardContent></Card>}
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   <Link to="/school/students" className="rounded-2xl border p-4 hover:bg-muted"><Users className="h-5 w-5"/><div className="mt-2 font-semibold">Learner register</div></Link>
   <Link to="/school/fees-billing" className="rounded-2xl border p-4 hover:bg-muted"><Wallet className="h-5 w-5"/><div className="mt-2 font-semibold">Fees & billing</div></Link>
   <Link to="/school/reports" className="rounded-2xl border p-4 hover:bg-muted"><BarChart3 className="h-5 w-5"/><div className="mt-2 font-semibold">Reports</div></Link>
   <Link to="/school/compliance" className="rounded-2xl border p-4 hover:bg-muted"><FileText className="h-5 w-5"/><div className="mt-2 font-semibold">Compliance</div></Link>
  </div>
  <div className="text-xs text-muted-foreground">Support records loaded: discipline {discipline.length} · health {health.length} · library loans {loans.length} · transport {transport.length}.</div>
 </div>;
}
