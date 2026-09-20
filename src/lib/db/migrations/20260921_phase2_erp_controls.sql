CREATE TABLE IF NOT EXISTS tax_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  tax_type TEXT NOT NULL DEFAULT 'VAT',
  rate REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'standard',
  inclusive_default INTEGER NOT NULL DEFAULT 1,
  zra_tax_code TEXT,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,company_id,code,effective_from)
);

CREATE TABLE IF NOT EXISTS tax_transaction_lines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  line_id TEXT,
  tax_code_id TEXT,
  tax_code TEXT,
  tax_category TEXT,
  rate REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  inclusive INTEGER NOT NULL DEFAULT 1,
  effective_from TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  warehouse_id TEXT,
  location_id TEXT,
  supplier_id TEXT,
  po_id TEXT,
  receipt_number TEXT NOT NULL,
  supplier_invoice_number TEXT,
  receipt_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  journal_entry_id TEXT,
  created_by TEXT,
  posted_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,receipt_number)
);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  po_item_id TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  batch_no TEXT,
  expiry_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_reconciliations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  location_id TEXT,
  warehouse_id TEXT,
  count_number TEXT NOT NULL,
  count_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_system_value REAL NOT NULL DEFAULT 0,
  total_counted_value REAL NOT NULL DEFAULT 0,
  total_variance_value REAL NOT NULL DEFAULT 0,
  reason TEXT,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  posted_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,count_number)
);

CREATE TABLE IF NOT EXISTS stock_reconciliation_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reconciliation_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  system_qty REAL NOT NULL DEFAULT 0,
  counted_qty REAL NOT NULL DEFAULT 0,
  variance_qty REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  variance_value REAL NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_correction_controls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  correction_type TEXT NOT NULL,
  original_reference TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  reason TEXT NOT NULL,
  approval_id TEXT,
  zra_status TEXT,
  zra_reference TEXT,
  journal_entry_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,source_type,source_id,correction_type)
);

ALTER TABLE credit_notes ADD COLUMN fiscal_state TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE credit_notes ADD COLUMN original_zra_receipt_number TEXT;
ALTER TABLE credit_notes ADD COLUMN zra_receipt_number TEXT;
ALTER TABLE credit_notes ADD COLUMN zra_response TEXT;
ALTER TABLE credit_notes ADD COLUMN submitted_at TEXT;
ALTER TABLE credit_notes ADD COLUMN fiscalized_at TEXT;

CREATE TABLE IF NOT EXISTS debit_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_id TEXT,
  invoice_id TEXT,
  number TEXT NOT NULL,
  issue_date TEXT NOT NULL DEFAULT (date('now')),
  currency TEXT NOT NULL DEFAULT 'ZMW',
  reason TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  vat_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  fiscal_state TEXT NOT NULL DEFAULT 'DRAFT',
  original_zra_receipt_number TEXT,
  zra_receipt_number TEXT,
  zra_response TEXT,
  submitted_at TEXT,
  fiscalized_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,number)
);

CREATE TABLE IF NOT EXISTS debit_note_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  debit_note_id TEXT NOT NULL,
  stock_item_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tax_transaction_source ON tax_transaction_lines(user_id,source_type,source_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_date ON purchase_receipts(user_id,receipt_date,status);
CREATE INDEX IF NOT EXISTS idx_stock_reconciliation_status ON stock_reconciliations(user_id,status);
CREATE INDEX IF NOT EXISTS idx_correction_controls_source ON document_correction_controls(user_id,source_type,source_id);

ALTER TABLE stock_items ADD COLUMN barcode TEXT;
ALTER TABLE stock_items ADD COLUMN category TEXT;
ALTER TABLE stock_items ADD COLUMN subcategory TEXT;
ALTER TABLE stock_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'stock';
ALTER TABLE stock_items ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stock_items ADD COLUMN service_item INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN bundle_item INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN base_unit TEXT;
ALTER TABLE stock_items ADD COLUMN sales_unit TEXT;
ALTER TABLE stock_items ADD COLUMN purchase_unit TEXT;
ALTER TABLE stock_items ADD COLUMN decimal_qty_allowed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN average_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN last_purchase_price REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN retail_price REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN wholesale_price REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN dealer_price REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN minimum_selling_price REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN maximum_stock REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN reserved_stock REAL NOT NULL DEFAULT 0;
