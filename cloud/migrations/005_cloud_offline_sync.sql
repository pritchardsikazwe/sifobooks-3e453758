-- SifoBooks Cloud sync protocol v1
ALTER TABLE cloud_sync_events ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;
ALTER TABLE cloud_sync_events ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE cloud_sync_events ADD COLUMN IF NOT EXISTS device_sequence BIGINT;
ALTER TABLE cloud_sync_events ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_cloud_sync_events_cursor ON cloud_sync_events(tenant_id,created_at,id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_sync_device_sequence
  ON cloud_sync_events(tenant_id,device_id,device_sequence)
  WHERE device_id IS NOT NULL AND device_sequence IS NOT NULL;

CREATE TABLE IF NOT EXISTS cloud_sync_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  branch_id TEXT,
  last_sequence BIGINT NOT NULL DEFAULT 0,
  last_pull_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,device_id)
);
CREATE INDEX IF NOT EXISTS idx_cloud_sync_devices_tenant ON cloud_sync_devices(tenant_id,status);

CREATE TABLE IF NOT EXISTS cloud_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  sync_event_id UUID REFERENCES cloud_sync_events(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  device_id TEXT,
  conflict_code TEXT NOT NULL,
  local_payload JSONB,
  cloud_payload JSONB,
  resolution TEXT NOT NULL DEFAULT 'pending',
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cloud_sync_conflicts_tenant ON cloud_sync_conflicts(tenant_id,resolution,created_at);

ALTER TABLE cloud_sync_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_sync_devices FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_sync_conflicts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cloud_sync_devices_tenant ON cloud_sync_devices;
CREATE POLICY cloud_sync_devices_tenant ON cloud_sync_devices
 USING (tenant_id = current_setting('app.tenant_id',true)::uuid)
 WITH CHECK (tenant_id = current_setting('app.tenant_id',true)::uuid);
DROP POLICY IF EXISTS cloud_sync_conflicts_tenant ON cloud_sync_conflicts;
CREATE POLICY cloud_sync_conflicts_tenant ON cloud_sync_conflicts
 USING (tenant_id = current_setting('app.tenant_id',true)::uuid)
 WITH CHECK (tenant_id = current_setting('app.tenant_id',true)::uuid);
