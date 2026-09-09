-- Extend the existing company workspace configuration without creating a
-- second company/tenant model. Legacy values remain valid for existing data.

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_workspace_mode_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_workspace_mode_check
  CHECK (workspace_mode IS NULL OR workspace_mode IN (
    'general_pos',
    'restaurant',
    'accounting',
    'pos_accounting',
    'retail_basic_accounting',
    'retail_full_accounting',
    'hotel',
    'ngo_donor'
  ));

-- Keep existing companies on their current configuration. New companies can
-- choose any of the extended modes through the existing workspace switcher.
COMMENT ON COLUMN public.companies.workspace_mode IS
  'Business workspace configuration. Legacy modes remain supported; extended modes include retail_basic_accounting, retail_full_accounting, hotel and ngo_donor.';
