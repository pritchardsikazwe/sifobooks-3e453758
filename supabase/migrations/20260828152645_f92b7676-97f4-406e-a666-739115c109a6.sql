
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  count_number text,
  count_date date not null default current_date,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  status text not null default 'draft',
  notes text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_counts TO authenticated;
GRANT ALL ON public.stock_counts TO service_role;
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock_counts" ON public.stock_counts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.stock_count_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  count_id uuid not null references public.stock_counts(id) on delete cascade,
  item_id uuid not null references public.stock_items(id) on delete cascade,
  expected_qty numeric not null default 0,
  counted_qty numeric,
  variance numeric generated always as (coalesce(counted_qty,0) - expected_qty) stored,
  note text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_lines TO authenticated;
GRANT ALL ON public.stock_count_lines TO service_role;
ALTER TABLE public.stock_count_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock_count_lines" ON public.stock_count_lines FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  item_id uuid not null references public.stock_items(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  batch_no text not null,
  quantity numeric not null default 0,
  unit_cost numeric not null default 0,
  manufactured_date date,
  expiry_date date,
  status text not null default 'active',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_batches TO authenticated;
GRANT ALL ON public.stock_batches TO service_role;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock_batches" ON public.stock_batches FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.stock_serials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  item_id uuid not null references public.stock_items(id) on delete cascade,
  batch_id uuid references public.stock_batches(id) on delete set null,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  serial_no text not null,
  status text not null default 'in_stock',
  received_date date default current_date,
  sold_date date,
  reference text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_serials TO authenticated;
GRANT ALL ON public.stock_serials TO service_role;
ALTER TABLE public.stock_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock_serials" ON public.stock_serials FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS stock_serials_unique ON public.stock_serials(user_id, item_id, serial_no);
CREATE INDEX IF NOT EXISTS stock_batches_item_idx ON public.stock_batches(user_id, item_id);
CREATE INDEX IF NOT EXISTS stock_count_lines_count_idx ON public.stock_count_lines(count_id);

CREATE OR REPLACE FUNCTION public.post_stock_count(_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.stock_counts;
  _l record;
  _applied int := 0;
BEGIN
  SELECT * INTO _c FROM public.stock_counts WHERE id = _count_id AND user_id = auth.uid();
  IF _c.id IS NULL THEN RAISE EXCEPTION 'Stock count not found'; END IF;
  IF _c.status = 'posted' THEN RETURN jsonb_build_object('ok', false, 'message', 'Already posted'); END IF;

  FOR _l IN SELECT * FROM public.stock_count_lines WHERE count_id = _count_id AND counted_qty IS NOT NULL LOOP
    IF _l.variance <> 0 THEN
      INSERT INTO public.stock_movements(user_id, item_id, movement_type, quantity, unit_cost, reference, note)
      SELECT _c.user_id, _l.item_id,
             CASE WHEN _l.variance > 0 THEN 'in' ELSE 'out' END,
             abs(_l.variance), coalesce(si.cost_price,0),
             coalesce(_c.count_number, 'COUNT'), 'Stock count variance'
      FROM public.stock_items si WHERE si.id = _l.item_id;
      _applied := _applied + 1;
    END IF;
  END LOOP;

  UPDATE public.stock_counts SET status = 'posted', posted_at = now(), updated_at = now() WHERE id = _count_id;
  RETURN jsonb_build_object('ok', true, 'lines_applied', _applied);
END;
$$;
