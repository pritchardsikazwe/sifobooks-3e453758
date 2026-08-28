
-- ============ MENU / TABLES / ORDERS COLUMN UPGRADES ============
ALTER TABLE public.restaurant_menu_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_86 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0.16,
  ADD COLUMN IF NOT EXISTS prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS pos_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS server_name text,
  ADD COLUMN IF NOT EXISTS occupied_since timestamptz,
  ADD COLUMN IF NOT EXISTS current_order_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.restaurant_orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gratuity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS drawer_id uuid,
  ADD COLUMN IF NOT EXISTS eod_id uuid,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.restaurant_order_items
  ADD COLUMN IF NOT EXISTS menu_item_id uuid REFERENCES public.restaurant_menu_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seat_no integer;

-- ============ NEW TABLES ============
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  business_name text,
  vat_rate numeric NOT NULL DEFAULT 0.16,
  service_charge_pct numeric NOT NULL DEFAULT 0,
  gratuity_options jsonb NOT NULL DEFAULT '[5,10,15]'::jsonb,
  packaging_fee numeric NOT NULL DEFAULT 0,
  auto_post_sales boolean NOT NULL DEFAULT true,
  deplete_ingredients boolean NOT NULL DEFAULT true,
  receipt_footer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_settings TO authenticated;
GRANT ALL ON public.restaurant_settings TO service_role;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_settings" ON public.restaurant_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_order_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  key text NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  requires_table boolean NOT NULL DEFAULT false,
  requires_customer boolean NOT NULL DEFAULT false,
  requires_address boolean NOT NULL DEFAULT false,
  service_charge_pct numeric NOT NULL DEFAULT 0,
  packaging_fee numeric NOT NULL DEFAULT 0,
  default_gratuity_pct numeric NOT NULL DEFAULT 0,
  price_key text,
  sort_order integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_order_types TO authenticated;
GRANT ALL ON public.restaurant_order_types TO service_role;
ALTER TABLE public.restaurant_order_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_order_types" ON public.restaurant_order_types FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  applies_to_categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_modifier_groups TO authenticated;
GRANT ALL ON public.restaurant_modifier_groups TO service_role;
ALTER TABLE public.restaurant_modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_modifier_groups" ON public.restaurant_modifier_groups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  group_id uuid NOT NULL REFERENCES public.restaurant_modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_modifiers TO authenticated;
GRANT ALL ON public.restaurant_modifiers TO service_role;
ALTER TABLE public.restaurant_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_modifiers" ON public.restaurant_modifiers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_menu_item_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  menu_item_id uuid NOT NULL REFERENCES public.restaurant_menu_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.restaurant_modifier_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, group_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_menu_item_groups TO authenticated;
GRANT ALL ON public.restaurant_menu_item_groups TO service_role;
ALTER TABLE public.restaurant_menu_item_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_menu_item_groups" ON public.restaurant_menu_item_groups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_kitchen_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  printer text,
  colour text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_kitchen_stations TO authenticated;
GRANT ALL ON public.restaurant_kitchen_stations TO service_role;
ALTER TABLE public.restaurant_kitchen_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_kitchen_stations" ON public.restaurant_kitchen_stations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  guest_name text NOT NULL,
  phone text,
  email text,
  guests integer NOT NULL DEFAULT 2,
  reserved_date date NOT NULL DEFAULT CURRENT_DATE,
  reserved_time time NOT NULL DEFAULT '18:00',
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.restaurant_orders(id) ON DELETE SET NULL,
  special_requests text,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'walk-in',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_reservations TO authenticated;
GRANT ALL ON public.restaurant_reservations TO service_role;
ALTER TABLE public.restaurant_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_reservations" ON public.restaurant_reservations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  guest_name text NOT NULL,
  phone text,
  guests integer NOT NULL DEFAULT 2,
  quoted_minutes integer NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'waiting',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_waitlist TO authenticated;
GRANT ALL ON public.restaurant_waitlist TO service_role;
ALTER TABLE public.restaurant_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_waitlist" ON public.restaurant_waitlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  menu_item_id uuid NOT NULL REFERENCES public.restaurant_menu_items(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_recipes TO authenticated;
GRANT ALL ON public.restaurant_recipes TO service_role;
ALTER TABLE public.restaurant_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_recipes" ON public.restaurant_recipes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_cash_drawers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'Drawer 1',
  station text,
  business_date date NOT NULL DEFAULT CURRENT_DATE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_float numeric NOT NULL DEFAULT 0,
  cash_sales numeric NOT NULL DEFAULT 0,
  cash_payouts numeric NOT NULL DEFAULT 0,
  cash_drops numeric NOT NULL DEFAULT 0,
  expected_cash numeric NOT NULL DEFAULT 0,
  counted_cash numeric NOT NULL DEFAULT 0,
  variance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  opened_by text,
  closed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_cash_drawers TO authenticated;
