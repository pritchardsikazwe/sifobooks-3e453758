-- 1. movement type: production
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type = ANY (ARRAY['in','out','adjust','opening','transfer_in','transfer_out','adjust_in','adjust_out','sale','purchase','return','reversal','production']));

CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _delta numeric := 0; _absolute boolean := false;
BEGIN
  IF NEW.movement_type IN ('in','opening','purchase','return','transfer_in','adjust_in','production') THEN
    _delta := NEW.quantity;
  ELSIF NEW.movement_type IN ('out','sale','transfer_out','adjust_out') THEN
    _delta := -NEW.quantity;
  ELSIF NEW.movement_type = 'adjust' THEN
    _absolute := true;
  ELSIF NEW.movement_type = 'reversal' THEN
    _delta := NEW.quantity;
  END IF;

  IF _absolute THEN
    UPDATE public.stock_items SET quantity_on_hand = NEW.quantity
     WHERE id = NEW.item_id AND user_id = NEW.user_id;
  ELSIF NEW.movement_type NOT IN ('transfer_in','transfer_out') AND _delta <> 0 THEN
    UPDATE public.stock_items SET quantity_on_hand = quantity_on_hand + _delta
     WHERE id = NEW.item_id AND user_id = NEW.user_id;
  END IF;

  IF NEW.location_id IS NOT NULL THEN
    INSERT INTO public.stock_balances (user_id, item_id, location_id, quantity)
    VALUES (NEW.user_id, NEW.item_id, NEW.location_id,
            CASE WHEN _absolute THEN NEW.quantity ELSE _delta END)
    ON CONFLICT (item_id, location_id) DO UPDATE
      SET quantity = CASE WHEN _absolute THEN EXCLUDED.quantity
                          ELSE public.stock_balances.quantity + EXCLUDED.quantity END,
          updated_at = now();
  END IF;

  IF NEW.total_cost IS NULL AND NEW.unit_cost IS NOT NULL THEN
    NEW.total_cost := NEW.unit_cost * NEW.quantity;
  END IF;
  RETURN NEW;
END; $$;

-- 2. product flags
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS source_unit text,
  ADD COLUMN IF NOT EXISTS needs_unit_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_cost_review boolean NOT NULL DEFAULT false;

-- 3. production batches
CREATE TABLE IF NOT EXISTS public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_no text NOT NULL,
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  posted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS production_batches_user_no_idx ON public.production_batches(user_id, upper(batch_no));

CREATE TABLE IF NOT EXISTS public.production_batch_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batches TO authenticated;
GRANT ALL ON public.production_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batch_lines TO authenticated;
GRANT ALL ON public.production_batch_lines TO service_role;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batch_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches view" ON public.production_batches FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.view', user_id)));
CREATE POLICY "batches manage" ON public.production_batches FOR ALL TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)))
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));
CREATE POLICY "batch lines view" ON public.production_batch_lines FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.view', user_id)));
CREATE POLICY "batch lines manage" ON public.production_batch_lines FOR ALL TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)))
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));

-- 4. cashier control records (historical shop sheets)
CREATE TABLE IF NOT EXISTS public.cashier_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  cashier_name text,
  cashier_user_id uuid,
  period_start date,
  period_end date,
  item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  delivered_qty numeric NOT NULL DEFAULT 0,
  sold_qty numeric NOT NULL DEFAULT 0,
  remaining_qty numeric NOT NULL DEFAULT 0,
  selling_price numeric,
  sales_value numeric,
  physical_count numeric,
  variance numeric GENERATED ALWAYS AS (COALESCE(physical_count,0) - remaining_qty) STORED,
  status text NOT NULL DEFAULT 'recorded',
  notes text,
  source_image_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashier_records TO authenticated;
GRANT ALL ON public.cashier_records TO service_role;
ALTER TABLE public.cashier_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashier records view" ON public.cashier_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.view', user_id)));
CREATE POLICY "cashier records manage" ON public.cashier_records FOR ALL TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)))
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));

-- 5. selling price history
CREATE TABLE IF NOT EXISTS public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  price_type text NOT NULL DEFAULT 'selling',
  price numeric NOT NULL,
  quantity numeric,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  source_type text,
  source_id uuid,
  cashier_name text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_price_history_item_idx ON public.product_price_history(item_id, effective_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_price_history TO authenticated;
GRANT ALL ON public.product_price_history TO service_role;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price history view" ON public.product_price_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.view', user_id)));
CREATE POLICY "price history manage" ON public.product_price_history FOR ALL TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)))
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));

CREATE TRIGGER production_batches_updated BEFORE UPDATE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cashier_records_updated BEFORE UPDATE ON public.cashier_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. reconciliation helper
CREATE OR REPLACE FUNCTION public.stock_reconciliation(_uid uuid, _location uuid, _from date, _to date)
RETURNS TABLE (
  item_id uuid, item_name text, sku text, unit text,
  opening numeric, produced numeric, transfers_in numeric, other_in numeric,
  sales numeric, returns numeric, transfers_out numeric, adjustments numeric,
  expected_closing numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.name, i.sku, i.unit,
    COALESCE(SUM(CASE WHEN m.transaction_date < _from THEN
      CASE WHEN m.movement_type IN ('in','opening','purchase','return','transfer_in','adjust_in','production') THEN m.quantity
           WHEN m.movement_type IN ('out','sale','transfer_out','adjust_out') THEN -m.quantity
           WHEN m.movement_type = 'reversal' THEN m.quantity ELSE 0 END END), 0) AS opening,
    COALESCE(SUM(CASE WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type='production' THEN m.quantity END),0),
    COALESCE(SUM(CASE WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type='transfer_in' THEN m.quantity END),0),
    COALESCE(SUM(CASE WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type IN ('in','opening','purchase') THEN m.quantity END),0),
    COALESCE(SUM(CASE WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type IN ('sale','out') THEN m.quantity END),0),
    COALESCE(SUM(CASE WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type='return' THEN m.quantity END),0),
    COALESCE(SUM(CASE WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type='transfer_out' THEN m.quantity END),0),
    COALESCE(SUM(CASE WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type='adjust_in' THEN m.quantity
                      WHEN m.transaction_date BETWEEN _from AND _to AND m.movement_type='adjust_out' THEN -m.quantity END),0),
    COALESCE(SUM(CASE WHEN m.transaction_date <= _to THEN
      CASE WHEN m.movement_type IN ('in','opening','purchase','return','transfer_in','adjust_in','production') THEN m.quantity
           WHEN m.movement_type IN ('out','sale','transfer_out','adjust_out') THEN -m.quantity
           WHEN m.movement_type = 'reversal' THEN m.quantity ELSE 0 END END), 0)
  FROM public.stock_movements m
  JOIN public.stock_items i ON i.id = m.item_id
  WHERE m.user_id = _uid
    AND (_location IS NULL OR m.location_id = _location)
    AND (public.has_perm('inventory.view', _uid) OR _uid = auth.uid())
  GROUP BY i.id, i.name, i.sku, i.unit
  HAVING COUNT(*) > 0
  ORDER BY i.name;
$$;

REVOKE ALL ON FUNCTION public.stock_reconciliation(uuid, uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stock_reconciliation(uuid, uuid, date, date) TO authenticated, service_role;