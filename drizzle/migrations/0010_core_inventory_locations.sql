-- Core inventory location foundation
-- Every warehouse gets a default stock location, and invoice posting can self-heal
-- older companies that were created before location setup was mandatory.

ALTER TABLE public.inventory_locations
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_inventory_locations_user_warehouse
  ON public.inventory_locations(user_id, warehouse_id);

-- Backfill a default stock location for every existing warehouse that has none.
INSERT INTO public.inventory_locations
  (id, user_id, company_id, name, code, location_type, warehouse_id, is_default, is_active, updated_at)
SELECT
  gen_random_uuid(),
  w.user_id,
  NULL,
  COALESCE(NULLIF(w.name,''), 'Warehouse') || ' Stock',
  COALESCE(NULLIF(w.code,''), 'MAIN') || '-STOCK',
  'warehouse',
  w.id,
  true,
  true,
  now()
FROM public.warehouses w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_locations il
  WHERE il.user_id = w.user_id
    AND il.warehouse_id = w.id
    AND COALESCE(il.is_active,true)
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
  true,
  now()
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_locations il
  WHERE il.company_id = c.id AND COALESCE(il.is_active,true)
)
AND NOT EXISTS (
  SELECT 1 FROM public.warehouses w
  WHERE NULL = c.id AND COALESCE(w.is_active,true)
);

-- Harden the existing invoice RPC: resolve the warehouse to its location,
-- then self-create a default location if an old warehouse has none.
DO $mig$
DECLARE
  d text;
  n text;
BEGIN
  d := pg_get_functiondef('public.post_sales_invoice(jsonb,jsonb)'::regprocedure);

  n := replace(
    d,
    $old$_loc := COALESCE(
          (SELECT il.id FROM public.inventory_locations il
            WHERE il.user_id = _uid AND il.id::text = NULLIF(it->>'location_id','') LIMIT 1),
          (SELECT il.id FROM public.inventory_locations il
            WHERE il.user_id = _uid AND COALESCE(il.is_active,true)
              AND il.warehouse_id::text = COALESCE(NULLIF(it->>'warehouse_id',''), NULLIF(it->>'location_id',''))
            ORDER BY il.is_default DESC NULLS LAST, il.created_at LIMIT 1),
          public.pos_resolve_location(NULL, NULL));$old$,
    $new$SELECT COALESCE(
          (SELECT il.id FROM public.inventory_locations il
            WHERE il.user_id = _uid AND il.id::text = NULLIF(it->>'location_id','') LIMIT 1),
          (SELECT il.id FROM public.inventory_locations il
            WHERE il.user_id = _uid AND COALESCE(il.is_active,true)
              AND il.warehouse_id::text = COALESCE(NULLIF(it->>'warehouse_id',''), NULLIF(it->>'location_id',''))
            ORDER BY il.is_default DESC NULLS LAST, il.updated_at LIMIT 1),
          public.pos_resolve_location(NULL, NULL))
      INTO _loc;

      IF _loc IS NULL THEN
        INSERT INTO public.inventory_locations
          (id, user_id, company_id, name, code, location_type, warehouse_id, is_default, is_active, updated_at)
        SELECT
          gen_random_uuid(),
          _uid,
          NULL,
          COALESCE(NULLIF(w.name,''),'Warehouse') || ' Stock',
          COALESCE(NULLIF(w.code,''),'MAIN') || '-STOCK',
          'warehouse',
          w.id,
          true,
          true,
          now()
        FROM public.warehouses w
        WHERE w.id::text = NULLIF(it->>'warehouse_id','')
          AND w.user_id = _uid
        LIMIT 1
        RETURNING id INTO _loc;
      END IF;

      IF _loc IS NULL THEN
        INSERT INTO public.inventory_locations
          (id, user_id, company_id, name, code, location_type, is_default, is_active, updated_at)
        SELECT
          gen_random_uuid(),
          _uid,
          cm.company_id,
          'Main Stock',
          'MAIN-STOCK',
          'warehouse',
          true,
          true,
          now()
        FROM public.company_members cm
        WHERE cm.user_id = _uid
        ORDER BY cm.created_at
        LIMIT 1
        RETURNING id INTO _loc;
      END IF;$new$
  );

  IF n = d THEN
    RAISE EXCEPTION 'post_sales_invoice location resolution block not found';
  END IF;

  EXECUTE n;
END $mig$;
