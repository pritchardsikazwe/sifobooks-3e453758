CREATE OR REPLACE FUNCTION public.inventory_unit_cost(_item uuid, _location uuid DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c numeric;
BEGIN
  IF _item IS NULL THEN RETURN 0; END IF;

  IF _location IS NOT NULL THEN
    SELECT NULLIF(b.unit_cost,0) INTO _c
      FROM public.stock_batches b
     WHERE b.item_id = _item AND b.warehouse_id = _location
       AND COALESCE(b.quantity,0) > 0
       AND COALESCE(b.status,'active') <> 'closed'
     ORDER BY b.created_at
     LIMIT 1;
    IF COALESCE(_c,0) > 0 THEN RETURN ROUND(_c, 4); END IF;
  END IF;

  SELECT NULLIF(cost_price,0) INTO _c FROM public.stock_items WHERE id = _item;
  RETURN ROUND(COALESCE(_c,0), 4);
END $$;

REVOKE ALL ON FUNCTION public.inventory_unit_cost(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_unit_cost(uuid,uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.pos_checkout(jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_checkout(jsonb,jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.sync_pos_sale(jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_pos_sale(jsonb,jsonb,jsonb) TO authenticated;