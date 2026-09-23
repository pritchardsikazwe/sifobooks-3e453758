-- SifoBooks vertical expansion: cashier code authentication + property / tenancy management
ALTER TABLE public.employee_pos_permissions ADD COLUMN IF NOT EXISTS cashier_code TEXT;
ALTER TABLE public.employee_pos_permissions ADD COLUMN IF NOT EXISTS display_name TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS employee_pos_permissions_cashier_code_uq ON public.employee_pos_permissions(cashier_code) WHERE cashier_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.property_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, code text NOT NULL, name text NOT NULL,
 property_type text NOT NULL DEFAULT 'apartment_block', address text, city text, units_count integer NOT NULL DEFAULT 0,
 active boolean NOT NULL DEFAULT true, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id, code)
);
CREATE TABLE IF NOT EXISTS public.property_units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, property_id uuid NOT NULL REFERENCES public.property_assets(id) ON DELETE CASCADE,
 unit_code text NOT NULL, unit_type text NOT NULL DEFAULT 'apartment', floor text, bedrooms integer NOT NULL DEFAULT 0, beds integer NOT NULL DEFAULT 1,
 monthly_rent numeric(18,2) NOT NULL DEFAULT 0, daily_rate numeric(18,2) NOT NULL DEFAULT 0, deposit_required numeric(18,2) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'vacant', active boolean NOT NULL DEFAULT true, notes text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(property_id, unit_code)
);
CREATE TABLE IF NOT EXISTS public.property_tenants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, tenant_no text NOT NULL, full_name text NOT NULL, phone text, email text,
 id_number text, emergency_contact text, emergency_phone text, notes text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id, tenant_no)
);
CREATE TABLE IF NOT EXISTS public.property_leases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, lease_no text NOT NULL,
 unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE RESTRICT, tenant_id uuid NOT NULL REFERENCES public.property_tenants(id) ON DELETE RESTRICT,
 lease_type text NOT NULL DEFAULT 'monthly', start_date date NOT NULL, end_date date, rent_amount numeric(18,2) NOT NULL DEFAULT 0,
 deposit_amount numeric(18,2) NOT NULL DEFAULT 0, billing_day integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'active',
 notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id, lease_no)
);
CREATE TABLE IF NOT EXISTS public.property_charges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, lease_id uuid NOT NULL REFERENCES public.property_leases(id) ON DELETE CASCADE,
 charge_date date NOT NULL DEFAULT CURRENT_DATE, due_date date NOT NULL DEFAULT CURRENT_DATE, charge_type text NOT NULL DEFAULT 'rent',
 description text NOT NULL, amount numeric(18,2) NOT NULL DEFAULT 0, paid_amount numeric(18,2) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, lease_id uuid REFERENCES public.property_leases(id) ON DELETE SET NULL,
 tenant_id uuid REFERENCES public.property_tenants(id) ON DELETE SET NULL, payment_no text NOT NULL, payment_date date NOT NULL DEFAULT CURRENT_DATE,
 amount numeric(18,2) NOT NULL DEFAULT 0, method text NOT NULL DEFAULT 'cash', reference text, allocation_notes text,
 status text NOT NULL DEFAULT 'posted', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id, payment_no)
);
CREATE TABLE IF NOT EXISTS public.property_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE RESTRICT,
 guest_name text NOT NULL, phone text, check_in date NOT NULL, check_out date NOT NULL, nightly_rate numeric(18,2) NOT NULL DEFAULT 0,
 total_amount numeric(18,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'reserved', notes text, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(check_out > check_in)
);
CREATE TABLE IF NOT EXISTS public.property_maintenance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, property_id uuid REFERENCES public.property_assets(id) ON DELETE SET NULL,
 unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL, title text NOT NULL, priority text NOT NULL DEFAULT 'medium',
 status text NOT NULL DEFAULT 'open', description text, estimated_cost numeric(18,2) NOT NULL DEFAULT 0, actual_cost numeric(18,2) NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_meter_readings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
 meter_type text NOT NULL, reading_date date NOT NULL DEFAULT CURRENT_DATE, reading numeric(18,3) NOT NULL DEFAULT 0, notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_units_property ON public.property_units(property_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_unit ON public.property_leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_tenant ON public.property_leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_charges_lease ON public.property_charges(lease_id);
CREATE INDEX IF NOT EXISTS idx_property_payments_tenant ON public.property_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_bookings_unit ON public.property_bookings(unit_id);
ALTER TABLE public.property_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_meter_readings ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['property_assets','property_units','property_tenants','property_leases','property_charges','property_payments','property_bookings','property_maintenance','property_meter_readings'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS "property tenant owner" ON public.%I',t);
  EXECUTE format('CREATE POLICY "property tenant owner" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',t);
 END LOOP;
END $$;

-- Recurring rental billing and tenant statement support.
ALTER TABLE public.property_charges ADD COLUMN IF NOT EXISTS billing_period TEXT;
ALTER TABLE public.property_charges ADD COLUMN IF NOT EXISTS charge_source TEXT NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS property_charges_lease_period_uq
  ON public.property_charges(lease_id, billing_period)
  WHERE billing_period IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_charges_due_status
  ON public.property_charges(company_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_property_payments_date
  ON public.property_payments(company_id, payment_date);
