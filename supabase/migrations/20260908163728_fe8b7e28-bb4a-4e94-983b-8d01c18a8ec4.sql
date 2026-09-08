-- ============ 1. PRODUCT MASTER ============
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS purchase_unit text,
  ADD COLUMN IF NOT EXISTS sales_unit text,
  ADD COLUMN IF NOT EXISTS conversion_factor numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retail_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_supplier_id uuid,
  ADD COLUMN IF NOT EXISTS inventory_account_id uuid,
  ADD COLUMN IF NOT EXISTS cogs_account_id uuid,
  ADD COLUMN IF NOT EXISTS sales_account_id uuid,
  ADD COLUMN IF NOT EXISTS purchase_account_id uuid,
  ADD COLUMN IF NOT EXISTS track_batches boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS track_expiry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS track_serials boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS notes text;

-- ============ 2. LOCATIONS ============
ALTER TABLE public.inventory_locations
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branch_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_locations_user_code_idx
  ON public.inventory_locations (user_id, upper(code)) WHERE code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_transit_location(_uid uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.inventory_locations
   WHERE user_id = _uid AND location_type = 'transit' LIMIT 1;
  IF _id IS NULL THEN
    INSERT INTO public.inventory_locations (user_id, name, code, location_type)
    VALUES (_uid, 'Stock in Transit', 'TRANSIT', 'transit') RETURNING id INTO _id;
  END IF;
  RETURN _id;
END; $$;

-- ============ 3. MOVEMENT LEDGER ============
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check CHECK (movement_type = ANY (ARRAY[
    'in','out','adjust','opening','transfer_in','transfer_out',
    'adjust_in','adjust_out','sale','purchase','return','reversal']));

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES public.inventory_transfers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS total_cost numeric,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS reversal_of uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS stock_movements_loc_idx ON public.stock_movements (location_id, item_id, created_at DESC);

-- per-location cached balances (ledger stays authoritative)
CREATE TABLE IF NOT EXISTS public.stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, location_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_balances TO authenticated;
GRANT ALL ON public.stock_balances TO service_role;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "balances select" ON public.stock_balances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.view', user_id)));
CREATE POLICY "balances insert" ON public.stock_balances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));
CREATE POLICY "balances update" ON public.stock_balances FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)))
  WITH CHECK (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));
CREATE POLICY "balances delete" ON public.stock_balances FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR (is_staff_of(user_id) AND has_perm('inventory.manage', user_id)));

CREATE TRIGGER trg_stock_balances_updated BEFORE UPDATE ON public.stock_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _delta numeric := 0; _absolute boolean := false;
BEGIN
  IF NEW.movement_type IN ('in','opening','purchase','return','transfer_in','adjust_in') THEN
    _delta := NEW.quantity;
  ELSIF NEW.movement_type IN ('out','sale','transfer_out','adjust_out') THEN
    _delta := -NEW.quantity;
  ELSIF NEW.movement_type = 'adjust' THEN
    _absolute := true;
  ELSIF NEW.movement_type = 'reversal' THEN
    _delta := NEW.quantity; -- signed quantity supplied by caller
  END IF;

  -- company-wide on-hand: transfers move stock between locations, never change the total
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

-- ============ 4. TRANSFERS ============
ALTER TABLE public.inventory_transfers
  ADD COLUMN IF NOT EXISTS transfer_number text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_by uuid,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by uuid,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_value numeric NOT NULL DEFAULT 0;

UPDATE public.inventory_transfers SET transfer_number = reference WHERE transfer_number IS NULL;

