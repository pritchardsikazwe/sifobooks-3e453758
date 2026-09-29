-- Employee 360 (active HR workflow): contracts and document vault.
-- Mirrors the existing Windows definitions; owned per user like employees.
CREATE TABLE IF NOT EXISTS public.hr_employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id uuid,
  contract_number text NOT NULL,
  contract_type text NOT NULL DEFAULT 'permanent',
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  signed_employee_at timestamptz,
  signed_employer_at timestamptz,
  attestation_status text NOT NULL DEFAULT 'not_submitted',
  attestation_reference text,
  attested_at timestamptz,
  termination_date date,
  termination_reason text,
  document_text text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contract_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_employee_contracts TO authenticated;
GRANT ALL ON public.hr_employee_contracts TO service_role;
ALTER TABLE public.hr_employee_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hr contracts" ON public.hr_employee_contracts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON public.hr_employee_contracts(employee_id);

CREATE TABLE IF NOT EXISTS public.hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  document_url text,
  document_text text,
  issue_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'active',
  uploaded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_documents TO authenticated;
GRANT ALL ON public.hr_documents TO service_role;
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hr documents" ON public.hr_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON public.hr_documents(employee_id, expiry_date);