-- SifoBooks Government Integration & Statutory Compliance Hub
-- Additive/idempotent SQLite migration. No existing accounting records are altered.

CREATE TABLE IF NOT EXISTS government_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  provider_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'TEST',
  status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  endpoint TEXT,
  auth_type TEXT,
  credential_ref TEXT,
  last_connection_test TEXT,
  last_successful_submission TEXT,
  last_error TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id, provider_code, integration_type)
);

CREATE TABLE IF NOT EXISTS government_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  provider_code TEXT NOT NULL,
  document_type TEXT NOT NULL,
  period TEXT,
  source_type TEXT,
  source_id TEXT,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  reference_number TEXT,
  request_payload TEXT,
  response_payload TEXT,
  error_code TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(idempotency_key)
);

CREATE TABLE IF NOT EXISTS government_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  provider_code TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  calculation_method TEXT,
  rate REAL,
  threshold REAL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  source_reference TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id, provider_code, rule_code, effective_from)
);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  provider_code TEXT,
  document_type TEXT NOT NULL,
  period TEXT,
  reference_number TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  file_path TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS statutory_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  employee_id TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  member_number TEXT,
  registration_status TEXT NOT NULL DEFAULT 'PENDING',
  verified_at TEXT,
  last_checked_at TEXT,
  UNIQUE(user_id, company_id, employee_id, provider_code)
);

CREATE TABLE IF NOT EXISTS mineral_types (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  valuation_method TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, company_id, code)
);

CREATE TABLE IF NOT EXISTS mineral_sales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  mineral_type_id TEXT NOT NULL,
  customer_id TEXT,
  invoice_id TEXT,
  sale_date TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit TEXT,
  sale_value REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  sale_channel TEXT NOT NULL DEFAULT 'LOCAL',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mineral_royalty_calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  period TEXT NOT NULL,
  mineral_type_id TEXT,
  calculation_method TEXT NOT NULL,
  gross_value REAL NOT NULL DEFAULT 0,
  norm_value REAL NOT NULL DEFAULT 0,
  rate REAL NOT NULL DEFAULT 0,
  royalty_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  rule_reference TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS statutory_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  provider_code TEXT NOT NULL,
  obligation_type TEXT NOT NULL,
  period TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'UPCOMING',
  submission_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id, provider_code, obligation_type, period)
);

CREATE INDEX IF NOT EXISTS idx_gov_integrations_status ON government_integrations(user_id,status,provider_code);
CREATE INDEX IF NOT EXISTS idx_gov_submissions_queue ON government_submissions(user_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_statutory_tasks_due ON statutory_tasks(user_id,status,due_date);
CREATE INDEX IF NOT EXISTS idx_mineral_sales_period ON mineral_sales(user_id,company_id,sale_date);
CREATE INDEX IF NOT EXISTS idx_royalty_period ON mineral_royalty_calculations(user_id,company_id,period);