ALTER TABLE public.inventory_transfer_items
  ADD COLUMN IF NOT EXISTS qty_received numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_no text,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE OR REPLACE FUNCTION public.transfer_can_manage(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = _uid
      OR (public.is_staff_of(_uid) AND (public.has_perm('inventory.transfer', _uid)
          OR public.has_perm('inventory.manage', _uid)));
$$;

CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(_transfer_id uuid, _allow_negative boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; l record; _transit uuid; _bal numeric;
BEGIN
  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id;
  IF t IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF NOT public.transfer_can_manage(t.user_id) THEN RAISE EXCEPTION 'Not authorised to dispatch stock'; END IF;
  IF t.status IN ('in_transit','received','completed','cancelled') THEN
    RAISE EXCEPTION 'Transfer is already %', t.status; END IF;
  IF t.from_location_id IS NULL OR t.to_location_id IS NULL THEN
    RAISE EXCEPTION 'Both source and destination locations are required'; END IF;

  _transit := public.ensure_transit_location(t.user_id);

  FOR l IN SELECT * FROM public.inventory_transfer_items WHERE transfer_id = t.id LOOP
    CONTINUE WHEN l.item_id IS NULL OR l.quantity <= 0;
    SELECT COALESCE(quantity, 0) INTO _bal FROM public.stock_balances
      WHERE item_id = l.item_id AND location_id = t.from_location_id;
    IF NOT _allow_negative AND COALESCE(_bal, 0) < l.quantity THEN
      RAISE EXCEPTION 'Insufficient stock at source for % (available %, requested %)',
        COALESCE(l.description, 'item'), COALESCE(_bal, 0), l.quantity;
    END IF;
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, t.from_location_id, 'transfer_out', l.quantity, l.unit_cost,
      COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date, 'transfer', t.id, auth.uid(), 'Dispatch');
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, _transit, 'transfer_in', l.quantity, l.unit_cost,
      COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date, 'transfer', t.id, auth.uid(), 'In transit');
  END LOOP;

  UPDATE public.inventory_transfers
     SET status = 'in_transit', dispatched_at = now(), dispatched_by = auth.uid(), updated_at = now()
   WHERE id = t.id;
  RETURN jsonb_build_object('ok', true, 'status', 'in_transit');
END; $$;

CREATE OR REPLACE FUNCTION public.receive_stock_transfer(_transfer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; l record; _transit uuid; _qty numeric;
BEGIN
  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id;
  IF t IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF NOT public.transfer_can_manage(t.user_id) THEN RAISE EXCEPTION 'Not authorised to receive stock'; END IF;
  IF t.status <> 'in_transit' THEN RAISE EXCEPTION 'Only dispatched transfers can be received'; END IF;

  _transit := public.ensure_transit_location(t.user_id);

  FOR l IN SELECT * FROM public.inventory_transfer_items WHERE transfer_id = t.id LOOP
    CONTINUE WHEN l.item_id IS NULL OR l.quantity <= 0;
    _qty := CASE WHEN l.qty_received > 0 THEN l.qty_received ELSE l.quantity END;
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, _transit, 'transfer_out', _qty, l.unit_cost,
      COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE, 'transfer', t.id, auth.uid(), 'Out of transit');
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, t.to_location_id, 'transfer_in', _qty, l.unit_cost,
      COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE, 'transfer', t.id, auth.uid(), 'Received');
    UPDATE public.inventory_transfer_items SET qty_received = _qty WHERE id = l.id;
  END LOOP;

  UPDATE public.inventory_transfers
     SET status = 'completed', received_at = now(), received_by = auth.uid(), updated_at = now()
   WHERE id = t.id;
  RETURN jsonb_build_object('ok', true, 'status', 'completed');
END; $$;

-- ============ 5. PERMISSIONS ============
INSERT INTO public.rbac_permissions (key, label, perm_group, sort) VALUES
  ('inventory.transfer', 'Transfer stock between locations', 'Inventory', 72),
  ('inventory.transfer.approve', 'Approve stock transfers', 'Inventory', 73),
  ('inventory.count', 'Perform stock counts', 'Inventory', 74),
  ('inventory.adjust', 'Post stock adjustments', 'Inventory', 75)
ON CONFLICT (key) DO NOTHING;

