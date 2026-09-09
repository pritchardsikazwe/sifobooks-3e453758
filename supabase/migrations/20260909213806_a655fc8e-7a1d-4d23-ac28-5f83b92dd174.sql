REVOKE ALL ON FUNCTION public.pos_checkout(jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_integrity_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_checkout(jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_integrity_report() TO authenticated;