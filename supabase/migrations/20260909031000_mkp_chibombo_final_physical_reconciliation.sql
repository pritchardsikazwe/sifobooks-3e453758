-- Correct the MKP Chibombo historical checkpoint.
-- The supplied 04/08-31/08 sheet is a delivered/sold/remaining sheet; the
-- earlier reconciliation incorrectly treated the 04/08 quantities as closing.
-- We reverse those earlier movements and establish the 31/08 physical closing
-- by auditable location-specific adjustments. No rows are deleted or overwritten.

DO $reconcile$
DECLARE
  _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75';
  _store uuid;
  _item uuid;
  _current numeric;
  _delta numeric;
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN RETURN; END IF;

  SELECT id INTO _store
  FROM public.inventory_locations
  WHERE user_id = _uid AND upper(code) = 'CHIBOMBO'
  LIMIT 1;
  IF _store IS NULL THEN RAISE EXCEPTION 'MKP Chibombo Store location was not found'; END IF;

  -- Reverse every movement created by the superseded 2026-08 reconciliation.
  FOR r IN
    SELECT sm.id, sm.item_id, sm.movement_type, sm.quantity, sm.unit_cost
    FROM public.stock_movements sm
    WHERE sm.user_id = _uid
      AND sm.location_id = _store
      AND sm.reference IN (
        'MKP-CHIBOMBO-OPENING-RECON-2026-08-04',
        'MKP-CHIBOMBO-AUGUST-STOCKTAKE-SALES-2026-08'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.stock_movements rev
        WHERE rev.user_id = _uid
          AND rev.location_id = _store
          AND rev.source_id = sm.id
          AND rev.reference = 'MKP-CHIBOMBO-RECON-REVERSAL-2026-09-09'
      )
  LOOP
    INSERT INTO public.stock_movements
      (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
       transaction_date,source_type,source_id,created_by,note)
    VALUES
      (_uid,r.item_id,_store,
       CASE WHEN r.movement_type='adjust_in' THEN 'adjust_out'
            WHEN r.movement_type='adjust_out' THEN 'adjust_in'
            ELSE 'reversal' END,
       r.quantity,r.unit_cost,'MKP-CHIBOMBO-RECON-REVERSAL-2026-09-09',
       DATE '2026-09-09','historical_reconciliation_reversal',r.id,_uid,
       'Reversal of superseded MKP Chibombo historical reconciliation movement; original retained for audit.');
  END LOOP;

  -- 31/08/2026 physical closing quantities from the supplied Chibombo sheet.
  FOR r IN SELECT * FROM (VALUES
    ('MKP-BFM-25',63::numeric),('MKP-MGW-50',12::numeric),('MKP-MN3-5',0::numeric),
    ('MKP-CPC-5',74::numeric),('MKP-SMP-5',27::numeric),('MKP-KSH-25',88::numeric),
    ('MKP-SCL-1L',97::numeric),('MKP-BSL-1L',95::numeric),('MKP-MRG-500',15::numeric),
    ('MKP-BOR-1L',39::numeric),('MKP-ZOX-1L',99::numeric),('MKP-NVX-500',196::numeric),
    ('MKP-N32-500',198::numeric),('MKP-MN-500',194::numeric),('MKP-SC-25',9::numeric),
    ('MKP-BSG-25',9::numeric)
  ) AS v(sku,target_qty)
  LOOP
    SELECT id INTO _item FROM public.stock_items
    WHERE user_id=_uid AND sku=r.sku LIMIT 1;
    IF _item IS NULL THEN RAISE EXCEPTION 'MKP product % not found',r.sku; END IF;

    SELECT COALESCE(quantity,0) INTO _current
    FROM public.stock_balances WHERE item_id=_item AND location_id=_store;
    _delta := r.target_qty-COALESCE(_current,0);

    IF _delta > 0 THEN
      INSERT INTO public.stock_movements
        (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,transaction_date,source_type,source_id,created_by,note)
      SELECT _uid,_item,_store,'adjust_in',_delta,cost_price,
        'MKP-CHIBOMBO-FINAL-CLOSING-RECON-2026-08-31',DATE '2026-08-31',
        'historical_physical_reconciliation',_item,_uid,
        'Final physical Chibombo closing stock at 31/08/2026 from supplied MKP sheet.'
      FROM public.stock_items WHERE id=_item;
    ELSIF _delta < 0 THEN
      INSERT INTO public.stock_movements
        (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,transaction_date,source_type,source_id,created_by,note)
      SELECT _uid,_item,_store,'adjust_out',abs(_delta),cost_price,
        'MKP-CHIBOMBO-FINAL-CLOSING-RECON-2026-08-31',DATE '2026-08-31',
        'historical_physical_reconciliation',_item,_uid,
        'Final physical Chibombo closing stock at 31/08/2026 from supplied MKP sheet.'
      FROM public.stock_items WHERE id=_item;
    END IF;
  END LOOP;

  -- Preserve the physical delivered/sold/remaining sheet as an audit record.
  INSERT INTO public.cashier_records
    (user_id,location_id,cashier_name,period_start,period_end,item_id,delivered_qty,sold_qty,remaining_qty,selling_price,sales_value,status,notes,created_by)
  SELECT _uid,_store,'MKP Chibombo physical reconciliation',DATE '2026-08-04',DATE '2026-08-31',si.id,
         v.delivered,v.stock_out,v.remaining,si.sell_price,0,'historical_reconciled_corrected',
         'Physical stock checkpoint only. Cash/revenue is not recreated; earlier reconciliation record retained for audit.',_uid
  FROM public.stock_items si
  JOIN (VALUES
    ('MKP-BFM-25',146::numeric,83::numeric,63::numeric),('MKP-MGW-50',48::numeric,36::numeric,12::numeric),
    ('MKP-MN3-5',69::numeric,69::numeric,0::numeric),('MKP-CPC-5',77::numeric,3::numeric,74::numeric),
    ('MKP-SMP-5',43::numeric,16::numeric,27::numeric),('MKP-KSH-25',98::numeric,10::numeric,88::numeric),
    ('MKP-SCL-1L',97::numeric,0::numeric,97::numeric),('MKP-BSL-1L',97::numeric,2::numeric,95::numeric),
    ('MKP-MRG-500',19::numeric,4::numeric,15::numeric),('MKP-BOR-1L',50::numeric,11::numeric,39::numeric),
    ('MKP-ZOX-1L',100::numeric,1::numeric,99::numeric),('MKP-NVX-500',198::numeric,2::numeric,196::numeric),
    ('MKP-N32-500',200::numeric,2::numeric,198::numeric),('MKP-MN-500',197::numeric,3::numeric,194::numeric),
    ('MKP-SC-25',9::numeric,0::numeric,9::numeric),('MKP-BSG-25',9::numeric,0::numeric,9::numeric)
  ) v(sku,delivered,stock_out,remaining) ON v.sku=si.sku
  WHERE si.user_id=_uid;
