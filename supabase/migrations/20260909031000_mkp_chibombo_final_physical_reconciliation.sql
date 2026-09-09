-- MKP CHIBOMBO FINAL PHYSICAL RECONCILIATION
--
-- IMPORTANT CORRECTION:
-- The earlier historical reconciliation used the 04/08 opening quantities as if
-- they were the final August quantities. The supplied Chibombo sheet actually
-- gives delivered, stock-out/sold and remaining quantities for the period.
-- This migration reverses the earlier reconciliation movements (without deleting
-- them) and establishes the 31/08/2026 physical closing as the new authoritative
-- stock checkpoint.
--
-- The printed sheet gives these final quantities:
-- Breakfast Meal 63, Roller Meal 12, Meal No.3 0, Couples Choice 74,
-- Samp Meal 27, K-Shine 88, Fertanix Liquid 97, Satva Liquid 95,
-- Margical 15, Boron 39, Zox 99, Nutrivox 196, Triple N32 198,
-- Micronutrient 194, Fertanix Granules 9, Satva Granules 9.
-- Total Chibombo physical closing stock = 1,215 units.
--
-- We do NOT delete or overwrite prior movements. Reversal movements preserve
-- the audit trail, then one final location-specific adjustment establishes the
-- physical closing checkpoint. Future POS activity starts from this ledger.

