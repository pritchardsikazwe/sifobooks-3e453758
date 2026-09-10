-- 1) Authoritative server-side cost for restaurant order lines.
CREATE OR REPLACE FUNCTION public.restaurant_line_cost(_menu_item_id uuid, _user uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF((
      SELECT SUM(rr.quantity * COALESCE(si.cost_price, 0))
      FROM restaurant_recipes rr
      JOIN stock_items si ON si.id = rr.stock_item_id
      WHERE rr.menu_item_id = _menu_item_id AND rr.user_id = _user
    ), 0),
    (SELECT COALESCE(mi.cost, 0) FROM restaurant_menu_items mi
      WHERE mi.id = _menu_item_id AND mi.user_id = _user),
    0
  );
$$;

REVOKE ALL ON FUNCTION public.restaurant_line_cost(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_line_cost(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.restaurant_order_item_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The client never decides cost of sales: always recompute from recipe/menu cost.
  IF NEW.menu_item_id IS NOT NULL THEN
    NEW.unit_cost := public.restaurant_line_cost(NEW.menu_item_id, NEW.user_id);
  ELSE
    NEW.unit_cost := COALESCE(NEW.unit_cost, 0);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_restaurant_order_item_cost ON public.restaurant_order_items;
CREATE TRIGGER trg_restaurant_order_item_cost
  BEFORE INSERT OR UPDATE OF menu_item_id, qty ON public.restaurant_order_items
  FOR EACH ROW EXECUTE FUNCTION public.restaurant_order_item_cost();

-- 2) Recalculate an open check from its lines.
CREATE OR REPLACE FUNCTION public.restaurant_recalc_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record; _sub numeric := 0; _disc numeric := 0; _svc_pct numeric; _vat numeric; _svc numeric; _tax numeric;
BEGIN
  SELECT * INTO o FROM restaurant_orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(qty * price), 0), COALESCE(SUM(COALESCE(discount, 0)), 0)
    INTO _sub, _disc
    FROM restaurant_order_items WHERE order_id = _order_id;

  SELECT COALESCE(service_charge_pct, 0), COALESCE(vat_rate, 0)
    INTO _svc_pct, _vat
    FROM restaurant_settings WHERE user_id = o.user_id;

  _svc := ROUND((_sub - _disc) * COALESCE(_svc_pct, 0) / 100.0, 2);
  _tax := ROUND((_sub - _disc + _svc) * COALESCE(_vat, 0) / 100.0, 2);

  UPDATE restaurant_orders
     SET subtotal = _sub,
         discount = _disc,
         service_charge = _svc,
         tax = _tax,
         total = _sub - _disc + _svc + _tax
              + COALESCE(delivery_fee, 0) + COALESCE(gratuity, 0) + COALESCE(packaging_fee, 0),
         updated_at = now()
   WHERE id = _order_id;
END $$;

REVOKE ALL ON FUNCTION public.restaurant_recalc_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_recalc_order(uuid) TO authenticated, service_role;

