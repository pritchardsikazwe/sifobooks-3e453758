-- MKP HISTORICAL RECONCILIATION
-- Source of truth for this checkpoint:
--   1) MKP warehouse opening stock from the supplied workbook.
--   2) Warehouse -> Chibombo transfer quantities from the supplied workbook.
--   3) Chibombo physical stock records shown in the supplied July/August sheets.
--
-- We do NOT overwrite stock_balances or stock_items.quantity_on_hand.
-- We post auditable adjustment/sale movements so the resulting Chibombo balance
-- is explainable from the ledger. The August stock-take is the closing checkpoint.
-- Conflicting later workbook receipt rows are intentionally NOT posted because
-- they would make the August physical closing impossible; they require confirmation.

DO $mkp_reconcile$
DECLARE
  _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75';
  _store uuid;
  _item uuid;
  _current numeric;
  _target numeric;
  _delta numeric;
  _sale numeric;
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

  -- The 04/08/2026 physical opening checkpoint. These values are taken from
  -- the Chibombo August stock-take sheet. Each delta is posted as an auditable
  -- adjustment, never as a direct balance overwrite.
  FOR _r IN
    SELECT * FROM (VALUES
      ('MKP-BSG-25', 9::numeric),
      ('MKP-SC-25', 9::numeric),
      ('MKP-MN-500', 194::numeric),
      ('MKP-N32-500', 198::numeric),
      ('MKP-NVX-500', 196::numeric),
      ('MKP-ZOX-1L', 99::numeric),
      ('MKP-BOR-1L', 39::numeric),
      ('MKP-MRG-500', 15::numeric),
      ('MKP-BSL-1L', 95::numeric),
      ('MKP-SCL-1L', 97::numeric),
      ('MKP-KSH-25', 88::numeric),
      ('MKP-BFM-25', 113::numeric),
      ('MKP-MGW-50', 62::numeric),
      ('MKP-MN3-5', 25::numeric),
      ('MKP-SMP-5', 27::numeric),
      ('MKP-CPC-5', 74::numeric)
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

    IF _delta > 0 AND NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE user_id=_uid AND item_id=_item AND location_id=_store
        AND movement_type='adjust_in'
        AND reference='MKP-CHIBOMBO-OPENING-RECON-2026-08-04'
    ) THEN
      SELECT cost_price INTO _sale FROM public.stock_items WHERE id=_item;
      INSERT INTO public.stock_movements
        (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
         transaction_date,source_type,source_id,created_by,note)
      VALUES
        (_uid,_item,_store,'adjust_in',_delta,_sale,
         'MKP-CHIBOMBO-OPENING-RECON-2026-08-04',DATE '2026-08-04','historical_reconciliation',_item,_uid,
         'Adjustment to the physical Chibombo opening stock recorded on 04/08/2026. Existing ledger retained.');
    ELSIF _delta < 0 AND NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE user_id=_uid AND item_id=_item AND location_id=_store
        AND movement_type='adjust_out'
        AND reference='MKP-CHIBOMBO-OPENING-RECON-2026-08-04'
    ) THEN
      SELECT cost_price INTO _sale FROM public.stock_items WHERE id=_item;
      INSERT INTO public.stock_movements
        (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
         transaction_date,source_type,source_id,created_by,note)
      VALUES
        (_uid,_item,_store,'adjust_out',abs(_delta),_sale,
         'MKP-CHIBOMBO-OPENING-RECON-2026-08-04',DATE '2026-08-04','historical_reconciliation',_item,_uid,
         'Adjustment to the physical Chibombo opening stock recorded on 04/08/2026. Existing ledger retained.');
    END IF;
  END LOOP;

  -- August 2026 physical sales. Only these six quantities are posted because
  -- they are the quantities explicitly shown in the August stock-take.
  -- These are historical inventory movements; they do not create a second POS
  -- or accounting engine. Retail values remain in cashier_records below.
  FOR _r IN
    SELECT * FROM (VALUES
      ('MKP-BSL-1L', 1::numeric),
      ('MKP-BFM-25', 59::numeric),
      ('MKP-MGW-50', 24::numeric),
      ('MKP-MN3-5', 17::numeric),
      ('MKP-SMP-5', 14::numeric),
      ('MKP-CPC-5', 5::numeric)
    ) AS v(sku,sold_qty)
  LOOP
    SELECT id INTO _item FROM public.stock_items WHERE user_id=_uid AND sku=_r.sku LIMIT 1;
    SELECT cost_price INTO _sale FROM public.stock_items WHERE id=_item;

    IF NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE user_id=_uid AND item_id=_item AND location_id=_store
        AND movement_type='sale'
        AND reference='MKP-CHIBOMBO-AUGUST-STOCKTAKE-SALES-2026-08'
    ) THEN
      INSERT INTO public.stock_movements
        (user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
         transaction_date,source_type,source_id,created_by,note)
      VALUES
        (_uid,_item,_store,'sale',_r.sold_qty,_sale,
         'MKP-CHIBOMBO-AUGUST-STOCKTAKE-SALES-2026-08',DATE '2026-08-31','historical_reconciliation',_item,_uid,
         'Historical Chibombo August stock-take sales; posted to inventory ledger only, not duplicated into POS/GL.');
    END IF;
  END LOOP;

  -- Preserve the physical sheet as an audit record. This does not change stock.
  INSERT INTO public.cashier_records
    (user_id,location_id,cashier_name,period_start,period_end,item_id,
     delivered_qty,sold_qty,remaining_qty,selling_price,sales_value,status,notes,created_by)
  SELECT _uid,_store,'MKP Chibombo historical sheet',DATE '2026-08-04',DATE '2026-08-31',si.id,
         v.opening_qty,v.sold_qty,v.closing_qty,v.selling_price,v.sales_value,
         'historical_reconciled',
         'Reconciled from supplied August 2026 stock-take. Inventory ledger is authoritative; this row preserves the source sheet.',_uid
  FROM public.stock_items si
  JOIN (VALUES
    ('MKP-BSG-25',9::numeric,0::numeric,9::numeric,1581::numeric,0::numeric),
    ('MKP-SC-25',9::numeric,0::numeric,9::numeric,1245::numeric,0::numeric),
    ('MKP-MN-500',194::numeric,0::numeric,194::numeric,259::numeric,0::numeric),
    ('MKP-N32-500',198::numeric,0::numeric,198::numeric,226::numeric,0::numeric),
    ('MKP-NVX-500',196::numeric,0::numeric,196::numeric,299::numeric,0::numeric),
    ('MKP-ZOX-1L',99::numeric,0::numeric,99::numeric,689::numeric,0::numeric),
    ('MKP-BOR-1L',39::numeric,0::numeric,39::numeric,577::numeric,0::numeric),
    ('MKP-MRG-500',15::numeric,0::numeric,15::numeric,155::numeric,0::numeric),
    ('MKP-BSL-1L',95::numeric,1::numeric,94::numeric,499::numeric,382::numeric),
    ('MKP-SCL-1L',97::numeric,0::numeric,97::numeric,382::numeric,0::numeric),
    ('MKP-KSH-25',88::numeric,0::numeric,88::numeric,504::numeric,0::numeric),
    ('MKP-BFM-25',113::numeric,59::numeric,54::numeric,220::numeric,13000::numeric),
    ('MKP-MGW-50',62::numeric,24::numeric,38::numeric,150::numeric,3900::numeric),
    ('MKP-MN3-5',25::numeric,17::numeric,8::numeric,180::numeric,3070::numeric),
    ('MKP-SMP-5',27::numeric,14::numeric,13::numeric,120::numeric,1190::numeric),
    ('MKP-CPC-5',74::numeric,5::numeric,69::numeric,150::numeric,250::numeric)
  ) AS v(sku,opening_qty,sold_qty,closing_qty,selling_price,sales_value) ON v.sku=si.sku
  WHERE si.user_id=_uid
    AND NOT EXISTS (
      SELECT 1 FROM public.cashier_records cr
      WHERE cr.user_id=_uid AND cr.location_id=_store AND cr.item_id=si.id
        AND cr.period_start=DATE '2026-08-04' AND cr.period_end=DATE '2026-08-31'
        AND cr.status='historical_reconciled'
    );
