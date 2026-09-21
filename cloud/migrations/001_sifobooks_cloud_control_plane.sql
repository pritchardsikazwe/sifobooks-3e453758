CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS cloud_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL, company_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Zambia', base_currency TEXT NOT NULL DEFAULT 'ZMW',
  status TEXT NOT NULL DEFAULT 'trialing', plan_code TEXT NOT NULL DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cloud_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff', status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(tenant_id,user_id)
);
CREATE TABLE IF NOT EXISTS cloud_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL, name TEXT NOT NULL, code TEXT, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,branch_id)
);
CREATE TABLE IF NOT EXISTS cloud_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'offline',
  environment TEXT NOT NULL DEFAULT 'test', last_seen_at TIMESTAMPTZ,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(tenant_id,connector_id)
);
CREATE TABLE IF NOT EXISTS cloud_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  device_id TEXT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1, idempotency_key TEXT NOT NULL UNIQUE, payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', conflict_code TEXT, conflict_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cloud_sync_events_tenant_status ON cloud_sync_events(tenant_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_cloud_members_user ON cloud_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_connectors_tenant ON cloud_connectors(tenant_id,status);
