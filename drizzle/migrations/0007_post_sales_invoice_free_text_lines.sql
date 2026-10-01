-- Free-text invoice lines (no product) must not read an unset product record.
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
  _lines jsonb := '[]'::jsonb; l jsonb;  _desc text;
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
    _tracks := false; _cost := 0; _loc := NULL; _desc := NULLIF(btrim(COALESCE(it->>'description','')),'');
    IF NULLIF(it->>'stock_item_id','') IS NOT NULL THEN
      SELECT * INTO _item FROM public.stock_items WHERE id = (it->>'stock_item_id')::uuid AND user_id = _uid;
      IF _item IS NULL THEN RAISE EXCEPTION 'UNKNOWN_ITEM'; END IF;
      _tracks := public.item_tracks_stock(_item.item_type); _desc := COALESCE(_desc, _item.name);
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
      'description', COALESCE(_desc, 'Item'),
      'qty', _qty, 'price', _price, 'rate', _rate, 'line', _net, 'tracks', _tracks, 'loc', _loc, 'cost', _cost);
  END LOOP;
  _subtotal := ROUND(_subtotal,2); _tax := ROUND(_tax,2); _total := _subtotal + _tax;

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