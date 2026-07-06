
-- Profile additions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tpin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN NOT NULL DEFAULT false;

-- stock_items
CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  hs_code TEXT,
  tax_category TEXT NOT NULL DEFAULT 'standard',
  vat_rate NUMERIC NOT NULL DEFAULT 16,
  unit TEXT NOT NULL DEFAULT 'each',
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock select" ON public.stock_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own stock insert" ON public.stock_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own stock update" ON public.stock_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own stock delete" ON public.stock_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- stock_movements
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjust')),
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC,
  reference TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own moves select" ON public.stock_movements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own moves insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own moves update" ON public.stock_movements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own moves delete" ON public.stock_movements FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-apply movement to item quantity
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE public.stock_items SET quantity_on_hand = quantity_on_hand + NEW.quantity WHERE id = NEW.item_id AND user_id = NEW.user_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.stock_items SET quantity_on_hand = quantity_on_hand - NEW.quantity WHERE id = NEW.item_id AND user_id = NEW.user_id;
  ELSIF NEW.movement_type = 'adjust' THEN
    UPDATE public.stock_items SET quantity_on_hand = NEW.quantity WHERE id = NEW.item_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_apply_stock_movement AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();
