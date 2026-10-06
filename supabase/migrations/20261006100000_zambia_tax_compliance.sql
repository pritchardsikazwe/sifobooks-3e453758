-- Zambia tax compliance expansion.
-- Additive and idempotent. Existing invoices, bills and accounting data are preserved.

ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS vat_recoverable boolean NOT NULL DEFAULT true;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS vat_claim_date date;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS business_use_percent numeric(6,2) NOT NULL DEFAULT 100;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS import_vat numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS vat_evidence_type text;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS vat_notes text;

CREATE TABLE IF NOT EXISTS public.tax_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  document_type text NOT NULL CHECK (document_type IN ('credit_note','debit_note')),
  direction text NOT NULL CHECK (direction IN ('issued','received')),
  original_invoice_id uuid,
  original_bill_id uuid,
  reference text NOT NULL,
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  vat_amount numeric(18,2) NOT NULL DEFAULT 0,
  total numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','voided')),
  zra_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (total >= 0 AND subtotal >= 0 AND vat_amount >= 0),
  UNIQUE(user_id, reference)
);

CREATE TABLE IF NOT EXISTS public.tax_filing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  filing_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','needs_configuration','exported','submitted','failed')),
  amount_due numeric(18,2) NOT NULL DEFAULT 0,
  amount_claimed numeric(18,2) NOT NULL DEFAULT 0,
  reconciliation_difference numeric(18,2) NOT NULL DEFAULT 0,
  submission_reference text,
  prepared_at timestamptz NOT NULL DEFAULT now(),
  exported_at timestamptz,
  submitted_at timestamptz,
  notes text,
  UNIQUE(user_id, filing_type, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.tax_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_adjustments_user_date ON public.tax_adjustments(user_id, adjustment_date);
CREATE INDEX IF NOT EXISTS idx_tax_adjustments_invoice ON public.tax_adjustments(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_tax_adjustments_bill ON public.tax_adjustments(original_bill_id);
CREATE INDEX IF NOT EXISTS idx_tax_filing_records_user_period ON public.tax_filing_records(user_id, period_end);
CREATE INDEX IF NOT EXISTS idx_tax_audit_events_user_date ON public.tax_audit_events(user_id, created_at DESC);

ALTER TABLE public.tax_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_filing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_adjustments_select_own ON public.tax_adjustments;
DROP POLICY IF EXISTS tax_adjustments_insert_own ON public.tax_adjustments;
DROP POLICY IF EXISTS tax_adjustments_update_own ON public.tax_adjustments;
CREATE POLICY tax_adjustments_select_own ON public.tax_adjustments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tax_adjustments_insert_own ON public.tax_adjustments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tax_adjustments_update_own ON public.tax_adjustments FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS tax_filing_records_select_own ON public.tax_filing_records;
DROP POLICY IF EXISTS tax_filing_records_insert_own ON public.tax_filing_records;
DROP POLICY IF EXISTS tax_filing_records_update_own ON public.tax_filing_records;
CREATE POLICY tax_filing_records_select_own ON public.tax_filing_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tax_filing_records_insert_own ON public.tax_filing_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tax_filing_records_update_own ON public.tax_filing_records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS tax_audit_events_select_own ON public.tax_audit_events;
DROP POLICY IF EXISTS tax_audit_events_insert_own ON public.tax_audit_events;
CREATE POLICY tax_audit_events_select_own ON public.tax_audit_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tax_audit_events_insert_own ON public.tax_audit_events FOR INSERT WITH CHECK (user_id = auth.uid());