-- 3) Split a check: move selected lines onto a new open check.
CREATE OR REPLACE FUNCTION public.restaurant_split_check(_order_id uuid, _item_ids uuid[], _guests integer DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o record; _new uuid; _moved integer;
BEGIN
  SELECT * INTO o FROM restaurant_orders WHERE id = _order_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Check not found'; END IF;
  IF o.status NOT IN ('open', 'held') OR o.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only open or held checks can be split';
  END IF;
  IF _item_ids IS NULL OR array_length(_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one line to move';
  END IF;
  IF (SELECT COUNT(*) FROM restaurant_order_items WHERE order_id = _order_id) <= array_length(_item_ids, 1) THEN
    RAISE EXCEPTION 'Leave at least one line on the original check';
  END IF;

  INSERT INTO restaurant_orders(
    user_id, order_no, table_id, order_type, status, server_name, guests,
    subtotal, tax, discount, total, business_date, customer_id, customer_name,
    customer_phone, branch_id, drawer_id, opened_at, notes, created_by)
  VALUES (
    o.user_id, COALESCE(o.order_no, '') || '-S' || to_char(now(), 'HH24MISS'), o.table_id, o.order_type,
    'open', o.server_name, COALESCE(_guests, 1), 0, 0, 0, 0, o.business_date, o.customer_id, o.customer_name,
    o.customer_phone, o.branch_id, o.drawer_id, now(),
    'Split from ' || COALESCE(o.order_no, o.id::text), auth.uid())
  RETURNING id INTO _new;

  UPDATE restaurant_order_items
     SET order_id = _new
   WHERE order_id = _order_id AND id = ANY(_item_ids);
  GET DIAGNOSTICS _moved = ROW_COUNT;

  PERFORM public.restaurant_recalc_order(_order_id);
  PERFORM public.restaurant_recalc_order(_new);

  INSERT INTO audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'restaurant.check.split', 'restaurant_orders', _order_id,
          jsonb_build_object('new_order_id', _new, 'lines_moved', _moved));

  RETURN _new;
END $$;

REVOKE ALL ON FUNCTION public.restaurant_split_check(uuid, uuid[], integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_split_check(uuid, uuid[], integer) TO authenticated, service_role;

-- 4) Merge two checks.
CREATE OR REPLACE FUNCTION public.restaurant_merge_checks(_source_id uuid, _target_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s record; t record; _moved integer;
BEGIN
  IF _source_id = _target_id THEN RAISE EXCEPTION 'Choose two different checks'; END IF;
  SELECT * INTO s FROM restaurant_orders WHERE id = _source_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Source check not found'; END IF;
  SELECT * INTO t FROM restaurant_orders WHERE id = _target_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Destination check not found'; END IF;
  IF s.status NOT IN ('open', 'held') OR t.status NOT IN ('open', 'held')
     OR s.journal_entry_id IS NOT NULL OR t.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only open or held checks can be merged';
  END IF;

  UPDATE restaurant_order_items SET order_id = _target_id WHERE order_id = _source_id;
  GET DIAGNOSTICS _moved = ROW_COUNT;

  UPDATE restaurant_orders
     SET status = 'merged',
         closed_at = now(),
         notes = COALESCE(notes || ' · ', '') || 'Merged into ' || COALESCE(t.order_no, _target_id::text),
         subtotal = 0, tax = 0, discount = 0, total = 0, updated_at = now()
   WHERE id = _source_id;

  UPDATE restaurant_tables SET current_order_id = NULL, status = 'dirty', updated_at = now()
   WHERE current_order_id = _source_id AND user_id = auth.uid();

  PERFORM public.restaurant_recalc_order(_target_id);

  INSERT INTO audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'restaurant.check.merge', 'restaurant_orders', _target_id,
          jsonb_build_object('source_order_id', _source_id, 'lines_moved', _moved));

  RETURN _target_id;
END $$;

REVOKE ALL ON FUNCTION public.restaurant_merge_checks(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_merge_checks(uuid, uuid) TO authenticated, service_role;

-- 5) Transfer a check to another table and/or server.
CREATE OR REPLACE FUNCTION public.restaurant_transfer_check(_order_id uuid, _table_id uuid DEFAULT NULL, _server_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o record;
BEGIN
  SELECT * INTO o FROM restaurant_orders WHERE id = _order_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Check not found'; END IF;
  IF o.status NOT IN ('open', 'held') OR o.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only open or held checks can be transferred';
  END IF;

  IF _table_id IS NOT NULL AND _table_id IS DISTINCT FROM o.table_id THEN
    IF NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE id = _table_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Destination table not found';
    END IF;
    UPDATE restaurant_tables SET current_order_id = NULL, status = 'dirty', updated_at = now()
     WHERE id = o.table_id AND user_id = auth.uid();
    UPDATE restaurant_tables
       SET current_order_id = _order_id, status = 'occupied', occupied_since = now(),
           server_name = COALESCE(_server_name, o.server_name), updated_at = now()
     WHERE id = _table_id AND user_id = auth.uid();
  END IF;

  UPDATE restaurant_orders
     SET table_id = COALESCE(_table_id, table_id),
         server_name = COALESCE(_server_name, server_name),
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'restaurant.check.transfer', 'restaurant_orders', _order_id,
          jsonb_build_object('from_table', o.table_id, 'to_table', _table_id,
                             'from_server', o.server_name, 'to_server', _server_name));

  RETURN _order_id;
END $$;

REVOKE ALL ON FUNCTION public.restaurant_transfer_check(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_transfer_check(uuid, uuid, text) TO authenticated, service_role;