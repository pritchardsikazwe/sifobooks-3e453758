CREATE TABLE public.restaurant_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  name TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 4,
  area TEXT NOT NULL DEFAULT 'Main',
  status TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_tables" ON public.restaurant_tables FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.restaurant_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Mains',
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  station TEXT NOT NULL DEFAULT 'Kitchen',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_menu_items TO authenticated;
GRANT ALL ON public.restaurant_menu_items TO service_role;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_menu_items" ON public.restaurant_menu_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.restaurant_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  order_no TEXT,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL DEFAULT 'DINE IN',
  status TEXT NOT NULL DEFAULT 'open',
  server_name TEXT,
  guests INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  business_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_orders TO authenticated;
GRANT ALL ON public.restaurant_orders TO service_role;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_orders" ON public.restaurant_orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.restaurant_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  order_id UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  station TEXT NOT NULL DEFAULT 'Kitchen',
  qty NUMERIC NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  kds_status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_order_items TO authenticated;
GRANT ALL ON public.restaurant_order_items TO service_role;
ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own restaurant_order_items" ON public.restaurant_order_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_rest_order_items_order ON public.restaurant_order_items(order_id);
CREATE INDEX idx_rest_orders_date ON public.restaurant_orders(user_id, business_date);