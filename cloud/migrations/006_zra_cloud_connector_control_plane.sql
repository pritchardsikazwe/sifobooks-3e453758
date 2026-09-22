-- SifoBooks customer-controlled VSDC connector control plane
CREATE TABLE IF NOT EXISTS cloud_connector_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  credential_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(tenant_id,connector_id)
);
CREATE TABLE IF NOT EXISTS cloud_connector_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  request_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cloud_connector_events ON cloud_connector_events(tenant_id,connector_id,created_at);

CREATE TABLE IF NOT EXISTS cloud_connector_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cloud_connector_commands ON cloud_connector_commands(tenant_id,connector_id,status,created_at);

ALTER TABLE cloud_connector_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_connector_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_connector_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_connector_events FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_connector_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_connector_commands FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cloud_connector_credentials_tenant ON cloud_connector_credentials;
CREATE POLICY cloud_connector_credentials_tenant ON cloud_connector_credentials USING (tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK (tenant_id=current_setting('app.tenant_id',true)::uuid);
DROP POLICY IF EXISTS cloud_connector_events_tenant ON cloud_connector_events;
CREATE POLICY cloud_connector_events_tenant ON cloud_connector_events USING (tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK (tenant_id=current_setting('app.tenant_id',true)::uuid);
DROP POLICY IF EXISTS cloud_connector_commands_tenant ON cloud_connector_commands;
CREATE POLICY cloud_connector_commands_tenant ON cloud_connector_commands USING (tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK (tenant_id=current_setting('app.tenant_id',true)::uuid);
