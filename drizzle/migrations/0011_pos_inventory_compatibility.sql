-- POS / inventory / invoice compatibility foundation
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS base_unit text NOT NULL DEFAULT 'each',
  ADD COLUMN IF NOT EXISTS sales_unit text,
  ADD COLUMN IF NOT EXISTS purchase_unit text,
  ADD COLUMN IF NOT EXISTS track_stock integer NOT NULL DEFAULT 1;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS discount_amount double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'amount';

ALTER TABLE public.pos_registers
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.pos_shifts
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS cash_sales double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_sales double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS momo_sales double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_sales double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drawer_name text,
  ADD COLUMN IF NOT EXISTS station text,
  ADD COLUMN IF NOT EXISTS manager_comment text,
  ADD COLUMN IF NOT EXISTS review_status text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS cash_denominations jsonb;

CREATE TABLE IF NOT EXISTS public.item_unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  from_unit text NOT NULL,
  to_unit text NOT NULL,
  multiplier double precision NOT NULL DEFAULT 1,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_unit_conversions_lookup
  ON public.item_unit_conversions(user_id,item_id,from_unit,to_unit,is_active);

CREATE TABLE IF NOT EXISTS public.item_unit_conversion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  conversion_id uuid,
  action text NOT NULL,
  from_unit text,
  to_unit text,
  multiplier double precision,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);