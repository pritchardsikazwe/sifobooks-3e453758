ALTER TABLE public.employee_pos_permissions ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS idx_epp_email ON public.employee_pos_permissions (lower(email));