END $mkp_reconcile$;

-- A compact, transaction-derived checkpoint for the UI/reports.
CREATE OR REPLACE VIEW public.mkp_chibombo_august_2026_checkpoint AS
SELECT
  si.id AS item_id,
  si.name,
  si.sku,
  si.unit,
  si.cost_price,
  si.sell_price,
  COALESCE(SUM(CASE WHEN sm.movement_type IN ('in','opening','purchase','return','transfer_in','adjust_in','production') THEN sm.quantity
                    WHEN sm.movement_type IN ('out','sale','transfer_out','adjust_out') THEN -sm.quantity
                    WHEN sm.movement_type='reversal' THEN sm.quantity ELSE 0 END),0) AS ledger_balance,
  COALESCE(cr.remaining_qty,0) AS physical_closing_qty,
  COALESCE(cr.remaining_qty,0) * si.cost_price AS physical_closing_cost_value,
  COALESCE(cr.remaining_qty,0) * si.sell_price AS physical_closing_retail_value
FROM public.stock_items si
LEFT JOIN public.stock_movements sm
  ON sm.item_id=si.id
 AND sm.user_id=si.user_id
 AND sm.location_id=(SELECT id FROM public.inventory_locations WHERE user_id=si.user_id AND upper(code)='CHIBOMBO' LIMIT 1)
LEFT JOIN public.cashier_records cr
  ON cr.item_id=si.id
 AND cr.user_id=si.user_id
 AND cr.status='historical_reconciled'
 AND cr.period_start=DATE '2026-08-04'
 AND cr.period_end=DATE '2026-08-31'
WHERE si.user_id='e54d7679-cd55-4fee-8811-6b8e260cba75'
GROUP BY si.id,si.name,si.sku,si.unit,si.cost_price,si.sell_price,cr.remaining_qty;

GRANT SELECT ON public.mkp_chibombo_august_2026_checkpoint TO authenticated;
