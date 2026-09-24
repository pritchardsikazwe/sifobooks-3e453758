-- Keep existing portable Windows databases compatible with the current reports and industry workspaces.
CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  receipt_number TEXT NOT NULL,
  po_number TEXT,
  receipt_date TEXT NOT NULL DEFAULT (date('now')),
  warehouse_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'ZMW',
  total REAL NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_user_date ON goods_receipts(user_id,receipt_date);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_warehouse ON goods_receipts(warehouse_id);

ALTER TABLE stock_items ADD COLUMN barcode TEXT;
ALTER TABLE stock_items ADD COLUMN category TEXT;
ALTER TABLE stock_items ADD COLUMN item_type TEXT;
ALTER TABLE stock_items ADD COLUMN bin TEXT;
ALTER TABLE stock_items ADD COLUMN reserved_qty REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN on_order_qty REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN safety_stock REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN max_stock REAL NOT NULL DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stock_items ADD COLUMN needs_cost_review INTEGER NOT NULL DEFAULT 0;

ALTER TABLE stock_movements ADD COLUMN total_cost REAL;
ALTER TABLE stock_movements ADD COLUMN transaction_date TEXT;
ALTER TABLE stock_movements ADD COLUMN source_type TEXT;
ALTER TABLE stock_movements ADD COLUMN source_id TEXT;
ALTER TABLE stock_movements ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));

ALTER TABLE pos_sales ADD COLUMN branch_id TEXT;
