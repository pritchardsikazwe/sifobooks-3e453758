ALTER TABLE public.stock_counts
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS counted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.stock_count_lines
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason_code text;

ALTER TABLE public.stock_adjustments
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS source_count_id uuid REFERENCES public.stock_counts(id) ON DELETE SET NULL;

-- ---------- document numbering ----------
CREATE OR REPLACE FUNCTION public.next_doc_number(_uid uuid, _prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seq int; _yr text := to_char(now(), 'YYYY');
BEGIN
  IF _prefix = 'TRF' THEN
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
END; $$;

-- ---------- location aware stock count posting ----------
CREATE OR REPLACE FUNCTION public.post_stock_count(_count_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.stock_counts; _l record; _applied int := 0; _cost numeric;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Stock count not found'; END IF;
  IF NOT public.transfer_can_manage(_c.user_id) THEN RAISE EXCEPTION 'Not authorised to post stock counts'; END IF;
  IF _c.status = 'posted' THEN RETURN jsonb_build_object('ok', false, 'message', 'Already posted'); END IF;

  FOR _l IN SELECT * FROM public.stock_count_lines WHERE count_id = _count_id AND counted_qty IS NOT NULL LOOP
    IF _l.variance <> 0 THEN
      SELECT coalesce(cost_price, 0) INTO _cost FROM public.stock_items WHERE id = _l.item_id;
      INSERT INTO public.stock_movements (user_id, item_id, location_id, movement_type, quantity, unit_cost,
        reference, transaction_date, source_type, source_id, created_by, note)
      VALUES (_c.user_id, _l.item_id, COALESCE(_l.location_id, _c.location_id),
        CASE WHEN _l.variance > 0 THEN 'adjust_in' ELSE 'adjust_out' END,
        abs(_l.variance), _cost, coalesce(_c.count_number, 'COUNT'), _c.count_date, 'stock_count', _c.id,
        auth.uid(), coalesce(_l.reason_code, 'count_variance'));

      INSERT INTO public.stock_adjustments (user_id, adjustment_number, adjustment_date, item_id, location_id,
        adjustment_type, quantity_before, quantity_after, reason, reason_code, source_count_id)
      VALUES (_c.user_id, public.next_doc_number(_c.user_id, 'ADJ'), _c.count_date, _l.item_id,
        COALESCE(_l.location_id, _c.location_id), 'count', _l.expected_qty, _l.counted_qty,
        'Stock count variance', coalesce(_l.reason_code, 'count_variance'), _c.id);
      _applied := _applied + 1;
    END IF;
  END LOOP;

  UPDATE public.stock_counts SET status = 'posted', posted_at = now(), updated_at = now() WHERE id = _count_id;
  RETURN jsonb_build_object('ok', true, 'lines_applied', _applied);
END; $$;

CREATE OR REPLACE FUNCTION public.approve_stock_count(_count_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.stock_counts;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Stock count not found'; END IF;
  IF NOT public.transfer_can_manage(_c.user_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  UPDATE public.stock_counts SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
    updated_at = now() WHERE id = _count_id;
  RETURN jsonb_build_object('ok', true, 'status', 'approved');
END; $$;

-- ---------- MKP 31 August 2026 stock take ----------
DO $mkp$
DECLARE _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75'; _wh uuid; _cnt uuid; _b record;
BEGIN
  SELECT id INTO _wh FROM public.inventory_locations WHERE user_id = _uid AND upper(code) = 'MKP-WH';
  IF _wh IS NULL THEN RETURN; END IF;

  SELECT id INTO _cnt FROM public.stock_counts WHERE user_id = _uid AND count_number = 'MKP-CNT-2026-08-31';
  IF _cnt IS NULL THEN
    INSERT INTO public.stock_counts (user_id, count_number, count_date, location_id, status, notes)
    VALUES (_uid, 'MKP-CNT-2026-08-31', DATE '2026-08-31', _wh, 'counted',
            'Month-end physical stock take — 31 August 2026')
    RETURNING id INTO _cnt;

    FOR _b IN SELECT item_id, quantity FROM public.stock_balances WHERE user_id = _uid AND location_id = _wh LOOP
      INSERT INTO public.stock_count_lines (user_id, count_id, item_id, location_id, expected_qty, counted_qty)
      VALUES (_uid, _cnt, _b.item_id, _wh, _b.quantity, _b.quantity);
    END LOOP;
  END IF;
END $mkp$;