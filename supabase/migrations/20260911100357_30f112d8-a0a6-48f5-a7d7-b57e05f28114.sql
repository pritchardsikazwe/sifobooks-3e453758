ALTER TABLE public.pos_shifts
  ADD COLUMN IF NOT EXISTS variance_reason text,
  ADD COLUMN IF NOT EXISTS cash_denominations jsonb;

DROP FUNCTION IF EXISTS public.submit_cashier_shift(uuid, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.submit_cashier_shift(
  _shift_id uuid,
  _actual_cash numeric,
  _reason text DEFAULT NULL,
  _denominations jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  s public.pos_shifts;
  expected numeric;
  _cash numeric := 0; _card numeric := 0; _momo numeric := 0; _other numeric := 0;
  _refunds numeric := 0; _var numeric;
BEGIN
  SELECT * INTO s FROM public.pos_shifts WHERE id = _shift_id;
  IF s.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Shift not found'); END IF;
  IF NOT (auth.uid() = s.user_id OR auth.uid() = s.created_by OR auth.uid() = s.cashier_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This is not your shift');
  END IF;
  IF s.review_status IN ('pending_review','approved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Shift already submitted');
  END IF;

  -- Totals are recomputed from the recorded sales and payments; figures sent
  -- by the terminal are never trusted for the cash-up.
  SELECT COALESCE(SUM(CASE WHEN lower(p.method) = 'cash' THEN p.amount END), 0),
         COALESCE(SUM(CASE WHEN lower(p.method) IN ('card','visa') THEN p.amount END), 0),
         COALESCE(SUM(CASE WHEN lower(p.method) IN ('momo','mobile money','mobile_money') THEN p.amount END), 0),
         COALESCE(SUM(CASE WHEN lower(p.method) NOT IN ('cash','card','visa','momo','mobile money','mobile_money') THEN p.amount END), 0)
    INTO _cash, _card, _momo, _other
    FROM public.pos_payments p
    JOIN public.pos_sales sa ON sa.id = p.sale_id
   WHERE sa.shift_id = _shift_id AND sa.status = 'completed';

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
    status = 'closed',
    closed_at = COALESCE(closed_at, now()),
    cash_sales = _cash,
    card_sales = _card,
    momo_sales = _momo,
    other_sales = _other,
    refunds_total = _refunds,
    expected_cash = expected,
    actual_cash = _actual_cash,
    variance = _var,
    variance_reason = NULLIF(btrim(COALESCE(_reason,'')), ''),
    cash_denominations = _denominations,
    submitted_at = now(),
    review_status = 'pending_review'
  WHERE id = _shift_id;

  PERFORM public.log_cashier_activity(s.user_id, 'shift.submitted', _shift_id,
    jsonb_build_object('expected', expected, 'actual', _actual_cash, 'variance', _var, 'reason', _reason));
  RETURN jsonb_build_object('ok', true, 'expected_cash', expected, 'variance', _var);
END $$;

REVOKE ALL ON FUNCTION public.submit_cashier_shift(uuid, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_cashier_shift(uuid, numeric, text, jsonb) TO authenticated;