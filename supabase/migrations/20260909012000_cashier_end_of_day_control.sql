-- Cashier / register / end-of-day control layer.
-- This does not replace POS, inventory or accounting. It reconciles their posted results.

ALTER TABLE public.pos_registers
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL;

ALTER TABLE public.pos_shifts
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supervisor_user_id uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE TABLE IF NOT EXISTS public.pos_end_of_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_date date NOT NULL DEFAULT CURRENT_DATE,
  location_id uuid NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
  register_id uuid REFERENCES public.pos_registers(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES public.pos_shifts(id) ON DELETE SET NULL,
  cashier_user_id uuid,
  cashier_name text,
  opening_float numeric NOT NULL DEFAULT 0,
  cash_sales numeric NOT NULL DEFAULT 0,
  card_sales numeric NOT NULL DEFAULT 0,
  mobile_money_sales numeric NOT NULL DEFAULT 0,
  other_sales numeric NOT NULL DEFAULT 0,
  refunds numeric NOT NULL DEFAULT 0,
  payouts numeric NOT NULL DEFAULT 0,
  expected_cash numeric NOT NULL DEFAULT 0,
  declared_cash numeric,
  cash_variance numeric GENERATED ALWAYS AS (COALESCE(declared_cash,0) - expected_cash) STORED,
  status text NOT NULL DEFAULT 'open',
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  closed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_end_of_day_status_check CHECK (status IN ('open','submitted','approved','closed','reopened')),
  CONSTRAINT pos_end_of_day_declared_nonnegative CHECK (declared_cash IS NULL OR declared_cash >= 0),
  UNIQUE (shift_id)
);

CREATE INDEX IF NOT EXISTS pos_end_of_day_user_date_idx ON public.pos_end_of_day(user_id, business_date DESC);
CREATE INDEX IF NOT EXISTS pos_end_of_day_location_date_idx ON public.pos_end_of_day(location_id, business_date DESC);
GRANT SELECT, INSERT, UPDATE ON public.pos_end_of_day TO authenticated;
GRANT ALL ON public.pos_end_of_day TO service_role;
ALTER TABLE public.pos_end_of_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eod view" ON public.pos_end_of_day;
CREATE POLICY "eod view" ON public.pos_end_of_day FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.view', user_id)));
DROP POLICY IF EXISTS "eod insert" ON public.pos_end_of_day;
CREATE POLICY "eod insert" ON public.pos_end_of_day FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));
DROP POLICY IF EXISTS "eod update" ON public.pos_end_of_day;
CREATE POLICY "eod update" ON public.pos_end_of_day FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)))
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));

CREATE TABLE IF NOT EXISTS public.pos_cash_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  end_of_day_id uuid NOT NULL REFERENCES public.pos_end_of_day(id) ON DELETE CASCADE,
  denomination numeric NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  amount numeric GENERATED ALWAYS AS (denomination * quantity) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_cash_decl_denom_positive CHECK (denomination > 0),
  CONSTRAINT pos_cash_decl_qty_nonnegative CHECK (quantity >= 0),
  UNIQUE (end_of_day_id, denomination)
);

CREATE INDEX IF NOT EXISTS pos_cash_declarations_eod_idx ON public.pos_cash_declarations(end_of_day_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_cash_declarations TO authenticated;
GRANT ALL ON public.pos_cash_declarations TO service_role;
ALTER TABLE public.pos_cash_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash declarations view" ON public.pos_cash_declarations;
CREATE POLICY "cash declarations view" ON public.pos_cash_declarations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pos_end_of_day e WHERE e.id = end_of_day_id AND (auth.uid() = e.user_id OR (is_staff_of(e.user_id) AND has_perm('inventory.view', e.user_id)))));
DROP POLICY IF EXISTS "cash declarations insert" ON public.pos_cash_declarations;
CREATE POLICY "cash declarations insert" ON public.pos_cash_declarations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pos_end_of_day e WHERE e.id = end_of_day_id AND (auth.uid() = e.user_id OR (is_staff_of(e.user_id) AND has_perm('inventory.manage', e.user_id)))));
DROP POLICY IF EXISTS "cash declarations update" ON public.pos_cash_declarations;
CREATE POLICY "cash declarations update" ON public.pos_cash_declarations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pos_end_of_day e WHERE e.id = end_of_day_id AND (auth.uid() = e.user_id OR (is_staff_of(e.user_id) AND has_perm('inventory.manage', e.user_id)))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pos_end_of_day e WHERE e.id = end_of_day_id AND (auth.uid() = e.user_id OR (is_staff_of(e.user_id) AND has_perm('inventory.manage', e.user_id)))));
DROP POLICY IF EXISTS "cash declarations delete" ON public.pos_cash_declarations;
CREATE POLICY "cash declarations delete" ON public.pos_cash_declarations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pos_end_of_day e WHERE e.id = end_of_day_id AND (auth.uid() = e.user_id OR (is_staff_of(e.user_id) AND has_perm('inventory.manage', e.user_id)))));

