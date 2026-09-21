-- SifoBooks Cloud Security & Trust Layer
-- Adds tenant-bound data isolation to the PostgreSQL accounting plane.
-- SQLite/local mode is unchanged.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure existing cloud companies have a control-plane tenant.
INSERT INTO cloud_tenants (owner_user_id, company_id, name, country, base_currency, status, plan_code)
SELECT c.user_id, c.id, c.name, COALESCE(c.country,'Zambia'), COALESCE(c.base_currency,'ZMW'), 'trialing', 'starter'
FROM companies c
ON CONFLICT (company_id) DO NOTHING;

-- Every user-owned accounting table gets an explicit tenant boundary.
-- Existing rows are assigned from their company_id where available; otherwise
-- they are assigned to the user's first cloud tenant. New writes are filled
-- by the server-side cloud executor.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema='public'
      AND c.column_name='user_id'
      AND c.table_name NOT LIKE 'cloud_%'
      AND c.table_name NOT IN ('auth_users')
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID', r.table_name);

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.table_name AND column_name='company_id'
    ) THEN
      EXECUTE format(
        'UPDATE %I t
         SET tenant_id = ct.id
         FROM cloud_tenants ct
         WHERE t.tenant_id IS NULL AND t.company_id IS NOT NULL AND ct.company_id=t.company_id',
        r.table_name
      );
    END IF;

    EXECUTE format(
      'UPDATE %I t
       SET tenant_id = ct.id
       FROM cloud_tenants ct
       WHERE t.tenant_id IS NULL
         AND t.user_id=ct.owner_user_id',
      r.table_name
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I(tenant_id)',
      'idx_' || r.table_name || '_tenant_id',
      r.table_name
    );
  END LOOP;
END $$;

-- Fail closed for tenant-scoped application traffic.
-- The application sets app.tenant_id transaction-locally for each request.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND column_name='tenant_id'
      AND table_name NOT LIKE 'cloud_%'
      AND table_name NOT IN ('auth_users')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS sifobooks_tenant_isolation ON %I', r.table_name);
    EXECUTE format(
      'CREATE POLICY sifobooks_tenant_isolation ON %I
       FOR ALL
       USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)
       WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      r.table_name
    );
  END LOOP;
END $$;

-- Security events are deliberately separate from ordinary tenant accounting data.
CREATE TABLE IF NOT EXISTS cloud_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES cloud_tenants(id) ON DELETE SET NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  resource_type TEXT,
  resource_id TEXT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cloud_security_events_tenant_time
  ON cloud_security_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cloud_security_events_severity_time
  ON cloud_security_events(severity, created_at DESC);

ALTER TABLE cloud_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_security_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cloud_security_events_tenant ON cloud_security_events;
CREATE POLICY cloud_security_events_tenant ON cloud_security_events
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR (
      tenant_id IS NULL
      AND user_id = NULLIF(current_setting('app.user_id', true), '')
    )
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

-- Security inventory used by the Security Centre and CI audit checks.
CREATE OR REPLACE VIEW cloud_security_rls_inventory AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped
  ) AS has_tenant_id,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public' AND p.tablename=c.relname
      AND p.policyname='sifobooks_tenant_isolation'
  ) AS has_tenant_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r';

-- Ordinary tenant traffic must never use a superuser or BYPASSRLS role.
-- This check is exposed as a view for deployment verification.
CREATE OR REPLACE VIEW cloud_security_runtime_role AS
SELECT current_user AS database_role,
       r.rolsuper AS is_superuser,
       r.rolbypassrls AS bypasses_rls
FROM pg_roles r
WHERE r.rolname=current_user;

COMMENT ON VIEW cloud_security_rls_inventory IS
  'SifoBooks security inventory: every tenant-scoped table must have RLS, FORCE RLS, tenant_id and the SifoBooks policy.';
COMMENT ON VIEW cloud_security_runtime_role IS
  'Production verification: the ordinary request-path PostgreSQL role must not be superuser or BYPASSRLS.';
