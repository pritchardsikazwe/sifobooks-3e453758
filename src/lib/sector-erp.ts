import { supabase } from "@/integrations/supabase/client";

export type SectorKind = "hotel" | "school";

function requireCompanyId(companyId?: string) {
  if (!companyId) throw new Error("A company must be selected before saving sector records.");
  return companyId;
}

export async function createHotelReservation(input: {
  companyId?: string; userId: string; reservationNo: string; guestId: string;
  roomTypeId?: string; roomId?: string; checkIn: string; checkOut: string;
  adults?: number; children?: number; totalAmount?: number; depositAmount?: number; notes?: string;
}) {
  const companyId = requireCompanyId(input.companyId);
  if (new Date(input.checkOut) <= new Date(input.checkIn)) throw new Error("Check-out must be after check-in.");
  const { data: duplicate } = await supabase.from("hotel_reservations").select("id").eq("company_id", companyId).eq("reservation_no", input.reservationNo).maybeSingle();
  if (duplicate) throw new Error("Reservation number already exists.");
  const { data, error } = await supabase.from("hotel_reservations").insert({ company_id: companyId, user_id: input.userId, reservation_no: input.reservationNo, guest_id: input.guestId, room_type_id: input.roomTypeId ?? null, room_id: input.roomId ?? null, check_in: input.checkIn, check_out: input.checkOut, adults: input.adults ?? 1, children: input.children ?? 0, total_amount: input.totalAmount ?? 0, deposit_amount: input.depositAmount ?? 0, notes: input.notes ?? null }).select().single();
  if (error) throw error;
  return data;
}

export async function postHotelFolioLine(input: {
  companyId?: string; userId: string; folioId: string; description: string; sourceType: string; sourceId?: string;
  quantity?: number; unitAmount: number; taxAmount?: number;
}) {
  const companyId = requireCompanyId(input.companyId);
  const quantity = input.quantity ?? 1;
  const taxAmount = input.taxAmount ?? 0;
  const totalAmount = quantity * input.unitAmount + taxAmount;
  if (totalAmount < 0) throw new Error("Folio amount cannot be negative.");
  const { data, error } = await supabase.from("hotel_folio_lines").insert({ company_id: companyId, user_id: input.userId, folio_id: input.folioId, description: input.description, source_type: input.sourceType, source_id: input.sourceId ?? null, quantity, unit_amount: input.unitAmount, tax_amount: taxAmount, total_amount: totalAmount }).select().single();
  if (error) throw error;
  return data;
}

export async function recordSchoolAttendance(input: { companyId?: string; userId: string; studentId: string; attendanceDate: string; status: string; notes?: string }) {
  const companyId = requireCompanyId(input.companyId);
  const { data: existing } = await supabase.from("school_attendance").select("id").eq("student_id", input.studentId).eq("attendance_date", input.attendanceDate).maybeSingle();
  const payload = { company_id: companyId, user_id: input.userId, student_id: input.studentId, attendance_date: input.attendanceDate, status: input.status, notes: input.notes ?? null };
  if (existing) {
    const { data, error } = await supabase.from("school_attendance").update(payload).eq("id", existing.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("school_attendance").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function saveSchoolMarks(input: { companyId?: string; userId: string; assessmentId: string; studentId: string; marks: number; grade?: string; remarks?: string }) {
  const companyId = requireCompanyId(input.companyId);
  if (input.marks < 0) throw new Error("Marks cannot be negative.");
  const { data, error } = await supabase.from("school_marks").upsert({ company_id: companyId, user_id: input.userId, assessment_id: input.assessmentId, student_id: input.studentId, marks: input.marks, grade: input.grade ?? null, remarks: input.remarks ?? null }, { onConflict: "assessment_id,student_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSchoolFeeAccount(input: { companyId?: string; userId: string; studentId: string; academicYear: string; term?: string; charges: number; paid: number }) {
  const companyId = requireCompanyId(input.companyId);
  if (input.charges < 0 || input.paid < 0) throw new Error("Fee charges and payments cannot be negative.");
  const balance = Math.max(input.charges - input.paid, 0);
  const { data, error } = await supabase.from("school_fee_accounts").upsert({ company_id: companyId, user_id: input.userId, student_id: input.studentId, academic_year: input.academicYear, term: input.term ?? null, charges: input.charges, paid: input.paid, balance }, { onConflict: "student_id,academic_year,term" }).select().single();
  if (error) throw error;
  return data;
}
