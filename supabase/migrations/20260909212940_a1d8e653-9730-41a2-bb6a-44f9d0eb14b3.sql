-- 1) pos_checkout: accept an explicit shift for offline replays (shift may since be closed)
CREATE OR REPLACE FUNCTION public.pos_checkout(_sale jsonb, _items jsonb DEFAULT '[]'::jsonb, _payments jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := public.current_tenant();
  _ref text := _sale->>'client_ref';
  _id uuid; _je uuid; _sale_no text;
  _shift record; _loc uuid; _reg uuid; _want_shift uuid := NULLIF(_sale->>'shift_id','')::uuid;
  _rate numeric; _incl boolean; _allow_neg boolean;
  it jsonb; pay jsonb;
  _item record; _qty numeric; _price numeric; _disc numeric;
  _gross numeric := 0; _linedisc numeric := 0; _cost numeric := 0;
  _saledisc numeric; _net numeric; _tax numeric; _subtotal numeric; _total numeric;
  _paid numeric := 0; _bal numeric; _override boolean;
  _cash numeric := 0; _card numeric := 0; _momo numeric := 0; _other numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF NOT public.has_perm('pos.sales.create', _uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF _ref IS NULL OR _ref = '' THEN RAISE EXCEPTION 'CLIENT_REF_REQUIRED'; END IF;

  SELECT id, journal_entry_id, sale_no INTO _id, _je, _sale_no
    FROM public.pos_sales WHERE user_id = _uid AND client_ref = _ref;
  IF _id IS NOT NULL AND _je IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'sale_id', _id, 'sale_no', _sale_no);
  END IF;

  -- Offline replay: the sale names the shift it was rung on (may now be closed).
  IF _want_shift IS NOT NULL THEN
    SELECT * INTO _shift FROM public.pos_shifts WHERE id = _want_shift AND user_id = _uid;
  END IF;
  IF _shift IS NULL THEN
    SELECT * INTO _shift FROM public.pos_shifts
     WHERE user_id = _uid AND status = 'open'
       AND (cashier_user_id = auth.uid() OR created_by = auth.uid())
     ORDER BY opened_at DESC LIMIT 1;
  END IF;
  IF _shift IS NULL THEN RAISE EXCEPTION 'NO_ACTIVE_SHIFT'; END IF;
  _reg := _shift.register_id;
  IF _reg IS NULL THEN RAISE EXCEPTION 'NO_REGISTER'; END IF;

  _loc := COALESCE(_shift.location_id, public.pos_default_location(_uid, auth.uid()));
  IF _loc IS NULL THEN RAISE EXCEPTION 'NO_LOCATION'; END IF;

  SELECT COALESCE(tax_rate,0), COALESCE(tax_inclusive,true), COALESCE(allow_negative_stock,false)
    INTO _rate, _incl, _allow_neg FROM public.pos_settings WHERE user_id = _uid;
  _rate := COALESCE(_rate,0); _incl := COALESCE(_incl,true); _allow_neg := COALESCE(_allow_neg,false);
  _override := public.has_override('pos.void', NULL) OR public.has_perm('inventory.manage', _uid);

  IF _id IS NULL THEN
    _sale_no := COALESCE(NULLIF(_sale->>'sale_no',''), public.next_doc_number(_uid, 'POS'));
    INSERT INTO public.pos_sales(user_id, sale_no, client_ref, shift_id, register_id, customer_id, customer_name,
      price_level, status, subtotal, discount, tax, total, paid, change_due, cost_total, note, sold_at,
      created_by, branch_id, location_id)
    VALUES (_uid, _sale_no, _ref, _shift.id, _reg, NULLIF(_sale->>'customer_id','')::uuid,
      COALESCE(NULLIF(_sale->>'customer_name',''),'Walk-in Customer'),
      COALESCE(NULLIF(_sale->>'price_level',''),'retail'), 'draft',
      0,0,0,0,0,0,0, _sale->>'note',
      COALESCE((_sale->>'sold_at')::timestamptz, now()), auth.uid(),
      COALESCE(_shift.branch_id, public.staff_branch()), _loc)
    RETURNING id INTO _id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pos_sale_items WHERE sale_id = _id) THEN
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) LOOP
      IF NULLIF(it->>'item_id','') IS NULL THEN RAISE EXCEPTION 'ITEM_REQUIRED'; END IF;
      SELECT * INTO _item FROM public.stock_items WHERE id = (it->>'item_id')::uuid AND user_id = _uid;
      IF _item IS NULL THEN RAISE EXCEPTION 'UNKNOWN_ITEM'; END IF;
      _qty := COALESCE((it->>'qty')::numeric,0);
      IF _qty <= 0 THEN RAISE EXCEPTION 'BAD_QUANTITY'; END IF;
      _disc := LEAST(GREATEST(COALESCE((it->>'discount_pct')::numeric,0),0),100);

      _price := COALESCE(NULLIF(_item.sell_price,0), 0);
      IF COALESCE((it->>'price')::numeric,0) <> _price
         AND (public.has_perm('prices.manage', _uid) OR public.has_override('prices.manage', _item.id)) THEN
        _price := COALESCE((it->>'price')::numeric,0);
      END IF;
      IF _price <= 0 THEN RAISE EXCEPTION 'NO_PRICE'; END IF;

      SELECT COALESCE(quantity,0) INTO _bal FROM public.stock_balances
        WHERE item_id = _item.id AND location_id = _loc;
      IF COALESCE(_bal,0) < _qty AND NOT _allow_neg AND NOT _override THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', _item.name;
      END IF;

      INSERT INTO public.pos_sale_items(user_id, sale_id, item_id, name, sku, qty, price, unit_cost,
        discount, tax_rate, line_total, note)
      VALUES (_uid, _id, _item.id, _item.name, _item.sku, _qty, _price,
        public.inventory_unit_cost(_item.id, _loc),
        ROUND(_qty*_price*_disc/100, 2), _rate,
        ROUND(_qty*_price*(1-_disc/100), 2), it->>'note');

      _gross := _gross + _qty*_price;
      _linedisc := _linedisc + _qty*_price*_disc/100;
      _cost := _cost + _qty*public.inventory_unit_cost(_item.id, _loc);
    END LOOP;
  ELSE
    SELECT COALESCE(SUM(qty*price),0), COALESCE(SUM(discount),0), COALESCE(SUM(qty*unit_cost),0)
      INTO _gross, _linedisc, _cost FROM public.pos_sale_items WHERE sale_id = _id;
  END IF;

  IF _gross <= 0 THEN RAISE EXCEPTION 'EMPTY_SALE'; END IF;

  _saledisc := ROUND((_gross - _linedisc) * LEAST(GREATEST(COALESCE((_sale->>'sale_discount_pct')::numeric,0),0),100) / 100, 2);
  _net := GREATEST(_gross - _linedisc - _saledisc, 0);
  IF _incl THEN
    _tax := ROUND(_net - _net/(1 + _rate/100), 2);
    _subtotal := ROUND(_net - _tax, 2);
    _total := ROUND(_net, 2);
  ELSE
    _tax := ROUND(_net * _rate/100, 2);
    _subtotal := ROUND(_net, 2);
    _total := ROUND(_net + _tax, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pos_payments WHERE sale_id = _id) THEN
    FOR pay IN SELECT * FROM jsonb_array_elements(COALESCE(_payments,'[]'::jsonb)) LOOP
      INSERT INTO public.pos_payments(user_id, sale_id, method, amount, reference)
      VALUES (_uid, _id, lower(COALESCE(pay->>'method','cash')), ROUND(COALESCE((pay->>'amount')::numeric,0),2), pay->>'reference');
    END LOOP;
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.pos_payments WHERE sale_id = _id;
  IF ROUND(_paid,2) + 0.01 < _total THEN RAISE EXCEPTION 'PAYMENT_SHORT'; END IF;

  UPDATE public.pos_sales
     SET subtotal = _subtotal, discount = ROUND(_linedisc + _saledisc, 2), tax = _tax, total = _total,
         paid = ROUND(_paid,2), change_due = GREATEST(ROUND(_paid - _total, 2), 0), cost_total = ROUND(_cost,2),
         status = 'completed', location_id = _loc, shift_id = _shift.id, register_id = _reg, updated_at = now()
   WHERE id = _id;

  PERFORM public.complete_pos_sale(_id);

  SELECT COALESCE(SUM(CASE WHEN lower(method)='cash' THEN amount END),0),
         COALESCE(SUM(CASE WHEN lower(method) IN ('card','visa') THEN amount END),0),
         COALESCE(SUM(CASE WHEN lower(method) IN ('momo','mobile money') THEN amount END),0),
         COALESCE(SUM(CASE WHEN lower(method) NOT IN ('cash','card','visa','momo','mobile money') THEN amount END),0)
    INTO _cash, _card, _momo, _other FROM public.pos_payments WHERE sale_id = _id;

  UPDATE public.pos_shifts
     SET cash_sales = COALESCE(cash_sales,0) + _cash,
         card_sales = COALESCE(card_sales,0) + _card,
         momo_sales = COALESCE(momo_sales,0) + _momo,
         other_sales = COALESCE(other_sales,0) + _other,
         expected_cash = COALESCE(opening_float,0) + COALESCE(cash_sales,0) + _cash
                         + COALESCE(cash_in,0) - COALESCE(cash_out,0),
         updated_at = now()
   WHERE id = _shift.id;

  PERFORM public.log_cashier_activity(_uid, 'pos.sale.completed', _id,
    jsonb_build_object('sale_no', _sale_no, 'total', _total, 'location', _loc, 'override_used', _override));

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'sale_id', _id, 'sale_no', _sale_no,
                            'total', _total, 'tax', _tax, 'cost_total', ROUND(_cost,2));
