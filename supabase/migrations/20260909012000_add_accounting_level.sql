-- SifoBooks accounting-level configuration.
-- Non-destructive: existing companies default to the full accounting engine.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS accounting_level text NOT NULL DEFAULT 'full';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_accounting_level_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_accounting_level_check
      CHECK (accounting_level IN ('starter', 'standard', 'full'));
  END IF;
END $$;

COMMENT ON COLUMN public.companies.accounting_level IS
  'Controls the accounting workspace depth. starter, standard, or full; never deletes accounting data.';
