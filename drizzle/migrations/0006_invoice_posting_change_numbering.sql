-- 1. Till sale numbering: next number after the highest existing one, serialised per tenant/prefix/year.
CREATE OR REPLACE FUNCTION public.next_doc_number(_uid uuid, _prefix text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _seq int; _yr text := to_char(now(), 'YYYY');
BEGIN
  IF _prefix = 'POS' THEN
    PERFORM pg_advisory_xact_lock(hashtext('docno:' || _uid::text || ':POS:' || _yr));
    SELECT COALESCE(MAX((substring(sale_no from '^POS-' || _yr || '-([0-9]+)$'))::int), 0) + 1
      INTO _seq FROM public.pos_sales
     WHERE user_id = _uid AND sale_no ~ ('^POS-' || _yr || '-[0-9]+$');
  ELSIF _prefix = 'TRF' THEN
    SELECT count(*) + 1 INTO _seq FROM public.inventory_transfers
      WHERE user_id = _uid AND to_char(created_at, 'YYYY') = _yr;
  ELSIF _prefix = 'CNT' THEN
    SELECT count(*) + 1 INTO _seq FROM public.stock_counts
      WHERE user_id = _uid AND to_char(created_at, 'YYYY') = _yr;
  ELSE
    SELECT count(*) + 1 INTO _seq FROM public.stock_adjustments
      WHERE user_id = _uid AND to_char(created_at, 'YYYY') = _yr;
  END IF;
  RETURN _prefix || '-' || _yr || '-' || lpad(_seq::text, 4, '0');
END; $function$;

-- 2. Till posting: change given back leaves cash, only the sale amount remains.
CREATE OR REPLACE FUNCTION public.complete_pos_sale(_sale_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s record; li record; p record;
  _entry uuid; _ref text; _uid uuid; _loc uuid; _worker uuid;
  _sales uuid; _vat uuid; _cogs uuid; _inv uuid; _ar uuid; _acct uuid; _cash uuid;
  _cogs_amt numeric := 0; _net numeric := 0; _paytotal numeric := 0; _c numeric; _change numeric := 0;
BEGIN
  SELECT * INTO s FROM pos_sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF NOT public.has_perm('pos.sales.create', s.user_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF s.journal_entry_id IS NOT NULL THEN RETURN s.journal_entry_id; END IF;
  _uid := s.user_id;
  _worker := COALESCE(s.created_by, auth.uid());
  _ref := 'POS:' || _sale_id::text;
  _loc := COALESCE(s.location_id, public.pos_default_location(_uid, _worker));

  _sales := ensure_account(_uid,'4000','Retail Sales','revenue');
  _vat   := ensure_account(_uid,'2200','VAT Output','liability');
  _cogs  := ensure_account(_uid,'5000','Cost of Sales','expense');
  _inv   := ensure_account(_uid,'1300','Inventory','asset');
  _ar    := ensure_account(_uid,'1100','Accounts Receivable','asset');

  UPDATE pos_sale_items i
     SET unit_cost = public.inventory_unit_cost(i.item_id, _loc)
    FROM stock_items si
   WHERE i.sale_id = _sale_id AND si.id = i.item_id AND public.item_tracks_stock(si.item_type)
     AND COALESCE(public.inventory_unit_cost(i.item_id, _loc),0) > 0;

  SELECT COALESCE(SUM(i.qty * COALESCE(NULLIF(i.unit_cost,0), 0)),0)
    INTO _cogs_amt FROM pos_sale_items i
    JOIN stock_items si ON si.id = i.item_id
   WHERE i.sale_id = _sale_id AND public.item_tracks_stock(si.item_type);
  _net := COALESCE(s.subtotal,0);

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (_uid, 'JE-POS-'||substr(_sale_id::text,1,8), s.sold_at::date, _ref,
          'Retail sale '||COALESCE(s.sale_no,''), 'posted', 0, 0)
  RETURNING id INTO _entry;

  FOR p IN SELECT method, SUM(amount) AS amt FROM pos_payments WHERE sale_id = _sale_id GROUP BY method LOOP
    _paytotal := _paytotal + p.amt;
    _acct := CASE lower(p.method)
      WHEN 'cash' THEN ensure_account(_uid,'1010','Cash on Hand','asset')
      WHEN 'card' THEN ensure_account(_uid,'1020','Card Clearing','asset')
      WHEN 'visa' THEN ensure_account(_uid,'1020','Card Clearing','asset')
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

  -- Change handed back to the customer comes out of the cash drawer.
  _change := GREATEST(ROUND(_paytotal - COALESCE(s.total,0), 2), 0);
  IF _change > 0 THEN
    _cash := ensure_account(_uid,'1010','Cash on Hand','asset');
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _cash, 0, _change, 'Change given');
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

  UPDATE journal_entries je
     SET total_debit = t.d, total_credit = t.c
    FROM (SELECT COALESCE(SUM(debit),0) d, COALESCE(SUM(credit),0) c FROM journal_lines WHERE entry_id = _entry) t
   WHERE je.id = _entry;

  FOR li IN SELECT i.* FROM pos_sale_items i JOIN stock_items si ON si.id = i.item_id
             WHERE i.sale_id = _sale_id AND public.item_tracks_stock(si.item_type) LOOP
    _c := COALESCE(NULLIF(li.unit_cost,0), public.inventory_unit_cost(li.item_id, _loc));
    INSERT INTO stock_movements(user_id, item_id, movement_type, quantity, unit_cost, total_cost, reference, note,
                                location_id, transaction_date, source_type, source_id, created_by)
    VALUES (_uid, li.item_id, 'sale', li.qty, _c, ROUND(COALESCE(_c,0)*li.qty,2),
            COALESCE(s.sale_no,_ref), 'Retail POS sale',
            _loc, s.sold_at::date, 'pos_sale', _sale_id, _worker);
  END LOOP;

  UPDATE pos_sales
    SET status='completed', journal_entry_id=_entry, cost_total=_cogs_amt, location_id=_loc, updated_at=now()
    WHERE id=_sale_id;

  RETURN _entry;
END $function$;

-- 3. Checkout: server-assigned sale number; shift cash counts cash kept (received minus change).
CREATE OR REPLACE FUNCTION public.pos_checkout(_sale jsonb, _items jsonb DEFAULT '[]'::jsonb, _payments jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := public.current_tenant();
  _ref text := _sale->>'client_ref';
  _id uuid; _je uuid; _sale_no text;
  _shift record; _loc uuid; _reg uuid; _want_shift uuid := NULLIF(_sale->>'shift_id','')::uuid;
  _rate numeric; _incl boolean; _allow_neg boolean;
  it jsonb; pay jsonb;
  _item record; _qty numeric; _price numeric; _disc numeric; _unit_cost numeric;
  _tracks boolean; _sale_unit text; _base_unit text;
  _gross numeric := 0; _linedisc numeric := 0; _cost numeric := 0;
  _saledisc numeric; _net numeric; _tax numeric; _subtotal numeric; _total numeric;
  _paid numeric := 0; _bal numeric; _change numeric := 0;
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

  _loc := public.pos_resolve_location(_reg, _shift.location_id);
  IF _loc IS NULL THEN RAISE EXCEPTION 'NO_LOCATION'; END IF;

  SELECT COALESCE(tax_rate,0), COALESCE(tax_inclusive,true), COALESCE(allow_negative_stock,false)
    INTO _rate, _incl, _allow_neg FROM public.pos_settings WHERE user_id = _uid;
  _rate := COALESCE(_rate,0); _incl := COALESCE(_incl,true); _allow_neg := COALESCE(_allow_neg,false);

  IF _id IS NULL THEN
    -- The number is always issued here, never taken from the terminal.
    _sale_no := public.next_doc_number(_uid, 'POS');
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
      _tracks := public.item_tracks_stock(_item.item_type);

      _base_unit := NULLIF(btrim(COALESCE(_item.unit,'')),'');
      _sale_unit := COALESCE(NULLIF(btrim(COALESCE(it->>'unit','')),''), _base_unit);
      IF _base_unit IS NOT NULL AND _sale_unit IS NOT NULL AND lower(_sale_unit) <> lower(_base_unit) THEN
        RAISE EXCEPTION 'UNIT_CONVERSION_MISSING:%|%|%', _item.name, _sale_unit, _base_unit;
      END IF;

      _price := COALESCE(NULLIF(_item.sell_price,0), 0);
      IF COALESCE((it->>'price')::numeric,0) <> _price
         AND (public.has_perm('prices.manage', _uid) OR public.has_override('prices.manage', _item.id)) THEN
        _price := COALESCE((it->>'price')::numeric,0);
      END IF;
      IF _price <= 0 THEN RAISE EXCEPTION 'NO_PRICE'; END IF;

      _unit_cost := public.inventory_unit_cost(_item.id, _loc);
      IF COALESCE(_unit_cost,0) <= 0 AND _tracks THEN
        RAISE EXCEPTION 'NO_COST:%', _item.name;
      END IF;

      SELECT COALESCE(quantity,0) INTO _bal FROM public.stock_balances
        WHERE item_id = _item.id AND location_id = _loc;
      IF COALESCE(_bal,0) < _qty AND _tracks THEN
        _oversell_ok := _allow_neg
          OR public.has_override('pos.oversell', _item.id)
          OR public.has_perm('inventory.manage', _uid);
        IF NOT _oversell_ok THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', _item.name; END IF;
        _oversold := _oversold || jsonb_build_object('item_id', _item.id, 'name', _item.name,
                                                     'available', COALESCE(_bal,0), 'sold', _qty);
      END IF;

      INSERT INTO public.pos_sale_items(user_id, sale_id, item_id, name, sku, qty, price, unit_cost,
        discount, tax_rate, line_total, note, unit, base_qty, base_unit)
      VALUES (_uid, _id, _item.id, _item.name, _item.sku, _qty, _price, COALESCE(_unit_cost,0),
        ROUND(_qty*_price*_disc/100, 2), _rate,
        ROUND(_qty*_price*(1-_disc/100), 2), it->>'note', _sale_unit, _qty, COALESCE(_base_unit,_sale_unit));

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
  _change := GREATEST(ROUND(_paid - _total, 2), 0);

  UPDATE public.pos_sales
     SET subtotal = _subtotal, discount = ROUND(_linedisc + _saledisc, 2), tax = _tax, total = _total,
         paid = ROUND(_paid,2), change_due = _change, cost_total = ROUND(_cost,2),
         status = 'completed', location_id = _loc, shift_id = _shift.id, register_id = _reg, updated_at = now()
   WHERE id = _id;

  PERFORM public.complete_pos_sale(_id);

  SELECT COALESCE(SUM(CASE WHEN lower(method)='cash' THEN amount END),0),
         COALESCE(SUM(CASE WHEN lower(method) IN ('card','visa') THEN amount END),0),
         COALESCE(SUM(CASE WHEN lower(method) IN ('momo','mobile money') THEN amount END),0),
         COALESCE(SUM(CASE WHEN lower(method) NOT IN ('cash','card','visa','momo','mobile money') THEN amount END),0)
    INTO _cash, _card, _momo, _other FROM public.pos_payments WHERE sale_id = _id;
  _cash := _cash - _change;

  UPDATE public.pos_shifts
     SET cash_sales = COALESCE(cash_sales,0) + _cash,
         card_sales = COALESCE(card_sales,0) + _card,
         momo_sales = COALESCE(momo_sales,0) + _momo,
         other_sales = COALESCE(other_sales,0) + _other,
         expected_cash = COALESCE(opening_float,0) + COALESCE(cash_sales,0) + _cash
                         + COALESCE(cash_in,0) - COALESCE(cash_out,0),
         location_id = COALESCE(location_id, _loc),
         updated_at = now()
   WHERE id = _shift.id;

  PERFORM public.log_cashier_activity(_uid, 'pos.sale.completed', _id,
    jsonb_build_object('sale_no', _sale_no, 'total', _total, 'change', _change, 'location', _loc));

  IF jsonb_array_length(_oversold) > 0 THEN
    PERFORM public.log_cashier_activity(_uid, 'pos.sale.oversell_authorised', _id,
      jsonb_build_object('sale_no', _sale_no, 'location', _loc, 'lines', _oversold));
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'sale_id', _id, 'sale_no', _sale_no,
                            'total', _total, 'tax', _tax, 'change_due', _change, 'cost_total', ROUND(_cost,2), 'location_id', _loc);
END $function$;

-- 4. Shift cash-up: change handed back is not in the drawer.
CREATE OR REPLACE FUNCTION public.submit_cashier_shift(_shift_id uuid, _actual_cash numeric, _reason text DEFAULT NULL::text, _denominations jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  s public.pos_shifts;
  expected numeric;
  _cash numeric := 0; _card numeric := 0; _momo numeric := 0; _other numeric := 0;
  _refunds numeric := 0; _var numeric; _change numeric := 0;
BEGIN
  SELECT * INTO s FROM public.pos_shifts WHERE id = _shift_id;
  IF s.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Shift not found'); END IF;
  IF NOT (auth.uid() = s.user_id OR auth.uid() = s.created_by OR auth.uid() = s.cashier_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This is not your shift');
  END IF;
  IF s.review_status IN ('pending_review','approved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Shift already submitted');
  END IF;

  SELECT COALESCE(SUM(CASE WHEN lower(p.method) = 'cash' THEN p.amount END), 0),
         COALESCE(SUM(CASE WHEN lower(p.method) IN ('card','visa') THEN p.amount END), 0),
         COALESCE(SUM(CASE WHEN lower(p.method) IN ('momo','mobile money','mobile_money') THEN p.amount END), 0),
         COALESCE(SUM(CASE WHEN lower(p.method) NOT IN ('cash','card','visa','momo','mobile money','mobile_money') THEN p.amount END), 0)
    INTO _cash, _card, _momo, _other
    FROM public.pos_payments p
    JOIN public.pos_sales sa ON sa.id = p.sale_id
   WHERE sa.shift_id = _shift_id AND sa.status = 'completed';

  SELECT COALESCE(SUM(sa.change_due), 0) INTO _change
    FROM public.pos_sales sa WHERE sa.shift_id = _shift_id AND sa.status = 'completed';
  _cash := _cash - _change;

  SELECT COALESCE(SUM(sa.total), 0) INTO _refunds
    FROM public.pos_sales sa
   WHERE sa.shift_id = _shift_id AND sa.status = 'refunded';

  expected := COALESCE(s.opening_float,0) + _cash + COALESCE(s.cash_in,0)
              - _refunds - COALESCE(s.cash_out,0);
  _var := ROUND(COALESCE(_actual_cash,0) - expected, 2);

  IF _var <> 0 AND COALESCE(btrim(_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Explain the difference between counted and expected cash', 'expected_cash', expected, 'variance', _var);
  END IF;

  UPDATE public.pos_shifts SET
    status = 'closed', closed_at = COALESCE(closed_at, now()),
    cash_sales = _cash, card_sales = _card, momo_sales = _momo, other_sales = _other,
    refunds_total = _refunds, expected_cash = expected, actual_cash = _actual_cash, variance = _var,
    variance_reason = NULLIF(btrim(COALESCE(_reason,'')), ''),
    cash_denominations = _denominations, submitted_at = now(), review_status = 'pending_review'
  WHERE id = _shift_id;

  PERFORM public.log_cashier_activity(s.user_id, 'shift.submitted', _shift_id,
    jsonb_build_object('expected', expected, 'actual', _actual_cash, 'variance', _var, 'reason', _reason));
  RETURN jsonb_build_object('ok', true, 'expected_cash', expected, 'variance', _var);
END $function$;

-- 5. Sales invoice posting, reusing the till's accounts, stock rule, cost and movement path.
CREATE OR REPLACE FUNCTION public.post_sales_invoice(_invoice jsonb, _items jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := public.current_tenant();
  _no text := NULLIF(btrim(COALESCE(_invoice->>'number','')),'');
  _incl boolean := COALESCE((_invoice->>'tax_inclusive')::boolean, true);
  _date date := COALESCE(NULLIF(_invoice->>'issue_date','')::date, CURRENT_DATE);
  _scheme text := lower(COALESCE(NULLIF(_invoice->>'tax_scheme',''),'vat'));
  _existing record; _inv_id uuid; _entry uuid; _allow_neg boolean;
  it jsonb; _item record; _tracks boolean;
  _qty numeric; _price numeric; _rate numeric; _gross numeric; _disc numeric; _net numeric; _ltax numeric; _lbase numeric;
  _subtotal numeric := 0; _tax numeric := 0; _total numeric; _cogs numeric := 0; _loc uuid; _cost numeric; _bal numeric;
  _lines jsonb := '[]'::jsonb; l jsonb;
  _ar uuid; _sales uuid; _vat uuid; _cogs_acct uuid; _inv_acct uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF NOT (auth.uid() = _uid OR (public.is_staff_of(_uid) AND public.has_perm('accounting.manage', _uid))) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF _no IS NULL THEN RAISE EXCEPTION 'INVOICE_NUMBER_REQUIRED'; END IF;
  IF _scheme NOT IN ('vat','none','exempt') THEN RAISE EXCEPTION 'UNSUPPORTED_TAX_SCHEME:%', _scheme; END IF;
  IF jsonb_array_length(COALESCE(_items,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'INVOICE_ITEMS_REQUIRED'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('inv:' || _uid::text || ':' || _no));
  SELECT id, status INTO _existing FROM public.invoices WHERE user_id = _uid AND number = _no LIMIT 1;
  IF _existing.id IS NOT NULL AND _existing.status <> 'draft' THEN
    SELECT id INTO _entry FROM public.journal_entries WHERE user_id = _uid AND reference = 'INV:' || _no LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'invoice_id', _existing.id, 'journal_entry_id', _entry);
  END IF;

  SELECT COALESCE(allow_negative_stock,false) INTO _allow_neg FROM public.pos_settings WHERE user_id = _uid;
  _allow_neg := COALESCE(_allow_neg,false);

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := COALESCE((it->>'quantity')::numeric,0);
    _price := COALESCE((it->>'unit_price')::numeric,0);
    _rate := CASE WHEN _scheme = 'vat' THEN COALESCE((it->>'vat_rate')::numeric,0) ELSE 0 END;
    IF _qty <= 0 OR _price < 0 OR _rate < 0 THEN RAISE EXCEPTION 'INVALID_INVOICE_LINE'; END IF;
    _gross := ROUND(_qty*_price, 2);
    _disc := LEAST(GREATEST(ROUND(COALESCE((it->>'discount_amount')::numeric,0),2),0), _gross);
    _net := _gross - _disc;
    IF _incl THEN _ltax := ROUND(_net - _net/(1+_rate/100), 2); _lbase := _net - _ltax;
    ELSE _ltax := ROUND(_net*_rate/100, 2); _lbase := _net; END IF;
    _tracks := false; _cost := 0; _loc := NULL;
    IF NULLIF(it->>'stock_item_id','') IS NOT NULL THEN
      SELECT * INTO _item FROM public.stock_items WHERE id = (it->>'stock_item_id')::uuid AND user_id = _uid;
      IF _item IS NULL THEN RAISE EXCEPTION 'UNKNOWN_ITEM'; END IF;
      _tracks := public.item_tracks_stock(_item.item_type);
      IF _tracks THEN
        _loc := COALESCE(NULLIF(it->>'location_id','')::uuid, public.pos_resolve_location(NULL, NULL));
        IF _loc IS NULL THEN RAISE EXCEPTION 'NO_LOCATION'; END IF;
        _cost := public.inventory_unit_cost(_item.id, _loc);
        IF COALESCE(_cost,0) <= 0 THEN RAISE EXCEPTION 'NO_COST:%', _item.name; END IF;
        SELECT COALESCE(quantity,0) INTO _bal FROM public.stock_balances WHERE item_id = _item.id AND location_id = _loc;
        IF COALESCE(_bal,0) < _qty AND NOT (_allow_neg OR public.has_perm('inventory.manage', _uid)) THEN
          RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', _item.name;
        END IF;
        _cogs := _cogs + ROUND(_qty*_cost, 2);
      END IF;
    END IF;
    _subtotal := _subtotal + _lbase; _tax := _tax + _ltax;
    _lines := _lines || jsonb_build_object('stock_item_id', NULLIF(it->>'stock_item_id',''),
      'description', COALESCE(NULLIF(it->>'description',''), _item.name, 'Item'),
      'qty', _qty, 'price', _price, 'rate', _rate, 'line', _net, 'tracks', _tracks, 'loc', _loc, 'cost', _cost);
  END LOOP;
  _subtotal := ROUND(_subtotal,2); _tax := ROUND(_tax,2); _total := _subtotal + _tax;

  -- Never silently change what the user saw.
  IF NULLIF(_invoice->>'expected_total','') IS NOT NULL
     AND abs((_invoice->>'expected_total')::numeric - _total) > 0.02 THEN
    RAISE EXCEPTION 'TOTAL_MISMATCH:%|%', (_invoice->>'expected_total'), _total;
  END IF;

  IF _existing.id IS NOT NULL THEN
    _inv_id := _existing.id;
    UPDATE public.invoices SET customer_id = NULLIF(_invoice->>'customer_id','')::uuid, issue_date = _date,
      due_date = NULLIF(_invoice->>'due_date','')::date, status = 'sent', currency = COALESCE(NULLIF(_invoice->>'currency',''),'ZMW'),
      subtotal = _subtotal, vat_amount = _tax, total = _total, amount_paid = 0,
      seller_tpin = _invoice->>'seller_tpin', buyer_tpin = _invoice->>'buyer_tpin', notes = _invoice->>'notes'
     WHERE id = _inv_id;
    DELETE FROM public.invoice_items WHERE invoice_id = _inv_id AND user_id = _uid;
  ELSE
    INSERT INTO public.invoices(user_id, customer_id, number, issue_date, due_date, status, currency,
      subtotal, vat_amount, total, amount_paid, seller_tpin, buyer_tpin, notes)
    VALUES (_uid, NULLIF(_invoice->>'customer_id','')::uuid, _no, _date, NULLIF(_invoice->>'due_date','')::date, 'sent',
      COALESCE(NULLIF(_invoice->>'currency',''),'ZMW'), _subtotal, _tax, _total, 0,
      _invoice->>'seller_tpin', _invoice->>'buyer_tpin', _invoice->>'notes')
    RETURNING id INTO _inv_id;
  END IF;

  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    INSERT INTO public.invoice_items(user_id, invoice_id, stock_item_id, description, quantity, unit_price, vat_rate, line_total)
    VALUES (_uid, _inv_id, NULLIF(l->>'stock_item_id','')::uuid, l->>'description', (l->>'qty')::numeric,
      (l->>'price')::numeric, (l->>'rate')::numeric, (l->>'line')::numeric);
    IF (l->>'tracks')::boolean THEN
      INSERT INTO public.stock_movements(user_id, item_id, movement_type, quantity, unit_cost, total_cost, reference, note,
        location_id, transaction_date, source_type, source_id, created_by)
      VALUES (_uid, (l->>'stock_item_id')::uuid, 'sale', (l->>'qty')::numeric, (l->>'cost')::numeric,
        ROUND((l->>'cost')::numeric*(l->>'qty')::numeric, 2), _no, 'Sales invoice',
        (l->>'loc')::uuid, _date, 'sales_invoice', _inv_id, auth.uid());
    END IF;
  END LOOP;

  _ar := ensure_account(_uid,'1100','Accounts Receivable','asset');
  _sales := ensure_account(_uid,'4000','Retail Sales','revenue');
  _vat := ensure_account(_uid,'2200','VAT Output','liability');
  _cogs_acct := ensure_account(_uid,'5000','Cost of Sales','expense');
  _inv_acct := ensure_account(_uid,'1300','Inventory','asset');

  INSERT INTO public.journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit, currency)
  VALUES (_uid, 'JE-INV-' || _no, _date, 'INV:' || _no, 'Sales invoice ' || _no, 'posted',
    _total + _cogs, _total + _cogs, COALESCE(NULLIF(_invoice->>'currency',''),'ZMW'))
  RETURNING id INTO _entry;
  INSERT INTO public.journal_lines(user_id, entry_id, account_id, debit, credit, description)
  VALUES (_uid, _entry, _ar, _total, 0, 'Trade receivable');
  IF _subtotal > 0 THEN
    INSERT INTO public.journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _sales, 0, _subtotal, 'Sales revenue');
  END IF;
  IF _tax > 0 THEN
    INSERT INTO public.journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _vat, 0, _tax, 'Output VAT');
  END IF;
  IF _cogs > 0 THEN
    INSERT INTO public.journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _cogs_acct, _cogs, 0, 'Cost of goods sold'),
           (_uid, _entry, _inv_acct, 0, _cogs, 'Inventory issued');
  END IF;

  PERFORM public.recalc_invoice_balance(_inv_id);

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'invoice_id', _inv_id, 'journal_entry_id', _entry,
    'subtotal', _subtotal, 'vat', _tax, 'total', _total, 'cost_total', _cogs);
END $function$;

REVOKE ALL ON FUNCTION public.post_sales_invoice(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_sales_invoice(jsonb, jsonb) TO authenticated, service_role;