CREATE TABLE IF NOT EXISTS item_unit_conversions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  multiplier REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,item_id,from_unit,to_unit)
);

CREATE INDEX IF NOT EXISTS idx_item_unit_conversions_item
  ON item_unit_conversions(user_id,item_id,is_active);

CREATE TABLE IF NOT EXISTS item_unit_conversion_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  conversion_id TEXT,
  action TEXT NOT NULL,
  from_unit TEXT,
  to_unit TEXT,
  multiplier REAL,
  actor_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
