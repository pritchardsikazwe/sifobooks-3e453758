-- Cashier PIN material must never be selectable by ordinary sessions.
-- Column-level REVOKE keeps every other field readable under the existing RLS
-- policies, while pin / pin_hash stay reachable only to SECURITY DEFINER
-- functions (set_cashier_pin, verify_cashier_pin, approve_pos_pin_reset, ...)
-- and service_role.
REVOKE SELECT (pin, pin_hash) ON public.employee_pos_permissions FROM authenticated;
REVOKE SELECT (pin, pin_hash) ON public.employee_pos_permissions FROM anon;
REVOKE UPDATE (pin, pin_hash) ON public.employee_pos_permissions FROM authenticated;
REVOKE UPDATE (pin, pin_hash) ON public.employee_pos_permissions FROM anon;