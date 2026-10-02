-- Lovable Cloud hosted ZRA connector control plane.
-- Additive only. Uses the existing SifoBooks user/device model.
BEGIN;

CREATE TABLE IF NOT EXISTS zra_connector_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  device_id TEXT NOT NULL,
  connector_id TEXT NOT NULL UNIQUE,
  credential_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  environment TEXT NOT NULL DEFAULT 'test',
  name TEXT NOT NULL DEFAULT 'SifoBooks Connector',
  last_used_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS zra_connector_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  connector_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  request_id TEXT,
  payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zra_connector_commands (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  connector_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload TEXT NOT NULL DEFAULT '{}',
  response TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_zra_connector_credentials_device
  ON zra_connector_credentials(user_id,device_id,status);

CREATE INDEX IF NOT EXISTS idx_zra_connector_events_connector
  ON zra_connector_events(user_id,connector_id,created_at);

CREATE INDEX IF NOT EXISTS idx_zra_connector_commands_poll
  ON zra_connector_commands(user_id,connector_id,status,created_at);

COMMIT;
