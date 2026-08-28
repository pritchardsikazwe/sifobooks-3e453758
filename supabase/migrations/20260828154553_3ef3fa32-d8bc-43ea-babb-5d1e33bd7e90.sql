
CREATE TABLE public.pos_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  branch text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_registers TO authenticated;
GRANT ALL ON public.pos_registers TO service_role;
ALTER TABLE public.pos_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pos_registers" ON public.pos_registers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pos_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  register_id uuid REFERENCES public.pos_registers(id) ON DELETE SET NULL,
  cashier_name text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_float numeric NOT NULL DEFAULT 0,
  cash_in numeric NOT NULL DEFAULT 0,
  cash_out numeric NOT NULL DEFAULT 0,
  expected_cash numeric NOT NULL DEFAULT 0,
  actual_cash numeric,
  variance numeric,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_shifts TO authenticated;
GRANT ALL ON public.pos_shifts TO service_role;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pos_shifts" ON public.pos_shifts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  sale_no text,
  client_ref text,
  shift_id uuid REFERENCES public.pos_shifts(id) ON DELETE SET NULL,
  register_id uuid REFERENCES public.pos_registers(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT 'Walk-in Customer',
  price_level text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  change_due numeric NOT NULL DEFAULT 0,
  cost_total numeric NOT NULL DEFAULT 0,
  note text,
  void_reason text,
  refund_of uuid,
  sold_at timestamptz NOT NULL DEFAULT now(),
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sales TO authenticated;
GRANT ALL ON public.pos_sales TO service_role;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pos_sales" ON public.pos_sales FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX pos_sales_user_status_idx ON public.pos_sales (user_id, status, sold_at DESC);

CREATE TABLE public.pos_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  qty numeric NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sale_items TO authenticated;
GRANT ALL ON public.pos_sale_items TO service_role;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pos_sale_items" ON public.pos_sale_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX pos_sale_items_sale_idx ON public.pos_sale_items (sale_id);

CREATE TABLE public.pos_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'cash',
  amount numeric NOT NULL DEFAULT 0,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_payments TO authenticated;
GRANT ALL ON public.pos_payments TO service_role;
ALTER TABLE public.pos_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pos_payments" ON public.pos_payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX pos_payments_sale_idx ON public.pos_payments (sale_id);

CREATE TABLE public.pos_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  group_name text NOT NULL DEFAULT 'Fast sellers',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_favorites TO authenticated;
GRANT ALL ON public.pos_favorites TO service_role;
ALTER TABLE public.pos_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pos_favorites" ON public.pos_favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pos_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  show_images boolean NOT NULL DEFAULT true,
  show_stock boolean NOT NULL DEFAULT true,
  show_sku boolean NOT NULL DEFAULT true,
  products_per_row integer NOT NULL DEFAULT 4,
  enable_fast_sellers boolean NOT NULL DEFAULT true,
  enable_quick_qty boolean NOT NULL DEFAULT true,
  enable_quick_discounts boolean NOT NULL DEFAULT true,
  allow_price_change boolean NOT NULL DEFAULT true,
  allow_negative_stock boolean NOT NULL DEFAULT false,
  default_customer text NOT NULL DEFAULT 'Walk-in Customer',
  default_price_level text NOT NULL DEFAULT 'normal',
  default_payment text NOT NULL DEFAULT 'cash',
  tax_rate numeric NOT NULL DEFAULT 16,
  tax_inclusive boolean NOT NULL DEFAULT true,
  auto_new_sale boolean NOT NULL DEFAULT true,
  auto_print_receipt boolean NOT NULL DEFAULT false,
  silent_print boolean NOT NULL DEFAULT false,
  receipt_footer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_settings TO authenticated;
GRANT ALL ON public.pos_settings TO service_role;
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pos_settings" ON public.pos_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER pos_registers_updated BEFORE UPDATE ON public.pos_registers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pos_shifts_updated BEFORE UPDATE ON public.pos_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pos_sales_updated BEFORE UPDATE ON public.pos_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pos_settings_updated BEFORE UPDATE ON public.pos_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.complete_pos_sale(_sale_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s record; li record; p record;
  _entry uuid; _ref text; _uid uuid;
  _sales uuid; _vat uuid; _cogs uuid; _inv uuid; _ar uuid; _acct uuid;
  _cogs_amt numeric := 0; _net numeric := 0; _paytotal numeric := 0;
BEGIN
  SELECT * INTO s FROM pos_sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF s.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF s.journal_entry_id IS NOT NULL THEN RETURN s.journal_entry_id; END IF;
  _uid := s.user_id;
  _ref := 'POS:' || _sale_id::text;

  _sales := ensure_account(_uid,'4000','Retail Sales','revenue');
  _vat   := ensure_account(_uid,'2200','VAT Output','liability');
  _cogs  := ensure_account(_uid,'5000','Cost of Sales','expense');
  _inv   := ensure_account(_uid,'1300','Inventory','asset');
  _ar    := ensure_account(_uid,'1100','Accounts Receivable','asset');

  SELECT COALESCE(SUM(qty * unit_cost),0) INTO _cogs_amt FROM pos_sale_items WHERE sale_id = _sale_id;
  _net := COALESCE(s.subtotal,0) - COALESCE(s.discount,0);

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (_uid, 'JE-POS-'||substr(_sale_id::text,1,8), s.sold_at::date, _ref,
          'Retail sale '||COALESCE(s.sale_no,''), 'posted',
          COALESCE(s.total,0)+_cogs_amt, COALESCE(s.total,0)+_cogs_amt)
  RETURNING id INTO _entry;

  FOR p IN SELECT method, SUM(amount) AS amt FROM pos_payments WHERE sale_id = _sale_id GROUP BY method LOOP
    _paytotal := _paytotal + p.amt;
    _acct := CASE lower(p.method)
      WHEN 'cash' THEN ensure_account(_uid,'1010','Cash on Hand','asset')
      WHEN 'card' THEN ensure_account(_uid,'1020','Card Clearing','asset')
      WHEN 'mobile money' THEN ensure_account(_uid,'1030','Mobile Money','asset')
      WHEN 'momo' THEN ensure_account(_uid,'1030','Mobile Money','asset')
      WHEN 'bank' THEN ensure_account(_uid,'1000','Cash & Bank','asset')
      WHEN 'credit' THEN _ar
      ELSE ensure_account(_uid,'1000','Cash & Bank','asset') END;
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _acct, p.amt, 0, initcap(p.method)||' received');
  END LOOP;

  IF _paytotal = 0 AND COALESCE(s.total,0) > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, ensure_account(_uid,'1010','Cash on Hand','asset'), s.total, 0, 'Cash received');
  END IF;

  IF _net > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _sales, 0, _net, 'Retail sales');
  END IF;
  IF COALESCE(s.tax,0) > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _vat, 0, s.tax, 'VAT output');
  END IF;
  IF _cogs_amt > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _cogs, _cogs_amt, 0, 'Cost of goods sold'),
           (_uid, _entry, _inv, 0, _cogs_amt, 'Inventory consumed');
  END IF;

  FOR li IN SELECT * FROM pos_sale_items WHERE sale_id = _sale_id AND item_id IS NOT NULL LOOP
    INSERT INTO stock_movements(user_id, item_id, movement_type, quantity, unit_cost, reference, note)
    VALUES (_uid, li.item_id, 'out', li.qty, li.unit_cost, COALESCE(s.sale_no,_ref), 'Retail POS sale');
  END LOOP;

  UPDATE pos_sales
    SET status='completed', journal_entry_id=_entry, cost_total=_cogs_amt, updated_at=now()
    WHERE id=_sale_id;

  RETURN _entry;
END $function$;
