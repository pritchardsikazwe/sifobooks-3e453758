-- Retail Control Center: secure, tenant-scoped operational summaries.
CREATE OR REPLACE FUNCTION public.retail_control_summary(_tenant uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  t uuid := COALESCE(_tenant, public.current_tenant());
  day_start timestamptz := date_trunc('day', now());
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_perm('reports.view', t) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT jsonb_build_object(
    'open_shifts', (SELECT count(*) FROM public.pos_shifts WHERE user_id=t AND status='open' AND public.branch_ok(branch_id)),
    'active_cashiers', (SELECT count(DISTINCT created_by) FROM public.pos_shifts WHERE user_id=t AND status='open' AND public.branch_ok(branch_id)),
    'today_sales', COALESCE((SELECT sum(total) FROM public.pos_sales WHERE user_id=t AND status='completed' AND sold_at >= day_start AND public.branch_ok(branch_id)),0),
    'today_refunds', abs(COALESCE((SELECT sum(total) FROM public.pos_sales WHERE user_id=t AND status='refunded' AND sold_at >= day_start AND public.branch_ok(branch_id)),0)),
    'today_voids', abs(COALESCE((SELECT sum(total) FROM public.pos_sales WHERE user_id=t AND status='voided' AND sold_at >= day_start AND public.branch_ok(branch_id)),0)),
    'today_discounts', COALESCE((SELECT sum(discount) FROM public.pos_sales WHERE user_id=t AND status='completed' AND sold_at >= day_start AND public.branch_ok(branch_id)),0)
  ) INTO result;

  RETURN result;
END $function$;

REVOKE EXECUTE ON FUNCTION public.retail_control_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retail_control_summary(uuid) TO authenticated, service_role;
