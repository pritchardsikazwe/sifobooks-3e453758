-- Keep existing desktop databases compatible with the warehouse UI.
ALTER TABLE warehouses ADD COLUMN company_id TEXT;
ALTER TABLE warehouses ADD COLUMN name TEXT NOT NULL DEFAULT 'Warehouse';
ALTER TABLE warehouses ADD COLUMN location TEXT;
ALTER TABLE warehouses ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE warehouses ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
CREATE INDEX IF NOT EXISTS idx_warehouses_user ON warehouses(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON warehouses(branch_id);
