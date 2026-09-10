
-- ============ ROOM TYPES ============
CREATE TABLE public.hotel_room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  base_rate numeric NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 2,
  amenities text[] NOT NULL DEFAULT '{}',
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_room_types TO authenticated;
GRANT ALL ON public.hotel_room_types TO service_role;
ALTER TABLE public.hotel_room_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_room_types" ON public.hotel_room_types FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hotel_room_types" ON public.hotel_room_types FOR SELECT TO authenticated USING (public.is_staff_of(user_id));

-- ============ ROOMS ============
CREATE TABLE public.hotel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  room_type_id uuid REFERENCES public.hotel_room_types(id) ON DELETE SET NULL,
  number text NOT NULL,
  floor text,
  status text NOT NULL DEFAULT 'vacant',
  housekeeping_status text NOT NULL DEFAULT 'clean',
  rate_override numeric,
  out_of_order boolean NOT NULL DEFAULT false,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_rooms TO authenticated;
GRANT ALL ON public.hotel_rooms TO service_role;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_rooms" ON public.hotel_rooms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hotel_rooms" ON public.hotel_rooms FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
CREATE POLICY "staff update hotel_rooms" ON public.hotel_rooms FOR UPDATE TO authenticated USING (public.is_staff_of(user_id)) WITH CHECK (public.is_staff_of(user_id));

-- ============ RESERVATIONS ============
CREATE TABLE public.hotel_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  reference text,
  guest_name text NOT NULL,
  phone text,
  email text,
  company text,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  check_in date NOT NULL,
  check_out date NOT NULL,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  nightly_rate numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  source text,
  walk_in boolean NOT NULL DEFAULT false,
  special_requests text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_reservations TO authenticated;
GRANT ALL ON public.hotel_reservations TO service_role;
ALTER TABLE public.hotel_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_reservations" ON public.hotel_reservations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hotel_reservations" ON public.hotel_reservations FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
CREATE POLICY "staff write hotel_reservations" ON public.hotel_reservations FOR INSERT TO authenticated WITH CHECK (public.is_staff_of(user_id));
CREATE POLICY "staff update hotel_reservations" ON public.hotel_reservations FOR UPDATE TO authenticated USING (public.is_staff_of(user_id)) WITH CHECK (public.is_staff_of(user_id));

