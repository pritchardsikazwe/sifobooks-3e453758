-- SifoBooks property recurring billing enhancements
ALTER TABLE public.property_charges ADD COLUMN IF NOT EXISTS billing_period TEXT;
ALTER TABLE public.property_charges ADD COLUMN IF NOT EXISTS charge_source TEXT NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS property_charges_lease_period_uq
  ON public.property_charges(lease_id, billing_period)
  WHERE billing_period IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_charges_due_status
  ON public.property_charges(company_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_property_payments_date
  ON public.property_payments(company_id, payment_date);
