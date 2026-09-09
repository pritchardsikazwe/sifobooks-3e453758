-- 1) Authoritative cost on every stock movement (BEFORE insert so it persists)
CREATE OR REPLACE FUNCTION public.stock_movement_resolve_cost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c numeric;
BEGIN
  IF COALESCE(NEW.unit_cost,0) = 0 AND NEW.item_id IS NOT NULL THEN
    SELECT COALESCE(cost_price,0) INTO _c FROM public.stock_items WHERE id = NEW.item_id;
    IF COALESCE(_c,0) > 0 THEN NEW.unit_cost := _c; END IF;
  END IF;
  IF NEW.unit_cost IS NOT NULL THEN
    NEW.total_cost := ROUND(NEW.unit_cost * COALESCE(NEW.quantity,0), 2);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.stock_movement_resolve_cost() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_stock_movement_cost ON public.stock_movements;
CREATE TRIGGER trg_stock_movement_cost
BEFORE INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.stock_movement_resolve_cost();

-- 2) Transfers resolve a valid cost (historical rows untouched)
CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(_transfer_id uuid, _allow_negative boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; l record; _transit uuid; _bal numeric; _cost numeric;
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
    SELECT COALESCE(NULLIF(l.unit_cost,0), NULLIF(si.cost_price,0)) INTO _cost
      FROM public.stock_items si WHERE si.id = l.item_id;
    IF COALESCE(l.unit_cost,0) = 0 AND COALESCE(_cost,0) > 0 THEN
      UPDATE public.inventory_transfer_items SET unit_cost = _cost WHERE id = l.id;
    END IF;
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, t.from_location_id, 'transfer_out', l.quantity, _cost,
      COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date, 'transfer', t.id, auth.uid(), 'Dispatch');
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, _transit, 'transfer_in', l.quantity, _cost,
      COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date, 'transfer', t.id, auth.uid(), 'In transit');
  END LOOP;

  UPDATE public.inventory_transfers
     SET status = 'in_transit', dispatched_at = now(), dispatched_by = auth.uid(), updated_at = now()
   WHERE id = t.id;
  RETURN jsonb_build_object('ok', true, 'status', 'in_transit');
END $$;

CREATE OR REPLACE FUNCTION public.receive_stock_transfer(_transfer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; l record; _transit uuid; _qty numeric; _cost numeric;
BEGIN
  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id;
  IF t IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF NOT public.transfer_can_manage(t.user_id) THEN RAISE EXCEPTION 'Not authorised to receive stock'; END IF;
  IF t.status <> 'in_transit' THEN RAISE EXCEPTION 'Only dispatched transfers can be received'; END IF;

  _transit := public.ensure_transit_location(t.user_id);

  FOR l IN SELECT * FROM public.inventory_transfer_items WHERE transfer_id = t.id LOOP
    CONTINUE WHEN l.item_id IS NULL OR l.quantity <= 0;
    _qty := CASE WHEN l.qty_received > 0 THEN l.qty_received ELSE l.quantity END;
    SELECT COALESCE(NULLIF(l.unit_cost,0), NULLIF(si.cost_price,0)) INTO _cost
      FROM public.stock_items si WHERE si.id = l.item_id;
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, _transit, 'transfer_out', _qty, _cost,
      COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE, 'transfer', t.id, auth.uid(), 'Out of transit');
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, t.to_location_id, 'transfer_in', _qty, _cost,
      COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE, 'transfer', t.id, auth.uid(), 'Received');
    UPDATE public.inventory_transfer_items SET qty_received = _qty WHERE id = l.id;
  END LOOP;

  UPDATE public.inventory_transfers
     SET status = 'completed', received_at = now(), received_by = auth.uid(), updated_at = now()
   WHERE id = t.id;
  RETURN jsonb_build_object('ok', true, 'status', 'completed');
END $$;

