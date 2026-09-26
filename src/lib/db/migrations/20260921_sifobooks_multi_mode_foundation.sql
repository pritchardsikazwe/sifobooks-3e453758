-- SifoBooks multi-mode foundation
ALTER TABLE companies ADD COLUMN deployment_mode TEXT NOT NULL DEFAULT 'offline';
ALTER TABLE companies ADD COLUMN sync_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN sync_endpoint TEXT;

CREATE TABLE IF NOT EXISTS deployment_profiles (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'offline', database_engine TEXT NOT NULL DEFAULT 'sqlite',
  server_host TEXT, server_port INTEGER, cloud_endpoint TEXT,
  sync_enabled INTEGER NOT NULL DEFAULT 0, offline_enabled INTEGER NOT NULL DEFAULT 1,
  pwa_enabled INTEGER NOT NULL DEFAULT 1, printing_mode TEXT NOT NULL DEFAULT 'system',
  license_status TEXT NOT NULL DEFAULT 'trial', config_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS sync_devices (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT, device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop', device_key TEXT NOT NULL UNIQUE,
  last_seen_at TEXT, last_sync_at TEXT, sync_cursor TEXT, status TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, device_id TEXT, user_id TEXT,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending',
  conflict_code TEXT, conflict_payload_json TEXT, attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT, processed_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_company_status ON sync_queue(company_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(company_id, entity_type, entity_id, version);

CREATE TABLE IF NOT EXISTS migration_runs (
  id TEXT PRIMARY KEY, user_id TEXT, company_id TEXT, source_type TEXT NOT NULL,
  source_label TEXT, source_reference TEXT, status TEXT NOT NULL DEFAULT 'staged',
  started_at TEXT, completed_at TEXT, source_counts_json TEXT, imported_counts_json TEXT,
  reconciliation_json TEXT, error_summary TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS migration_items (
  id TEXT PRIMARY KEY, migration_run_id TEXT NOT NULL, source_table TEXT NOT NULL,
  source_id TEXT, target_table TEXT, target_id TEXT, action TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending', source_payload_json TEXT, target_payload_json TEXT,
  error_message TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_migration_items_run ON migration_items(migration_run_id, status);

CREATE TABLE IF NOT EXISTS backup_catalog (
  id TEXT PRIMARY KEY, company_id TEXT, user_id TEXT, backup_type TEXT NOT NULL DEFAULT 'automatic',
  storage_type TEXT NOT NULL DEFAULT 'local', file_path TEXT NOT NULL, file_size_bytes INTEGER,
  checksum TEXT, database_engine TEXT NOT NULL DEFAULT 'sqlite', verified INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT, restore_tested INTEGER NOT NULL DEFAULT 0, restore_tested_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_backup_catalog_company ON backup_catalog(company_id, created_at);

CREATE TABLE IF NOT EXISTS print_agents (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, device_id TEXT, name TEXT NOT NULL,
  agent_key TEXT NOT NULL UNIQUE, printer_type TEXT NOT NULL DEFAULT 'system',
  capabilities_json TEXT, last_seen_at TEXT, status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT, print_agent_id TEXT,
  document_type TEXT NOT NULL, document_id TEXT, printer_name TEXT, payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT, printed_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Legacy/base SQLite schema may already contain print_jobs without the
-- multi-mode columns. Add them before the multi-mode index.
ALTER TABLE print_jobs ADD COLUMN company_id TEXT;
ALTER TABLE print_jobs ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(company_id, status, created_at);

CREATE TABLE IF NOT EXISTS license_activations (
  id TEXT PRIMARY KEY, company_id TEXT, user_id TEXT, installation_id TEXT NOT NULL,
  product_edition TEXT NOT NULL DEFAULT 'offline', license_status TEXT NOT NULL DEFAULT 'trial',
  license_reference TEXT, activated_at TEXT, expires_at TEXT, last_verified_at TEXT,
  offline_grace_until TEXT, metadata_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(installation_id, product_edition)
);
