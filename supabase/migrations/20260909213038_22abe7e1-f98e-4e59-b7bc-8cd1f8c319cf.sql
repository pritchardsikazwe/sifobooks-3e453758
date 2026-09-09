-- Single, extensible inventory valuation point. Today: batch/location cost when
-- available, else the item cost price. FIFO/weighted-average can slot in here
-- without touching POS, transfers or accounting callers.
CREATE OR REPLACE FUNCTION public.inventory_unit_cost(_item uuid, _location uuid DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c numeric;
BEGIN
  IF _item IS NULL THEN RETURN 0; END IF;

  IF _location IS NOT NULL THEN
    SELECT NULLIF(b.unit_cost,0) INTO _c
      FROM public.stock_batches b
     WHERE b.item_id = _item AND b.location_id = _location
       AND COALESCE(b.quantity,0) > 0
     ORDER BY b.received_date NULLS LAST, b.created_at
     LIMIT 1;
    IF COALESCE(_c,0) > 0 THEN RETURN ROUND(_c, 4); END IF;
  END IF;

  SELECT NULLIF(cost_price,0) INTO _c FROM public.stock_items WHERE id = _item;
  RETURN ROUND(COALESCE(_c,0), 4);
END $$;

REVOKE ALL ON FUNCTION public.inventory_unit_cost(uuid,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.inventory_unit_cost(uuid,uuid) TO authenticated;

-- Cost of sales derives from the valuation service for the selling location.
CREATE OR REPLACE FUNCTION public.complete_pos_sale(_sale_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record; li record; p record;
  _entry uuid; _ref text; _uid uuid; _loc uuid; _worker uuid;
  _sales uuid; _vat uuid; _cogs uuid; _inv uuid; _ar uuid; _acct uuid;
  _cogs_amt numeric := 0; _net numeric := 0; _paytotal numeric := 0; _c numeric;
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

  -- Server-authoritative cost: valuation service, never the client figure.
  UPDATE pos_sale_items i
     SET unit_cost = public.inventory_unit_cost(i.item_id, _loc)
   WHERE i.sale_id = _sale_id AND i.item_id IS NOT NULL
     AND COALESCE(public.inventory_unit_cost(i.item_id, _loc),0) > 0;

  SELECT COALESCE(SUM(i.qty * COALESCE(NULLIF(i.unit_cost,0), 0)),0)
    INTO _cogs_amt FROM pos_sale_items i WHERE i.sale_id = _sale_id;
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

  FOR li IN SELECT * FROM pos_sale_items WHERE sale_id = _sale_id AND item_id IS NOT NULL LOOP
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
END $$;

-- Transfers resolve cost through the same valuation service
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
    _cost := COALESCE(NULLIF(l.unit_cost,0), public.inventory_unit_cost(l.item_id, t.from_location_id));
    IF COALESCE(l.unit_cost,0) = 0 AND COALESCE(_cost,0) > 0 THEN
      UPDATE public.inventory_transfer_items SET unit_cost = _cost WHERE id = l.id;
    END IF;
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost, total_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, t.from_location_id, 'transfer_out', l.quantity, _cost, ROUND(COALESCE(_cost,0)*l.quantity,2),
      COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date, 'transfer', t.id, auth.uid(), 'Dispatch');
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost, total_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, _transit, 'transfer_in', l.quantity, _cost, ROUND(COALESCE(_cost,0)*l.quantity,2),
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
    _cost := COALESCE(NULLIF(l.unit_cost,0), public.inventory_unit_cost(l.item_id, t.from_location_id));
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost, total_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, _transit, 'transfer_out', _qty, _cost, ROUND(COALESCE(_cost,0)*_qty,2),
      COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE, 'transfer', t.id, auth.uid(), 'Out of transit');
    INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost, total_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES (t.user_id, l.item_id, t.to_location_id, 'transfer_in', _qty, _cost, ROUND(COALESCE(_cost,0)*_qty,2),
      COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE, 'transfer', t.id, auth.uid(), 'Received');
    UPDATE public.inventory_transfer_items SET qty_received = _qty WHERE id = l.id;
  END LOOP;

  UPDATE public.inventory_transfers
     SET status = 'completed', received_at = now(), received_by = auth.uid(), updated_at = now()
   WHERE id = t.id;
  RETURN jsonb_build_object('ok', true, 'status', 'completed');
END $$;