-- 3) Hardened till checkout
CREATE OR REPLACE FUNCTION public.pos_checkout(_sale jsonb, _items jsonb DEFAULT '[]'::jsonb, _payments jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := public.current_tenant();
  _ref text := _sale->>'client_ref';
  _id uuid; _je uuid; _sale_no text;
  _shift record; _loc uuid; _reg uuid;
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

  -- Idempotent retry
  SELECT id, journal_entry_id, sale_no INTO _id, _je, _sale_no
    FROM public.pos_sales WHERE user_id = _uid AND client_ref = _ref;
  IF _id IS NOT NULL AND _je IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'sale_id', _id, 'sale_no', _sale_no);
  END IF;

  -- Active shift is mandatory (never created silently)
  SELECT * INTO _shift FROM public.pos_shifts
   WHERE user_id = _uid AND status = 'open'
     AND (cashier_user_id = auth.uid() OR created_by = auth.uid())
   ORDER BY opened_at DESC LIMIT 1;
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

  -- Rebuild lines from authoritative item data
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
        COALESCE(_item.cost_price,0),
        ROUND(_qty*_price*_disc/100, 2), _rate,
        ROUND(_qty*_price*(1-_disc/100), 2), it->>'note');

      _gross := _gross + _qty*_price;
      _linedisc := _linedisc + _qty*_price*_disc/100;
      _cost := _cost + _qty*COALESCE(_item.cost_price,0);
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

  -- Shift payment totals (posted once, on first completion)
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

REVOKE ALL ON FUNCTION public.pos_checkout(jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_checkout(jsonb, jsonb, jsonb) TO authenticated;

-- 4) COGS in the ledger uses authoritative item cost
CREATE OR REPLACE FUNCTION public.complete_pos_sale(_sale_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record; li record; p record;
  _entry uuid; _ref text; _uid uuid; _loc uuid;
  _sales uuid; _vat uuid; _cogs uuid; _inv uuid; _ar uuid; _acct uuid;
  _cogs_amt numeric := 0; _net numeric := 0; _paytotal numeric := 0;
BEGIN
  SELECT * INTO s FROM pos_sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF NOT public.has_perm('pos.sales.create', s.user_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF s.journal_entry_id IS NOT NULL THEN RETURN s.journal_entry_id; END IF;
  _uid := s.user_id;
  _ref := 'POS:' || _sale_id::text;
  _loc := COALESCE(s.location_id, public.pos_default_location(_uid, s.worker_id));

  _sales := ensure_account(_uid,'4000','Retail Sales','revenue');
  _vat   := ensure_account(_uid,'2200','VAT Output','liability');
  _cogs  := ensure_account(_uid,'5000','Cost of Sales','expense');
  _inv   := ensure_account(_uid,'1300','Inventory','asset');
  _ar    := ensure_account(_uid,'1100','Accounts Receivable','asset');

  SELECT COALESCE(SUM(i.qty * COALESCE(NULLIF(i.unit_cost,0), si.cost_price, 0)),0)
    INTO _cogs_amt
    FROM pos_sale_items i LEFT JOIN stock_items si ON si.id = i.item_id
   WHERE i.sale_id = _sale_id;
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

  FOR li IN SELECT i.*, si.cost_price FROM pos_sale_items i
              LEFT JOIN stock_items si ON si.id = i.item_id
             WHERE i.sale_id = _sale_id AND i.item_id IS NOT NULL LOOP
    INSERT INTO stock_movements(user_id, item_id, movement_type, quantity, unit_cost, reference, note,
                                location_id, transaction_date, source_type, source_id, created_by)
    VALUES (_uid, li.item_id, 'sale', li.qty, COALESCE(NULLIF(li.unit_cost,0), li.cost_price),
            COALESCE(s.sale_no,_ref), 'Retail POS sale',
            _loc, s.sold_at::date, 'pos_sale', _sale_id, s.worker_id);
  END LOOP;

  UPDATE pos_sales
    SET status='completed', journal_entry_id=_entry, cost_total=_cogs_amt, location_id=_loc, updated_at=now()
    WHERE id=_sale_id;

  RETURN _entry;
END $$;