GRANT ALL ON public.restaurant_cash_drawers TO service_role;
ALTER TABLE public.restaurant_cash_drawers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_cash_drawers" ON public.restaurant_cash_drawers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  drawer_id uuid REFERENCES public.restaurant_cash_drawers(id) ON DELETE CASCADE,
  txn_type text NOT NULL DEFAULT 'payout',
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  reference text,
  approved_by text,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_cash_transactions TO authenticated;
GRANT ALL ON public.restaurant_cash_transactions TO service_role;
ALTER TABLE public.restaurant_cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_cash_transactions" ON public.restaurant_cash_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  order_id uuid NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'cash',
  amount numeric NOT NULL DEFAULT 0,
  tendered numeric NOT NULL DEFAULT 0,
  change_given numeric NOT NULL DEFAULT 0,
  reference text,
  drawer_id uuid REFERENCES public.restaurant_cash_drawers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_payments TO authenticated;
GRANT ALL ON public.restaurant_payments TO service_role;
ALTER TABLE public.restaurant_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_payments" ON public.restaurant_payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  eta_minutes integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_delivery_zones TO authenticated;
GRANT ALL ON public.restaurant_delivery_zones TO service_role;
ALTER TABLE public.restaurant_delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_delivery_zones" ON public.restaurant_delivery_zones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  code text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  initial_value numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_gift_cards TO authenticated;
GRANT ALL ON public.restaurant_gift_cards TO service_role;
ALTER TABLE public.restaurant_gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_gift_cards" ON public.restaurant_gift_cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  member_name text,
  phone text,
  points numeric NOT NULL DEFAULT 0,
  lifetime_spend numeric NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_loyalty_accounts TO authenticated;
GRANT ALL ON public.restaurant_loyalty_accounts TO service_role;
ALTER TABLE public.restaurant_loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_loyalty_accounts" ON public.restaurant_loyalty_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  staff_name text NOT NULL,
  role text NOT NULL DEFAULT 'server',
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  declared_tips numeric NOT NULL DEFAULT 0,
  business_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_shifts TO authenticated;
GRANT ALL ON public.restaurant_shifts TO service_role;
ALTER TABLE public.restaurant_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_shifts" ON public.restaurant_shifts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_end_of_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  business_date date NOT NULL DEFAULT CURRENT_DATE,
  orders_count integer NOT NULL DEFAULT 0,
  gross_sales numeric NOT NULL DEFAULT 0,
  discounts numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  service_charge numeric NOT NULL DEFAULT 0,
  gratuity numeric NOT NULL DEFAULT 0,
  delivery_fees numeric NOT NULL DEFAULT 0,
  cash_sales numeric NOT NULL DEFAULT 0,
  card_sales numeric NOT NULL DEFAULT 0,
  momo_sales numeric NOT NULL DEFAULT 0,
  other_sales numeric NOT NULL DEFAULT 0,
  cash_payouts numeric NOT NULL DEFAULT 0,
  cash_variance numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'closed',
  approved_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_end_of_day TO authenticated;
