ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS payslip_header text,
  ADD COLUMN IF NOT EXISTS payslip_footer text;