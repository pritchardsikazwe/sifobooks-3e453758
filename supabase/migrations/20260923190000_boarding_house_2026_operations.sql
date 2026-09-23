-- SifoBooks Boarding House 2026 operational layer
-- Extends school boarding with rooms, leave, visitors, meals, attendance and maintenance.

CREATE TABLE IF NOT EXISTS public.school_boarding_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES public.school_boarding_houses(id) ON DELETE CASCADE,
  block text NOT NULL DEFAULT 'Block A',
  room_code text NOT NULL,
  floor text,
  room_type text NOT NULL DEFAULT 'standard',
  capacity integer NOT NULL DEFAULT 4,
  beds_count integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, house_id, room_code)
);

ALTER TABLE public.school_boarding_beds ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.school_boarding_rooms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_boarding_beds_room ON public.school_boarding_beds(room_id);

CREATE TABLE IF NOT EXISTS public.school_boarding_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'weekend',
  from_date date NOT NULL,
  to_date date NOT NULL,
  destination text,
  guardian_contact text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (to_date >= from_date)
);

CREATE TABLE IF NOT EXISTS public.school_boarding_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  relationship text,
  phone text,
  id_number text,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  time_in timestamptz,
  time_out timestamptz,
  purpose text,
  status text NOT NULL DEFAULT 'checked_in',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_boarding_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(18,2) NOT NULL DEFAULT 0,
  breakfast boolean NOT NULL DEFAULT true,
  lunch boolean NOT NULL DEFAULT true,
  dinner boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  notes text
);

CREATE TABLE IF NOT EXISTS public.school_boarding_meal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  meal_plan_id uuid NOT NULL REFERENCES public.school_boarding_meal_plans(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  UNIQUE(company_id, student_id, meal_plan_id, start_date)
);

CREATE TABLE IF NOT EXISTS public.school_boarding_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  session text NOT NULL DEFAULT 'evening',
  status text NOT NULL DEFAULT 'present',
  notes text,
  UNIQUE(company_id, student_id, attendance_date, session)
);

CREATE TABLE IF NOT EXISTS public.school_boarding_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_id uuid REFERENCES public.school_boarding_houses(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.school_boarding_rooms(id) ON DELETE SET NULL,
  bed_id uuid REFERENCES public.school_boarding_beds(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  assigned_to text,
  estimated_cost numeric(18,2) NOT NULL DEFAULT 0,
  actual_cost numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boarding_rooms_house ON public.school_boarding_rooms(house_id);
CREATE INDEX IF NOT EXISTS idx_boarding_leave_student ON public.school_boarding_leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_boarding_visitors_student ON public.school_boarding_visitors(student_id);
CREATE INDEX IF NOT EXISTS idx_boarding_meals_student ON public.school_boarding_meal_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_boarding_attendance_date ON public.school_boarding_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_boarding_maintenance_house ON public.school_boarding_maintenance(house_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'school_boarding_rooms','school_boarding_leave_requests','school_boarding_visitors',
    'school_boarding_meal_plans','school_boarding_meal_assignments',
    'school_boarding_attendance','school_boarding_maintenance'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "boarding owner" ON public.%I', t);
    EXECUTE format('CREATE POLICY "boarding owner" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;