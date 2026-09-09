import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Sector ERP tables are not present in the generated types yet.
const db: any = supabase;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
import { toast } from "sonner";
import { createHotelReservation, recordSchoolAttendance, saveSchoolMarks, updateSchoolFeeAccount } from "@/lib/sector-erp";

export function SifoSectorConnectedWorkspace({ kind, screen }: { kind: "hotel" | "school"; screen: string }) {
  const [userId, setUserId] = useState<string>();
  const [companyId, setCompanyId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).order("is_primary", { ascending: false }).limit(1).maybeSingle();
    setCompanyId(company?.id);
    await refresh(user.id, company?.id);
  })(); }, [screen, kind]);

  const refresh = async (uid?: string, cid?: string) => {
    if (!uid || !cid) return;
    if (screen === "/hotel/reservations") {
      const { data } = await db.from("hotel_reservations").select("reservation_no,check_in,check_out,status,total_amount,hotel_guests(first_name,last_name)").eq("company_id", cid).order("check_in", { ascending: false }).limit(50);
      setRows(data ?? []);
    } else if (screen === "/school/students") {
      const { data } = await db.from("school_students").select("admission_no,first_name,last_name,current_class,status").eq("company_id", cid).order("created_at", { ascending: false }).limit(50);
      setRows(data ?? []);
    } else if (screen === "/school/attendance") {
      const { data } = await db.from("school_attendance").select("attendance_date,status,notes,school_students(first_name,last_name,admission_no)").eq("company_id", cid).order("attendance_date", { ascending: false }).limit(50);
      setRows(data ?? []);
    } else if (screen === "/school/exams") {
      const { data } = await db.from("school_marks").select("marks,grade,remarks,school_students(first_name,last_name,admission_no),school_assessments(name,term,academic_year)").eq("company_id", cid).order("created_at", { ascending: false }).limit(50);
      setRows(data ?? []);
    } else if (screen === "/school/fees") {
      const { data } = await db.from("school_fee_accounts").select("academic_year,term,charges,paid,balance,school_students(first_name,last_name,admission_no,current_class)").eq("company_id", cid).order("updated_at", { ascending: false }).limit(50);
      setRows(data ?? []);
    } else if (screen === "/hotel/folios") {
      const { data } = await db.from("hotel_folios").select("folio_no,status,total_amount,paid_amount,hotel_guests(first_name,last_name)").eq("company_id", cid).order("updated_at", { ascending: false }).limit(50);
      setRows(data ?? []);
    } else if (screen === "/hotel/guests") {
      const { data } = await db.from("hotel_guests").select("first_name,last_name,phone,email,nationality").eq("company_id", cid).order("created_at", { ascending: false }).limit(50);
      setRows(data ?? []);
    }
  };

  const action = async (fn: () => Promise<unknown>) => { try { setBusy(true); await fn(); toast.success("Saved successfully"); await refresh(userId, companyId); } catch (e: any) { toast.error(e?.message ?? "Unable to save"); } finally { setBusy(false); } };

  if (screen === "/hotel/reservations" && userId && companyId) return <HotelReservationEditor busy={busy} onSave={(v: any) => action(() => createHotelReservation({ ...v, userId, companyId }))} rows={rows} />;
  if (screen === "/school/attendance" && userId && companyId) return <SchoolAttendanceEditor busy={busy} onSave={(v: any) => action(() => recordSchoolAttendance({ ...v, userId, companyId }))} rows={rows} />;
  if (screen === "/school/exams" && userId && companyId) return <SchoolMarksEditor busy={busy} onSave={(v: any) => action(() => saveSchoolMarks({ ...v, userId, companyId }))} rows={rows} />;
  if (screen === "/school/fees" && userId && companyId) return <SchoolFeeEditor busy={busy} onSave={(v: any) => action(() => updateSchoolFeeAccount({ ...v, userId, companyId }))} rows={rows} />;
  return <SifoIndustryWorkspace kind={kind} screen={screen} />;
}

