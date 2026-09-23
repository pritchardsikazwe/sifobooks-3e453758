import "@/styles/boarding-house-2026.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BedDouble, Building2, CalendarCheck, ClipboardCheck, DoorOpen, FileBarChart,
  GraduationCap, HeartPulse, Home, LogOut, Mail, Megaphone, MoreHorizontal,
  Plus, ShieldAlert, UserRound, Users, Utensils, Wrench, Wallet, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireModule } from "@/components/RequireModule";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AnyRow = Record<string, any>;

const TABS = [
  ["dashboard", "Dashboard", Home],
  ["houses", "Houses", Building2],
  ["rooms", "Rooms & Beds", BedDouble],
  ["students", "Students", GraduationCap],
  ["profile", "Student Profile", UserRound],
  ["fees", "Fees & Payments", Wallet],
  ["attendance", "Attendance", CalendarCheck],
  ["leave", "Leave", LogOut],
  ["maintenance", "Maintenance", Wrench],
  ["discipline", "Discipline", ShieldAlert],
  ["visitors", "Visitors", Users],
  ["meals", "Meal Plans", Utensils],
  ["reports", "Reports", FileBarChart],
  ["settings", "Settings", MoreHorizontal],
] as const;

export function BoardingHouseWorkspace({ initialTab = "dashboard" }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [data, setData] = useState<Record<string, AnyRow[]>>({});
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AnyRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }
    setUid(auth.user.id);
    const { data: profile } = await supabase.from("profiles").select("active_company_id").eq("id", auth.user.id).maybeSingle();
    const cid = profile?.active_company_id ?? "";
    setCompanyId(cid);
    const q = (table: string, select = "*", order?: string) => {
      let req: any = supabase.from(table).select(select).eq("user_id", auth.user.id).limit(1000);
      if (order) req = req.order(order, { ascending: false });
      return req;
    };
    const [students, houses, beds, allocations, rooms, fees, payments, attendance, leave, maintenance, discipline, visitors, meals, mealAssignments] = await Promise.all([
      q("students", "id,student_no,first_name,last_name,gender,class_id,status,guardian_name,guardian_phone,guardian_email,boarding,date_of_birth,address,enrolment_date", "last_name"),
      q("school_boarding_houses", "*", "name"),
      q("school_boarding_beds", "*", "bed_code"),
      q("school_boarding_allocations", "*", "start_date"),
      q("school_boarding_rooms", "*", "room_code"),
      q("student_fees", "id,student_id,term,academic_year,amount_due,amount_paid,balance,status,due_date,description", "due_date"),
      q("fee_payments", "id,student_id,amount,payment_date,method,receipt_no,reference", "payment_date"),
      q("school_boarding_attendance", "*", "attendance_date"),
      q("school_boarding_leave_requests", "*", "from_date"),
      q("school_boarding_maintenance", "*", "created_at"),
      q("school_discipline_incidents", "*", "incident_date"),
      q("school_boarding_visitors", "*", "visit_date"),
      q("school_boarding_meal_plans", "*", "name"),
      q("school_boarding_meal_assignments", "*", "start_date"),
    ]);
    const clean = (r: any) => r?.data ?? [];
    setData({
      students: clean(students), houses: clean(houses), beds: clean(beds), allocations: clean(allocations),
      rooms: clean(rooms), fees: clean(fees), payments: clean(payments), attendance: clean(attendance),
      leave: clean(leave), maintenance: clean(maintenance), discipline: clean(discipline),
      visitors: clean(visitors), meals: clean(meals), mealAssignments: clean(mealAssignments),
    });
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const students = data.students ?? [];
  const houses = data.houses ?? [];
  const beds = data.beds ?? [];
  const allocations = data.allocations ?? [];
  const rooms = data.rooms ?? [];
  const fees = data.fees ?? [];
  const payments = data.payments ?? [];
  const attendance = data.attendance ?? [];
  const leave = data.leave ?? [];
  const maintenance = data.maintenance ?? [];
  const discipline = data.discipline ?? [];
  const visitors = data.visitors ?? [];
  const meals = data.meals ?? [];
  const mealAssignments = data.mealAssignments ?? [];

  const studentName = (id: string) => {
    const s = students.find(x => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "Student";
  };
  const houseName = (id: string) => houses.find(x => x.id === id)?.name ?? "House";
  const bedAllocation = (bedId: string) => allocations.find(x => x.bed_id === bedId && x.status === "active");
  const activeAllocations = allocations.filter(x => x.status === "active");
  const occupiedBeds = activeAllocations.length;
  const vacantBeds = Math.max(0, beds.length - occupiedBeds);
  const feeBilled = fees.reduce((n, x) => n + Number(x.amount_due || 0), 0);
  const feePaid = fees.reduce((n, x) => n + Number(x.amount_paid || 0), 0);
  const feeOutstanding = Math.max(0, feeBilled - feePaid);
  const occupancy = beds.length ? Math.round((occupiedBeds / beds.length) * 100) : 0;
  const activeStudents = students.filter(s => String(s.status).toLowerCase() === "active" || !s.status);
  const matches = (row: AnyRow) => {
    if (!query.trim()) return true;
    return JSON.stringify(row).toLowerCase().includes(query.toLowerCase());
  };

  const save = async (kind: string, form: AnyRow) => {
    if (!uid || !companyId) return;
    setSaving(true);
    try {
      const map: Record<string, string> = {
        house: "school_boarding_houses",
        room: "school_boarding_rooms",
        bed: "school_boarding_beds",
        allocation: "school_boarding_allocations",
        leave: "school_boarding_leave_requests",
        visitor: "school_boarding_visitors",
        meal: "school_boarding_meal_plans",
        mealAssignment: "school_boarding_meal_assignments",
        attendance: "school_boarding_attendance",
        maintenance: "school_boarding_maintenance",
        discipline: "school_discipline_incidents",
      };
      if (kind === "fee") {
        const amount = Number(form.amount_due || 0);
        const { error } = await supabase.from("student_fees").insert({
          user_id: uid, student_id: form.student_id, term: form.term || "Term 3",
          academic_year: Number(form.academic_year || new Date().getFullYear()),
          amount_due: amount, amount_paid: 0, balance: amount,
          status: "unpaid", due_date: form.due_date || new Date().toISOString().slice(0, 10),
          description: form.description || "Boarding fees",
        });
        if (error) throw error;
      } else if (kind === "payment") {
        const { error } = await supabase.from("fee_payments").insert({
          user_id: uid, student_id: form.student_id, amount: Number(form.amount || 0),
          payment_date: form.payment_date || new Date().toISOString().slice(0, 10),
          method: form.method || "cash", receipt_no: form.receipt_no || `BR-${Date.now()}`,
          reference: form.reference || null,
        });
        if (error) throw error;
      } else {
        const table = map[kind];
        if (!table) throw new Error("Unknown operation");
        const { error } = await supabase.from(table).insert({ ...form, user_id: uid, company_id: companyId });
        if (error) throw error;
      }
      setModal(null);
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Could not save record.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="boarding-2026-page p-8 text-muted-foreground">Loading Boarding House Management…</div>;
  }

  return (
    <RequireModule moduleKey="school_erp">
      <div className="boarding-2026-page">
        <div className="boarding-shell">
          <div className="boarding-brand">
            <div className="boarding-brand-mark"><GraduationCap size={24} /></div>
            <div>
              <div className="boarding-brand-name">SifoBooks <span>Boarding House</span></div>
              <div className="boarding-brand-sub">Student Accommodation Management</div>
            </div>
            <div className="boarding-property-select">Sifo College Boarding · Zambia ▾</div>
            <div className="boarding-user"><span className="boarding-user-code">B001</span><strong>House Admin</strong><small>22 Sep 2026 · 14:23</small></div>
          </div>

          <div className="boarding-nav">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)} className={cn("boarding-nav-item", tab === id && "is-active")}>
                <Icon size={16} /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="boarding-body">
            <div className="boarding-page-head">
              <div>
                <div className="boarding-eyebrow">SIFOBOOKS BOARDING HOUSE</div>
                <h1>{TABS.find(x => x[0] === tab)?.[1] ?? "Dashboard"}</h1>
                <p>Safe students. Healthy living. Brighter futures.</p>
              </div>
              <div className="boarding-head-actions">
                <Input className="boarding-search" placeholder="Search students, rooms, houses…" value={query} onChange={e => setQuery(e.target.value)} />
                <Button className="boarding-primary" onClick={() => setModal(tab === "houses" ? "house" : tab === "rooms" ? "room" : tab === "students" ? "allocation" : tab === "fees" ? "fee" : tab === "leave" ? "leave" : tab === "visitors" ? "visitor" : tab === "maintenance" ? "maintenance" : tab === "meals" ? "meal" : "student")}>
                  <Plus size={16} className="mr-1" /> Add
                </Button>
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="boarding-tabs">
              <TabsContent value="dashboard"><Dashboard houses={houses} beds={beds} allocations={activeAllocations} students={students} fees={fees} payments={payments} maintenance={maintenance} discipline={discipline} occupancy={occupancy} outstanding={feeOutstanding} onAction={setModal} studentName={studentName} /></TabsContent>
              <TabsContent value="houses"><Houses houses={houses} beds={beds} allocations={activeAllocations} onAdd={() => setModal("house")} /></TabsContent>
              <TabsContent value="rooms"><Rooms rooms={rooms} houses={houses} beds={beds} allocations={activeAllocations} onAdd={() => setModal("room")} studentName={studentName} /></TabsContent>
              <TabsContent value="students"><Students students={students.filter(matches)} houses={houses} beds={beds} allocations={activeAllocations} onStudent={setSelectedStudent} onAllocate={() => setModal("allocation")} /></TabsContent>
              <TabsContent value="profile"><StudentProfile student={selectedStudent ?? students[0]} fees={fees} allocations={activeAllocations} beds={beds} houses={houses} onClose={() => setSelectedStudent(null)} /></TabsContent>
              <TabsContent value="fees"><Fees fees={fees} payments={payments} students={students} onFee={() => setModal("fee")} onPayment={() => setModal("payment")} /></TabsContent>
              <TabsContent value="attendance"><Attendance attendance={attendance} students={activeStudents} studentName={studentName} onAdd={() => setModal("attendance")} /></TabsContent>
              <TabsContent value="leave"><Leave rows={leave} studentName={studentName} onAdd={() => setModal("leave")} /></TabsContent>
              <TabsContent value="maintenance"><Maintenance rows={maintenance} houses={houses} rooms={rooms} onAdd={() => setModal("maintenance")} /></TabsContent>
              <TabsContent value="discipline"><Discipline rows={discipline} studentName={studentName} onAdd={() => setModal("discipline")} /></TabsContent>
              <TabsContent value="visitors"><Visitors rows={visitors} studentName={studentName} onAdd={() => setModal("visitor")} /></TabsContent>
              <TabsContent value="meals"><Meals plans={meals} assignments={mealAssignments} students={students} studentName={studentName} onAdd={() => setModal("meal")} /></TabsContent>
              <TabsContent value="reports"><Reports students={students} houses={houses} beds={beds} allocations={activeAllocations} fees={fees} attendance={attendance} leave={leave} maintenance={maintenance} discipline={discipline} /></TabsContent>
              <TabsContent value="settings"><Settings /></TabsContent>
            </Tabs>
          </div>
        </div>
        {modal && <BoardingForm kind={modal} students={students} houses={houses} rooms={rooms} beds={beds} meals={meals} onClose={() => setModal(null)} onSave={save} saving={saving} />}
      </div>
    </RequireModule>
  );
}

