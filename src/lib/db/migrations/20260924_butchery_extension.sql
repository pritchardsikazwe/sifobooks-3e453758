-- Butchery extension for SifoBooks Retail / Enterprise.
CREATE TABLE IF NOT EXISTS butchery_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  animal_type TEXT NOT NULL DEFAULT 'beef',
  cut_name TEXT,
  grade TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_kg REAL NOT NULL DEFAULT 0,
  min_price_per_kg REAL NOT NULL DEFAULT 0,
  scale_enabled INTEGER NOT NULL DEFAULT 1,
  label_enabled INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id,item_id)
);

CREATE TABLE IF NOT EXISTS butchery_scale_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  connection_type TEXT NOT NULL DEFAULT 'web_serial',
  port TEXT,
  baud_rate INTEGER NOT NULL DEFAULT 9600,
  unit TEXT NOT NULL DEFAULT 'kg',
  decimal_places INTEGER NOT NULL DEFAULT 3,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_weight REAL,
  last_stable INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS butchery_processing_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  source_item_id TEXT,
  input_qty REAL NOT NULL DEFAULT 0,
  input_unit TEXT NOT NULL DEFAULT 'kg',
  input_cost REAL NOT NULL DEFAULT 0,
  saleable_qty REAL NOT NULL DEFAULT 0,
  waste_qty REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  processed_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS butchery_yield_lines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  output_item_id TEXT,
  output_name TEXT NOT NULL,
  output_qty REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  yield_percent REAL NOT NULL DEFAULT 0,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_butchery_products_user ON butchery_products(user_id,is_active);
CREATE INDEX IF NOT EXISTS idx_butchery_scales_user ON butchery_scale_devices(user_id,is_active);
CREATE INDEX IF NOT EXISTS idx_butchery_batches_user ON butchery_processing_batches(user_id,processed_at);
