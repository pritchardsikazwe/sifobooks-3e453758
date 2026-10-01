-- Lovable Cloud ZRA fiscalization state for hosted POS submissions/corrections.
-- Additive only: does not alter existing customer/accounting data.

CREATE TABLE IF NOT EXISTS zra_fiscal_controls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  terminal_id TEXT,
  invoice_number TEXT,
  state TEXT NOT NULL DEFAULT 'SUBMITTED',
  idempotency_key TEXT NOT NULL,
  zra_receipt_number TEXT,
  zra_internal_data TEXT,
  zra_receipt_signature TEXT,
  zra_qr_data TEXT,
  zra_response_json TEXT,
  error_code TEXT,
  error_message TEXT,
  submission_at TEXT,
  fiscalized_at TEXT,
  updated_at TEXT NOT NULL DEFAULT now(),
  UNIQUE(user_id, sale_id),
  UNIQUE(idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_zra_fiscal_controls_user_state
  ON zra_fiscal_controls(user_id, state, updated_at);

CREATE TABLE IF NOT EXISTS zra_document_corrections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  correction_type TEXT NOT NULL,
  original_reference TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  zra_status TEXT,
  zra_reference TEXT,
  reason TEXT NOT NULL,
  payload TEXT,
  response TEXT,
  error_code TEXT,
  error_message TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now(),
  UNIQUE(user_id, sale_id, correction_type)
);

CREATE INDEX IF NOT EXISTS idx_zra_document_corrections_user_status
  ON zra_document_corrections(user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS zra_stock_sync_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  sar_no BIGINT NOT NULL,
  org_sar_no BIGINT NOT NULL DEFAULT 0,
  stock_items_status TEXT NOT NULL DEFAULT 'PENDING',
  stock_master_status TEXT NOT NULL DEFAULT 'PENDING',
  stock_items_request TEXT,
  stock_items_response TEXT,
  stock_master_request TEXT,
  stock_master_response TEXT,
  error_code TEXT,
  error_message TEXT,
  updated_at TEXT NOT NULL DEFAULT now(),
  UNIQUE(user_id, sale_id)
);

CREATE INDEX IF NOT EXISTS idx_zra_stock_sync_user_status
  ON zra_stock_sync_records(user_id, stock_items_status, stock_master_status, updated_at);
