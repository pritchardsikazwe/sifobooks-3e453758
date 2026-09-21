-- SifoBooks Cloud atomic accounting transaction layer.

CREATE TABLE IF NOT EXISTS cloud_transaction_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  client_ref TEXT,
  status TEXT NOT NULL DEFAULT 'posted',
  currency TEXT NOT NULL DEFAULT 'ZMW',
  total_debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cloud_transaction_batches_idem
  ON cloud_transaction_batches(tenant_id, transaction_type, client_ref)
  WHERE client_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS cloud_transaction_batches_source
  ON cloud_transaction_batches(tenant_id, source_type, source_id);

CREATE TABLE IF NOT EXISTS cloud_transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES cloud_transaction_batches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cloud_transaction_events_txn
  ON cloud_transaction_events(tenant_id, transaction_id, created_at);

CREATE TABLE IF NOT EXISTS cloud_payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES cloud_tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  reason TEXT,
  journal_entry_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cloud_payment_refunds_sale
  ON cloud_payment_refunds(tenant_id, sale_id);

CREATE UNIQUE INDEX IF NOT EXISTS cloud_pos_client_ref
  ON pos_sales(tenant_id, client_ref)
  WHERE tenant_id IS NOT NULL AND client_ref IS NOT NULL;

ALTER TABLE cloud_transaction_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_transaction_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_transaction_events FORCE ROW LEVEL SECURITY;
ALTER TABLE cloud_payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_payment_refunds FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cloud_transaction_batches_tenant ON cloud_transaction_batches;
CREATE POLICY cloud_transaction_batches_tenant ON cloud_transaction_batches
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS cloud_transaction_events_tenant ON cloud_transaction_events;
CREATE POLICY cloud_transaction_events_tenant ON cloud_transaction_events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS cloud_payment_refunds_tenant ON cloud_payment_refunds;
CREATE POLICY cloud_payment_refunds_tenant ON cloud_payment_refunds
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