END $reconcile$;

-- Corrected physical closing checkpoint used by MKP reconciliation screens.
CREATE OR REPLACE VIEW public.mkp_chibombo_august_2026_checkpoint AS
SELECT
  si.id AS item_id, si.name, si.sku, si.unit, si.cost_price, si.sell_price,
  COALESCE(sb.quantity,0) AS ledger_balance,
  v.remaining AS physical_closing_qty,
  v.remaining * si.cost_price AS physical_closing_cost_value,
  v.remaining * si.sell_price AS physical_closing_retail_value
FROM public.stock_items si
JOIN (VALUES
  ('MKP-BFM-25',63::numeric),('MKP-MGW-50',12::numeric),('MKP-MN3-5',0::numeric),
  ('MKP-CPC-5',74::numeric),('MKP-SMP-5',27::numeric),('MKP-KSH-25',88::numeric),
  ('MKP-SCL-1L',97::numeric),('MKP-BSL-1L',95::numeric),('MKP-MRG-500',15::numeric),
  ('MKP-BOR-1L',39::numeric),('MKP-ZOX-1L',99::numeric),('MKP-NVX-500',196::numeric),
  ('MKP-N32-500',198::numeric),('MKP-MN-500',194::numeric),('MKP-SC-25',9::numeric),
  ('MKP-BSG-25',9::numeric)
) v(sku,remaining) ON v.sku=si.sku
LEFT JOIN public.stock_balances sb
  ON sb.item_id=si.id
 AND sb.location_id=(SELECT id FROM public.inventory_locations WHERE user_id=si.user_id AND upper(code)='CHIBOMBO' LIMIT 1)
WHERE si.user_id='e54d7679-cd55-4fee-8811-6b8e260cba75';

ALTER VIEW public.mkp_chibombo_august_2026_checkpoint SET (security_invoker=true);
GRANT SELECT ON public.mkp_chibombo_august_2026_checkpoint TO authenticated;
