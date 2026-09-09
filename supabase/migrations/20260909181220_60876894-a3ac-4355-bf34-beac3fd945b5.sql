UPDATE public.employee_pos_permissions SET pin = NULL WHERE pin IS NOT NULL;
REVOKE SELECT (pin, pin_hash) ON public.employee_pos_permissions FROM authenticated;
REVOKE SELECT (pin, pin_hash) ON public.employee_pos_permissions FROM anon;
REVOKE INSERT (pin, pin_hash), UPDATE (pin, pin_hash) ON public.employee_pos_permissions FROM authenticated;
REVOKE INSERT (pin, pin_hash), UPDATE (pin, pin_hash) ON public.employee_pos_permissions FROM anon;
GRANT ALL ON public.employee_pos_permissions TO service_role;