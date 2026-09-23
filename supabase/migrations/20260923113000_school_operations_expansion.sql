-- School ERP operational expansion: boarding, discipline, health, library, transport and communications
CREATE TABLE IF NOT EXISTS public.school_boarding_houses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, code text NOT NULL, name text NOT NULL,
 gender text, capacity integer NOT NULL DEFAULT 0, house_parent text, active boolean NOT NULL DEFAULT true,
 UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS public.school_boarding_beds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, house_id uuid NOT NULL REFERENCES public.school_boarding_houses(id) ON DELETE CASCADE,
 bed_code text NOT NULL, status text NOT NULL DEFAULT 'vacant'
);
CREATE TABLE IF NOT EXISTS public.school_boarding_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
 bed_id uuid NOT NULL REFERENCES public.school_boarding_beds(id) ON DELETE RESTRICT, start_date date NOT NULL DEFAULT CURRENT_DATE,
 end_date date, status text NOT NULL DEFAULT 'active', notes text
);
CREATE TABLE IF NOT EXISTS public.school_discipline_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
 incident_date date NOT NULL DEFAULT CURRENT_DATE, category text NOT NULL, severity text NOT NULL DEFAULT 'low',
 description text, action_taken text, status text NOT NULL DEFAULT 'open', resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.school_health_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
 visit_date date NOT NULL DEFAULT CURRENT_DATE, complaint text, treatment text, referred boolean NOT NULL DEFAULT false, notes text
);
CREATE TABLE IF NOT EXISTS public.school_library_books (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, isbn text, title text NOT NULL, author text,
 category text, copies integer NOT NULL DEFAULT 1, available_copies integer NOT NULL DEFAULT 1, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.school_library_loans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, book_id uuid NOT NULL REFERENCES public.school_library_books(id) ON DELETE RESTRICT,
 student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE RESTRICT, issued_date date NOT NULL DEFAULT CURRENT_DATE,
 due_date date, returned_date date, status text NOT NULL DEFAULT 'issued'
);
CREATE TABLE IF NOT EXISTS public.school_transport_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, code text NOT NULL, name text NOT NULL, vehicle_no text,
 driver_name text, driver_phone text, capacity integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
 UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS public.school_transport_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, route_id uuid NOT NULL REFERENCES public.school_transport_routes(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE, pickup_point text, status text NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS public.school_communications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, audience text NOT NULL, subject text NOT NULL, message text NOT NULL,
 sent_at timestamptz, status text NOT NULL DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['school_boarding_houses','school_boarding_beds','school_boarding_allocations','school_discipline_incidents','school_health_visits','school_library_books','school_library_loans','school_transport_routes','school_transport_allocations','school_communications'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS "school ops owner" ON public.%I',t);
  EXECUTE format('CREATE POLICY "school ops owner" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',t);
 END LOOP;
END $$;