-- SifoBooks inventory schema safety migration
-- Creates the location-level stock balance table when it is absent.
-- Existing installations are left unchanged by CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS stock_balances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  item_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, item_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_user_item
  ON stock_balances(user_id, item_id);

CREATE INDEX IF NOT EXISTS idx_stock_balances_user_location
  ON stock_balances(user_id, location_id);
