-- Additive indexes for the new sector ERP tables.
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_company_dates ON public.hotel_reservations(company_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_guest ON public.hotel_reservations(company_id, guest_id);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_company_status ON public.hotel_rooms(company_id, status, housekeeping_status);
CREATE INDEX IF NOT EXISTS idx_hotel_folios_company_status ON public.hotel_folios(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hotel_folio_lines_folio_date ON public.hotel_folio_lines(folio_id, posting_date);
CREATE INDEX IF NOT EXISTS idx_hotel_housekeeping_date_status ON public.hotel_housekeeping_tasks(company_id, task_date, status);
CREATE INDEX IF NOT EXISTS idx_hotel_maintenance_status ON public.hotel_maintenance_tasks(company_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_school_students_company_status ON public.school_students(company_id, status, current_class);
CREATE INDEX IF NOT EXISTS idx_school_admissions_company_status ON public.school_admissions(company_id, status, application_date);
CREATE INDEX IF NOT EXISTS idx_school_attendance_company_date ON public.school_attendance(company_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_school_marks_assessment ON public.school_marks(assessment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_school_fee_accounts_company_year ON public.school_fee_accounts(company_id, academic_year, term);
