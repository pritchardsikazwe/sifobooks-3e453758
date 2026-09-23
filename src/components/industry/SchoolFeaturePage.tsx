import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Baby, BookOpen, Bus, CalendarCheck, CheckCircle2, ClipboardList, FileBarChart,
  GraduationCap, HeartPulse, Library, Megaphone, Settings2, ShieldAlert, Utensils,
  Users, Wallet, ArrowRight, Search, Plus, Clock3, School,
} from "lucide-react";

type Row = Record<string, any>;

const CONFIG: Record<string, {title:string; subtitle:string; icon:any; table?:string; links?:[string,string][]}> = {
  preschool: {title:"Pre-School Management", subtitle:"Nursery, Reception and early-years learning, care, development and parent communication.", icon:Baby, links:[["Add child","/students"],["Classes & streams","/school/academics"],["Attendance","/school/attendance"],["Fees","/school/fees-billing"]]},
  profile: {title:"Student Profile", subtitle:"A complete learner view covering identity, guardian, academics, attendance, fees, welfare and boarding.", icon:GraduationCap, links:[["Student register","/school/students"],["Guardians","/school/parents"],["Fees","/school/fees"],["Report cards","/school/report-cards"]]},
  library: {title:"Library Management", subtitle:"Books, issues, returns, overdue items and learner borrowing history.", icon:Library, table:"library_loans", links:[["Student register","/school/students"],["Reports","/school/reports"]]},
  meals: {title:"Meals & Nutrition", subtitle:"School meal plans, boarding meal assignments and daily nutrition operations.", icon:Utensils, table:"school_boarding_meal_plans", links:[["Boarding","/school/boarding"],["Students","/school/students"]]},
  discipline: {title:"Discipline & Behaviour", subtitle:"Incidents, warnings, counselling, follow-up and learner welfare history.", icon:ShieldAlert, table:"student_discipline", links:[["Students","/school/students"],["Reports","/school/reports"]]},
  health: {title:"Student Health & Welfare", subtitle:"Health visits, referrals, welfare follow-up and confidential learner support.", icon:HeartPulse, table:"student_health", links:[["Students","/school/students"],["Attendance","/school/attendance"]]},
  communications: {title:"School Communication", subtitle:"Announcements, parent communication, notices, events and school-wide messages.", icon:Megaphone, links:[["Parent Portal","/school/parent-portal"],["Student Portal","/school/student-portal"],["Reports","/school/reports"]]},
  settings: {title:"School Settings", subtitle:"School profile, academic terms, fee structures, roles, permissions, integrations and backups.", icon:Settings2, links:[["Fees & Billing","/school/fees-billing"],["Compliance","/school/compliance"],["Staff & HR","/school/staff"]]},
  reports: {title:"School Reports", subtitle:"Academic, attendance, fees, enrolment, boarding, transport, library and management reporting.", icon:FileBarChart, links:[["Fees","/school/fees"],["Exams","/school/exams"],["Boarding","/school/boarding"]]},
};

function Stat({label,value,hint,icon:Icon,tone="green"}:{label:string;value:string|number;hint?:string;icon:any;tone?:string}) {
  return <Card className="school-kpi-card"><CardContent className="p-4">
    <div className="flex items-center justify-between"><span className={`school-kpi-icon tone-${tone}`}><Icon size={17}/></span><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">2026</span></div>
    <div className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
    <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
  </CardContent></Card>;
}

function QuickAction({label,to,icon:Icon}:{label:string;to:string;icon?:any}) {
  return <Link to={to as never} className="school-quick-action">{Icon && <Icon size={17}/>}<span>{label}</span><ArrowRight size={14} className="ml-auto opacity-60"/></Link>;
}

