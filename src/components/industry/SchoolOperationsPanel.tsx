import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney } from "@/lib/format";
import {
  ArrowRight, BarChart3, BedDouble, BookOpen, Bus, CalendarCheck, CheckCircle2,
  ClipboardCheck, FileBarChart, GraduationCap, HeartPulse, Megaphone, ReceiptText,
  ShieldAlert, Sparkles, Users, Wallet, UserPlus, Trophy, Clock3,
} from "lucide-react";

type Props={screen:string;data:Record<string,any[]>};
type IconType=React.ComponentType<{className?:string}>;

const TITLES:Record<string,[string,string,string]>={
 "/school/admissions":["Admissions & Enrolment","Turn enquiries into enrolled learners with a clear application-to-class workflow.","Admissions"],
 "/school/attendance":["Attendance Control","Daily register readiness, absentee follow-up and attendance reporting.","Attendance"],
 "/school/exams":["Examinations & Results","Assessment operations, gradebook readiness and results publishing.","Examinations"],
 "/school/report-cards":["Report Cards","Prepare learner results, comments, attendance and printable report-card output.","Report Cards"],
 "/school/scholarships":["Scholarships & Discounts","Keep concessions controlled, traceable and linked to learner fee accounts.","Scholarships"],
 "/school/boarding":["Hostel & Boarding","Residential capacity, rooms, beds, leave, visitors, meals and welfare.","Boarding"],
 "/school/transport":["Transport Operations","Learner transport allocations, routes, vehicles and transport charges.","Transport"],
 "/school/parent-portal":["Parent Portal","Give guardians a clear self-service path to learner progress, fees and communication.","Parent Portal"],
 "/school/student-portal":["Student Portal","Learner self-service for timetable, results, attendance, fees and school notices.","Student Portal"],
};

