-- MKP SEPTEMBER 2026 OPENING CHECKPOINT
--
-- The August reconciliation is the historical cut-off. We do NOT insert another
-- opening movement because doing so would double-count the existing ledger.
-- September opening is calculated transactionally from all MKP stock movements
-- dated on or before 2026-08-31, separately for Warehouse and Chibombo.
--
-- Going forward:
--   * Warehouse and Chibombo remain separate inventory locations.
--   * POS stock is read from the register/shift location.
--   * Only completed POS sales reduce stock.
--   * Warehouse -> Chibombo remains a transfer, never a sale.

DO $mkp_setup$
DECLARE
  _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75';
  _store uuid;
  _register uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
    RETURN;
  END IF;

  SELECT id INTO _store
  FROM public.inventory_locations
  WHERE user_id = _uid
    AND upper(code) = 'CHIBOMBO'
    AND is_active = true
  LIMIT 1;

  IF _store IS NULL THEN
    RAISE EXCEPTION 'MKP Chibombo Store location was not found';
  END IF;

  -- Pin the existing primary retail register to Chibombo. We do not create a
  -- second POS engine or a second register; this only corrects the location
  -- binding used by the existing POS/stock engine.
  SELECT id INTO _register
  FROM public.pos_registers
  WHERE is_active = true
    AND lower(trim(name)) IN ('register 01', 'main register', 'main')
  ORDER BY CASE lower(trim(name))
    WHEN 'register 01' THEN 1
    WHEN 'main register' THEN 2
    ELSE 3
  END
  LIMIT 1;

  IF _register IS NOT NULL THEN
    UPDATE public.pos_registers
       SET location_id = _store
     WHERE id = _register;

    UPDATE public.pos_shifts
       SET location_id = _store
     WHERE register_id = _register
       AND (location_id IS NULL OR location_id <> _store);
  END IF;
END $mkp_setup$;

-- Transaction-derived September opening by location. This is deliberately a
-- view rather than a balance overwrite, so every figure remains explainable
-- from the stock movement ledger.
CREATE OR REPLACE VIEW public.mkp_september_2026_opening AS
WITH products AS (
  SELECT id, name, sku, unit, cost_price, sell_price
  FROM public.stock_items
  WHERE user_id = 'e54d7679-cd55-4fee-8811-6b8e260cba75'
    AND sku IN (
      'MKP-BSG-25','MKP-SC-25','MKP-MN-500','MKP-N32-500',
      'MKP-NVX-500','MKP-ZOX-1L','MKP-BOR-1L','MKP-MRG-500',
      'MKP-BSL-1L','MKP-SCL-1L','MKP-KSH-25','MKP-BFM-25',
      'MKP-MGW-50','MKP-MN3-5','MKP-SMP-5','MKP-CPC-5'
    )
), locations AS (
  SELECT id, name, code
  FROM public.inventory_locations
  WHERE user_id = 'e54d7679-cd55-4fee-8811-6b8e260cba75'
    AND upper(code) IN ('MKP-WH','CHIBOMBO')
), movement_totals AS (
  SELECT
    sm.item_id,
    sm.location_id,
    COALESCE(SUM(
      CASE
        WHEN sm.movement_type IN ('in','opening','purchase','return','transfer_in','adjust_in','production') THEN sm.quantity
        WHEN sm.movement_type IN ('out','sale','transfer_out','adjust_out') THEN -sm.quantity
        WHEN sm.movement_type = 'reversal' THEN sm.quantity
        ELSE 0
      END
    ), 0) AS qty
  FROM public.stock_movements sm
  JOIN products p ON p.id = sm.item_id
  JOIN locations l ON l.id = sm.location_id
  WHERE sm.transaction_date <= DATE '2026-08-31'
  GROUP BY sm.item_id, sm.location_id
)
SELECT
  p.id AS item_id,
  p.name,
  p.sku,
  p.unit,
  p.cost_price,
  p.sell_price,
  COALESCE(MAX(CASE WHEN upper(l.code) = 'MKP-WH' THEN mt.qty END), 0) AS warehouse_opening_qty,
  COALESCE(MAX(CASE WHEN upper(l.code) = 'CHIBOMBO' THEN mt.qty END), 0) AS chibombo_opening_qty,
  COALESCE(MAX(CASE WHEN upper(l.code) = 'MKP-WH' THEN mt.qty END), 0)
    + COALESCE(MAX(CASE WHEN upper(l.code) = 'CHIBOMBO' THEN mt.qty END), 0) AS company_opening_qty,
  COALESCE(MAX(CASE WHEN upper(l.code) = 'MKP-WH' THEN mt.qty END), 0) * p.cost_price AS warehouse_cost_value,
  COALESCE(MAX(CASE WHEN upper(l.code) = 'CHIBOMBO' THEN mt.qty END), 0) * p.cost_price AS chibombo_cost_value,
  (
    COALESCE(MAX(CASE WHEN upper(l.code) = 'MKP-WH' THEN mt.qty END), 0)
    + COALESCE(MAX(CASE WHEN upper(l.code) = 'CHIBOMBO' THEN mt.qty END), 0)
  ) * p.cost_price AS company_cost_value,
  COALESCE(MAX(CASE WHEN upper(l.code) = 'CHIBOMBO' THEN mt.qty END), 0) * p.sell_price AS chibombo_retail_value
FROM products p
CROSS JOIN locations l
LEFT JOIN movement_totals mt ON mt.item_id = p.id AND mt.location_id = l.id
GROUP BY p.id,p.name,p.sku,p.unit,p.cost_price,p.sell_price;

ALTER VIEW public.mkp_september_2026_opening SET (security_invoker = true);
GRANT SELECT ON public.mkp_september_2026_opening TO authenticated;

-- Make the historical checkpoint view security-invoker as well so its fixed MKP
-- dataset cannot bypass the underlying tenant RLS rules.
ALTER VIEW public.mkp_chibombo_august_2026_checkpoint SET (security_invoker = true);

-- A compact control view for the September operating dashboard.
CREATE OR REPLACE VIEW public.mkp_september_2026_control AS
SELECT
  COUNT(*) AS product_count,
  COALESCE(SUM(chibombo_opening_qty),0) AS chibombo_opening_units,
  COALESCE(SUM(warehouse_opening_qty),0) AS warehouse_opening_units,
  COALESCE(SUM(company_opening_qty),0) AS company_opening_units,
  COALESCE(SUM(chibombo_cost_value),0) AS chibombo_cost_value,
  COALESCE(SUM(warehouse_cost_value),0) AS warehouse_cost_value,
  COALESCE(SUM(company_cost_value),0) AS company_cost_value,
  COALESCE(SUM(chibombo_retail_value),0) AS chibombo_retail_value
FROM public.mkp_september_2026_opening;

ALTER VIEW public.mkp_september_2026_control SET (security_invoker = true);
GRANT SELECT ON public.mkp_september_2026_control TO authenticated;