DO $mkp_final_reconcile$
DECLARE
  _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75';
  _store uuid;
  _item uuid;
  _current numeric;
  _target numeric;
  _delta numeric;
  _r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
    RETURN;
  END IF;

  SELECT id INTO _store
  FROM public.inventory_locations
  WHERE user_id = _uid AND upper(code) = 'CHIBOMBO'
  LIMIT 1;

  IF _store IS NULL THEN
    RAISE EXCEPTION 'MKP Chibombo Store location was not found';
  END IF;

  -- Reverse the earlier reconciliation movements by posting the exact opposite
  -- movement type. The original rows remain untouched for audit purposes.
  FOR _r IN
    SELECT id, item_id, movement_type, quantity, unit_cost
    FROM public.stock_movements
    WHERE user_id = _uid
      AND location_id = _store
      AND reference IN (
        'MKP-CHIBOMBO-OPENING-RECON-2026-08-04',
        'MKP-CHIBOMBO-AUGUST-STOCKTAKE-SALES-2026-08'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.stock_movements rev
        WHERE rev.user_id = _uid
          AND rev.location_id = _store
          AND rev.source_id = _r.id
          AND rev.reference = 'MKP-CHIBOMBO-RECON-REVERSAL-2026-09-09'
      )
  LOOP
    INSERT INTO public.stock_movements
      (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
       transaction_date,source_type,source_id,created_by,note)
    VALUES
      (_uid,_r.item_id,_store,
       CASE
         WHEN _r.movement_type = 'adjust_in' THEN 'adjust_out'
         WHEN _r.movement_type = 'adjust_out' THEN 'adjust_in'
         WHEN _r.movement_type = 'sale' THEN 'reversal'
         ELSE 'reversal'
       END,
       _r.quantity,_r.unit_cost,
       'MKP-CHIBOMBO-RECON-REVERSAL-2026-09-09',
       DATE '2026-09-09','historical_reconciliation_reversal',_r.id,_uid,
       'Reversal of superseded 04/08 opening / August stock-take reconciliation. Original movement retained for audit.');
  END LOOP;

  -- Final physical closing checkpoint from the supplied Chibombo sheet.
  FOR _r IN
    SELECT * FROM (VALUES
      ('MKP-BFM-25', 63::numeric),
      ('MKP-MGW-50', 12::numeric),
      ('MKP-MN3-5', 0::numeric),
      ('MKP-CPC-5', 74::numeric),
      ('MKP-SMP-5', 27::numeric),
      ('MKP-KSH-25', 88::numeric),
      ('MKP-SCL-1L', 97::numeric),
      ('MKP-BSL-1L', 95::numeric),
      ('MKP-MRG-500', 15::numeric),
      ('MKP-BOR-1L', 39::numeric),
      ('MKP-ZOX-1L', 99::numeric),
      ('MKP-NVX-500', 196::numeric),
      ('MKP-N32-500', 198::numeric),
      ('MKP-MN-500', 194::numeric),
      ('MKP-SC-25', 9::numeric),
      ('MKP-BSG-25', 9::numeric)
    ) AS v(sku,target_qty)
  LOOP
    SELECT id INTO _item
    FROM public.stock_items
    WHERE user_id = _uid AND sku = _r.sku
    LIMIT 1;

    IF _item IS NULL THEN
      RAISE EXCEPTION 'MKP product % not found', _r.sku;
    END IF;

    SELECT COALESCE(quantity,0) INTO _current
    FROM public.stock_balances
    WHERE item_id = _item AND location_id = _store;

    _target := _r.target_qty;
    _delta := _target - COALESCE(_current,0);

    IF _delta > 0 THEN
      INSERT INTO public.stock_movements
        (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
         transaction_date,source_type,source_id,created_by,note)
      SELECT _uid,_item,_store,'adjust_in',_delta,si.cost_price,
        'MKP-CHIBOMBO-FINAL-CLOSING-RECON-2026-08-31',DATE '2026-08-31',
        'historical_physical_reconciliation',_item,_uid,
        'Final physical Chibombo closing stock at 31/08/2026 from supplied MKP sheet.'
      FROM public.stock_items si WHERE si.id = _item;
    ELSIF _delta < 0 THEN
      INSERT INTO public.stock_movements
        (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
         transaction_date,source_type,source_id,created_by,note)
      SELECT _uid,_item,_store,'adjust_out',abs(_delta),si.cost_price,
        'MKP-CHIBOMBO-FINAL-CLOSING-RECON-2026-08-31',DATE '2026-08-31',
        'historical_physical_reconciliation',_item,_uid,
        'Final physical Chibombo closing stock at 31/08/2026 from supplied MKP sheet.'
      FROM public.stock_items si WHERE si.id = _item;
    END IF;
  END LOOP;

  -- Preserve the exact delivered/sold/remaining physical-flow information from
  -- the sheet as an audit record. Stock quantities are authoritative in the
  -- inventory ledger; this record is explicitly historical and does not create
  -- POS or GL transactions.
  INSERT INTO public.cashier_records
    (user_id,location_id,cashier_name,period_start,period_end,item_id,
     delivered_qty,sold_qty,remaining_qty,selling_price,sales_value,status,notes,created_by)
  SELECT _uid,_store,'MKP Chibombo physical reconciliation',DATE '2026-08-04',DATE '2026-08-31',si.id,
         v.delivered_qty,v.stock_out_qty,v.remaining_qty,si.sell_price,0,
         'historical_reconciled_corrected',
         'Corrected from supplied Chibombo sheet. Physical closing is authoritative; cash/revenue amounts are not recreated here. Earlier reconciliation record is retained for audit.',_uid
  FROM public.stock_items si
  JOIN (VALUES
    ('MKP-BFM-25',146::numeric,83::numeric,63::numeric),
    ('MKP-MGW-50',48::numeric,36::numeric,12::numeric),
    ('MKP-MN3-5',69::numeric,69::numeric,0::numeric),
    ('MKP-CPC-5',77::numeric,3::numeric,74::numeric),
    ('MKP-SMP-5',43::numeric,16::numeric,27::numeric),
    ('MKP-KSH-25',98::numeric,10::numeric,88::numeric),
    ('MKP-SCL-1L',97::numeric,0::numeric,97::numeric),
    ('MKP-BSL-1L',97::numeric,2::numeric,95::numeric),
    ('MKP-MRG-500',19::numeric,4::numeric,15::numeric),
    ('MKP-BOR-1L',50::numeric,11::numeric,39::numeric),
    ('MKP-ZOX-1L',100::numeric,1::numeric,99::numeric),
    ('MKP-NVX-500',198::numeric,2::numeric,196::numeric),
    ('MKP-N32-500',200::numeric,2::numeric,198::numeric),
    ('MKP-MN-500',197::numeric,3::numeric,194::numeric),
    ('MKP-SC-25',9::numeric,0::numeric,9::numeric),
    ('MKP-BSG-25',9::numeric,0::numeric,9::numeric)
  ) AS v(sku,delivered_qty,stock_out_qty,remaining_qty) ON v.sku = si.sku
  WHERE si.user_id = _uid;
END $mkp_final_reconcile$;

