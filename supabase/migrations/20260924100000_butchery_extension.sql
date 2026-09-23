-- Butchery extension for SifoBooks Retail / Enterprise.
CREATE TABLE IF NOT EXISTS public.butchery_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  animal_type text NOT NULL DEFAULT 'beef',
  cut_name text,
  grade text,
  unit text NOT NULL DEFAULT 'kg',
  price_per_kg numeric NOT NULL DEFAULT 0,
  min_price_per_kg numeric NOT NULL DEFAULT 0,
  scale_enabled boolean NOT NULL DEFAULT true,
  label_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,item_id)
);

CREATE TABLE IF NOT EXISTS public.butchery_scale_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  manufacturer text,
  model text,
  connection_type text NOT NULL DEFAULT 'web_serial',
  port text,
  baud_rate integer NOT NULL DEFAULT 9600,
  unit text NOT NULL DEFAULT 'kg',
  decimal_places integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  last_weight numeric,
  last_stable boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.butchery_processing_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL,
  source_item_id uuid,
  input_qty numeric NOT NULL DEFAULT 0,
  input_unit text NOT NULL DEFAULT 'kg',
  input_cost numeric NOT NULL DEFAULT 0,
  saleable_qty numeric NOT NULL DEFAULT 0,
  waste_qty numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  processed_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.butchery_yield_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  output_item_id uuid,
  output_name text NOT NULL,
  output_qty numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  yield_percent numeric NOT NULL DEFAULT 0,
  note text
);

CREATE INDEX IF NOT EXISTS idx_butchery_products_user ON public.butchery_products(user_id,is_active);
CREATE INDEX IF NOT EXISTS idx_butchery_scales_user ON public.butchery_scale_devices(user_id,is_active);
CREATE INDEX IF NOT EXISTS idx_butchery_batches_user ON public.butchery_processing_batches(user_id,processed_at);