function Dashboard({ houses, beds, allocations, students, fees, payments, maintenance, discipline, occupancy, outstanding, onAction, studentName }: any) {
  const recent = [...payments.slice(0, 3), ...maintenance.slice(0, 2), ...discipline.slice(0, 2)].slice(0, 6);
  return <div className="space-y-4">
    <div className="boarding-hero">
      <div className="boarding-hero-image"><Home size={52}/><div><strong>SifoBooks Boarding House</strong><span>Safe Rooms. Healthy Living. Brighter Futures.</span></div></div>
      <div className="boarding-kpi-grid">
        <Kpi label="Total Students" value={students.length} hint="+12%" />
        <Kpi label="Total Rooms" value={roomsCount(houses, beds)} />
        <Kpi label="Total Beds" value={beds.length} />
        <Kpi label="Occupied Beds" value={allocations.length} good />
        <Kpi label="Vacant Beds" value={Math.max(0, beds.length - allocations.length)} warn />
        <Kpi label="Fees Collected" value={fmtMoney(fees.reduce((n:any,x:any)=>n+Number(x.amount_paid||0),0))} />
        <Kpi label="Outstanding Fees" value={fmtMoney(outstanding)} danger />
        <Kpi label="Maintenance" value={maintenance.filter((x:any)=>x.status!=="completed").length} />
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Occupancy Overview"><DonutPercent value={occupancy} label="Occupied"/><div className="status-legend"><span><i className="dot green"/>Occupied {allocations.length}</span><span><i className="dot amber"/>Vacant {Math.max(0,beds.length-allocations.length)}</span></div></Panel>
      <Panel title="Fee Collection This Term"><div className="big-money">{fmtMoney(fees.reduce((n:any,x:any)=>n+Number(x.amount_paid||0),0))}</div><div className="fee-progress"><span style={{width:`${fees.reduce((n:any,x:any)=>n+Number(x.amount_due||0),0)?Math.min(100,(fees.reduce((n:any,x:any)=>n+Number(x.amount_paid||0),0)/fees.reduce((n:any,x:any)=>n+Number(x.amount_due||0),0))*100):0}%`}}/></div><div className="text-sm muted">Outstanding {fmtMoney(outstanding)}</div></Panel>
      <Panel title="Quick Actions"><div className="quick-actions"><Quick onClick={()=>onAction("allocation")} icon={BedDouble} label="Allocate Student"/><Quick onClick={()=>onAction("fee")} icon={Wallet} label="Record Fee"/><Quick onClick={()=>onAction("maintenance")} icon={Wrench} label="New Maintenance"/><Quick onClick={()=>onAction("leave")} icon={LogOut} label="New Leave"/><Quick onClick={()=>onAction("visitor")} icon={Users} label="Register Visitor"/><Quick onClick={()=>onAction("discipline")} icon={ShieldAlert} label="New Incident"/></div></Panel>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Recent Activities"><div className="activity-list">{recent.map((x:any,i:number)=><div className="activity-row" key={x.id??i}><span className="activity-icon">{i%3===0?<Wallet size={14}/>:i%3===1?<Wrench size={14}/>:<ShieldAlert size={14}/>}</span><div><strong>{x.description||x.title||x.category||"Boarding activity"}</strong><small>{x.payment_date||x.created_at||x.incident_date||""}</small></div></div>)}</div></Panel>
      <Panel title="Boarding Overview"><div className="mini-list">{houses.slice(0,5).map((h:any)=>{const hb=beds.filter((b:any)=>b.house_id===h.id);const used=allocations.filter((a:any)=>hb.some((b:any)=>b.id===a.bed_id)).length;return <div className="mini-row" key={h.id}><div><strong>{h.name}</strong><small>{h.gender||"Mixed"} · {h.house_parent||"House parent —"}</small></div><b>{used}/{hb.length}</b></div>})}</div></Panel>
    </div>
  </div>;
}

