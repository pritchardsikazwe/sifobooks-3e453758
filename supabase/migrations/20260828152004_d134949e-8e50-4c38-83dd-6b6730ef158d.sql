ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bin text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS reserved_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_order_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS stock_items_user_idx ON public.stock_items(user_id);
CREATE INDEX IF NOT EXISTS stock_items_barcode_idx ON public.stock_items(barcode);
CREATE INDEX IF NOT EXISTS stock_items_sku_idx ON public.stock_items(sku);
CREATE INDEX IF NOT EXISTS stock_items_category_idx ON public.stock_items(category);
CREATE INDEX IF NOT EXISTS stock_items_warehouse_idx ON public.stock_items(warehouse_id);
CREATE INDEX IF NOT EXISTS stock_movements_item_idx ON public.stock_movements(item_id, created_at DESC);