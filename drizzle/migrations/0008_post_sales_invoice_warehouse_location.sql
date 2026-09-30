-- The invoice form picks a warehouse; resolve it to that warehouse's stock location.
DO $mig$
DECLARE d text; n text;
BEGIN
  d := pg_get_functiondef('public.post_sales_invoice(jsonb,jsonb)'::regprocedure);
  n := replace(d,
    $o$_loc := COALESCE(NULLIF(it->>'location_id','')::uuid, public.pos_resolve_location(NULL, NULL));$o$,
    $r$_loc := COALESCE(
          (SELECT il.id FROM public.inventory_locations il
            WHERE il.user_id = _uid AND il.id::text = NULLIF(it->>'location_id','') LIMIT 1),
          (SELECT il.id FROM public.inventory_locations il
            WHERE il.user_id = _uid AND COALESCE(il.is_active,true)
              AND il.warehouse_id::text = COALESCE(NULLIF(it->>'warehouse_id',''), NULLIF(it->>'location_id',''))
            ORDER BY il.is_default DESC NULLS LAST, il.created_at LIMIT 1),
          public.pos_resolve_location(NULL, NULL));$r$);
  IF n = d THEN RAISE EXCEPTION 'post_sales_invoice location line not found'; END IF;
  EXECUTE n;
END $mig$;