-- ============ FOLIOS ============
CREATE TABLE public.hotel_folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  reservation_id uuid REFERENCES public.hotel_reservations(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  folio_number text NOT NULL,
  guest_name text,
  billing_type text NOT NULL DEFAULT 'guest',
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_folios TO authenticated;
GRANT ALL ON public.hotel_folios TO service_role;
ALTER TABLE public.hotel_folios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_folios" ON public.hotel_folios FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hotel_folios" ON public.hotel_folios FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
CREATE POLICY "staff write hotel_folios" ON public.hotel_folios FOR INSERT TO authenticated WITH CHECK (public.is_staff_of(user_id));
CREATE POLICY "staff update hotel_folios" ON public.hotel_folios FOR UPDATE TO authenticated USING (public.is_staff_of(user_id)) WITH CHECK (public.is_staff_of(user_id));

-- ============ FOLIO CHARGES ============
CREATE TABLE public.hotel_folio_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folio_id uuid NOT NULL REFERENCES public.hotel_folios(id) ON DELETE CASCADE,
  charge_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'room',
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  levy_amount numeric NOT NULL DEFAULT 0,
  service_charge numeric NOT NULL DEFAULT 0,
  payment_method text,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_folio_charges TO authenticated;
GRANT ALL ON public.hotel_folio_charges TO service_role;
ALTER TABLE public.hotel_folio_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_folio_charges" ON public.hotel_folio_charges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hotel_folio_charges" ON public.hotel_folio_charges FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
CREATE POLICY "staff write hotel_folio_charges" ON public.hotel_folio_charges FOR INSERT TO authenticated WITH CHECK (public.is_staff_of(user_id));

-- ============ HOUSEKEEPING ============
CREATE TABLE public.hotel_housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  task_date date NOT NULL DEFAULT CURRENT_DATE,
  task_type text NOT NULL DEFAULT 'departure clean',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  assigned_to text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_housekeeping_tasks TO authenticated;
GRANT ALL ON public.hotel_housekeeping_tasks TO service_role;
ALTER TABLE public.hotel_housekeeping_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_housekeeping_tasks" ON public.hotel_housekeeping_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hotel_housekeeping_tasks" ON public.hotel_housekeeping_tasks FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
CREATE POLICY "staff write hotel_housekeeping_tasks" ON public.hotel_housekeeping_tasks FOR INSERT TO authenticated WITH CHECK (public.is_staff_of(user_id));
CREATE POLICY "staff update hotel_housekeeping_tasks" ON public.hotel_housekeeping_tasks FOR UPDATE TO authenticated USING (public.is_staff_of(user_id)) WITH CHECK (public.is_staff_of(user_id));

-- ============ NIGHT AUDIT ============
CREATE TABLE public.hotel_night_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  audit_date date NOT NULL,
  rooms_available integer NOT NULL DEFAULT 0,
  rooms_occupied integer NOT NULL DEFAULT 0,
  room_revenue numeric NOT NULL DEFAULT 0,
  fnb_revenue numeric NOT NULL DEFAULT 0,
  other_revenue numeric NOT NULL DEFAULT 0,
  vat_total numeric NOT NULL DEFAULT 0,
  levy_total numeric NOT NULL DEFAULT 0,
  service_charge_total numeric NOT NULL DEFAULT 0,
  payments jsonb NOT NULL DEFAULT '{}'::jsonb,
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  run_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_night_audits TO authenticated;
GRANT ALL ON public.hotel_night_audits TO service_role;
ALTER TABLE public.hotel_night_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_night_audits" ON public.hotel_night_audits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hotel_night_audits" ON public.hotel_night_audits FOR SELECT TO authenticated USING (public.is_staff_of(user_id));

-- ============ HOSPITALITY TAX PROFILES ============
CREATE TABLE public.hospitality_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  name text NOT NULL DEFAULT 'Default',
  vat_rate numeric NOT NULL DEFAULT 16,
  tourism_levy_rate numeric NOT NULL DEFAULT 1.5,
  service_charge_rate numeric NOT NULL DEFAULT 0,
  levy_on_accommodation boolean NOT NULL DEFAULT true,
  levy_on_conference_package boolean NOT NULL DEFAULT true,
  levy_on_food_beverage boolean NOT NULL DEFAULT false,
  prices_tax_inclusive boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitality_tax_profiles TO authenticated;
GRANT ALL ON public.hospitality_tax_profiles TO service_role;
ALTER TABLE public.hospitality_tax_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hospitality_tax_profiles" ON public.hospitality_tax_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read hospitality_tax_profiles" ON public.hospitality_tax_profiles FOR SELECT TO authenticated USING (public.is_staff_of(user_id));

-- ============ COMPLIANCE DOCUMENTS ============
CREATE TABLE public.compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  reference text,
  issuing_body text,
  responsible_person text,
  issue_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'active',
  document_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_documents TO authenticated;
GRANT ALL ON public.compliance_documents TO service_role;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own compliance_documents" ON public.compliance_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read compliance_documents" ON public.compliance_documents FOR SELECT TO authenticated USING (public.is_staff_of(user_id));

-- ============ ZRA SMART INVOICE ============
CREATE TABLE public.zra_smart_invoice_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid,
  mode text NOT NULL DEFAULT 'not_configured',
  taxpayer_name text,
  tpin text,
  branch_code text,
  device_serial text,
  vsdc_endpoint text,
  enabled boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zra_smart_invoice_config TO authenticated;
GRANT ALL ON public.zra_smart_invoice_config TO service_role;
ALTER TABLE public.zra_smart_invoice_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own zra_smart_invoice_config" ON public.zra_smart_invoice_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.zra_invoice_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL DEFAULT 'invoice',
  source_id uuid,
  invoice_number text,
  total numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  levy_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz,
  response_code text,
  response_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zra_invoice_queue TO authenticated;
GRANT ALL ON public.zra_invoice_queue TO service_role;
ALTER TABLE public.zra_invoice_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own zra_invoice_queue" ON public.zra_invoice_queue FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read zra_invoice_queue" ON public.zra_invoice_queue FOR SELECT TO authenticated USING (public.is_staff_of(user_id));

-- ============ INDEXES ============
CREATE INDEX idx_hotel_rooms_user ON public.hotel_rooms(user_id, number);
CREATE INDEX idx_hotel_reservations_user_dates ON public.hotel_reservations(user_id, check_in, check_out);
CREATE INDEX idx_hotel_folios_user_status ON public.hotel_folios(user_id, status);
CREATE INDEX idx_hotel_folio_charges_folio ON public.hotel_folio_charges(folio_id);
CREATE INDEX idx_hotel_housekeeping_user_date ON public.hotel_housekeeping_tasks(user_id, task_date);
CREATE INDEX idx_compliance_documents_user_expiry ON public.compliance_documents(user_id, expiry_date);

-- ============ UPDATED_AT TRIGGERS ============
CREATE TRIGGER trg_hotel_room_types_updated BEFORE UPDATE ON public.hotel_room_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_rooms_updated BEFORE UPDATE ON public.hotel_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_reservations_updated BEFORE UPDATE ON public.hotel_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_folios_updated BEFORE UPDATE ON public.hotel_folios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_folio_charges_updated BEFORE UPDATE ON public.hotel_folio_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_housekeeping_updated BEFORE UPDATE ON public.hotel_housekeeping_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_night_audits_updated BEFORE UPDATE ON public.hotel_night_audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hospitality_tax_profiles_updated BEFORE UPDATE ON public.hospitality_tax_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_compliance_documents_updated BEFORE UPDATE ON public.compliance_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_zra_config_updated BEFORE UPDATE ON public.zra_smart_invoice_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_zra_queue_updated BEFORE UPDATE ON public.zra_invoice_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