export function SchoolFeaturePage({kind}:{kind:string}) {
  const cfg = CONFIG[kind] ?? CONFIG.settings;
  const Icon = cfg.icon;
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState("");
  const [students,setStudents]=useState<Row[]>([]);
  const [classes,setClasses]=useState<Row[]>([]);
  const [fees,setFees]=useState<Row[]>([]);
  const [records,setRecords]=useState<Row[]>([]);

  useEffect(()=>{ let dead=false; (async()=>{
    setLoading(true);
    const {data:u}=await supabase.auth.getUser(); const uid=u.user?.id;
    if(!uid){setLoading(false);return;}
    const [s,c,f,r]=await Promise.all([
      supabase.from("students").select("id,student_no,first_name,last_name,class_id,status,gender,guardian_name,boarding").eq("user_id",uid).limit(1000),
      supabase.from("school_classes").select("id,name,grade_level,stream,class_teacher,capacity,status").eq("user_id",uid).limit(300),
      supabase.from("student_fees").select("id,student_id,amount_due,amount_paid,balance,status,term,due_date").eq("user_id",uid).limit(1000),
      cfg.table ? supabase.from(cfg.table).select("*").eq("user_id",uid).limit(500) : Promise.resolve({data:[]}),
    ]);
    if(dead)return;
    setStudents(s.data??[]); setClasses(c.data??[]); setFees(f.data??[]); setRecords((r as any).data??[]);
    setLoading(false);
  })(); return()=>{dead=true;};},[kind,cfg.table]);

  const classMap=useMemo(()=>new Map(classes.map(c=>[c.id,c.name])),[classes]);
  const filtered=records.filter(r=>!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).slice(0,80);
  const preschoolStudents=students.filter(s=>/nursery|reception|pre.?school|kindergarten|grade 0|baby|toddler/i.test(String(classMap.get(s.class_id)??"")));
  const billed=fees.reduce((n,f)=>n+Number(f.amount_due||0),0);
  const paid=fees.reduce((n,f)=>n+Number(f.amount_paid||0),0);
  const arrears=Math.max(0,billed-paid);

  if(loading)return <div className="school-feature-page"><div className="grid gap-3 md:grid-cols-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-2xl bg-muted"/>)}</div></div>;

  return <div className="school-feature-page space-y-5">
    <div className="school-feature-hero">
      <div className="flex items-start gap-3">
        <div className="school-feature-icon"><Icon size={22}/></div>
        <div className="min-w-0"><div className="school-eyebrow">SIFOBOOKS SCHOOL · 2026</div><h2>{cfg.title}</h2><p>{cfg.subtitle}</p></div>
      </div>
      <div className="school-page-actions">
        <div className="school-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search this page…"/></div>
        {cfg.links?.[0] && <Link to={cfg.links[0][1] as never} className="school-primary-btn"><Plus size={16}/>{cfg.links[0][0]}</Link>}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label="Students" value={students.length} hint="Live learner register" icon={Users}/>
      <Stat label="Classes" value={classes.length} hint="Configured classes" icon={School} tone="blue"/>
      <Stat label="Fees billed" value={fmtMoney(billed)} hint="Current records" icon={Wallet} tone="gold"/>
      <Stat label="Arrears" value={fmtMoney(arrears)} hint="Outstanding balance" icon={Wallet} tone={arrears?"red":"green"}/>
      <Stat label={cfg.table ? "Records" : "Quick actions"} value={cfg.table ? records.length : (cfg.links?.length??0)} hint={cfg.table ? "Live operational records" : "Connected school modules"} icon={ClipboardList} tone="teal"/>
    </div>

    {kind==="preschool" && <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Early Years Register</CardTitle></CardHeader><CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{preschoolStudents.slice(0,12).map(s=><div key={s.id} className="school-record-card"><div className="school-avatar">{String(s.first_name??"?")[0]}{String(s.last_name??"?")[0]}</div><div className="min-w-0 flex-1"><b className="truncate block">{s.first_name} {s.last_name}</b><span>{s.student_no??"—"} · {classMap.get(s.class_id)??"Early Years"}</span><div className="mt-1"><Badge variant="outline">{s.status??"active"}</Badge></div></div></div>)}{!preschoolStudents.length&&<div className="school-empty">No early-years learners detected from the current class register.</div>}</div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Pre-School workflow</CardTitle></CardHeader><CardContent className="space-y-2">
        <QuickAction label="Admissions & enrolment" to="/school/admissions" icon={Users}/>
        <QuickAction label="Daily attendance" to="/school/attendance" icon={CalendarCheck}/>
        <QuickAction label="Student profile" to="/school/student-profile" icon={GraduationCap}/>
        <QuickAction label="Parent communication" to="/school/communications" icon={Megaphone}/>
      </CardContent></Card>
    </div>}

    {cfg.table && <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Live {cfg.title.replace("Management","").replace("School ","")} records</CardTitle><p className="mt-1 text-xs text-muted-foreground">No demo records are inserted. This list reflects the school's connected data.</p></div><span className="school-status good">{records.length} records</span></div></CardHeader><CardContent>
      {!filtered.length ? <div className="school-empty">No matching records are available yet.</div> :
      <div className="overflow-x-auto"><table className="school-data-table"><thead><tr><th>Date / ID</th><th>Primary details</th><th>Status</th><th>Reference</th></tr></thead><tbody>{filtered.map((r,i)=>{
        const vals=Object.entries(r).filter(([k,v])=>k!=="id"&&v!==null&&v!==undefined&&typeof v!=="object").slice(0,7);
        return <tr key={r.id??i}><td>{String(r.created_at??r.date??r.incident_date??r.visit_date??r.id??"—").slice(0,22)}</td><td>{vals.slice(0,3).map(([k,v])=><span key={k} className="block"><b>{k.replaceAll("_"," ")}</b>: {String(v).slice(0,70)}</span>)}</td><td><span className={`school-status ${String(r.status??"active").toLowerCase().includes("paid")||String(r.status??"").toLowerCase()==="active"?"good":String(r.status??"").toLowerCase().includes("pending")?"warn":"info"`}>{r.status??"active"}</span></td><td className="text-xs text-muted-foreground">{String(r.reference??r.student_id??r.code??"—").slice(0,28)}</td></tr>
      })}</tbody></table></div>}
    </CardContent></Card>}

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>School module map</CardTitle></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2">
        {[
          ["Admissions & Enrolment","/school/admissions",Users],["Students","/school/students",GraduationCap],["Academics & Classes","/school/academics",BookOpen],["Timetable","/school/timetable",Clock3],["Attendance","/school/attendance",CalendarCheck],["Exams & Results","/school/exams",ClipboardList],["Fees & Payments","/school/fees-billing",Wallet],["Library","/school/library",Library],["Transport","/school/transport",Bus],["Boarding","/school/boarding",School],["Meals & Nutrition","/school/meals",Utensils],["Discipline","/school/discipline",ShieldAlert],["Communication","/school/communications",Megaphone],["Reports","/school/reports",FileBarChart],["Settings","/school/settings",Settings2],["Compliance","/school/compliance",CheckCircle2],
        ].map(([label,to,I])=><QuickAction key={to as string} label={label as string} to={to as string} icon={I as any}/>)}
      </div></CardContent></Card>
      <Card><CardHeader><CardTitle>Connected workflows</CardTitle></CardHeader><CardContent className="space-y-2">{(cfg.links??[]).map(([label,to])=><QuickAction key={to} label={label} to={to} icon={ArrowRight}/>)}</CardContent></Card>
    </div>
  </div>;
}