-- ============ 6. MKP FARMS SETUP ============
DO $mkp$
DECLARE
  _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75';
  _wh uuid; _outlet uuid; _tr uuid; _item uuid;
  _p record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN RETURN; END IF;

  SELECT id INTO _wh FROM public.inventory_locations WHERE user_id = _uid AND upper(code) = 'MKP-WH';
  IF _wh IS NULL THEN
    INSERT INTO public.inventory_locations (user_id, name, code, location_type, is_default)
    VALUES (_uid, 'MKP Farms Warehouse', 'MKP-WH', 'warehouse', true) RETURNING id INTO _wh;
  END IF;

  SELECT id INTO _outlet FROM public.inventory_locations WHERE user_id = _uid AND upper(code) = 'MKP-OUTLET';
  IF _outlet IS NULL THEN
    INSERT INTO public.inventory_locations (user_id, name, code, location_type)
    VALUES (_uid, 'MKP Sales Outlet', 'MKP-OUTLET', 'outlet') RETURNING id INTO _outlet;
  END IF;

  PERFORM public.ensure_transit_location(_uid);

  IF NOT EXISTS (SELECT 1 FROM public.inventory_transfers
                  WHERE user_id = _uid AND transfer_number = 'MKP-TRF-2026-08-04-001') THEN
    INSERT INTO public.inventory_transfers
      (user_id, reference, transfer_number, from_location_id, to_location_id, transfer_date, status, purpose, notes)
    VALUES (_uid, 'MKP-TRF-2026-08-04-001', 'MKP-TRF-2026-08-04-001', _wh, _outlet, DATE '2026-08-04', 'draft',
            'Branch Opening / August Stock Transfer', 'August 2026 opening stock transfer to MKP Sales Outlet')
    RETURNING id INTO _tr;
  ELSE
    SELECT id INTO _tr FROM public.inventory_transfers
     WHERE user_id = _uid AND transfer_number = 'MKP-TRF-2026-08-04-001';
  END IF;

  FOR _p IN
    SELECT * FROM (VALUES
      ('Biostimulant Granule','MKP-BSG-25','25 KG',9),
      ('Soil Conditioner','MKP-SC-25','25 KG',9),
      ('Micronutrients','MKP-MN-500','500 ML',194),
      ('Triple N32','MKP-N32-500','500 ML',198),
      ('Nutrivox','MKP-NVX-500','500 ML',196),
      ('Zox','MKP-ZOX-1L','1 L',99),
      ('Boron','MKP-BOR-1L','1 L',39),
      ('Margical','MKP-MRG-500','500 ML',15),
      ('Biostimulant Liquid','MKP-BSL-1L','1 L',95),
      ('Soil Conditioner Liquid','MKP-SCL-1L','1 L',97),
      ('K-Shine','MKP-KSH-25','25 KG',113),
      ('Breakfast Meal','MKP-BFM-25','25 KG',62),
      ('Mgaiwa Meal','MKP-MGW-50','50 KG',25),
      ('Meal No. 3','MKP-MN3-5','5 KG',27),
      ('Samp Meal','MKP-SMP-5','5 KG',74),
      ('Couples Choice','MKP-CPC-5','5 KG',0)
    ) AS v(name, sku, unit, qty)
  LOOP
    SELECT id INTO _item FROM public.stock_items WHERE user_id = _uid AND sku = _p.sku;
    IF _item IS NULL THEN
      INSERT INTO public.stock_items (user_id, name, sku, unit, purchase_unit, sales_unit, category,
        item_type, warehouse_id, is_active, notes)
      VALUES (_uid, _p.name, _p.sku, _p.unit, _p.unit, _p.unit,
        CASE WHEN _p.name IN ('Breakfast Meal','Mgaiwa Meal','Meal No. 3','Samp Meal','Couples Choice')
             THEN 'Milled Products' ELSE 'Agro Inputs' END,
        'product', (SELECT id FROM public.warehouses WHERE user_id = _uid LIMIT 1), true,
        CASE WHEN _p.name = 'Couples Choice' THEN 'Quantity requires physical confirmation.' ELSE NULL END)
      RETURNING id INTO _item;
    END IF;

    IF _p.qty > 0 AND NOT EXISTS (
      SELECT 1 FROM public.stock_movements
       WHERE item_id = _item AND location_id = _wh AND movement_type = 'opening') THEN
      INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity,
        unit_cost, reference, transaction_date, source_type, note)
      VALUES (_uid, _item, _wh, 'opening', _p.qty, 0, 'MKP-OPENING-2026-08', DATE '2026-08-01',
              'opening', 'August 2026 opening stock at MKP Farms Warehouse');
    END IF;

    IF _tr IS NOT NULL AND _p.qty > 0 AND NOT EXISTS (
      SELECT 1 FROM public.inventory_transfer_items WHERE transfer_id = _tr AND item_id = _item) THEN
      INSERT INTO public.inventory_transfer_items (transfer_id, item_id, description, quantity, unit_cost)
      VALUES (_tr, _item, _p.name || ' (' || _p.unit || ')', _p.qty, 0);
    END IF;
  END LOOP;
END $mkp$;