-- Replace the checkpoint with the corrected 31-August physical closing values.
CREATE OR REPLACE VIEW public.mkp_chibombo_august_2026_checkpoint AS
SELECT
  si.id AS item_id,
  si.name,
  si.sku,
  si.unit,
  si.cost_price,
  si.sell_price,
  COALESCE(sb.quantity,0) AS ledger_balance,
  CASE si.sku
    WHEN 'MKP-BFM-25' THEN 63
    WHEN 'MKP-MGW-50' THEN 12
    WHEN 'MKP-MN3-5' THEN 0
    WHEN 'MKP-CPC-5' THEN 74
    WHEN 'MKP-SMP-5' THEN 27
    WHEN 'MKP-KSH-25' THEN 88
    WHEN 'MKP-SCL-1L' THEN 97
    WHEN 'MKP-BSL-1L' THEN 95
    WHEN 'MKP-MRG-500' THEN 15
    WHEN 'MKP-BOR-1L' THEN 39
    WHEN 'MKP-ZOX-1L' THEN 99
    WHEN 'MKP-NVX-500' THEN 196
    WHEN 'MKP-N32-500' THEN 198
    WHEN 'MKP-MN-500' THEN 194
    WHEN 'MKP-SC-25' THEN 9
    WHEN 'MKP-BSG-25' THEN 9
  END::numeric AS physical_closing_qty,
  (
    CASE si.sku
      WHEN 'MKP-BFM-25' THEN 63 WHEN 'MKP-MGW-50' THEN 12 WHEN 'MKP-MN3-5' THEN 0
      WHEN 'MKP-CPC-5' THEN 74 WHEN 'MKP-SMP-5' THEN 27 WHEN 'MKP-KSH-25' THEN 88
      WHEN 'MKP-SCL-1L' THEN 97 WHEN 'MKP-BSL-1L' THEN 95 WHEN 'MKP-MRG-500' THEN 15
      WHEN 'MKP-BOR-1L' THEN 39 WHEN 'MKP-ZOX-1L' THEN 99 WHEN 'MKP-NVX-500' THEN 196
      WHEN 'MKP-N32-500' THEN 198 WHEN 'MKP-MN-500' THEN 194 WHEN 'MKP-SC-25' THEN 9
      WHEN 'MKP-BSG-25' THEN 9
    END::numeric
  ) * si.cost_price AS physical_closing_cost_value,
  (
    CASE si.sku
      WHEN 'MKP-BFM-25' THEN 63 WHEN 'MKP-MGW-50' THEN 12 WHEN 'MKP-MN3-5' THEN 0
      WHEN 'MKP-CPC-5' THEN 74 WHEN 'MKP-SMP-5' THEN 27 WHEN 'MKP-KSH-25' THEN 88
      WHEN 'MKP-SCL-1L' THEN 97 WHEN 'MKP-BSL-1L' THEN 95 WHEN 'MKP-MRG-500' THEN 15
      WHEN 'MKP-BOR-1L' THEN 39 WHEN 'MKP-ZOX-1L' THEN 99 WHEN 'MKP-NVX-500' THEN 196
      WHEN 'MKP-N32-500' THEN 198 WHEN 'MKP-MN-500' THEN 194 WHEN 'MKP-SC-25' THEN 9
      WHEN 'MKP-BSG-25' THEN 9
    END::numeric
  ) * si.sell_price AS physical_closing_retail_value
FROM public.stock_items si
LEFT JOIN public.stock_balances sb
  ON sb.item_id = si.id
 AND sb.location_id = (SELECT id FROM public.inventory_locations WHERE user_id = si.user_id AND upper(code) = 'CHIBOMBO' LIMIT 1)
WHERE si.user_id = 'e54d7679-cd55-4fee-8811-6b8e260cba75'
  AND si.sku IN (
    'MKP-BFM-25','MKP-MGW-50','MKP-MN3-5','MKP-CPC-5','MKP-SMP-5','MKP-KSH-25',
    'MKP-SCL-1L','MKP-BSL-1L','MKP-MRG-500','MKP-BOR-1L','MKP-ZOX-1L','MKP-NVX-500',
    'MKP-N32-500','MKP-MN-500','MKP-SC-25','MKP-BSG-25'
  );

ALTER VIEW public.mkp_chibombo_august_2026_checkpoint SET (security_invoker = true);
GRANT SELECT ON public.mkp_chibombo_august_2026_checkpoint TO authenticated;
