-- Warehouse compatibility: expose the reserved_stock field expected by warehouse views.
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS reserved_stock numeric NOT NULL DEFAULT 0;
