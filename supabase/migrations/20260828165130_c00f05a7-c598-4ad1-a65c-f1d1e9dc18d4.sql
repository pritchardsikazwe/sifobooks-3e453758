ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS workspace_mode text NOT NULL DEFAULT 'accounting';

UPDATE public.companies
SET workspace_mode = CASE
  WHEN industry ILIKE '%restaurant%' OR industry ILIKE '%hospitality%' THEN 'restaurant'
  WHEN industry ILIKE '%retail%' OR industry ILIKE '%wholesale%' THEN 'general_pos'
  ELSE 'accounting'
END
WHERE workspace_mode = 'accounting';