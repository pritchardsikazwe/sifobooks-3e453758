-- SifoBooks Zambia compliance/accounting foundation
-- Idempotent migration: safe to run against existing SQLite installations.

CREATE TABLE IF NOT EXISTS tax_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  tax_type TEXT NOT NULL DEFAULT 'VAT',
  rate REAL NOT NULL DEFAULT 0,
  category TEXT,
  inclusive INTEGER NOT NULL DEFAULT 1,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  zra_tax_code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id, code, effective_from)
);

CREATE TABLE IF NOT EXISTS document_sequences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  document_type TEXT NOT NULL,
  prefix TEXT NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  padding INTEGER NOT NULL DEFAULT 6,
  period_key TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id, branch_id, document_type, period_key)
);

CREATE TABLE IF NOT EXISTS fiscal_transaction_controls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  terminal_id TEXT,
  sale_id TEXT NOT NULL,
  invoice_number TEXT,
  state TEXT NOT NULL DEFAULT 'DRAFT',
  idempotency_key TEXT NOT NULL,
  zra_receipt_number TEXT,
  zra_internal_data TEXT,
  zra_receipt_signature TEXT,
  zra_qr_data TEXT,
  zra_response_json TEXT,
  submission_at TEXT,
  fiscalized_at TEXT,
  error_code TEXT,
  error_message TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, sale_id),
  UNIQUE(idempotency_key)
);

CREATE TABLE IF NOT EXISTS zra_outbox (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  branch_id TEXT,
  terminal_id TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_attempt_at TEXT,
  request_id TEXT,
  payload TEXT NOT NULL,
  response TEXT,
  http_status INTEGER,
  result_code TEXT,
  result_message TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(idempotency_key)
);

CREATE TABLE IF NOT EXISTS terminal_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  terminal_code TEXT NOT NULL,
  name TEXT,
  operating_system TEXT,
  application_version TEXT,
  zra_device_id TEXT,
  vsdc_status TEXT,
  last_sync_at TEXT,
  last_heartbeat_at TEXT,
  status TEXT NOT NULL DEFAULT 'OFFLINE',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, terminal_code)
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_attempt_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_master_attributes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL DEFAULT 'stock',
  category TEXT,
  subcategory TEXT,
  service_item INTEGER NOT NULL DEFAULT 0,
  bundle_item INTEGER NOT NULL DEFAULT 0,
  base_unit TEXT,
  sales_unit TEXT,
  purchase_unit TEXT,
  decimal_quantity INTEGER NOT NULL DEFAULT 0,
  average_cost REAL NOT NULL DEFAULT 0,
  last_purchase_price REAL NOT NULL DEFAULT 0,
  retail_price REAL NOT NULL DEFAULT 0,
  wholesale_price REAL NOT NULL DEFAULT 0,
  dealer_price REAL NOT NULL DEFAULT 0,
  minimum_selling_price REAL NOT NULL DEFAULT 0,
  reserved_stock REAL NOT NULL DEFAULT 0,
  maximum_stock REAL,
  bin_location TEXT,
  batch_tracking INTEGER NOT NULL DEFAULT 0,
  serial_tracking INTEGER NOT NULL DEFAULT 0,
  expiry_tracking INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_unit_conversions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  multiplier REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, item_id, from_unit, to_unit)
);

CREATE TABLE IF NOT EXISTS customer_master_attributes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_id TEXT NOT NULL UNIQUE,
  customer_code TEXT,
  customer_type TEXT NOT NULL DEFAULT 'individual',
  province TEXT,
  district TEXT,
  credit_limit REAL NOT NULL DEFAULT 0,
  opening_balance REAL NOT NULL DEFAULT 0,
  account_status TEXT NOT NULL DEFAULT 'active',
  zra_customer_id TEXT,
  zra_registration_status TEXT NOT NULL DEFAULT 'not_configured',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_master_attributes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL UNIQUE,
  supplier_code TEXT,
  vat_number TEXT,
  contact_phone TEXT,
  email TEXT,
  address TEXT,
  district TEXT,
  province TEXT,
  credit_terms_days INTEGER NOT NULL DEFAULT 30,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  opening_balance REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  warehouse_id TEXT,
  location_id TEXT,
  movement_type TEXT NOT NULL,
  quantity_in REAL NOT NULL DEFAULT 0,
  quantity_out REAL NOT NULL DEFAULT 0,
  balance_quantity REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  source_type TEXT,
  source_id TEXT,
  source_number TEXT,
  movement_date TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounting_posting_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  rule_key TEXT NOT NULL,
  debit_account_id TEXT,
  credit_account_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id, rule_key)
);

CREATE TABLE IF NOT EXISTS period_controls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  financial_period_id TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  closed_by TEXT,
  closed_at TEXT,
  reopened_by TEXT,
  reopened_at TEXT,
  reopen_reason TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, financial_period_id)
);

CREATE TABLE IF NOT EXISTS compliance_exceptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  terminal_id TEXT,
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  entity_type TEXT,
  entity_id TEXT,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  assigned_to TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  resolution_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_event_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  terminal_id TEXT,
  actor_email TEXT,
  role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  approval_id TEXT,
  ip_address TEXT,
  device_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  previous_hash TEXT,
  event_hash TEXT
);

CREATE TRIGGER IF NOT EXISTS audit_event_log_no_update
BEFORE UPDATE ON audit_event_log
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_LOG_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS audit_event_log_no_delete
BEFORE DELETE ON audit_event_log
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_LOG_IMMUTABLE');
END;

CREATE INDEX IF NOT EXISTS idx_zra_outbox_status ON zra_outbox(user_id,status,next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_controls_state ON fiscal_transaction_controls(user_id,state,updated_at);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_date ON stock_ledger(user_id,item_id,movement_date);
CREATE INDEX IF NOT EXISTS idx_audit_event_log_entity ON audit_event_log(user_id,entity_type,entity_id,created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_exceptions_status ON compliance_exceptions(user_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(user_id,status,next_attempt_at);
