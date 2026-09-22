CREATE TABLE IF NOT EXISTS software_licenses (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  edition TEXT NOT NULL,
  license_type TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT,
  max_devices INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS software_license_activations (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  activated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT,
  deactivated_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(license_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_software_licenses_customer ON software_licenses(customer_name);
CREATE INDEX IF NOT EXISTS idx_software_licenses_status ON software_licenses(status);
CREATE INDEX IF NOT EXISTS idx_software_license_activations_license ON software_license_activations(license_id);
