-- Keep cloud tenants aligned with the standalone report schema.
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS item_type text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS bin text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS reserved_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS on_order_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS safety_stock numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS max_stock numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS needs_cost_review boolean NOT NULL DEFAULT false;

ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS total_cost numeric;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS transaction_date timestamptz;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS branch_id uuid;

CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid,
  receipt_number text NOT NULL,
  po_number text,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id uuid,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'ZMW',
  total numeric NOT NULL DEFAULT 0,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goods_receipts_owner_access" ON public.goods_receipts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_goods_receipts_user_date ON public.goods_receipts(user_id, receipt_date);