function Stat({label,value,hint,icon:Icon,tone="green"}:{label:string;value:any;hint?:string;icon:IconType;tone?:string}){
 return <Card className="school-kpi-card"><CardContent className="p-4">
  <div className="flex items-center justify-between"><span className={`school-kpi-icon tone-${tone}`}><Icon className="h-4 w-4"/></span><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">LIVE</span></div>
  <div className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
  <div className="text-xs font-semibold text-muted-foreground">{label}</div>
  {hint&&<div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
 </CardContent></Card>;
}

function Action({label,to,icon:Icon=ArrowRight,primary=false}:{label:string;to:string;icon?:IconType;primary?:boolean}){
 return <Link to={to as never} className={primary?"school-primary-btn":"school-quick-action"}><Icon className="h-4 w-4"/><span>{label}</span>{!primary&&<ArrowRight className="ml-auto h-3.5 w-3.5 opacity-50"/>}</Link>;
}

function Empty({title,message,to,label}:{title:string;message:string;to:string;label:string}){
 return <div className="school-empty"><div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-5 w-5"/></div><div className="font-semibold text-slate-800">{title}</div><p className="mx-auto mt-1 max-w-xl">{message}</p><Link to={to as never} className="school-primary-btn mt-4">{label}<ArrowRight className="h-4 w-4"/></Link></div>;
}

export function SchoolOperationsPanel({screen,data}:Props){
 const students=data.students??[], fees=data.fees??[], classes=data.classes??[];
 const houses=data.boardingHouses??[], beds=data.boardingBeds??[], allocations=data.boardingAllocations??[];
 const discipline=data.discipline??[], health=data.health??[], loans=data.libraryLoans??[], transport=data.transport??[];
 const rooms=data.boardingRooms??[], leave=data.boardingLeave??[], visitors=data.boardingVisitors??[];
 const mealPlans=data.boardingMealPlans??[], mealAssignments=data.boardingMealAssignments??[], boardingAttendance=data.boardingAttendance??[], maintenance=data.boardingMaintenance??[];
 const title=TITLES[screen]??["School operations","Connected school operations.","School"];
 const arrears=fees.reduce((n,x)=>n+Math.max(0,Number(x.balance??Number(x.amount_due||0)-Number(x.amount_paid||0))),0);
 const activeStudents=students.filter(s=>String(s.status??"active").toLowerCase()==="active").length;
 const occupiedBeds=allocations.length;
 const present=boardingAttendance.filter(x=>String(x.status).toLowerCase()==="present").length;
 const missing=boardingAttendance.filter(x=>["absent","missing"].includes(String(x.status).toLowerCase())).length;
 const today=new Date().toISOString().slice(0,10);
 const visitorsToday=visitors.filter(x=>String(x.visit_date??"").slice(0,10)===today).length;

 const common=<>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
   <Stat label="Learners" value={students.length} hint={`${activeStudents} active`} icon={GraduationCap}/>
   <Stat label="Classes" value={classes.length} hint="Live class register" icon={BookOpen} tone="blue"/>
   <Stat label="Fee arrears" value={fmtMoney(arrears)} hint="Outstanding balance" icon={Wallet} tone={arrears?"gold":"green"}/>
   <Stat label="Boarding beds" value={beds.length} hint={`${occupiedBeds} allocated`} icon={BedDouble} tone="teal"/>
   <Stat label="Welfare records" value={discipline.length+health.length} hint={`${discipline.length} discipline · ${health.length} health`} icon={HeartPulse} tone="red"/>
  </div>
 </>;

 const panel=()=>{
  switch(screen){
   case "/school/admissions":
    return <div className="grid gap-4 lg:grid-cols-3">
     <Card className="lg:col-span-2"><CardHeader><CardTitle>Admissions pipeline</CardTitle><p className="text-xs text-muted-foreground">A clean operational path from enquiry to an enrolled learner. Admissions records are shown only when the school has connected data.</p></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-5">{["Application","Assessment","Offer","Enrolment","Class placement"].map((x,i)=><div key={x} className="rounded-xl border p-4"><div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 font-bold">{i+1}</div><div className="mt-3 text-sm font-bold">{x}</div><div className="mt-1 text-[11px] text-muted-foreground">Ready for workflow</div></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><Stat label="Current learners" value={students.length} icon={Users}/><Stat label="Available classes" value={classes.length} icon={BookOpen} tone="blue"/></div></CardContent></Card>
     <Card><CardHeader><CardTitle>Admissions actions</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Open learner register" to="/school/students" icon={Users} primary/><Action label="Manage classes" to="/school/academics" icon={BookOpen}/><Action label="Review fees" to="/school/fees-billing" icon={Wallet}/></CardContent></Card>
    </div>;
   case "/school/attendance":
    return <div className="grid gap-4 lg:grid-cols-3">
     <Card className="lg:col-span-2"><CardHeader><CardTitle>Daily attendance control</CardTitle><p className="text-xs text-muted-foreground">Use the live learner register as the source for class registers and absentee follow-up. No attendance records are invented.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Stat label="Learners to mark" value={students.length} icon={Users}/><Stat label="Classes" value={classes.length} icon={BookOpen} tone="blue"/><Stat label="Active learners" value={activeStudents} icon={CheckCircle2} tone="green"/></div><div className="mt-4 rounded-2xl border border-dashed p-6 text-center"><CalendarCheck className="mx-auto h-8 w-8 text-emerald-600"/><div className="mt-2 font-semibold">Daily register workspace</div><p className="mt-1 text-xs text-muted-foreground">Connect attendance entries here when the attendance register is populated.</p></div></CardContent></Card>
     <Card><CardHeader><CardTitle>Attendance workflow</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Open students" to="/school/students" icon={Users} primary/><Action label="View reports" to="/school/reports" icon={FileBarChart}/><Action label="Timetable" to="/school/timetable" icon={Clock3}/></CardContent></Card>
    </div>;
   case "/school/exams":
    return <div className="grid gap-4 lg:grid-cols-3">
     <Card className="lg:col-span-2"><CardHeader><CardTitle>Examination control centre</CardTitle><p className="text-xs text-muted-foreground">Assessment setup should remain linked to classes and learners before results are published.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Stat label="Learners" value={students.length} icon={GraduationCap}/><Stat label="Classes" value={classes.length} icon={BookOpen} tone="blue"/><Stat label="Result records" value="—" hint="No connected marks dataset" icon={Trophy} tone="gold"/></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Action label="Classes & subjects" to="/school/academics" icon={BookOpen}/><Action label="Report cards" to="/school/report-cards" icon={ReceiptText}/></div></CardContent></Card>
     <Card><CardHeader><CardTitle>Results workflow</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Open classes" to="/school/academics" icon={BookOpen} primary/><Action label="Report cards" to="/school/report-cards" icon={ReceiptText}/><Action label="School reports" to="/school/reports" icon={FileBarChart}/></CardContent></Card>
    </div>;
   case "/school/report-cards":
    return <div className="grid gap-4 lg:grid-cols-3">
     <Card className="lg:col-span-2"><CardHeader><CardTitle>Report-card preparation</CardTitle><p className="text-xs text-muted-foreground">The report-card flow combines learner identity, class placement, assessment, attendance and comments into a printable result.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-4">{[["Learner","Student register",Users],["Academics","Subjects & classes",BookOpen],["Results","Assessment marks",Trophy],["Attendance","Attendance history",CalendarCheck]].map(([a,b,I])=><div key={a as string} className="school-record-card"><I className="h-5 w-5 text-emerald-600"/><div><b className="block text-sm">{a as string}</b><span>{b as string}</span></div></div>)}</div><div className="mt-4"><Empty title="No result dataset connected" message="Once assessment results are recorded, this page can become the final report-card publishing and printing control point." to="/school/exams" label="Open examinations"/></div></CardContent></Card>
     <Card><CardHeader><CardTitle>Report actions</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Examinations" to="/school/exams" icon={Trophy} primary/><Action label="Students" to="/school/students" icon={Users}/><Action label="Reports" to="/school/reports" icon={FileBarChart}/></CardContent></Card>
    </div>;
   case "/school/scholarships":
    return <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Scholarship & concession control</CardTitle><p className="text-xs text-muted-foreground">Concessions should be approved and traceable without silently changing the underlying fee structure.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Stat label="Learners" value={students.length} icon={Users}/><Stat label="Fee accounts" value={fees.length} icon={ReceiptText} tone="blue"/><Stat label="Exposure / arrears" value={fmtMoney(arrears)} icon={Wallet} tone="gold"/></div><div className="mt-4 rounded-xl border p-4 text-sm">Scholarship records are displayed when the school has connected scholarship data. Current fee exposure remains <b>{fmtMoney(arrears)}</b>.</div></CardContent></Card><Card><CardHeader><CardTitle>Concession actions</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Fee billing" to="/school/fees-billing" icon={Wallet} primary/><Action label="Learners" to="/school/students" icon={Users}/><Action label="Reports" to="/school/reports" icon={FileBarChart}/></CardContent></Card></div>;
   case "/school/transport":
    return <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Transport register</CardTitle><p className="text-xs text-muted-foreground">Live transport records currently connected to this school.</p></CardHeader><CardContent>{transport.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{transport.slice(0,12).map((x:any)=><div key={x.id} className="school-record-card"><Bus className="h-5 w-5 text-emerald-600"/><div className="min-w-0"><b className="block truncate">{x.route_name??x.route??x.vehicle_no??"Transport record"}</b><span className="block truncate">{x.status??"active"} · {x.vehicle_no??x.registration_no??"No vehicle"}</span></div></div>)}</div>:<Empty title="No transport records" message="Create routes, vehicles or learner allocations to populate the transport control centre." to="/school/students" label="Open learners"/>}</CardContent></Card><Card><CardHeader><CardTitle>Transport actions</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Learner register" to="/school/students" icon={Users} primary/><Action label="School reports" to="/school/reports" icon={FileBarChart}/></CardContent></Card></div>;
   case "/school/parent-portal":
    return <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Parent communication readiness</CardTitle><p className="text-xs text-muted-foreground">Guardian contact information is sourced from learner records.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Stat label="Learners" value={students.length} icon={Users}/><Stat label="With phone" value={students.filter(s=>s.guardian_phone).length} icon={Megaphone} tone="blue"/><Stat label="With email" value={students.filter(s=>s.guardian_email).length} icon={Megaphone} tone="teal"/></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{students.filter(s=>s.guardian_name).slice(0,8).map(s=><div key={s.id} className="school-record-card"><Megaphone className="h-4 w-4 text-emerald-600"/><div className="min-w-0"><b className="block truncate">{s.guardian_name}</b><span>{s.first_name} {s.last_name} · {s.guardian_phone??s.guardian_email??"No contact"}</span></div></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Parent actions</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Learner register" to="/school/students" icon={Users} primary/><Action label="Communication" to="/school/communications" icon={Megaphone}/><Action label="Fee accounts" to="/school/fees" icon={Wallet}/></CardContent></Card></div>;
   case "/school/student-portal":
    return <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Student self-service readiness</CardTitle><p className="text-xs text-muted-foreground">Learner identity, class, fees and academic workflows form the foundation of the portal.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2">{[["Profile","Identity and guardian",GraduationCap,"/school/student-profile"],["Timetable","Class schedule",Clock3,"/school/timetable"],["Attendance","Daily presence",CalendarCheck,"/school/attendance"],["Results","Exams and report cards",Trophy,"/school/exams"],["Fees","Balances and receipts",Wallet,"/school/fees"],["Notices","School communication",Megaphone,"/school/communications"]].map(([a,b,I,to])=><Link key={a as string} to={to as never} className="school-record-card hover:border-emerald-300"><I className="h-5 w-5 text-emerald-600"/><div><b className="block text-sm">{a as string}</b><span>{b as string}</span></div><ArrowRight className="ml-auto h-4 w-4 opacity-50"/></Link>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Portal actions</CardTitle></CardHeader><CardContent className="space-y-2"><Action label="Student profiles" to="/school/student-profile" icon={GraduationCap} primary/><Action label="Parents" to="/school/parents" icon={Users}/><Action label="Reports" to="/school/reports" icon={FileBarChart}/></CardContent></Card></div>;
   case "/school/boarding":
    return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-6"><Stat label="Houses" value={houses.length} icon={BedDouble}/><Stat label="Rooms" value={rooms.length} icon={BookOpen} tone="blue"/><Stat label="Beds" value={beds.length} icon={BedDouble} tone="teal"/><Stat label="Occupied" value={occupiedBeds} icon={Users}/><Stat label="Present" value={present} icon={CheckCircle2}/><Stat label="Visitors today" value={visitorsToday} icon={Users} tone="gold"/></div><div className="grid gap-4 xl:grid-cols-3"><Card className="xl:col-span-2"><CardHeader><CardTitle>Boarding house occupancy</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{houses.map((h:any)=>{const hr=rooms.filter(r=>r.house_id===h.id);const hb=beds.filter(b=>b.house_id===h.id||hr.some(r=>r.id===b.room_id));const used=allocations.filter(a=>hb.some(b=>b.id===a.bed_id)).length;const pct=hb.length?Math.round(used/hb.length*100):0;return <div key={h.id} className="rounded-xl border p-4"><div className="flex justify-between"><b>{h.name??h.house_name??"Boarding house"}</b><span className="school-status good">{used}/{hb.length}</span></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-600" style={{width:pct+"%"}}/></div><div className="mt-2 text-[11px] text-muted-foreground">{hr.length} rooms · {Math.max(0,hb.length-used)} available</div></div>})}{!houses.length&&<Empty title="No boarding houses" message="Create boarding houses and beds to start residential allocation." to="/boarding-houses" label="Boarding setup"/>}</div></CardContent></Card><Card><CardHeader><CardTitle>Tonight's control</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span>Present</span><b className="text-emerald-700">{present}</b></div><div className="flex justify-between"><span>Absent / missing</span><b className="text-red-600">{missing}</b></div><div className="flex justify-between"><span>Meals assigned</span><b>{mealAssignments.length}</b></div><div className="flex justify-between"><span>Open maintenance</span><b>{maintenance.filter(x=>x.status!=="closed").length}</b></div><div className="pt-2 text-xs text-muted-foreground">Leave: {leave.filter(x=>x.status==="pending").length} pending · {visitorsToday} visitors today.</div></CardContent></Card></div></div>;
   default:return <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>{title[0]}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{title[1]}</p></CardContent></Card></div>;
  }
 };

 return <div className="school-operations-2026 space-y-5">
  <div className="school-feature-hero"><div><div className="school-eyebrow">SIFOBOOKS SCHOOL · 2026 · {title[2]}</div><h2>{title[0]}</h2><p>{title[1]}</p></div><div className="school-page-actions"><Action label="Open students" to="/school/students" icon={Users} primary/></div></div>
  {common}
  {panel()}
  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
   <Action label="Students" to="/school/students" icon={Users}/><Action label="Academics" to="/school/academics" icon={BookOpen}/><Action label="Fees & billing" to="/school/fees-billing" icon={Wallet}/><Action label="Reports" to="/school/reports" icon={BarChart3}/>
  </div>
 </div>;
}
