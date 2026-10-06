-- Restore missing SifoBooks module-gate tables.
-- Additive/idempotent: existing data and tables are preserved.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.butchery_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, item_id uuid NOT NULL,
  animal_type text NOT NULL DEFAULT 'beef', cut_name text, grade text, unit text NOT NULL DEFAULT 'kg',
  price_per_kg numeric NOT NULL DEFAULT 0, min_price_per_kg numeric NOT NULL DEFAULT 0,
  scale_enabled boolean NOT NULL DEFAULT true, label_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,item_id)
);

CREATE TABLE IF NOT EXISTS public.butchery_scale_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL,
  manufacturer text, model text, connection_type text NOT NULL DEFAULT 'web_serial', port text,
  baud_rate integer NOT NULL DEFAULT 9600, unit text NOT NULL DEFAULT 'kg',
  decimal_places integer NOT NULL DEFAULT 3, is_active boolean NOT NULL DEFAULT true,
  last_weight numeric, last_stable boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.butchery_processing_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, reference text NOT NULL,
  source_item_id uuid, input_qty numeric NOT NULL DEFAULT 0, input_unit text NOT NULL DEFAULT 'kg',
  input_cost numeric NOT NULL DEFAULT 0, saleable_qty numeric NOT NULL DEFAULT 0, waste_qty numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', processed_at timestamptz, notes text, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.butchery_yield_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, batch_id uuid NOT NULL,
  output_item_id uuid, output_name text NOT NULL, output_qty numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg', yield_percent numeric NOT NULL DEFAULT 0, note text
);

CREATE TABLE IF NOT EXISTS public.property_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 code text NOT NULL, name text NOT NULL, property_type text NOT NULL DEFAULT 'apartment_block',
 address text, city text, units_count integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
 notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 property_id uuid REFERENCES public.property_assets(id) ON DELETE CASCADE, unit_code text NOT NULL,
 unit_type text NOT NULL DEFAULT 'apartment', floor text, bedrooms integer NOT NULL DEFAULT 0,
 beds integer NOT NULL DEFAULT 1, monthly_rent numeric(18,2) NOT NULL DEFAULT 0,
 daily_rate numeric(18,2) NOT NULL DEFAULT 0, deposit_required numeric(18,2) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'vacant', active boolean NOT NULL DEFAULT true, notes text
);
CREATE TABLE IF NOT EXISTS public.property_tenants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 tenant_no text NOT NULL, full_name text NOT NULL, phone text, email text, id_number text,
 emergency_contact text, emergency_phone text, notes text, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_leases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 lease_no text NOT NULL, unit_id uuid REFERENCES public.property_units(id), tenant_id uuid REFERENCES public.property_tenants(id),
 lease_type text NOT NULL DEFAULT 'monthly', start_date date NOT NULL DEFAULT CURRENT_DATE, end_date date,
 rent_amount numeric(18,2) NOT NULL DEFAULT 0, deposit_amount numeric(18,2) NOT NULL DEFAULT 0,
 billing_day integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'active',
 notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_charges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 lease_id uuid REFERENCES public.property_leases(id) ON DELETE CASCADE, charge_date date NOT NULL DEFAULT CURRENT_DATE,
 due_date date NOT NULL DEFAULT CURRENT_DATE, charge_type text NOT NULL DEFAULT 'rent', description text NOT NULL,
 amount numeric(18,2) NOT NULL DEFAULT 0, paid_amount numeric(18,2) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 lease_id uuid REFERENCES public.property_leases(id) ON DELETE SET NULL, tenant_id uuid REFERENCES public.property_tenants(id) ON DELETE SET NULL,
 payment_no text NOT NULL, payment_date date NOT NULL DEFAULT CURRENT_DATE, amount numeric(18,2) NOT NULL DEFAULT 0,
 method text NOT NULL DEFAULT 'cash', reference text, allocation_notes text, status text NOT NULL DEFAULT 'posted',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 unit_id uuid REFERENCES public.property_units(id), guest_name text NOT NULL, phone text,
 check_in date NOT NULL, check_out date NOT NULL, nightly_rate numeric(18,2) NOT NULL DEFAULT 0,
 total_amount numeric(18,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'reserved', notes text,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(check_out > check_in)
);
CREATE TABLE IF NOT EXISTS public.property_maintenance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 property_id uuid REFERENCES public.property_assets(id), unit_id uuid REFERENCES public.property_units(id),
 title text NOT NULL, priority text NOT NULL DEFAULT 'medium', status text NOT NULL DEFAULT 'open',
 description text, estimated_cost numeric(18,2) NOT NULL DEFAULT 0, actual_cost numeric(18,2) NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_meter_readings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, user_id uuid NOT NULL,
 unit_id uuid REFERENCES public.property_units(id) ON DELETE CASCADE, meter_type text NOT NULL,
 reading_date date NOT NULL DEFAULT CURRENT_DATE, reading numeric(18,3) NOT NULL DEFAULT 0,
 notes text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lending_borrowers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, company_id uuid,
 borrower_no text NOT NULL, borrower_type text NOT NULL DEFAULT 'individual', full_name text NOT NULL,
 phone text, email text, national_id text, address text, employment text,
 monthly_income numeric(18,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'active',
 kyc_status text NOT NULL DEFAULT 'pending', credit_score integer, notes text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lending_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, company_id uuid,
 application_no text NOT NULL, borrower_id uuid REFERENCES public.lending_borrowers(id),
 product_id uuid, amount_requested numeric(18,2) NOT NULL DEFAULT 0, term integer NOT NULL DEFAULT 1,
 purpose text, monthly_income numeric(18,2) NOT NULL DEFAULT 0, monthly_expenses numeric(18,2) NOT NULL DEFAULT 0,
 credit_score integer, affordability_status text NOT NULL DEFAULT 'pending',
 kyc_status text NOT NULL DEFAULT 'pending', status text NOT NULL DEFAULT 'draft',
 notes text, applied_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_butchery_products_user ON public.butchery_products(user_id,is_active);
CREATE INDEX IF NOT EXISTS idx_butchery_scales_user ON public.butchery_scale_devices(user_id,is_active);
CREATE INDEX IF NOT EXISTS idx_property_units_user ON public.property_units(user_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_user ON public.property_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_lending_borrowers_user ON public.lending_borrowers(user_id);
CREATE INDEX IF NOT EXISTS idx_lending_apps_user ON public.lending_applications(user_id);