function Houses({ houses, beds, allocations, onAdd }: any) {
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{houses.map((h:any)=>{const hb=beds.filter((b:any)=>b.house_id===h.id);const used=allocations.filter((a:any)=>hb.some((b:any)=>b.id===a.bed_id)).length;const pct=hb.length?Math.round(used/hb.length*100):0;return <Card key={h.id} className="boarding-card overflow-hidden"><div className="house-photo"><Building2 size={42}/></div><CardContent className="p-4"><div className="flex justify-between"><div><h3>{h.name}</h3><p>{h.code} · {h.gender||"Mixed"} · {h.capacity||hb.length} beds</p></div><Badge>{h.active===false?"Inactive":"Active"}</Badge></div><div className="mt-4 flex justify-between text-sm"><span>{used}/{hb.length} occupied</span><strong>{pct}%</strong></div><div className="bar"><span style={{width:`${pct}%`}}/></div><div className="mt-4 flex gap-2"><Button variant="outline" size="sm">View Details</Button><Button size="sm">Manage</Button></div></CardContent></Card>})}</div>{!houses.length&&<Empty title="No boarding houses" action={onAdd}/>}</div>;
}

function Rooms({ rooms, houses, beds, allocations, onAdd, studentName }: any) {
  return <div className="space-y-4"><div className="flex flex-wrap gap-2">{["All Rooms","Available","Occupied","Partially Occupied","Maintenance","Out of Service"].map((x,i)=><span className={cn("filter-chip",i===0&&"active")} key={x}>{x}</span>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{rooms.map((r:any)=>{const roomBeds=beds.filter((b:any)=>b.room_id===r.id); const hb=roomBeds.length?roomBeds:beds.filter((b:any)=>b.house_id===r.house_id).slice(0,Number(r.beds_count||r.capacity||4));const used=hb.filter((b:any)=>allocations.some((a:any)=>a.bed_id===b.id)).length;const status=used===0?"available":used>=hb.length?"occupied":"partial";return <div key={r.id} className={cn("room-card",`room-${status}`)}><div className="flex justify-between"><strong>{r.room_code}</strong><Badge>{status}</Badge></div><small>{houses.find((h:any)=>h.id===r.house_id)?.name||"House"} · {r.block||"Block A"} · {r.floor||"Ground"}</small><div className="room-beds">{hb.map((b:any)=><span key={b.id} className={allocations.some((a:any)=>a.bed_id===b.id)?"occupied":"vacant"} title={bedAllocationLabel(b.id,allocations,studentName)}>🛏</span>)}</div><div className="room-foot"><span>{used}/{hb.length}</span><span>{r.room_type||"Standard"}</span></div></div>})}</div>{!rooms.length&&<Empty title="No rooms configured" action={onAdd}/>}</div>;
}

function Students({ students, houses, beds, allocations, onStudent, onAllocate }: any) {
  return <Panel title="Student Management" right={<Button onClick={onAllocate}><Plus size={15} className="mr-1"/>Allocate Student</Button>}><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Student ID</th><th>Name</th><th>Gender</th><th>Grade/Class</th><th>House</th><th>Bed</th><th>Status</th><th></th></tr></thead><tbody>{students.map((s:any)=>{const a=allocations.find((x:any)=>x.student_id===s.id);const b=beds.find((x:any)=>x.id===a?.bed_id);return <tr key={s.id}><td>{s.student_no}</td><td><button className="link-button" onClick={()=>onStudent(s)}>{s.first_name} {s.last_name}</button></td><td>{s.gender||"—"}</td><td>{s.class_id||"—"}</td><td>{b?houses.find((h:any)=>h.id===b.house_id)?.name:"—"}</td><td>{b?.bed_code||"—"}</td><td><Status value={s.status||"active"}/></td><td><button className="icon-button" onClick={()=>onStudent(s)}><MoreHorizontal size={16}/></button></td></tr>})}</tbody></table></div></Panel>;
}

function StudentProfile({ student, fees, allocations, beds, houses, onClose }: any) {
  if (!student) return <Empty title="Select a student from Student Management" />;
  const a=allocations.find((x:any)=>x.student_id===student.id); const b=beds.find((x:any)=>x.id===a?.bed_id); const h=b?houses.find((x:any)=>x.id===b.house_id):null; const sf=fees.filter((x:any)=>x.student_id===student.id); const balance=sf.reduce((n:any,x:any)=>n+Number(x.balance||0),0);
  return <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><Panel title="Student Profile" right={<Button variant="outline" onClick={onClose}><X size={15}/></Button>}><div className="profile-head"><div className="avatar-lg">{student.first_name?.[0]}{student.last_name?.[0]}</div><div><h2>{student.first_name} {student.last_name}</h2><p>{student.student_no} · {student.gender||"—"} · {student.class_id||"—"}</p><Status value={student.status||"active"}/></div></div><div className="profile-grid"><Info label="Date of birth" value={student.date_of_birth}/><Info label="Guardian" value={student.guardian_name}/><Info label="Guardian phone" value={student.guardian_phone}/><Info label="Guardian email" value={student.guardian_email}/><Info label="Address" value={student.address}/><Info label="Enrolment date" value={student.enrolment_date}/></div><div className="profile-nav"><span className="active">Overview</span><span>Personal Info</span><span>Guardian</span><span>Academic</span><span>Medical</span><span>Documents</span><span>History</span></div></Panel><div className="space-y-4"><Panel title="Current Allocation"><div className="big-allocation"><BedDouble size={28}/><div><strong>{b?.bed_code||"Not allocated"}</strong><small>{h?.name||"No house"} · {a?.start_date||""}</small></div></div></Panel><Panel title="Fees & Payments"><div className="big-money">{fmtMoney(balance)}</div><small className="muted">Outstanding balance</small><div className="mt-3"><Link to="/school/fees-billing" className="boarding-link">Open fee account</Link></div></Panel></div></div>;
}

function Fees({ fees, payments, students, onFee, onPayment }: any) {
  const student=(id:string)=>students.find((s:any)=>s.id===id);
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="Total Fees" value={fmtMoney(fees.reduce((n:any,x:any)=>n+Number(x.amount_due||0),0))}/><Kpi label="Amount Paid" value={fmtMoney(fees.reduce((n:any,x:any)=>n+Number(x.amount_paid||0),0))} good/><Kpi label="Outstanding" value={fmtMoney(fees.reduce((n:any,x:any)=>n+Number(x.balance||0),0))} danger/><Kpi label="Payments" value={payments.length}/></div><Panel title="Fees & Payments" right={<div className="flex gap-2"><Button variant="outline" onClick={onPayment}>Record Payment</Button><Button onClick={onFee}><Plus size={15} className="mr-1"/>Create Fee</Button></div>}><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Student</th><th>Description</th><th>Term</th><th>Amount</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{fees.map((f:any)=><tr key={f.id}><td>{student(f.student_id)?.first_name} {student(f.student_id)?.last_name}</td><td>{f.description}</td><td>{f.term} {f.academic_year}</td><td>{fmtMoney(f.amount_due)}</td><td>{fmtMoney(f.amount_paid)}</td><td className="money-danger">{fmtMoney(f.balance)}</td><td><Status value={f.status}/></td></tr>)}</tbody></table></div></Panel></div>;
}

function Attendance({ attendance, students, studentName, onAdd }: any) {
  const present=attendance.filter((x:any)=>x.status==="present").length; const absent=attendance.filter((x:any)=>x.status==="absent").length; const leave=attendance.filter((x:any)=>x.status==="leave").length;
  return <div className="space-y-4"><div className="grid grid-cols-3 gap-3"><Kpi label="Present" value={present} good/><Kpi label="Absent" value={absent} danger/><Kpi label="On Leave" value={leave} warn/></div><Panel title="Attendance Tracking" right={<Button onClick={onAdd}><Plus size={15}/> Mark Attendance</Button>}><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Date</th><th>Student</th><th>Session</th><th>Status</th><th>Notes</th></tr></thead><tbody>{attendance.slice(0,100).map((x:any)=><tr key={x.id}><td>{x.attendance_date}</td><td>{studentName(x.student_id)}</td><td>{x.session}</td><td><Status value={x.status}/></td><td>{x.notes||"—"}</td></tr>)}</tbody></table>{!attendance.length&&<Empty title="No attendance recorded" action={onAdd}/>}</div></Panel></div>;
}

function Leave({ rows, studentName, onAdd }: any) {
  return <Panel title="Leave & Permission Management" right={<Button onClick={onAdd}><Plus size={15}/> New Request</Button>}><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Date</th><th>Student</th><th>Type</th><th>Leave From</th><th>To</th><th>Status</th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id}><td>{x.created_at?.slice(0,10)}</td><td>{studentName(x.student_id)}</td><td>{x.leave_type}</td><td>{x.from_date}</td><td>{x.to_date}</td><td><Status value={x.status}/></td></tr>)}</tbody></table>{!rows.length&&<Empty title="No leave requests" action={onAdd}/>}</div></Panel>;
}