CREATE OR REPLACE FUNCTION public.pos_eod_declaration_total(_eod uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount),0) FROM public.pos_cash_declarations WHERE end_of_day_id = _eod;
$$;
REVOKE ALL ON FUNCTION public.pos_eod_declaration_total(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_eod_declaration_total(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_pos_eod_declared_cash()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eod uuid;
BEGIN
  _eod := COALESCE(NEW.end_of_day_id, OLD.end_of_day_id);
  UPDATE public.pos_end_of_day
     SET declared_cash = COALESCE((SELECT SUM(d.amount) FROM public.pos_cash_declarations d WHERE d.end_of_day_id = _eod),0), updated_at = now()
   WHERE id = _eod;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS pos_cash_declarations_refresh_eod ON public.pos_cash_declarations;
CREATE TRIGGER pos_cash_declarations_refresh_eod AFTER INSERT OR UPDATE OR DELETE ON public.pos_cash_declarations
FOR EACH ROW EXECUTE FUNCTION public.refresh_pos_eod_declared_cash();

CREATE OR REPLACE VIEW public.pos_end_of_day_report AS
SELECT e.id,e.user_id,e.business_date,e.location_id,l.name AS location_name,e.register_id,r.name AS register_name,e.shift_id,e.cashier_user_id,e.cashier_name,e.opening_float,
  COALESCE(SUM(CASE WHEN s.status='completed' AND lower(p.method)='cash' THEN p.amount ELSE 0 END),0) AS cash_sales,
  COALESCE(SUM(CASE WHEN s.status='completed' AND lower(p.method) IN ('card','visa','mastercard','bank_card') THEN p.amount ELSE 0 END),0) AS card_sales,
  COALESCE(SUM(CASE WHEN s.status='completed' AND lower(p.method) IN ('mobile_money','momo','airtel_money','mtn_momo','mobile money') THEN p.amount ELSE 0 END),0) AS mobile_money_sales,
  COALESCE(SUM(CASE WHEN s.status='completed' AND lower(p.method) NOT IN ('cash','card','visa','mastercard','bank_card','mobile_money','momo','airtel_money','mtn_momo','mobile money') THEN p.amount ELSE 0 END),0) AS other_sales,
  e.payouts,e.refunds,e.status,e.expected_cash,e.declared_cash,e.cash_variance,e.opened_at,e.submitted_at,e.approved_at,e.closed_at
FROM public.pos_end_of_day e
LEFT JOIN public.inventory_locations l ON l.id=e.location_id
LEFT JOIN public.pos_registers r ON r.id=e.register_id
LEFT JOIN public.pos_sales s ON s.shift_id=e.shift_id
LEFT JOIN public.pos_payments p ON p.sale_id=s.id
GROUP BY e.id,l.name,r.name;
GRANT SELECT ON public.pos_end_of_day_report TO authenticated;

-- Seed only by the stable register identity. Do not assume pos_registers has a user_id column.
DO $mkp$
DECLARE _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75'; _loc uuid;
BEGIN
  SELECT id INTO _loc FROM public.inventory_locations WHERE user_id=_uid AND upper(code)='CHIBOMBO' AND is_active=true LIMIT 1;
  IF _loc IS NOT NULL THEN
    UPDATE public.pos_registers SET location_id=_loc WHERE is_active=true AND (name='Register 01' OR branch='Main');
  END IF;
END $mkp$;

UPDATE public.pos_shifts s SET location_id=r.location_id
FROM public.pos_registers r WHERE s.register_id=r.id AND s.location_id IS NULL AND r.location_id IS NOT NULL;

DROP TRIGGER IF EXISTS pos_end_of_day_updated ON public.pos_end_of_day;
CREATE TRIGGER pos_end_of_day_updated BEFORE UPDATE ON public.pos_end_of_day
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
