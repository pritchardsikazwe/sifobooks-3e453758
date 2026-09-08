-- Harden inventory transfers so dispatch cannot bypass approval.
-- Safe to run after the existing transfer migrations.

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

  IF NOT public.transfer_can_manage(t.user_id) THEN
    RAISE EXCEPTION 'Not authorised to approve stock transfers';
  END IF;

  IF t.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted transfers can be approved';
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

  IF t.status <> 'approved' THEN
    RAISE EXCEPTION 'Transfer must be approved before dispatch';
  END IF;

  IF t.from_location_id IS NULL OR t.to_location_id IS NULL THEN
    RAISE EXCEPTION 'Both source and destination locations are required';
  END IF;

  _transit := public.ensure_transit_location(t.user_id);

  FOR l IN
    SELECT *
    FROM public.inventory_transfer_items
    WHERE transfer_id = t.id
  LOOP
    CONTINUE WHEN l.item_id IS NULL OR l.quantity <= 0;

    SELECT COALESCE(quantity, 0)
    INTO _bal
    FROM public.stock_balances
    WHERE item_id = l.item_id
      AND location_id = t.from_location_id
    FOR UPDATE;

    IF NOT _allow_negative AND COALESCE(_bal, 0) < l.quantity THEN
      RAISE EXCEPTION 'Insufficient stock at source for % (available %, requested %)',
        COALESCE(l.description, 'item'), COALESCE(_bal, 0), l.quantity;
    END IF;

    INSERT INTO public.stock_movements (
      user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note
    )
    VALUES (
      t.user_id, l.item_id, t.from_location_id, 'transfer_out', l.quantity, l.unit_cost,
      COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date,
      'transfer', t.id, auth.uid(), 'Dispatch'
    );

    INSERT INTO public.stock_movements (
      user_id, item_id, location_id, movement_type, quantity, unit_cost,
      reference, transfer_id, transaction_date, source_type, source_id, created_by, note
    )
    VALUES (
      t.user_id, l.item_id, _transit, 'transfer_in', l.quantity, l.unit_cost,
      COALESCE(t.transfer_number, t.reference), t.id, t.transfer_date,
      'transfer', t.id, auth.uid(), 'In transit'
    );
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

REVOKE ALL ON FUNCTION public.approve_stock_transfer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_stock_transfer(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_stock_transfer(uuid, boolean) TO authenticated;
