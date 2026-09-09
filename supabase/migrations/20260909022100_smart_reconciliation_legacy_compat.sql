-- Preserve the existing Stock Takes UI while enforcing the Smart Reconciliation workflow.
-- This is a compatibility migration; it does not rewrite live stock.

CREATE OR REPLACE FUNCTION public.approve_stock_count(_count_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.stock_counts;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Stock count not found'; END IF;
  IF NOT public.transfer_can_manage(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _c.counted_by = auth.uid() THEN RAISE EXCEPTION 'The counter cannot approve their own stock count'; END IF;
  IF _c.status NOT IN ('counted','draft') AND _c.workflow_status NOT IN ('SUBMITTED','UNDER REVIEW') THEN
    RAISE EXCEPTION 'Stock count is not ready for approval';
  END IF;
  UPDATE public.stock_counts
  SET status='approved', workflow_status='APPROVED', approved_by=auth.uid(), approved_at=now(), updated_at=now()
  WHERE id = _count_id;
  RETURN jsonb_build_object('ok', true, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_reconciliation_reject(_count_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.stock_counts;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id FOR UPDATE;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Reconciliation session not found'; END IF;
  IF NOT public.transfer_can_manage(auth.uid()) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  IF _c.workflow_status NOT IN ('SUBMITTED','UNDER REVIEW') THEN RAISE EXCEPTION 'Session is not awaiting review'; END IF;
  UPDATE public.stock_counts
  SET workflow_status='REJECTED', status='draft', rejected_by=auth.uid(), rejected_at=now(),
      rejection_reason=NULLIF(trim(_reason), ''), updated_at=now()
  WHERE id=_count_id;
  RETURN jsonb_build_object('ok', true, 'status', 'REJECTED');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_stock_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_count(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.smart_reconciliation_reject(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_reject(uuid,text) TO authenticated, service_role;
