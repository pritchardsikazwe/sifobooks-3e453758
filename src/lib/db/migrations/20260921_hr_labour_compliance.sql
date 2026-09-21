-- SifoBooks HR & Labour Compliance Foundation
-- Additive only: employment records, contract templates, labour-law controls and compliance tasks.

CREATE TABLE IF NOT EXISTS hr_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  template_code text NOT NULL,
  template_name text NOT NULL,
  employment_type text NOT NULL DEFAULT 'permanent',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  body text NOT NULL,
  effective_from date,
  effective_to date,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, template_code, version)
);

CREATE TABLE IF NOT EXISTS hr_employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  template_id uuid REFERENCES hr_contract_templates(id) ON DELETE SET NULL,
  contract_number text NOT NULL,
  contract_type text NOT NULL DEFAULT 'permanent',
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  signed_employee_at timestamptz,
  signed_employer_at timestamptz,
  attestation_status text NOT NULL DEFAULT 'not_submitted',
  attestation_reference text,
  attested_at date,
  termination_date date,
  termination_reason text,
  document_text text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, contract_number)
);

CREATE TABLE IF NOT EXISTS hr_labour_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  requirement_code text NOT NULL,
  requirement_name text NOT NULL,
  authority text NOT NULL DEFAULT 'MLSS',
  legal_reference text,
  frequency text NOT NULL DEFAULT 'annual',
  due_date date,
  status text NOT NULL DEFAULT 'open',
  owner_user_id uuid,
  evidence_note text,
  last_checked_at timestamptz,
  next_review_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, requirement_code)
);

CREATE TABLE IF NOT EXISTS hr_employee_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requirement_code text NOT NULL,
  status text NOT NULL DEFAULT 'missing',
  due_date date,
  evidence_reference text,
  notes text,
  checked_at timestamptz,
  checked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, requirement_code)
);

CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON hr_employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_status ON hr_employee_contracts(status, attestation_status);
CREATE INDEX IF NOT EXISTS idx_hr_labour_compliance_due ON hr_labour_compliance(due_date, status);
CREATE INDEX IF NOT EXISTS idx_hr_employee_compliance_status ON hr_employee_compliance(employee_id, status);

-- Keep an audit trail for changes to labour compliance records where the audit table exists.
DO $$
BEGIN
  IF to_regclass('audit_event_log') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_event_hr ON audit_event_log(entity_type, entity_id)';
  END IF;
END $$;
