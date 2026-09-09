CREATE OR REPLACE FUNCTION public.pos_checkout(_sale jsonb, _items jsonb DEFAULT '[]'::jsonb, _payments jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := public.current_tenant();
  _ref text := _sale->>'client_ref';
  _id uuid; _je uuid; _sale_no text;
  _shift record; _loc uuid; _reg uuid; _want_shift uuid := NULLIF(_sale->>'shift_id','')::uuid;
  _rate numeric; _incl boolean; _allow_neg boolean;
  it jsonb; pay jsonb;
  _item record; _qty numeric; _price numeric; _disc numeric; _unit_cost numeric;
  _gross numeric := 0; _linedisc numeric := 0; _cost numeric := 0;
  _saledisc numeric; _net numeric; _tax numeric; _subtotal numeric; _total numeric;
  _paid numeric := 0; _bal numeric;
  _oversell_ok boolean; _oversold jsonb := '[]'::jsonb;
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
  IF NOT EXISTS (SELECT 1 FROM public.inventory_locations l
                  WHERE l.id = _loc AND l.user_id = _uid AND COALESCE(l.is_active, true)) THEN
    RAISE EXCEPTION 'NO_LOCATION';
  END IF;

  SELECT COALESCE(tax_rate,0), COALESCE(tax_inclusive,true), COALESCE(allow_negative_stock,false)
    INTO _rate, _incl, _allow_neg FROM public.pos_settings WHERE user_id = _uid;
  _rate := COALESCE(_rate,0); _incl := COALESCE(_incl,true); _allow_neg := COALESCE(_allow_neg,false);

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

      -- Authoritative valuation. A stock-tracked item with no determinable cost
      -- is refused rather than posted at zero COGS.
      _unit_cost := public.inventory_unit_cost(_item.id, _loc);
      IF COALESCE(_unit_cost,0) <= 0 AND COALESCE(_item.track_stock, true) THEN
        RAISE EXCEPTION 'NO_COST:%', _item.name;
      END IF;

      SELECT COALESCE(quantity,0) INTO _bal FROM public.stock_balances
        WHERE item_id = _item.id AND location_id = _loc;
      IF COALESCE(_bal,0) < _qty AND COALESCE(_item.track_stock, true) THEN
        _oversell_ok := _allow_neg
          OR public.has_override('pos.oversell', _item.id)
          OR public.has_perm('inventory.manage', _uid);
        IF NOT _oversell_ok THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', _item.name; END IF;
        _oversold := _oversold || jsonb_build_object('item_id', _item.id, 'name', _item.name,
                                                     'available', COALESCE(_bal,0), 'sold', _qty);
      END IF;

      INSERT INTO public.pos_sale_items(user_id, sale_id, item_id, name, sku, qty, price, unit_cost,
        discount, tax_rate, line_total, note)
      VALUES (_uid, _id, _item.id, _item.name, _item.sku, _qty, _price, _unit_cost,
        ROUND(_qty*_price*_disc/100, 2), _rate,
        ROUND(_qty*_price*(1-_disc/100), 2), it->>'note');

      _gross := _gross + _qty*_price;
      _linedisc := _linedisc + _qty*_price*_disc/100;
      _cost := _cost + _qty*COALESCE(_unit_cost,0);
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
    jsonb_build_object('sale_no', _sale_no, 'total', _total, 'location', _loc));

  IF jsonb_array_length(_oversold) > 0 THEN
    PERFORM public.log_cashier_activity(_uid, 'pos.sale.oversell_authorised', _id,
      jsonb_build_object('sale_no', _sale_no, 'location', _loc, 'lines', _oversold));
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'sale_id', _id, 'sale_no', _sale_no,
                            'total', _total, 'tax', _tax, 'cost_total', ROUND(_cost,2));
END $function$;

REVOKE ALL ON FUNCTION public.pos_checkout(jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_checkout(jsonb, jsonb, jsonb) TO authenticated;

-- Read-only legacy integrity report. Reports only; never mutates historical rows.
CREATE OR REPLACE FUNCTION public.pos_integrity_report()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := public.current_tenant(); _out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF NOT (public.has_perm('reports.view', _uid) OR public.has_perm('inventory.manage', _uid)) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  SELECT jsonb_build_object(
    'sales_missing_shift', (SELECT count(*) FROM public.pos_sales WHERE user_id=_uid AND status='completed' AND shift_id IS NULL),
    'sales_missing_location', (SELECT count(*) FROM public.pos_sales WHERE user_id=_uid AND status='completed' AND location_id IS NULL),
    'sales_missing_journal', (SELECT count(*) FROM public.pos_sales WHERE user_id=_uid AND status='completed' AND journal_entry_id IS NULL),
    'sales_missing_cashier', (SELECT count(*) FROM public.pos_sales WHERE user_id=_uid AND status='completed' AND created_by IS NULL),
    'movements_missing_cost', (SELECT count(*) FROM public.stock_movements WHERE user_id=_uid AND (unit_cost IS NULL OR unit_cost=0 OR total_cost IS NULL)),
    'movements_cost_mismatch', (SELECT count(*) FROM public.stock_movements WHERE user_id=_uid AND unit_cost IS NOT NULL AND total_cost IS NOT NULL AND ROUND(total_cost,2) <> ROUND(unit_cost*quantity,2)),
    'items_without_cost', (SELECT count(*) FROM public.stock_items WHERE user_id=_uid AND COALESCE(track_stock,true) AND COALESCE(cost_price,0)=0),
    'unbalanced_pos_journals', (SELECT count(*) FROM (
        SELECT e.id FROM public.journal_entries e
          JOIN public.journal_lines l ON l.entry_id=e.id
         WHERE e.user_id=_uid AND e.reference LIKE 'POS:%'
         GROUP BY e.id HAVING ROUND(SUM(l.debit),2) <> ROUND(SUM(l.credit),2)) q),
    'duplicate_client_refs', (SELECT count(*) FROM (
        SELECT client_ref FROM public.pos_sales WHERE user_id=_uid AND client_ref IS NOT NULL
         GROUP BY client_ref HAVING count(*) > 1) d),
    'generated_at', now()
  ) INTO _out;
  RETURN _out;
END $function$;

REVOKE ALL ON FUNCTION public.pos_integrity_report() FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_integrity_report() TO authenticated;