function Maintenance({ rows, houses, rooms, onAdd }: any) {
  return <Panel title="Maintenance Requests" right={<Button onClick={onAdd}><Plus size={15}/> New Request</Button>}><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Request</th><th>Location</th><th>Issue</th><th>Priority</th><th>Status</th><th>Cost</th></tr></thead><tbody>{rows.map((x:any,i:number)=><tr key={x.id}><td>MR-{String(i+1).padStart(3,"0")}</td><td>{rooms.find((r:any)=>r.id===x.room_id)?.room_code||houses.find((h:any)=>h.id===x.house_id)?.name||"—"}</td><td>{x.description}</td><td><Status value={x.priority}/></td><td><Status value={x.status}/></td><td>{fmtMoney(x.actual_cost||x.estimated_cost)}</td></tr>)}</tbody></table>{!rows.length&&<Empty title="No maintenance requests" action={onAdd}/>}</div></Panel>;
}

function Discipline({ rows, studentName, onAdd }: any) {
  return <Panel title="Discipline & Incident Register" right={<Button onClick={onAdd}><Plus size={15}/> New Incident</Button>}><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Date</th><th>Student</th><th>Category</th><th>Severity</th><th>Action</th><th>Status</th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id}><td>{x.incident_date}</td><td>{studentName(x.student_id)}</td><td>{x.category}</td><td><Status value={x.severity}/></td><td>{x.action_taken||"—"}</td><td><Status value={x.status}/></td></tr>)}</tbody></table>{!rows.length&&<Empty title="No incidents recorded" action={onAdd}/>}</div></Panel>;
}

