-- Warehouse compatibility: older/newer screens use reserved_stock while the core inventory model uses reserved_qty.
ALTER TABLE stock_items ADD COLUMN reserved_stock REAL NOT NULL DEFAULT 0;
