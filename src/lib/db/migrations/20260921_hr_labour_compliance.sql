-- SifoBooks HR & Labour Compliance Foundation
-- SQLite/Windows runtime version. Cloud PostgreSQL has its own migration path.
-- Additive only: employment records, contract templates, labour-law controls and compliance tasks.

CREATE TABLE IF NOT EXISTS hr_contract_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  template_code TEXT NOT NULL,
  template_name TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'permanent',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  body TEXT NOT NULL,
  effective_from TEXT,
  effective_to TEXT,
  created_by TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, template_code, version)
);

CREATE TABLE IF NOT EXISTS hr_employee_contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  employee_id TEXT NOT NULL,
  template_id TEXT,
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'permanent',
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  signed_employee_at TEXT,
  signed_employer_at TEXT,
  attestation_status TEXT NOT NULL DEFAULT 'not_submitted',
  attestation_reference TEXT,
  attested_at TEXT,
  termination_date TEXT,
  termination_reason TEXT,
  document_text TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, contract_number)
);

CREATE TABLE IF NOT EXISTS hr_labour_compliance (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  requirement_code TEXT NOT NULL,
  requirement_name TEXT NOT NULL,
  authority TEXT NOT NULL DEFAULT 'MLSS',
  legal_reference TEXT,
  frequency TEXT NOT NULL DEFAULT 'annual',
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  owner_user_id TEXT,
  evidence_note TEXT,
  last_checked_at TEXT,
  next_review_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, requirement_code)
);

CREATE TABLE IF NOT EXISTS hr_employee_compliance (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  employee_id TEXT NOT NULL,
  requirement_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing',
  due_date TEXT,
  evidence_reference TEXT,
  notes TEXT,
  checked_at TEXT,
  checked_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employee_id, requirement_code)
);

CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON hr_employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_status ON hr_employee_contracts(status, attestation_status);
CREATE INDEX IF NOT EXISTS idx_hr_labour_compliance_due ON hr_labour_compliance(due_date, status);
CREATE INDEX IF NOT EXISTS idx_hr_employee_compliance_status ON hr_employee_compliance(employee_id, status);