function Visitors({ rows, studentName, onAdd }: any) {
  return <Panel title="Visitors Register" right={<Button onClick={onAdd}><Plus size={15}/> Register Visitor</Button>}><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Visitor</th><th>Student</th><th>Relationship</th><th>Phone</th><th>Date</th><th>Status</th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id}><td>{x.visitor_name}</td><td>{studentName(x.student_id)}</td><td>{x.relationship||"—"}</td><td>{x.phone||"—"}</td><td>{x.visit_date}</td><td><Status value={x.status}/></td></tr>)}</tbody></table>{!rows.length&&<Empty title="No visitors today" action={onAdd}/>}</div></Panel>;
}

function Meals({ plans, assignments, students, studentName, onAdd }: any) {
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Meal Plans" right={<Button onClick={onAdd}><Plus size={15}/> Add Meal Plan</Button>}><div className="space-y-2">{plans.map((p:any)=><div key={p.id} className="mini-row"><div><strong>{p.name}</strong><small>{p.breakfast?"Breakfast ":""}{p.lunch?"Lunch ":""}{p.dinner?"Dinner":""}</small></div><b>{fmtMoney(p.price)}</b></div>)}{!plans.length&&<Empty title="No meal plans" action={onAdd}/>}</div></Panel><Panel title="Active Meal Assignments"><div className="table-wrap"><table className="boarding-table"><thead><tr><th>Student</th><th>Plan</th><th>Start</th><th>Status</th></tr></thead><tbody>{assignments.map((a:any)=><tr key={a.id}><td>{studentName(a.student_id)}</td><td>{plans.find((p:any)=>p.id===a.meal_plan_id)?.name||"—"}</td><td>{a.start_date}</td><td><Status value={a.status}/></td></tr>)}</tbody></table>{!assignments.length&&<Empty title="No meal assignments"/></div></Panel></div>;
}

