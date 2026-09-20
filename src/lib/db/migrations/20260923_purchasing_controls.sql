ALTER TABLE purchase_receipts ADD COLUMN bill_id TEXT;
ALTER TABLE purchase_order_items ADD COLUMN received_quantity REAL NOT NULL DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN approved_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN approved_at TEXT;
ALTER TABLE purchase_orders ADD COLUMN posted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_bill ON purchase_receipts(user_id,bill_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(user_id,po_id);
