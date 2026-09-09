-- FINAL INVENTORY FLOW: approval is a required control point before dispatch.
-- No stock is moved by approval. Stock moves only when an approved transfer is dispatched.

CREATE OR REPLACE FUNCTION public.approve_stock_transfer(_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
BEGIN
  SELECT * INTO t
  FROM public.inventory_transfers
  WHERE id = _transfer_id
  FOR UPDATE;

  IF t IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  IF NOT public.transfer_can_manage(t.user_id)
     AND NOT public.has_perm('inventory.transfer.approve', t.user_id) THEN
    RAISE EXCEPTION 'Not authorised to approve stock transfer';
  END IF;

  IF t.status NOT IN ('draft','submitted') THEN
    RAISE EXCEPTION 'Only draft or submitted transfers can be approved (current status: %)', t.status;
  END IF;

  IF t.from_location_id IS NULL OR t.to_location_id IS NULL THEN
    RAISE EXCEPTION 'Both source and destination locations are required';
  END IF;

  IF t.from_location_id = t.to_location_id THEN
    RAISE EXCEPTION 'Source and destination locations must be different';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.inventory_transfer_items i
    WHERE i.transfer_id = t.id
      AND i.item_id IS NOT NULL
      AND i.quantity > 0
  ) THEN
    RAISE EXCEPTION 'Transfer must contain at least one stock item';
  END IF;

  UPDATE public.inventory_transfers
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  WHERE id = t.id;

  RETURN jsonb_build_object('ok', true, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(_transfer_id uuid, _allow_negative boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  l record;
  _transit uuid;
  _bal numeric;
BEGIN
  SELECT * INTO t
  FROM public.inventory_transfers
  WHERE id = _transfer_id
  FOR UPDATE;

  IF t IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  IF NOT public.transfer_can_manage(t.user_id) THEN
    RAISE EXCEPTION 'Not authorised to dispatch stock';
  END IF;

  -- Critical control: dispatch can only happen after approval.
  IF t.status <> 'approved' THEN
    RAISE EXCEPTION 'Transfer must be approved before dispatch (current status: %)', t.status;
  END IF;

  IF t.from_location_id IS NULL OR t.to_location_id IS NULL THEN
    RAISE EXCEPTION 'Both source and destination locations are required';
  END IF;

  IF t.from_location_id = t.to_location_id THEN
    RAISE EXCEPTION 'Source and destination locations must be different';
  END IF;

  _transit := public.ensure_transit_location(t.user_id);

  FOR l IN
    SELECT * FROM public.inventory_transfer_items
    WHERE transfer_id = t.id
    FOR UPDATE
  LOOP
    CONTINUE WHEN l.item_id IS NULL OR l.quantity <= 0;

    SELECT COALESCE(quantity, 0) INTO _bal
    FROM public.stock_balances
    WHERE item_id = l.item_id
      AND location_id = t.from_location_id
    FOR UPDATE;

    IF NOT _allow_negative AND COALESCE(_bal, 0) < l.quantity THEN
      RAISE EXCEPTION 'Insufficient stock at source for % (available %, requested %)',
        COALESCE(l.description, 'item'), COALESCE(_bal, 0), l.quantity;
    END IF;

    INSERT INTO public.stock_movements
      (user_id, item_id, location_id, movement_type, quantity, unit_cost,
       reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES
      (t.user_id, l.item_id, t.from_location_id, 'transfer_out', l.quantity, l.unit_cost,
       COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date,
       'transfer', t.id, auth.uid(), 'Dispatch');

    INSERT INTO public.stock_movements
      (user_id, item_id, location_id, movement_type, quantity, unit_cost,
       reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES
      (t.user_id, l.item_id, _transit, 'transfer_in', l.quantity, l.unit_cost,
       COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date,
       'transfer', t.id, auth.uid(), 'In transit');
  END LOOP;

  UPDATE public.inventory_transfers
  SET status = 'in_transit',
      dispatched_at = now(),
      dispatched_by = auth.uid(),
      updated_at = now()
  WHERE id = t.id;

  RETURN jsonb_build_object('ok', true, 'status', 'in_transit');
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_stock_transfer(_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  l record;
  _transit uuid;
  _qty numeric;
BEGIN
  SELECT * INTO t
  FROM public.inventory_transfers
  WHERE id = _transfer_id
  FOR UPDATE;

  IF t IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  IF NOT public.transfer_can_manage(t.user_id) THEN
    RAISE EXCEPTION 'Not authorised to receive stock';
  END IF;

  IF t.status <> 'in_transit' THEN
    RAISE EXCEPTION 'Only dispatched transfers can be received (current status: %)', t.status;
  END IF;

  _transit := public.ensure_transit_location(t.user_id);

  FOR l IN
    SELECT * FROM public.inventory_transfer_items
    WHERE transfer_id = t.id
    FOR UPDATE
  LOOP
    CONTINUE WHEN l.item_id IS NULL OR l.quantity <= 0;

    _qty := CASE WHEN l.qty_received > 0 THEN l.qty_received ELSE l.quantity END;

    IF _qty <= 0 OR _qty > l.quantity THEN
      RAISE EXCEPTION 'Invalid received quantity for %: received %, dispatched %',
        COALESCE(l.description, 'item'), _qty, l.quantity;
    END IF;

    INSERT INTO public.stock_movements
      (user_id, item_id, location_id, movement_type, quantity, unit_cost,
       reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES
      (t.user_id, l.item_id, _transit, 'transfer_out', _qty, l.unit_cost,
       COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE,
       'transfer', t.id, auth.uid(), 'Out of transit');

    INSERT INTO public.stock_movements
      (user_id, item_id, location_id, movement_type, quantity, unit_cost,
       reference, transfer_id, transaction_date, source_type, source_id, created_by, note)
    VALUES
      (t.user_id, l.item_id, t.to_location_id, 'transfer_in', _qty, l.unit_cost,
       COALESCE(t.transfer_number, t.reference), t.id, CURRENT_DATE,
       'transfer', t.id, auth.uid(), 'Received');

    UPDATE public.inventory_transfer_items
    SET qty_received = _qty
    WHERE id = l.id;
  END LOOP;

  UPDATE public.inventory_transfers
  SET status = 'completed',
      received_at = now(),
      received_by = auth.uid(),
      updated_at = now()
  WHERE id = t.id;

  RETURN jsonb_build_object('ok', true, 'status', 'completed');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_stock_transfer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_stock_transfer(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.receive_stock_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_stock_transfer(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_stock_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_stock_transfer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_stock_transfer(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.receive_stock_transfer(uuid) TO service_role;