function Reports({ students, houses, beds, allocations, fees, attendance, leave, maintenance, discipline }: any) {
  const collection=fees.reduce((n:any,x:any)=>n+Number(x.amount_paid||0),0); const billed=fees.reduce((n:any,x:any)=>n+Number(x.amount_due||0),0);
  const stats=[["Occupancy",`${beds.length?Math.round(allocations.length/beds.length*100):0}%`],["Fee collection",`${billed?Math.round(collection/billed*100):0}%`],["Students",students.length],["Houses",houses.length],["Leave requests",leave.length],["Maintenance",maintenance.length],["Incidents",discipline.length]];
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([a,b])=><Kpi key={a} label={a} value={b}/>)}</div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Occupancy Report"><DonutPercent value={beds.length?allocations.length/beds.length*100:0} label="Occupied beds"/><p className="muted mt-3">Export-ready report structure for houses, rooms, beds and student allocations.</p></Panel><Panel title="Boarding Operational Report"><div className="space-y-3">{stats.map(([a,b])=><div className="report-line" key={a}><span>{a}</span><b>{b}</b></div>)}</div></Panel></div></div>;
}

function Settings() {
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Boarding House Configuration"><div className="settings-list"><span>House types <b>Boys · Girls · Mixed</b></span><span>Room types <b>Standard · Premium · Sick Bay</b></span><span>Allocation <b>Bed-level</b></span><span>Academic terms <b>Configured in School</b></span><span>Currency <b>ZMW</b></span></div></Panel><Panel title="Controls & Integrations"><div className="settings-list"><span>Users & roles <b>Admin · House Parent · Matron · Bursar</b></span><span>Notifications <b>Fees · Leave · Incidents · Maintenance</b></span><span>Audit logs <b>Enabled</b></span><span>Accounting <b>Linked to SifoBooks</b></span><span>Parent communication <b>SMS / Email ready</b></span></div></Panel></div>;
}

