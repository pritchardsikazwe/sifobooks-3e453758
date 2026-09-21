-- ZRA Smart Invoice device-aware local / cloud / hybrid architecture
-- ZRA identifies an integration device using TPIN + Branch ID + Device Serial Number.
CREATE TABLE IF NOT EXISTS zra_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  terminal_id TEXT,
  deployment_mode TEXT NOT NULL DEFAULT 'local',
  environment TEXT NOT NULL DEFAULT 'test',
  tpin TEXT,
  branch_code TEXT NOT NULL,
  device_serial TEXT NOT NULL,
  vsdc_endpoint TEXT,
  connector_endpoint TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  initialization_status TEXT NOT NULL DEFAULT 'not_initialized',
  taxpayer_name TEXT,
  branch_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_verified_at TEXT,
  last_submission_at TEXT,
  last_submission_status TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, device_serial),
  UNIQUE(user_id, terminal_id)
);

CREATE INDEX IF NOT EXISTS idx_zra_devices_user_branch ON zra_devices(user_id, branch_code, is_active);
CREATE INDEX IF NOT EXISTS idx_zra_devices_terminal ON zra_devices(user_id, terminal_id);

CREATE TABLE IF NOT EXISTS zra_device_events (
  id TEXT PRIMARY KEY,
  zra_device_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'info',
  message TEXT,
  response_code TEXT,
  response_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_zra_device_events_device ON zra_device_events(zra_device_id, created_at);

-- Keep the existing invoice queue compatible while attaching every fiscal event to a device.
ALTER TABLE zra_invoice_queue ADD COLUMN zra_device_id TEXT;
CREATE INDEX IF NOT EXISTS idx_zra_invoice_queue_device ON zra_invoice_queue(zra_device_id, updated_at);

-- Keep existing single-config installations working while making the device table authoritative for new installations.
INSERT OR IGNORE INTO zra_devices (
  id,user_id,branch_id,device_name,device_type,terminal_id,deployment_mode,environment,
  tpin,branch_code,device_serial,vsdc_endpoint,status,initialization_status,taxpayer_name,
  last_verified_at,created_at,updated_at
)
SELECT
  id || '-device',
  user_id,
  branch_id,
  COALESCE(NULLIF(device_serial,''),'SifoBooks Device'),
  'desktop',
  NULL,
  'local',
  CASE WHEN mode='production' THEN 'production' ELSE 'test' END,
  tpin,
  COALESCE(branch_code,'000'),
  COALESCE(device_serial,id),
  vsdc_endpoint,
  CASE WHEN mode='initialized' THEN 'initialized' ELSE 'registered' END,
  CASE WHEN mode='initialized' THEN 'initialized' ELSE 'not_initialized' END,
  taxpayer_name,
  last_verified_at,
  updated_at,
  updated_at
FROM zra_smart_invoice_config
WHERE device_serial IS NOT NULL AND device_serial <> '';