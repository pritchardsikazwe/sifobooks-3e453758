-- SifoBooks Smart Reconciliation Centre
-- Extends the existing stock-count workflow. No live balances are overwritten.

ALTER TABLE public.stock_counts
  ADD COLUMN IF NOT EXISTS session_name text,
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS recount_of_count_id uuid REFERENCES public.stock_counts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.stock_count_lines
  ADD COLUMN IF NOT EXISTS counted_at timestamptz,
  ADD COLUMN IF NOT EXISTS counted_by uuid,
  ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stock_counts_workflow_status
  ON public.stock_counts(user_id, workflow_status, count_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_session_item
  ON public.stock_count_lines(count_id, item_id);

-- Keep the existing status values used by the legacy Stock Takes page while
-- giving Smart Reconciliation a richer workflow state machine.
UPDATE public.stock_counts
SET workflow_status = CASE
  WHEN status = 'posted' THEN 'COMPLETED'
  WHEN status = 'approved' THEN 'APPROVED'
  WHEN status = 'counted' THEN 'SUBMITTED'
  WHEN status = 'rejected' THEN 'REJECTED'
  ELSE 'DRAFT'
END
WHERE workflow_status IS NULL OR workflow_status = 'DRAFT';

CREATE OR REPLACE FUNCTION public.smart_reconciliation_start(
  _location_id uuid,
  _count_date date,
  _session_name text,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count_id uuid;
  _number text;
  _b record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.transfer_can_manage(_uid) THEN RAISE EXCEPTION 'Not authorised to start a smart reconciliation'; END IF;
  IF _location_id IS NULL THEN RAISE EXCEPTION 'Location is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.inventory_locations WHERE id = _location_id AND user_id = _uid AND is_active) THEN
    RAISE EXCEPTION 'Location is not available to this company';
  END IF;

  _number := public.next_doc_number(_uid, 'CNT');
  INSERT INTO public.stock_counts
    (user_id, count_number, count_date, location_id, notes, counted_by, session_name, workflow_status, status)
  VALUES
    (_uid, _number, _count_date, _location_id, _notes, _uid, NULLIF(trim(_session_name), ''), 'DRAFT', 'draft')
  RETURNING id INTO _count_id;

  -- Snapshot the current ledger-backed balance only. Starting a count does not
  -- post or alter inventory. Expected quantities are frozen for investigation.
  FOR _b IN
    SELECT sb.item_id, sb.quantity
    FROM public.stock_balances sb
    JOIN public.stock_items si ON si.id = sb.item_id AND si.user_id = _uid
    WHERE sb.user_id = _uid AND sb.location_id = _location_id
  LOOP
    INSERT INTO public.stock_count_lines
      (user_id, count_id, item_id, location_id, expected_qty)
    VALUES
      (_uid, _count_id, _b.item_id, _location_id, COALESCE(_b.quantity, 0));
  END LOOP;

  RETURN _count_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_reconciliation_submit(_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _c public.stock_counts;
  _counted integer;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Reconciliation session not found'; END IF;
  IF _c.user_id <> auth.uid() AND NOT public.transfer_can_manage(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _c.workflow_status NOT IN ('DRAFT','REJECTED') THEN RAISE EXCEPTION 'Session is not ready for submission'; END IF;

  SELECT count(*) INTO _counted FROM public.stock_count_lines WHERE count_id = _count_id AND counted_qty IS NOT NULL;
  IF _counted = 0 THEN RAISE EXCEPTION 'Count at least one product before submitting'; END IF;

  UPDATE public.stock_counts
  SET workflow_status = 'SUBMITTED', status = 'counted', submitted_at = now(), reviewed_at = NULL,
      reviewer_id = NULL, rejected_by = NULL, rejected_at = NULL, rejection_reason = NULL, updated_at = now()
  WHERE id = _count_id;

  RETURN jsonb_build_object('ok', true, 'counted_products', _counted);
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_reconciliation_review(_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _c public.stock_counts;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Reconciliation session not found'; END IF;
  IF NOT public.transfer_can_manage(auth.uid()) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  IF _c.workflow_status <> 'SUBMITTED' THEN RAISE EXCEPTION 'Only submitted sessions can enter review'; END IF;
  UPDATE public.stock_counts SET workflow_status='UNDER REVIEW', reviewer_id=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_count_id;
  RETURN jsonb_build_object('ok', true, 'status', 'UNDER REVIEW');
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_reconciliation_approve(_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _c public.stock_counts;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Reconciliation session not found'; END IF;
  IF NOT public.transfer_can_manage(auth.uid()) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  IF _c.counted_by = auth.uid() THEN RAISE EXCEPTION 'The counter cannot approve their own reconciliation'; END IF;
  IF _c.workflow_status NOT IN ('SUBMITTED','UNDER REVIEW') THEN RAISE EXCEPTION 'Session is not awaiting approval'; END IF;

  UPDATE public.stock_counts
  SET workflow_status='APPROVED', status='approved', approved_by=auth.uid(), approved_at=now(), updated_at=now()
  WHERE id=_count_id;

  RETURN jsonb_build_object('ok', true, 'status', 'APPROVED');
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_reconciliation_reject(_count_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _c public.stock_counts;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Reconciliation session not found'; END IF;
  IF NOT public.transfer_can_manage(auth.uid()) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  IF _c.workflow_status NOT IN ('SUBMITTED','UNDER REVIEW') THEN RAISE EXCEPTION 'Session is not awaiting review'; END IF;

  UPDATE public.stock_counts
  SET workflow_status='REJECTED', status='rejected', rejected_by=auth.uid(), rejected_at=now(),
      rejection_reason=NULLIF(trim(_reason), ''), updated_at=now()
  WHERE id=_count_id;

  RETURN jsonb_build_object('ok', true, 'status', 'REJECTED');
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_reconciliation_request_recount(_count_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _c public.stock_counts;
  _new uuid;
  _number text;
  _l record;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Reconciliation session not found'; END IF;
  IF NOT public.transfer_can_manage(auth.uid()) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  IF _c.workflow_status NOT IN ('SUBMITTED','UNDER REVIEW') THEN RAISE EXCEPTION 'Session is not awaiting recount'; END IF;

  _number := public.next_doc_number(_c.user_id, 'CNT');
  INSERT INTO public.stock_counts
    (user_id, count_number, count_date, location_id, notes, counted_by, session_name, workflow_status, status, recount_of_count_id)
  VALUES
    (_c.user_id, _number, CURRENT_DATE, _c.location_id,
     'Recount requested for ' || COALESCE(_c.count_number, _c.id::text), auth.uid(),
     COALESCE(_c.session_name, 'Recount'), 'DRAFT', 'draft', _c.id)
  RETURNING id INTO _new;

  FOR _l IN SELECT item_id, location_id, expected_qty FROM public.stock_count_lines WHERE count_id=_count_id LOOP
    INSERT INTO public.stock_count_lines
      (user_id, count_id, item_id, location_id, expected_qty)
    VALUES
      (_c.user_id, _new, _l.item_id, COALESCE(_l.location_id, _c.location_id), _l.expected_qty);
  END LOOP;

  RETURN _new;
END;
$$;

-- Strengthen the existing posting RPC so only an approved reconciliation can
-- create the existing auditable stock adjustment movements.
CREATE OR REPLACE FUNCTION public.post_stock_count(_count_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.stock_counts; _l record; _applied int := 0; _cost numeric;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Stock count not found'; END IF;
  IF NOT public.transfer_can_manage(_c.user_id) THEN RAISE EXCEPTION 'Not authorised to post stock counts'; END IF;
  IF _c.status = 'posted' OR _c.workflow_status = 'COMPLETED' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Already posted');
  END IF;
  IF _c.status <> 'approved' OR _c.workflow_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Stock count must be approved before posting';
  END IF;

  FOR _l IN SELECT * FROM public.stock_count_lines WHERE count_id = _count_id AND counted_qty IS NOT NULL LOOP
    IF COALESCE(_l.variance, _l.counted_qty - _l.expected_qty) <> 0 THEN
      SELECT COALESCE(cost_price, 0) INTO _cost FROM public.stock_items WHERE id = _l.item_id;
      INSERT INTO public.stock_movements
        (user_id, item_id, location_id, movement_type, quantity, unit_cost, reference, transaction_date, source_type, source_id, created_by, note)
      VALUES
        (_c.user_id, _l.item_id, COALESCE(_l.location_id, _c.location_id),
         CASE WHEN COALESCE(_l.variance, _l.counted_qty - _l.expected_qty) > 0 THEN 'adjust_in' ELSE 'adjust_out' END,
         abs(COALESCE(_l.variance, _l.counted_qty - _l.expected_qty)), _cost,
         COALESCE(_c.count_number, 'COUNT'), _c.count_date, 'stock_count', _c.id, auth.uid(), COALESCE(_l.reason_code, 'count_variance'));

      INSERT INTO public.stock_adjustments
        (user_id, adjustment_number, adjustment_date, item_id, location_id, adjustment_type, quantity_before, quantity_after, reason, reason_code, source_count_id)
      VALUES
        (_c.user_id, public.next_doc_number(_c.user_id, 'ADJ'), _c.count_date, _l.item_id,
         COALESCE(_l.location_id, _c.location_id), 'count', _l.expected_qty, _l.counted_qty,
         'Smart reconciliation variance', COALESCE(_l.reason_code, 'count_variance'), _c.id);
      _applied := _applied + 1;
    END IF;
  END LOOP;

  UPDATE public.stock_counts
  SET status='posted', workflow_status='COMPLETED', posted_at=now(), completed_at=now(), updated_at=now()
  WHERE id=_count_id;

  RETURN jsonb_build_object('ok', true, 'lines_applied', _applied);
END;
$$;

REVOKE ALL ON FUNCTION public.smart_reconciliation_start(uuid,date,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smart_reconciliation_submit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smart_reconciliation_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smart_reconciliation_approve(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smart_reconciliation_reject(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smart_reconciliation_request_recount(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_start(uuid,date,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_submit(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_review(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_approve(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_reject(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_request_recount(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.post_stock_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_stock_count(uuid) TO authenticated, service_role;