GRANT ALL ON public.restaurant_end_of_day TO service_role;
ALTER TABLE public.restaurant_end_of_day ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_end_of_day" ON public.restaurant_end_of_day FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ACCOUNTING INTEGRATION ============
CREATE OR REPLACE FUNCTION public.post_restaurant_order(_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o record; r record; _entry uuid; _ref text;
  _sales uuid; _vat uuid; _cash uuid; _cogs uuid; _inv uuid; _tips uuid; _svc uuid;
  _cogs_amt numeric := 0; _net numeric := 0; _pay_total numeric := 0; p record;
BEGIN
  SELECT * INTO o FROM restaurant_orders WHERE id = _order_id;
  IF NOT FOUND OR o.status <> 'paid' THEN RETURN NULL; END IF;
  IF o.journal_entry_id IS NOT NULL THEN RETURN o.journal_entry_id; END IF;

  _ref := 'RPOS:' || _order_id::text;
  SELECT id INTO _entry FROM journal_entries WHERE user_id = o.user_id AND reference = _ref;
  IF _entry IS NOT NULL THEN
    UPDATE restaurant_orders SET journal_entry_id = _entry WHERE id = _order_id;
    RETURN _entry;
  END IF;

  _sales := ensure_account(o.user_id, '4100', 'Restaurant Sales', 'revenue');
  _vat   := ensure_account(o.user_id, '2200', 'VAT Output', 'liability');
  _cogs  := ensure_account(o.user_id, '5000', 'Cost of Sales', 'expense');
  _inv   := ensure_account(o.user_id, '1300', 'Inventory', 'asset');
  _tips  := ensure_account(o.user_id, '2150', 'Gratuities Payable', 'liability');
  _svc   := ensure_account(o.user_id, '4150', 'Service Charge & Delivery', 'revenue');

  SELECT COALESCE(SUM(qty * unit_cost), 0) INTO _cogs_amt
    FROM restaurant_order_items WHERE order_id = _order_id;

  _net := COALESCE(o.subtotal,0) - COALESCE(o.discount,0);

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (o.user_id, 'JE-POS-' || substr(_order_id::text,1,8), o.business_date, _ref,
          'Restaurant sale ' || COALESCE(o.order_no,'') || ' (' || o.order_type || ')',
          'posted', COALESCE(o.total,0) + _cogs_amt, COALESCE(o.total,0) + _cogs_amt)
  RETURNING id INTO _entry;

  -- Money in, split by tender
  FOR p IN SELECT method, SUM(amount) AS amt FROM restaurant_payments WHERE order_id = _order_id GROUP BY method LOOP
    _pay_total := _pay_total + p.amt;
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (o.user_id, _entry,
      CASE lower(p.method)
        WHEN 'cash' THEN ensure_account(o.user_id,'1010','Cash on Hand','asset')
        WHEN 'card' THEN ensure_account(o.user_id,'1020','Card Clearing','asset')
        WHEN 'momo' THEN ensure_account(o.user_id,'1030','Mobile Money','asset')
        WHEN 'mobile money' THEN ensure_account(o.user_id,'1030','Mobile Money','asset')
        WHEN 'gift card' THEN ensure_account(o.user_id,'2160','Gift Card Liability','liability')
        ELSE ensure_account(o.user_id,'1000','Cash & Bank','asset')
      END,
      p.amt, 0, initcap(p.method) || ' received');
  END LOOP;

  IF _pay_total = 0 AND COALESCE(o.total,0) > 0 THEN
    _cash := CASE lower(COALESCE(o.payment_method,'cash'))
      WHEN 'card' THEN ensure_account(o.user_id,'1020','Card Clearing','asset')
      WHEN 'momo' THEN ensure_account(o.user_id,'1030','Mobile Money','asset')
      WHEN 'bank' THEN ensure_account(o.user_id,'1000','Cash & Bank','asset')
      ELSE ensure_account(o.user_id,'1010','Cash on Hand','asset') END;
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (o.user_id, _entry, _cash, o.total, 0, 'Payment received');
  END IF;

  IF _net > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (o.user_id, _entry, _sales, 0, _net, 'Food & beverage sales');
  END IF;
  IF COALESCE(o.tax,0) > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (o.user_id, _entry, _vat, 0, o.tax, 'VAT output');
  END IF;
  IF COALESCE(o.service_charge,0) + COALESCE(o.delivery_fee,0) + COALESCE(o.packaging_fee,0) > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (o.user_id, _entry, _svc, 0,
            COALESCE(o.service_charge,0) + COALESCE(o.delivery_fee,0) + COALESCE(o.packaging_fee,0),
            'Service, delivery & packaging');
  END IF;
  IF COALESCE(o.gratuity,0) > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (o.user_id, _entry, _tips, 0, o.gratuity, 'Gratuity payable to staff');
  END IF;

  IF _cogs_amt > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (o.user_id, _entry, _cogs, _cogs_amt, 0, 'Cost of food & beverage'),
           (o.user_id, _entry, _inv, 0, _cogs_amt, 'Inventory consumed');
  END IF;

  UPDATE restaurant_orders SET journal_entry_id = _entry WHERE id = _order_id;

  -- Deplete ingredients from recipes
  IF COALESCE((SELECT deplete_ingredients FROM restaurant_settings WHERE user_id = o.user_id), true) THEN
    FOR r IN
      SELECT rr.stock_item_id, SUM(rr.quantity * oi.qty) AS qty
      FROM restaurant_order_items oi
      JOIN restaurant_recipes rr ON rr.menu_item_id = oi.menu_item_id
      WHERE oi.order_id = _order_id
      GROUP BY rr.stock_item_id
    LOOP
      INSERT INTO stock_movements(user_id, item_id, movement_type, quantity, reference, note)
      VALUES (o.user_id, r.stock_item_id, 'out', r.qty, _ref, 'Restaurant recipe consumption');
    END LOOP;
  END IF;

  RETURN _entry;
END $$;

CREATE OR REPLACE FUNCTION public.trg_post_restaurant_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid')
     AND COALESCE((SELECT auto_post_sales FROM restaurant_settings WHERE user_id = NEW.user_id), true) THEN
    PERFORM post_restaurant_order(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS restaurant_order_post ON public.restaurant_orders;
CREATE TRIGGER restaurant_order_post
AFTER INSERT OR UPDATE OF status ON public.restaurant_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_post_restaurant_order();