function Shell({ title, children }: { title: string; children: ReactNode }) { return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-7xl space-y-5"><Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card></div></div>; }
function HotelReservationEditor({ busy, onSave, rows }: any) { const [v,setV]=useState({reservationNo:"",guestId:"",checkIn:"",checkOut:"",totalAmount:0,depositAmount:0}); return <Shell title="Reservations — Connected"><div className="grid gap-4 md:grid-cols-2">{[['reservationNo','Reservation number'],['guestId','Guest ID'],['checkIn','Check-in'],['checkOut','Check-out'],['totalAmount','Total amount'],['depositAmount','Deposit']].map(([k,l])=><div key={k}><Label>{l}</Label><Input value={(v as any)[k]} type={String(k).includes('Amount')?'number':String(k).includes('Date')?'date':'text'} onChange={e=>setV({...v,[k]:e.target.value})}/></div>)}</div><Button className="mt-5" disabled={busy} onClick={()=>onSave({...v,totalAmount:Number(v.totalAmount),depositAmount:Number(v.depositAmount)})}>Create reservation</Button><div className="mt-6 space-y-2">{rows.map((r:any)=><div key={r.reservation_no} className="rounded-lg border bg-white p-3 text-sm">{r.reservation_no} · {r.hotel_guests?.first_name} {r.hotel_guests?.last_name} · {r.status} · K {r.total_amount}</div>)}</div></Shell>; }
function SchoolAttendanceEditor({ busy, onSave, rows }: any) { const [v,setV]=useState({studentId:"",attendanceDate:"",status:"present",notes:""}); return <Shell title="Attendance — Connected"><div className="grid gap-4 md:grid-cols-2">{[['studentId','Student ID'],['attendanceDate','Date'],['status','Status'],['notes','Notes']].map(([k,l])=><div key={k}><Label>{l}</Label><Input type={k==='attendanceDate'?'date':'text'} value={(v as any)[k]} onChange={e=>setV({...v,[k]:e.target.value})}/></div>)}</div><Button className="mt-5" disabled={busy} onClick={()=>onSave(v)}>Save attendance</Button><div className="mt-6 space-y-2">{rows.map((r:any,i:number)=><div key={i} className="rounded-lg border bg-white p-3 text-sm">{r.school_students?.admission_no} · {r.status} · {r.attendance_date}</div>)}</div></Shell>; }
function SchoolMarksEditor({ busy, onSave, rows }: any) { const [v,setV]=useState({assessmentId:"",studentId:"",marks:0,grade:"",remarks:""}); return <Shell title="Examinations & Results — Connected"><div className="grid gap-4 md:grid-cols-2">{[['assessmentId','Assessment ID'],['studentId','Student ID'],['marks','Marks'],['grade','Grade'],['remarks','Remarks']].map(([k,l])=><div key={k}><Label>{l}</Label><Input type={k==='marks'?'number':'text'} value={(v as any)[k]} onChange={e=>setV({...v,[k]:e.target.value})}/></div>)}</div><Button className="mt-5" disabled={busy} onClick={()=>onSave({...v,marks:Number(v.marks)})}>Save marks</Button><div className="mt-6 space-y-2">{rows.map((r:any,i:number)=><div key={i} className="rounded-lg border bg-white p-3 text-sm">{r.school_students?.admission_no} · {r.school_assessments?.name} · {r.marks} · {r.grade ?? "—"}</div>)}</div></Shell>; }
function SchoolFeeEditor({ busy, onSave, rows }: any) { const [v,setV]=useState({studentId:"",academicYear:"2026",term:"Term 1",charges:0,paid:0}); return <Shell title="Fees & Billing — Connected"><div className="grid gap-4 md:grid-cols-2">{[['studentId','Student ID'],['academicYear','Academic year'],['term','Term'],['charges','Charges'],['paid','Paid']].map(([k,l])=><div key={k}><Label>{l}</Label><Input type={['charges','paid'].includes(k)?'number':'text'} value={(v as any)[k]} onChange={e=>setV({...v,[k]:e.target.value})}/></div>)}</div><Button className="mt-5" disabled={busy} onClick={()=>onSave({...v,charges:Number(v.charges),paid:Number(v.paid)})}>Save fee account</Button><div className="mt-6 space-y-2">{rows.map((r:any,i:number)=><div key={i} className="rounded-lg border bg-white p-3 text-sm">{r.school_students?.admission_no} · {r.academic_year} · billed K {r.charges} · paid K {r.paid} · balance K {r.balance}</div>)}</div></Shell>; }
