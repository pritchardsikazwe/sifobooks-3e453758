CREATE TABLE IF NOT EXISTS pos_stations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  station_code TEXT NOT NULL,
  station_name TEXT NOT NULL,
  station_type TEXT NOT NULL DEFAULT 'pos',
  device_name TEXT,
  device_serial TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_user_id TEXT,
  assigned_role TEXT NOT NULL DEFAULT 'cashier',
  zra_branch_code TEXT,
  zra_device_id TEXT,
  zra_sdc_id TEXT,
  zra_device_serial TEXT,
  zra_vsdc_endpoint TEXT,
  zra_environment TEXT NOT NULL DEFAULT 'production',
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, station_code)
);

CREATE INDEX IF NOT EXISTS idx_pos_stations_company ON pos_stations(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_stations_zra_device ON pos_stations(zra_device_id);
CREATE INDEX IF NOT EXISTS idx_pos_stations_assigned_user ON pos_stations(assigned_user_id);

CREATE TABLE IF NOT EXISTS pos_station_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  station_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pos_station_events_station ON pos_station_events(station_id);
CREATE INDEX IF NOT EXISTS idx_pos_station_events_created ON pos_station_events(created_at);

CREATE TABLE IF NOT EXISTS fiscal_station_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  station_id TEXT NOT NULL,
  user_id TEXT,
  transaction_type TEXT NOT NULL,
  source_id TEXT,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  zra_sdc_id TEXT,
  zra_device_id TEXT,
  zra_receipt_number TEXT,
  zra_internal_data TEXT,
  zra_receipt_signature TEXT,
  zra_qr_url TEXT,
  payload TEXT,
  response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fiscal_station_txn_company_station ON fiscal_station_transactions(company_id, station_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_station_txn_status ON fiscal_station_transactions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_station_txn_source ON fiscal_station_transactions(company_id, station_id, source_id);
