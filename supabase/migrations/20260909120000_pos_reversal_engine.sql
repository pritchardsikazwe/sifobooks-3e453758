-- POS reversal engine
-- Atomic void/refund posting with duplicate protection and audit trail.

CREATE TABLE IF NOT EXISTS public.pos_reversal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_sale_id uuid NOT NULL REFERENCES public.pos_sales(id),
  reversal_sale_id uuid REFERENCES public.pos_sales(id),
  action text NOT NULL CHECK (action IN ('void','refund')),
  reason text NOT NULL,
  refund_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (original_sale_id, action)
);

ALTER TABLE public.pos_reversal_actions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.pos_reversal_actions TO authenticated;
GRANT ALL ON public.pos_reversal_actions TO service_role;

CREATE POLICY pos_reversal_select ON public.pos_reversal_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_perm('pos.sales.view_all', user_id));

CREATE OR REPLACE FUNCTION public.reverse_pos_sale(
  _sale_id uuid,
  _action text,
  _reason text,
  _refund_method text DEFAULT 'cash'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  s record;
  r record;
  li record;
  _uid uuid;
  _rid uuid;
  _ref text;
  _existing uuid;
  _method text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _action NOT IN ('void','refund') THEN RAISE EXCEPTION 'Invalid reversal action'; END IF;
  IF nullif(trim(coalesce(_reason,'')), '') IS NULL THEN RAISE EXCEPTION 'A reversal reason is required'; END IF;

  SELECT * INTO s FROM public.pos_sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  _uid := s.user_id;

  IF NOT (public.has_perm(CASE WHEN _action='void' THEN 'pos.void' ELSE 'pos.refund' END, _uid)
          OR public.has_override(CASE WHEN _action='void' THEN 'pos.void' ELSE 'pos.refund' END, _sale_id)) THEN
    RAISE EXCEPTION 'Manager authorisation required';
  END IF;

  IF s.status <> 'completed' THEN
    RAISE EXCEPTION 'Only a completed sale can be reversed';
  END IF;

  SELECT reversal_sale_id INTO _existing
    FROM public.pos_reversal_actions
   WHERE original_sale_id = _sale_id AND action = _action;
  IF _existing IS NOT NULL THEN RETURN _existing; END IF;

  _method := lower(coalesce(nullif(trim(_refund_method),''),'cash'));
  IF _action = 'refund' AND _method NOT IN ('cash','card','mobile money','momo','bank','credit') THEN
    RAISE EXCEPTION 'Unsupported refund payment method';
  END IF;

  _ref := CASE WHEN _action='refund' THEN 'RF-' ELSE 'RV-' END || coalesce(s.sale_no, substr(_sale_id::text,1,8));

  INSERT INTO public.pos_sales(
    user_id, sale_no, client_ref, status, refund_of, customer_id, customer_name,
    price_level, subtotal, discount, tax, total, paid, change_due, cost_total,
    note, sold_at, created_by, branch_id, shift_id, register_id
  ) VALUES (
    _uid, _ref, 'posreversal:' || _action || ':' || _sale_id::text,
    'draft', CASE WHEN _action='refund' THEN _sale_id ELSE NULL END,
    s.customer_id, s.customer_name, s.price_level,
    -coalesce(s.subtotal,0), -coalesce(s.discount,0), -coalesce(s.tax,0),
    -coalesce(s.total,0), -coalesce(s.paid,0), 0, -coalesce(s.cost_total,0),
    _action || ': ' || trim(_reason), now(), auth.uid(), s.branch_id, s.shift_id, s.register_id
  ) RETURNING id INTO _rid;

  FOR li IN SELECT * FROM public.pos_sale_items WHERE sale_id = _sale_id LOOP
    INSERT INTO public.pos_sale_items(
      user_id, sale_id, item_id, name, sku, qty, price, unit_cost, discount,
      tax_rate, line_total, note
    ) VALUES (
      _uid, _rid, li.item_id, li.name, li.sku, -coalesce(li.qty,0),
      coalesce(li.price,0), coalesce(li.unit_cost,0), -coalesce(li.discount,0),
      coalesce(li.tax_rate,0), -coalesce(li.line_total,0), _action || ': reversal'
    );
  END LOOP;

  IF _action = 'refund' THEN
    INSERT INTO public.pos_payments(user_id, sale_id, method, amount, reference)
    VALUES (_uid, _rid, _method, -coalesce(s.total,0), 'Refund of ' || coalesce(s.sale_no, _sale_id::text));
  ELSE
    -- A void reverses the original tender without creating a customer-facing refund.
    FOR r IN SELECT method, sum(amount) AS amount FROM public.pos_payments WHERE sale_id = _sale_id GROUP BY method LOOP
      INSERT INTO public.pos_payments(user_id, sale_id, method, amount, reference)
      VALUES (_uid, _rid, r.method, -coalesce(r.amount,0), 'Void of ' || coalesce(s.sale_no, _sale_id::text));
    END LOOP;
  END IF;

  PERFORM public.complete_pos_sale(_rid);

  UPDATE public.pos_sales
     SET status = CASE WHEN _action='refund' THEN 'refunded' ELSE 'voided' END,
         void_reason = CASE WHEN _action='void' THEN trim(_reason) ELSE void_reason END,
         updated_at = now()
   WHERE id = _sale_id;

  INSERT INTO public.pos_reversal_actions(user_id, original_sale_id, reversal_sale_id, action, reason, refund_method)
  VALUES (auth.uid(), _sale_id, _rid, _action, trim(_reason), CASE WHEN _action='refund' THEN _method ELSE NULL END);

  RETURN _rid;
EXCEPTION
  WHEN unique_violation THEN
    SELECT reversal_sale_id INTO _existing FROM public.pos_reversal_actions
     WHERE original_sale_id = _sale_id AND action = _action;
    IF _existing IS NOT NULL THEN RETURN _existing; END IF;
    RAISE;
END $function$;

REVOKE EXECUTE ON FUNCTION public.reverse_pos_sale(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_pos_sale(uuid,text,text,text) TO authenticated, service_role;
