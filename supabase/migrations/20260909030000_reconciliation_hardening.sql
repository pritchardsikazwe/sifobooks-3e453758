-- Smart Reconciliation / MKP hardening.
-- Extends the existing inventory ledger and stock-count workflow only.

-- Re-assert the maker/checker rule at the database boundary.
CREATE OR REPLACE FUNCTION public.smart_reconciliation_approve(_count_id uuid)
RETURNS public.stock_counts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count public.stock_counts;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _count
  FROM public.stock_counts
  WHERE id = _count_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock count not found';
  END IF;

  IF NOT public.transfer_can_manage(_uid) THEN
    RAISE EXCEPTION 'Manager permission required';
  END IF;

  IF _count.counted_by = _uid THEN
    RAISE EXCEPTION 'The counter cannot approve their own reconciliation';
  END IF;

  IF COALESCE(_count.workflow_status, 'DRAFT') NOT IN ('SUBMITTED','IN_REVIEW') THEN
    RAISE EXCEPTION 'Only submitted stock counts can be approved';
  END IF;

  UPDATE public.stock_counts
  SET status = 'approved',
      workflow_status = 'APPROVED',
      approved_by = _uid,
      approved_at = now(),
      reviewer_id = COALESCE(reviewer_id, _uid),
      reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = _count_id
  RETURNING * INTO _count;

  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_reconciliation_reject(
  _count_id uuid,
  _reason text DEFAULT NULL
)
RETURNS public.stock_counts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count public.stock_counts;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _count
  FROM public.stock_counts
  WHERE id = _count_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock count not found';
  END IF;

  IF NOT public.transfer_can_manage(_uid) THEN
    RAISE EXCEPTION 'Manager permission required';
  END IF;

  IF COALESCE(_count.workflow_status, 'DRAFT') NOT IN ('SUBMITTED','IN_REVIEW') THEN
    RAISE EXCEPTION 'Only submitted stock counts can be rejected';
  END IF;

  UPDATE public.stock_counts
  SET status = 'draft',
      workflow_status = 'REJECTED',
      rejection_reason = NULLIF(trim(_reason), ''),
      rejected_by = _uid,
      rejected_at = now()
  WHERE id = _count_id
  RETURNING * INTO _count;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.smart_reconciliation_approve(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smart_reconciliation_reject(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_approve(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.smart_reconciliation_reject(uuid,text) TO authenticated, service_role;

-- The original MKP reconciliation view used a fixed seed user and was granted
-- to every authenticated user. Replace it with a tenant-scoped view. The
-- existing columns are retained for UI compatibility.
CREATE OR REPLACE VIEW public.mkp_inventory_reconciliation
WITH (security_invoker = true) AS
WITH mkp_locations AS (
  SELECT id, user_id, name, location_type
  FROM public.inventory_locations
  WHERE user_id = auth.uid()
    AND name IN ('MKP Farms Warehouse','Chibombo Store')
),
items AS (
  SELECT si.id, si.user_id, si.name, si.sku, si.unit,
         si.cost_price, si.sell_price
  FROM public.stock_items si
  WHERE si.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM mkp_locations l WHERE l.id = si.warehouse_id
         OR l.id IN (SELECT id FROM mkp_locations)
    )
),
mov AS (
  SELECT sm.user_id, sm.item_id, sm.location_id,
         sm.movement_type, sm.quantity
  FROM public.stock_movements sm
  WHERE sm.user_id = auth.uid()
),
calc AS (
  SELECT
    i.*,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='opening'),0) AS warehouse_initial,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='transfer_out'),0) AS warehouse_transferred_out,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='transfer_in'),0) AS warehouse_transferred_in,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='purchase'),0) AS warehouse_purchased,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='return'),0) AS warehouse_returns,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type IN ('adjust','adjust_in','adjust_out')),0) AS warehouse_adjustments,
    COALESCE((SELECT quantity FROM public.stock_balances sb JOIN mkp_locations l ON l.id=sb.location_id
      WHERE sb.item_id=i.id AND l.name='MKP Farms Warehouse' LIMIT 1),0) AS warehouse_current,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='transfer_in'),0) AS chibombo_received,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='sale'),0) AS chibombo_sales,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='return'),0) AS chibombo_returns,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type IN ('adjust','adjust_in','adjust_out')),0) AS chibombo_adjustments,
    COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id
      WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='transfer_out'),0) AS chibombo_transferred_out,
    COALESCE((SELECT quantity FROM public.stock_balances sb JOIN mkp_locations l ON l.id=sb.location_id
      WHERE sb.item_id=i.id AND l.name='Chibombo Store' LIMIT 1),0) AS chibombo_current
  FROM items i
)
SELECT * FROM calc;

GRANT SELECT ON public.mkp_inventory_reconciliation TO authenticated;

-- Non-destructive acceptance/audit view for the K-Shine scenario. It exposes
-- the live ledger checkpoints without inserting test transactions.
CREATE OR REPLACE VIEW public.mkp_kshine_inventory_audit
WITH (security_invoker = true) AS
SELECT
  r.item_id,
  r.sku,
  r.name,
  r.unit,
  r.warehouse_current,
  r.chibombo_current,
  (r.warehouse_current + r.chibombo_current) AS company_available,
  r.cost_price,
  (r.warehouse_current * r.cost_price) AS warehouse_cost_value,
  (r.chibombo_current * r.cost_price) AS chibombo_cost_value,
  ((r.warehouse_current + r.chibombo_current) * r.cost_price) AS company_cost_value
FROM public.mkp_inventory_reconciliation r
WHERE r.sku = 'MKP-KSH-25';

GRANT SELECT ON public.mkp_kshine_inventory_audit TO authenticated;