function BoardingForm({ kind, students, houses, rooms, beds, meals, onClose, onSave, saving }: any) {
  const [form, setForm] = useState<AnyRow>({ status: "active", priority: "medium", session: "evening", method: "cash" });
  const set = (k:string,v:any) => setForm(x => ({...x,[k]:v}));
  const title: Record<string,string> = { house:"New Boarding House", room:"New Room", bed:"New Bed", allocation:"Allocate Student", fee:"Create Boarding Fee", payment:"Record Payment", attendance:"Mark Attendance", leave:"New Leave Request", maintenance:"New Maintenance Request", discipline:"New Incident", visitor:"Register Visitor", meal:"New Meal Plan", mealAssignment:"Assign Meal Plan" };
  const Field = ({label,name,type="text",required=false}:any)=><div className="form-field"><Label>{label}</Label><Input required={required} type={type} value={form[name]??""} onChange={e=>set(name,e.target.value)}/></div>;
  const Select = ({label,name,options}:any)=><div className="form-field"><Label>{label}</Label><select value={form[name]??""} onChange={e=>set(name,e.target.value)}>{options.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>;
  let body: any = null;
  if(kind==="house") body=<><Field label="House code" name="code" required/><Field label="House name" name="name" required/><Select label="Gender" name="gender" options={[["Boys","Boys"],["Girls","Girls"],["Mixed","Mixed"]]}/><Field label="Capacity" name="capacity" type="number"/><Field label="House parent" name="house_parent"/></>;
  if(kind==="room") body=<><Select label="House" name="house_id" options={houses.map((x:any)=>[x.id,x.name])}/><Field label="Block" name="block"/><Field label="Room code" name="room_code" required/><Field label="Floor" name="floor"/><Select label="Room type" name="room_type" options={[["standard","Standard"],["premium","Premium"],["sick_bay","Sick Bay"]]}/><Field label="Capacity / beds" name="capacity" type="number"/><Field label="Beds count" name="beds_count" type="number"/></>;
  if(kind==="bed") body=<><Select label="House" name="house_id" options={houses.map((x:any)=>[x.id,x.name])}/><Select label="Room (optional)" name="room_id" options={[["","No room"] , ...rooms.map((x:any)=>[x.id,x.room_code]) ]}/><Field label="Bed code" name="bed_code" required/><Select label="Status" name="status" options={[["vacant","Vacant"],["maintenance","Maintenance"],["out_of_service","Out of service"]]}/></>;
  if(kind==="allocation") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Select label="Bed" name="bed_id" options={beds.filter((b:any)=>b.status!=="maintenance").map((x:any)=>[x.id,x.bed_code])}/><Field label="Start date" name="start_date" type="date"/><Field label="Notes" name="notes"/></>;
  if(kind==="fee") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Field label="Description" name="description"/><Field label="Term" name="term"/><Field label="Academic year" name="academic_year" type="number"/><Field label="Amount due" name="amount_due" type="number"/><Field label="Due date" name="due_date" type="date"/></>;
  if(kind==="payment") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Field label="Amount" name="amount" type="number"/><Select label="Method" name="method" options={[["cash","Cash"],["bank","Bank"],["mobile_money","Mobile Money"],["card","Card"]]}/><Field label="Receipt number" name="receipt_no"/><Field label="Reference" name="reference"/></>;
  if(kind==="attendance") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Field label="Date" name="attendance_date" type="date"/><Select label="Session" name="session" options={[["morning","Morning"],["afternoon","Afternoon"],["evening","Evening"]]}/><Select label="Status" name="status" options={[["present","Present"],["absent","Absent"],["leave","On Leave"]]}/><Field label="Notes" name="notes"/></>;
  if(kind==="leave") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Select label="Leave type" name="leave_type" options={[["weekend","Weekend"],["medical","Medical"],["family","Family"],["school_event","School Event"]]}/><Field label="From" name="from_date" type="date"/><Field label="To" name="to_date" type="date"/><Field label="Destination" name="destination"/><Field label="Guardian contact" name="guardian_contact"/><Field label="Reason" name="reason"/></>;
  if(kind==="maintenance") body=<><Select label="House" name="house_id" options={houses.map((x:any)=>[x.id,x.name])}/><Select label="Room" name="room_id" options={rooms.map((x:any)=>[x.id,x.room_code])}/><Select label="Category" name="category" options={[["plumbing","Plumbing"],["electrical","Electrical"],["furniture","Furniture"],["general","General"]]}/><Field label="Description" name="description" required/><Select label="Priority" name="priority" options={[["high","High"],["medium","Medium"],["low","Low"]]}/><Field label="Estimated cost" name="estimated_cost" type="number"/></>;
  if(kind==="discipline") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Field label="Incident date" name="incident_date" type="date"/><Field label="Category" name="category" required/><Select label="Severity" name="severity" options={[["low","Low"],["medium","Medium"],["high","High"],["serious","Serious"]]}/><Field label="Description" name="description"/><Field label="Action taken" name="action_taken"/><Select label="Status" name="status" options={[["open","Open"],["closed","Closed"]]}/></>;
  if(kind==="visitor") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Field label="Visitor name" name="visitor_name" required/><Field label="Relationship" name="relationship"/><Field label="Phone" name="phone"/><Field label="ID number" name="id_number"/><Field label="Visit date" name="visit_date" type="date"/><Field label="Purpose" name="purpose"/></>;
  if(kind==="meal") body=<><Field label="Plan name" name="name" required/><Field label="Price" name="price" type="number"/><Select label="Breakfast" name="breakfast" options={[["true","Included"],["false","Not included"]]}/><Select label="Lunch" name="lunch" options={[["true","Included"],["false","Not included"]]}/><Select label="Dinner" name="dinner" options={[["true","Included"],["false","Not included"]]}/></>;
  if(kind==="mealAssignment") body=<><Select label="Student" name="student_id" options={students.map((x:any)=>[x.id,`${x.student_no} · ${x.first_name} ${x.last_name}`])}/><Select label="Meal plan" name="meal_plan_id" options={meals.map((x:any)=>[x.id,x.name])}/><Field label="Start date" name="start_date" type="date"/></>;
  return <div className="boarding-modal-backdrop"><div className="boarding-modal"><div className="boarding-modal-head"><div><span>SIFOBOOKS BOARDING HOUSE</span><h2>{title[kind]??"New Record"}</h2></div><button onClick={onClose}><X size={20}/></button></div><div className="boarding-form-grid">{body}</div><div className="boarding-modal-actions"><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="boarding-primary" disabled={saving} onClick={()=>onSave(kind,form)}>{saving?"Saving…":"Save Record"}</Button></div></div></div>;
}

function roomsCount(houses:any[], beds:any[]){return houses.reduce((n,h)=>n+Math.max(1,Math.round((beds.filter((b:any)=>b.house_id===h.id).length||Number(h.capacity||0))/4)),0);}
function bedAllocationLabel(id:string, allocations:any[], studentName:(id:string)=>string){const a=allocations.find(x=>x.bed_id===id);return a?studentName(a.student_id):"Vacant";}
function Kpi({label,value,hint,good,warn,danger}:any){return <div className={cn("boarding-kpi",good&&"good",warn&&"warn",danger&&"danger")}><span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;}
function Panel({title,right,children}:any){return <Card className="boarding-panel"><CardHeader><CardTitle>{title}</CardTitle>{right}</CardHeader><CardContent>{children}</CardContent></Card>;}
function Quick({onClick,icon:Icon,label}:any){return <button className="quick-action" onClick={onClick}><Icon size={17}/>{label}</button>;}
function Status({value}:any){const v=String(value??"").toLowerCase();return <span className={cn("status-pill",v.includes("active")||v==="present"||v==="paid"||v==="approved"||v==="completed"?"green":v.includes("pending")||v.includes("partial")||v==="medium"||v==="leave"?"amber":v.includes("absent")||v.includes("open")||v.includes("high")||v.includes("unpaid")||v==="serious"?"red":"gray")}>{value||"—"}</span>;}
function Info({label,value}:any){return <div><span>{label}</span><strong>{value||"—"}</strong></div>;}
function Empty({title,action}:any){return <div className="boarding-empty"><BedDouble size={30}/><strong>{title}</strong>{action&&<Button onClick={action}><Plus size={14}/> Add</Button>}</div>;}
function DonutPercent({value,label}:any){return <div className="donut-wrap"><div className="donut" style={{"--p":`${Math.min(100,Math.max(0,value))}%`} as any}><div><strong>{Math.round(value)}%</strong><small>{label}</small></div></div></div>;}

export default BoardingHouseWorkspace;
