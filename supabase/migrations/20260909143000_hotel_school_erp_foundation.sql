-- Additive foundation only. Does not alter or delete existing SifoBooks finance/POS/inventory tables.
-- All sector records are tenant-scoped through company_id and user_id.

CREATE TABLE IF NOT EXISTS public.hotel_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, code TEXT NOT NULL, name TEXT NOT NULL,
  capacity SMALLINT NOT NULL DEFAULT 1, base_rate NUMERIC(18,2) NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, code)
);
CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, room_type_id UUID REFERENCES public.hotel_room_types(id) ON DELETE SET NULL,
  room_number TEXT NOT NULL, floor TEXT, status TEXT NOT NULL DEFAULT 'available', housekeeping_status TEXT NOT NULL DEFAULT 'clean',
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, room_number)
);
CREATE TABLE IF NOT EXISTS public.hotel_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL, phone TEXT, email TEXT, id_number TEXT, nationality TEXT DEFAULT 'Zambia',
  notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hotel_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, reservation_no TEXT NOT NULL, guest_id UUID NOT NULL REFERENCES public.hotel_guests(id) ON DELETE RESTRICT,
  room_type_id UUID REFERENCES public.hotel_room_types(id) ON DELETE SET NULL, room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  check_in DATE NOT NULL, check_out DATE NOT NULL, adults SMALLINT NOT NULL DEFAULT 1, children SMALLINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', total_amount NUMERIC(18,2) NOT NULL DEFAULT 0, deposit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, reservation_no), CHECK (check_out > check_in)
);
CREATE TABLE IF NOT EXISTS public.hotel_folios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, folio_no TEXT NOT NULL, reservation_id UUID REFERENCES public.hotel_reservations(id) ON DELETE SET NULL,
  guest_id UUID NOT NULL REFERENCES public.hotel_guests(id) ON DELETE RESTRICT, status TEXT NOT NULL DEFAULT 'open',
  currency TEXT NOT NULL DEFAULT 'ZMW', total_amount NUMERIC(18,2) NOT NULL DEFAULT 0, paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, folio_no)
);
CREATE TABLE IF NOT EXISTS public.hotel_folio_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, folio_id UUID NOT NULL REFERENCES public.hotel_folios(id) ON DELETE CASCADE,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE, description TEXT NOT NULL, source_type TEXT NOT NULL, source_id UUID,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1, unit_amount NUMERIC(18,2) NOT NULL DEFAULT 0, tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hotel_housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE, task_type TEXT NOT NULL DEFAULT 'cleaning', status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID, notes TEXT, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hotel_maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open', description TEXT,
  estimated_cost NUMERIC(18,2) NOT NULL DEFAULT 0, actual_cost NUMERIC(18,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, admission_no TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  date_of_birth DATE, gender TEXT, status TEXT NOT NULL DEFAULT 'active', current_class TEXT, phone TEXT, email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, admission_no)
);
CREATE TABLE IF NOT EXISTS public.school_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name TEXT NOT NULL, relationship TEXT, phone TEXT, email TEXT,
  address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.school_student_parents (
  student_id UUID NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE, parent_id UUID NOT NULL REFERENCES public.school_parents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE, is_primary BOOLEAN NOT NULL DEFAULT false, PRIMARY KEY(student_id, parent_id)
);
CREATE TABLE IF NOT EXISTS public.school_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, application_no TEXT NOT NULL, applicant_name TEXT NOT NULL, class_applied TEXT NOT NULL,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE, status TEXT NOT NULL DEFAULT 'new', notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, application_no)
);
CREATE TABLE IF NOT EXISTS public.school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, code TEXT NOT NULL, name TEXT NOT NULL, grade TEXT, stream TEXT, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, code)
);
CREATE TABLE IF NOT EXISTS public.school_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, code TEXT NOT NULL, name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, code)
);
CREATE TABLE IF NOT EXISTS public.school_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, student_id UUID NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL, status TEXT NOT NULL, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(student_id, attendance_date)
);
CREATE TABLE IF NOT EXISTS public.school_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name TEXT NOT NULL, term TEXT, academic_year TEXT NOT NULL, class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft', max_marks NUMERIC(10,2) NOT NULL DEFAULT 100, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.school_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, assessment_id UUID NOT NULL REFERENCES public.school_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE, marks NUMERIC(10,2) NOT NULL DEFAULT 0, grade TEXT, remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(assessment_id, student_id)
);
CREATE TABLE IF NOT EXISTS public.school_fee_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, student_id UUID NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL, term TEXT, charges NUMERIC(18,2) NOT NULL DEFAULT 0, paid NUMERIC(18,2) NOT NULL DEFAULT 0, balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(student_id, academic_year, term)
);

ALTER TABLE public.hotel_room_types ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hotel_guests ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hotel_reservations ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hotel_folios ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hotel_folio_lines ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hotel_housekeeping_tasks ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hotel_maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_parents ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_student_parents ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_admissions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_attendance ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_assessments ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_marks ENABLE ROW LEVEL SECURITY; ALTER TABLE public.school_fee_accounts ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN FOR t IN SELECT unnest(ARRAY['hotel_room_types','hotel_rooms','hotel_guests','hotel_reservations','hotel_folios','hotel_folio_lines','hotel_housekeeping_tasks','hotel_maintenance_tasks','school_students','school_parents','school_student_parents','school_admissions','school_classes','school_subjects','school_attendance','school_assessments','school_marks','school_fee_accounts']) LOOP EXECUTE format('DROP POLICY IF EXISTS "own sector records" ON public.%I', t); EXECUTE format('CREATE POLICY "own sector records" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t); END LOOP; END $$;
