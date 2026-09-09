CREATE OR REPLACE FUNCTION public.complete_pos_sale(_sale_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record; li record; p record;
  _entry uuid; _ref text; _uid uuid; _loc uuid; _worker uuid;
  _sales uuid; _vat uuid; _cogs uuid; _inv uuid; _ar uuid; _acct uuid;
  _cogs_amt numeric := 0; _net numeric := 0; _paytotal numeric := 0;
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
            _loc, s.sold_at::date, 'pos_sale', _sale_id, _worker);
  END LOOP;

  UPDATE pos_sales
    SET status='completed', journal_entry_id=_entry, cost_total=_cogs_amt, location_id=_loc, updated_at=now()
    WHERE id=_sale_id;

  RETURN _entry;
END $$;