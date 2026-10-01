-- Core inventory location foundation
-- Every warehouse gets a default stock location, and invoice posting can self-heal
-- older companies that were created before location setup was mandatory.

ALTER TABLE public.inventory_locations
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_inventory_locations_user_warehouse
  ON public.inventory_locations(user_id, warehouse_id);

-- Backfill a default stock location for every existing warehouse that has none.
INSERT INTO public.inventory_locations
  (id, user_id, company_id, name, code, location_type, warehouse_id, is_default, is_active, updated_at)
SELECT
  gen_random_uuid(),
  w.user_id,
  NULL,
  'Warehouse ' || COALESCE(NULLIF(w.code,''), 'MAIN') || ' Stock',
  COALESCE(NULLIF(w.code,''), 'MAIN') || '-STOCK',
  'warehouse',
  w.id,
  true,
  1,
  now()
FROM public.warehouses w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_locations il
  WHERE il.user_id = w.user_id
    AND il.warehouse_id = w.id
    AND COALESCE(il.is_active,1) <> 0
);

-- If a company has no warehouse/location yet, provide a company-level default.
INSERT INTO public.inventory_locations
  (id, user_id, company_id, name, code, location_type, is_default, is_active, updated_at)
SELECT
  gen_random_uuid(),
  c.user_id,
  c.id,
  COALESCE(NULLIF(c.name,''), 'Company') || ' Main Stock',
  'MAIN-STOCK',
  'warehouse',
  true,
  1,
  now()
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_locations il
  WHERE il.company_id = c.id AND COALESCE(il.is_active,1) <> 0
)
AND NOT EXISTS (
  SELECT 1 FROM public.warehouses w
  WHERE w.user_id = c.user_id
);
