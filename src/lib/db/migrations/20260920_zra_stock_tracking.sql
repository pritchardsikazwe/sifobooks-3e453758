CREATE TABLE IF NOT EXISTS zra_stock_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sale_id TEXT NOT NULL UNIQUE,
  sar_no INTEGER NOT NULL UNIQUE,
  org_sar_no INTEGER NOT NULL DEFAULT 0,
  stock_items_status TEXT NOT NULL DEFAULT 'PENDING',
  stock_master_status TEXT NOT NULL DEFAULT 'PENDING',
  stock_items_request TEXT,
  stock_items_response TEXT,
  stock_master_request TEXT,
  stock_master_response TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_zra_stock_records_status ON zra_stock_records(user_id,stock_items_status,stock_master_status);
