-- Restore exact legacy table names used by the current School module gate.
-- These are compatibility tables; existing school ERP tables are not replaced.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.boarding_houses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, code text,
 name text NOT NULL, gender text, capacity integer NOT NULL DEFAULT 0,
 house_parent text, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.boarding_beds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 house_id uuid REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
 bed_code text, status text NOT NULL DEFAULT 'vacant'
);
CREATE TABLE IF NOT EXISTS public.boarding_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 student_id uuid, bed_id uuid REFERENCES public.boarding_beds(id) ON DELETE RESTRICT,
 start_date date NOT NULL DEFAULT CURRENT_DATE, end_date date,
 status text NOT NULL DEFAULT 'active', notes text
);
CREATE TABLE IF NOT EXISTS public.student_discipline (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, student_id uuid,
 incident_date date NOT NULL DEFAULT CURRENT_DATE, category text NOT NULL DEFAULT 'general',
 severity text NOT NULL DEFAULT 'low', description text, action_taken text,
 status text NOT NULL DEFAULT 'open', resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.student_health (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, student_id uuid,
 visit_date date NOT NULL DEFAULT CURRENT_DATE, complaint text, treatment text,
 referred boolean NOT NULL DEFAULT false, notes text
);
CREATE TABLE IF NOT EXISTS public.library_loans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, book_id uuid, student_id uuid,
 issued_date date NOT NULL DEFAULT CURRENT_DATE, due_date date, returned_date date,
 status text NOT NULL DEFAULT 'issued'
);
CREATE TABLE IF NOT EXISTS public.school_transport (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, route_id uuid, student_id uuid,
 pickup_point text, status text NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_boarding_houses_user ON public.boarding_houses(user_id);
CREATE INDEX IF NOT EXISTS idx_boarding_beds_user ON public.boarding_beds(user_id);
CREATE INDEX IF NOT EXISTS idx_boarding_allocations_user ON public.boarding_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_student_discipline_user ON public.student_discipline(user_id);
CREATE INDEX IF NOT EXISTS idx_student_health_user ON public.student_health(user_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_user ON public.library_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_school_transport_user ON public.school_transport(user_id);