END $$;

-- 2) Offline/legacy path now routes through the hardened checkout instead of trusting client figures
CREATE OR REPLACE FUNCTION public.sync_pos_sale(_sale jsonb, _items jsonb DEFAULT '[]'::jsonb, _payments jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _res jsonb; _items2 jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'item_id', e->>'item_id',
           'qty', COALESCE((e->>'qty')::numeric,0),
           'price', COALESCE((e->>'price')::numeric,0),
           'discount_pct', COALESCE((e->>'discount_pct')::numeric, 0),
           'note', e->>'note')), '[]'::jsonb)
    INTO _items2 FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) e;
  _res := public.pos_checkout(_sale, _items2, _payments);
  RETURN (_res->>'sale_id')::uuid;
END $$;

-- 3) Retail till cash belongs to the POS shift, not a restaurant drawer (no double counting)
CREATE OR REPLACE FUNCTION public.pos_payment_to_drawer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _drawer uuid; _shift uuid;
BEGIN
  IF lower(COALESCE(NEW.method,'')) <> 'cash' THEN RETURN NEW; END IF;

  SELECT shift_id INTO _shift FROM public.pos_sales WHERE id = NEW.sale_id;
  IF _shift IS NOT NULL THEN RETURN NEW; END IF; -- POS shift already carries this cash

  SELECT id INTO _drawer FROM public.restaurant_cash_drawers
   WHERE user_id = NEW.user_id AND status = 'open' AND created_by = auth.uid()
   ORDER BY opened_at DESC LIMIT 1;
  IF _drawer IS NULL THEN
    SELECT id INTO _drawer FROM public.restaurant_cash_drawers
     WHERE user_id = NEW.user_id AND status = 'open' ORDER BY opened_at DESC LIMIT 1;
  END IF;

  IF _drawer IS NOT NULL THEN
    UPDATE public.restaurant_cash_drawers
       SET cash_sales = COALESCE(cash_sales,0) + COALESCE(NEW.amount,0),
           expected_cash = COALESCE(opening_float,0) + COALESCE(cash_sales,0) + COALESCE(NEW.amount,0)
                           - COALESCE(cash_payouts,0) - COALESCE(cash_drops,0),
           updated_at = now()
     WHERE id = _drawer;
  END IF;
  RETURN NEW;
END $$;

-- 4) Cost is resolved by the BEFORE-insert trigger; drop the dead AFTER assignment
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.sync_pos_sale(jsonb,jsonb,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.pos_checkout(jsonb,jsonb,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_pos_sale(jsonb,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_checkout(jsonb,jsonb,jsonb) TO authenticated;