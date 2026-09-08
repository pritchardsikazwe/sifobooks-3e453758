CREATE OR REPLACE FUNCTION public.sync_pos_sale(_sale jsonb, _items jsonb DEFAULT '[]'::jsonb, _payments jsonb DEFAULT '[]'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ref text := _sale->>'client_ref';
  _id uuid;
  _je uuid;
  it jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _ref IS NULL OR _ref = '' THEN RAISE EXCEPTION 'client_ref required'; END IF;

  SELECT id, journal_entry_id INTO _id, _je FROM pos_sales WHERE user_id = _uid AND client_ref = _ref;

  IF _id IS NULL THEN
    INSERT INTO pos_sales(user_id, sale_no, client_ref, shift_id, register_id, customer_id, customer_name,
      price_level, status, subtotal, discount, tax, total, paid, change_due, cost_total, note, sold_at)
    VALUES (_uid, _sale->>'sale_no', _ref,
      NULLIF(_sale->>'shift_id','')::uuid, NULLIF(_sale->>'register_id','')::uuid, NULLIF(_sale->>'customer_id','')::uuid,
      COALESCE(NULLIF(_sale->>'customer_name',''),'Walk-in Customer'),
      COALESCE(NULLIF(_sale->>'price_level',''),'retail'), 'completed',
      COALESCE((_sale->>'subtotal')::numeric,0), COALESCE((_sale->>'discount')::numeric,0),
      COALESCE((_sale->>'tax')::numeric,0), COALESCE((_sale->>'total')::numeric,0),
      COALESCE((_sale->>'paid')::numeric,0), COALESCE((_sale->>'change_due')::numeric,0),
      COALESCE((_sale->>'cost_total')::numeric,0), _sale->>'note',
      COALESCE((_sale->>'sold_at')::timestamptz, now()))
    RETURNING id INTO _id;
  ELSIF _je IS NOT NULL THEN
    RETURN _id; -- already fully synced
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pos_sale_items WHERE sale_id = _id) THEN
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) LOOP
      INSERT INTO pos_sale_items(user_id, sale_id, item_id, name, sku, qty, price, unit_cost, discount, tax_rate, line_total, note)
      VALUES (_uid, _id, NULLIF(it->>'item_id','')::uuid, COALESCE(it->>'name','Item'), it->>'sku',
        COALESCE((it->>'qty')::numeric,0), COALESCE((it->>'price')::numeric,0), COALESCE((it->>'unit_cost')::numeric,0),
        COALESCE((it->>'discount')::numeric,0), COALESCE((it->>'tax_rate')::numeric,0),
        COALESCE((it->>'line_total')::numeric,0), it->>'note');
    END LOOP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pos_payments WHERE sale_id = _id) THEN
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_payments,'[]'::jsonb)) LOOP
      INSERT INTO pos_payments(user_id, sale_id, method, amount, reference)
      VALUES (_uid, _id, COALESCE(it->>'method','cash'), COALESCE((it->>'amount')::numeric,0), it->>'reference');
    END LOOP;
  END IF;

  PERFORM complete_pos_sale(_id);
  RETURN _id;
END $$;

GRANT EXECUTE ON FUNCTION public.sync_pos_sale(jsonb, jsonb, jsonb) TO authenticated;