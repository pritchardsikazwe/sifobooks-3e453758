-- MKP inventory correction: preserve the existing engine and history.
-- This migration uses reversing ledger entries for the previously seeded
-- opening quantities, then posts the correct opening and historical transfer.
-- No products, transactions or balances are deleted or manually overwritten.

DO $mkp$
DECLARE
  _uid uuid := 'e54d7679-cd55-4fee-8811-6b8e260cba75';
  _wh uuid;
  _store uuid;
  _transit uuid;
  _tr uuid;
  _item uuid;
  _existing numeric;
  _p record;
  _t record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
    RETURN;
  END IF;

  SELECT id INTO _wh
  FROM public.inventory_locations
  WHERE user_id = _uid AND upper(code) = 'MKP-WH'
  LIMIT 1;

  IF _wh IS NULL THEN
    INSERT INTO public.inventory_locations (user_id, name, code, location_type, is_default)
    VALUES (_uid, 'MKP Farms Warehouse', 'MKP-WH', 'warehouse', true)
    RETURNING id INTO _wh;
  ELSE
    UPDATE public.inventory_locations
       SET name = 'MKP Farms Warehouse', location_type = 'warehouse', is_default = true
     WHERE id = _wh;
  END IF;

  SELECT id INTO _store
  FROM public.inventory_locations
  WHERE user_id = _uid AND upper(code) IN ('MKP-OUTLET', 'CHIBOMBO')
  ORDER BY CASE WHEN upper(code) = 'CHIBOMBO' THEN 0 ELSE 1 END
  LIMIT 1;

  IF _store IS NULL THEN
    INSERT INTO public.inventory_locations (user_id, name, code, location_type, is_default)
    VALUES (_uid, 'Chibombo Store', 'CHIBOMBO', 'outlet', false)
    RETURNING id INTO _store;
  ELSE
    UPDATE public.inventory_locations
       SET name = 'Chibombo Store', code = 'CHIBOMBO', location_type = 'outlet', is_default = false
     WHERE id = _store;
  END IF;

  _transit := public.ensure_transit_location(_uid);

  -- Correct the existing product master without deleting product records.
  FOR _p IN
    SELECT * FROM (VALUES
      ('MKP-BSG-25','Satva Granules','25 KG',67,1216,1581),
      ('MKP-SC-25','Fertanix Granules','25 KG',125,958,1245),
      ('MKP-MN-500','Elementra Liquid','500 ML',400,199,259),
      ('MKP-N32-500','Triple N 32 Liquid','500 ML',500,174,226),
      ('MKP-NVX-500','Nutrivox 11:11:08 Liquid','500 ML',500,230,299),
      ('MKP-ZOX-1L','Zox Liquid','1 L',125,499,689),
      ('MKP-BOR-1L','Boron Liquid','1 L',50,444,577),
      ('MKP-MRG-500','Magical Liquid','500 ML',250,119,155),
      ('MKP-BSL-1L','Satva Liquid','1 L',1000,384,499),
      ('MKP-SCL-1L','Fertanix Liquid','1 L',500,294,382),
      ('MKP-KSH-25','K-Shine Liquid','1 L',125,388,504),
      ('MKP-BFM-25','Breakfast Meal','25 KG',73,178,220),
      ('MKP-MGW-50','Roller Meal','25 KG',55,127,150),
      ('MKP-MN3-5','Meal No. 3','5 KG',25,100,180),
      ('MKP-SMP-5','Samp Meal','5 KG',45,100,120),
      ('MKP-CPC-5','Couples Choice','5 KG',77,100,150)
    ) AS v(sku,name,unit,initial_qty,cost_price,sell_price)
  LOOP
    SELECT id INTO _item
    FROM public.stock_items
    WHERE user_id = _uid AND sku = _p.sku
    LIMIT 1;

    IF _item IS NULL THEN
      INSERT INTO public.stock_items (
        user_id,name,sku,unit,purchase_unit,sales_unit,conversion_factor,
        cost_price,sell_price,wholesale_price,retail_price,category,item_type,is_active,
        warehouse_id,notes
      ) VALUES (
        _uid,_p.name,_p.sku,_p.unit,_p.unit,_p.unit,1,
        _p.cost_price,_p.sell_price,_p.sell_price,_p.sell_price,
        CASE WHEN _p.name IN ('Breakfast Meal','Roller Meal','Meal No. 3','Samp Meal','Couples Choice')
             THEN 'Milled Products' ELSE 'Agro Inputs' END,
        'product',true,(SELECT id FROM public.warehouses WHERE user_id = _uid LIMIT 1),NULL
      ) RETURNING id INTO _item;
    ELSE
      UPDATE public.stock_items
         SET name = _p.name,
             unit = _p.unit,
             purchase_unit = _p.unit,
             sales_unit = _p.unit,
             conversion_factor = 1,
             cost_price = _p.cost_price,
             sell_price = _p.sell_price,
             wholesale_price = _p.sell_price,
             retail_price = _p.sell_price,
             category = CASE WHEN _p.name IN ('Breakfast Meal','Roller Meal','Meal No. 3','Samp Meal','Couples Choice')
                             THEN 'Milled Products' ELSE 'Agro Inputs' END,
             is_active = true
       WHERE id = _item;
    END IF;

    -- Reverse the old MKP opening quantity if it was previously seeded.
    SELECT COALESCE(SUM(sm.quantity),0) INTO _existing
    FROM public.stock_movements sm
    WHERE sm.user_id = _uid
      AND sm.item_id = _item
      AND sm.location_id = _wh
      AND sm.movement_type = 'opening'
      AND sm.reference = 'MKP-OPENING-2026-08';

    IF _existing > 0 AND NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE user_id = _uid AND item_id = _item
        AND reference = 'MKP-CORRECTION-REVERSAL-2026-09-09'
    ) THEN
      INSERT INTO public.stock_movements (
        user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
        transaction_date,source_type,note
      ) VALUES (
        _uid,_item,_wh,'reversal',-_existing,_p.cost_price,
        'MKP-CORRECTION-REVERSAL-2026-09-09',DATE '2026-09-09','correction',
        'Reversal of superseded MKP opening seed; original transaction retained.'
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE user_id = _uid AND item_id = _item
        AND location_id = _wh
        AND movement_type = 'opening'
        AND reference = 'MKP-OPENING-2026-08-CORRECTED'
    ) THEN
      INSERT INTO public.stock_movements (
        user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
        transaction_date,source_type,note
      ) VALUES (
        _uid,_item,_wh,'opening',_p.initial_qty,_p.cost_price,
        'MKP-OPENING-2026-08-CORRECTED',DATE '2026-08-01','opening',
        'Corrected MKP Wharehouse opening stock from source workbook.'
      );
    END IF;
  END LOOP;

  -- Samta Poly has confirmed warehouse opening stock but no confirmed initial transfer quantity.
  SELECT id INTO _item FROM public.stock_items WHERE user_id = _uid AND sku = 'MKP-SMPOLY-500' LIMIT 1;
  IF _item IS NULL THEN
    INSERT INTO public.stock_items (
      user_id,name,sku,unit,purchase_unit,sales_unit,conversion_factor,
      cost_price,sell_price,wholesale_price,retail_price,category,item_type,is_active,
      warehouse_id,notes
    ) VALUES (
      _uid,'Samta Poly','MKP-SMPOLY-500','500 ML','500 ML','500 ML',1,
      209,272,272,272,'Agro Inputs','product',true,
      (SELECT id FROM public.warehouses WHERE user_id = _uid LIMIT 1),
      'Initial Chibombo transfer quantity not specified in source workbook; confirmation required.'
    ) RETURNING id INTO _item;
  ELSE
    UPDATE public.stock_items
       SET name='Samta Poly', unit='500 ML', purchase_unit='500 ML', sales_unit='500 ML',
           cost_price=209, sell_price=272, wholesale_price=272, retail_price=272,
           notes='Initial Chibombo transfer quantity not specified in source workbook; confirmation required.'
     WHERE id=_item;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE user_id=_uid AND item_id=_item AND location_id=_wh
      AND movement_type='opening' AND reference='MKP-OPENING-2026-08-CORRECTED'
  ) THEN
    INSERT INTO public.stock_movements (
      user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,
      transaction_date,source_type,note
    ) VALUES (
      _uid,_item,_wh,'opening',50,209,'MKP-OPENING-2026-08-CORRECTED',DATE '2026-08-01','opening',
      'Corrected MKP Wharehouse opening stock from source workbook.'
    );
  END IF;

  -- Correct the existing historical transfer document rather than creating a duplicate.
  SELECT id INTO _tr
  FROM public.inventory_transfers
  WHERE user_id=_uid AND transfer_number='MKP-TRF-2026-08-04-001'
  LIMIT 1;

  IF _tr IS NULL THEN
    INSERT INTO public.inventory_transfers (
      user_id,reference,transfer_number,from_location_id,to_location_id,transfer_date,
      status,purpose,notes,requested_by,approved_by,approved_at,dispatched_by,dispatched_at,
      received_by,received_at
    ) VALUES (
      _uid,'MKP-TRF-2026-08-04-001','MKP-TRF-2026-08-04-001',_wh,_store,DATE '2026-08-04',
      'completed','Initial warehouse transfer to Chibombo Store',
      'Corrected historical MKP opening transfer. Samta Poly intentionally excluded pending confirmation.',
      _uid,_uid,now(),_uid,now(),_uid,now()
    ) RETURNING id INTO _tr;
  ELSE
    UPDATE public.inventory_transfers
       SET from_location_id=_wh,
           to_location_id=_store,
           transfer_date=DATE '2026-08-04',
           status='completed',
           purpose='Initial warehouse transfer to Chibombo Store',
           notes='Corrected historical MKP opening transfer. Samta Poly intentionally excluded pending confirmation.',
           approved_by=_uid,approved_at=COALESCE(approved_at,now()),
           dispatched_by=_uid,dispatched_at=COALESCE(dispatched_at,now()),
           received_by=_uid,received_at=COALESCE(received_at,now()),
           updated_at=now()
     WHERE id=_tr;
  END IF;

  FOR _t IN
    SELECT * FROM (VALUES
      ('MKP-BSG-25',10,1216),('MKP-SC-25',10,958),('MKP-BSL-1L',100,384),
      ('MKP-SCL-1L',100,294),('MKP-MN-500',200,199),('MKP-N32-500',200,174),
      ('MKP-NVX-500',199,230),('MKP-MRG-500',20,119),('MKP-ZOX-1L',100,499),
      ('MKP-KSH-25',100,388),('MKP-BOR-1L',50,444),('MKP-BFM-25',73,178),
      ('MKP-MGW-50',55,127),('MKP-MN3-5',25,100),('MKP-SMP-5',45,100),
      ('MKP-CPC-5',77,100)
    ) AS v(sku,qty,cost)
  LOOP
    SELECT id INTO _item FROM public.stock_items WHERE user_id=_uid AND sku=_t.sku LIMIT 1;

    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_transfer_items
      WHERE transfer_id=_tr AND item_id=_item
    ) THEN
      INSERT INTO public.inventory_transfer_items (transfer_id,item_id,description,quantity,unit_cost)
      SELECT _tr,_item,si.name || ' (' || si.unit || ')',_t.qty,_t.cost
      FROM public.stock_items si WHERE si.id=_item;
    ELSE
      UPDATE public.inventory_transfer_items
         SET quantity=_t.qty, unit_cost=_t.cost,
             description=(SELECT name || ' (' || unit || ')' FROM public.stock_items WHERE id=_item)
       WHERE transfer_id=_tr AND item_id=_item;
    END IF;
  END LOOP;

  -- Post the historical transfer only once. Four ledger legs preserve the full transit trail.
  IF NOT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE user_id=_uid AND transfer_id=_tr AND reference='MKP-TRF-2026-08-04-001'
  ) THEN
    FOR _t IN
      SELECT iti.item_id, iti.quantity, iti.unit_cost
      FROM public.inventory_transfer_items iti
      WHERE iti.transfer_id=_tr AND iti.quantity>0
    LOOP
      INSERT INTO public.stock_movements (
        user_id,item_id,location_id,movement_type,quantity,unit_cost,reference,transfer_id,
        transaction_date,source_type,source_id,created_by,note
      ) VALUES
        (_uid,_t.item_id,_wh,'transfer_out',_t.quantity,_t.unit_cost,'MKP-TRF-2026-08-04-001',_tr,DATE '2026-08-04','transfer',_tr,_uid,'Historical transfer out from warehouse'),
        (_uid,_t.item_id,_transit,'transfer_in',_t.quantity,_t.unit_cost,'MKP-TRF-2026-08-04-001',_tr,DATE '2026-08-04','transfer',_tr,_uid,'Historical transfer entered transit'),
        (_uid,_t.item_id,_transit,'transfer_out',_t.quantity,_t.unit_cost,'MKP-TRF-2026-08-04-001',_tr,DATE '2026-08-04','transfer',_tr,_uid,'Historical transfer received out of transit'),
        (_uid,_t.item_id,_store,'transfer_in',_t.quantity,_t.unit_cost,'MKP-TRF-2026-08-04-001',_tr,DATE '2026-08-04','transfer',_tr,_uid,'Historical transfer received at Chibombo Store');

      UPDATE public.inventory_transfer_items
         SET qty_received=_t.quantity
       WHERE transfer_id=_tr AND item_id=_t.item_id;
    END LOOP;
  END IF;
END $mkp$;

-- Transaction-derived MKP reconciliation view. Ledger remains authoritative.
CREATE OR REPLACE VIEW public.mkp_inventory_reconciliation AS
WITH mkp_locations AS (
  SELECT id,user_id,name,location_type
  FROM public.inventory_locations
  WHERE name IN ('MKP Farms Warehouse','Chibombo Store')
),
items AS (
  SELECT si.id,si.user_id,si.name,si.sku,si.unit,si.cost_price,si.sell_price
  FROM public.stock_items si
  WHERE si.user_id='e54d7679-cd55-4fee-8811-6b8e260cba75'
),
mov AS (
  SELECT sm.user_id,sm.item_id,sm.location_id,sm.movement_type,sm.quantity
  FROM public.stock_movements sm
  WHERE sm.user_id='e54d7679-cd55-4fee-8811-6b8e260cba75'
)
SELECT
  i.id AS item_id,i.user_id,i.name,i.sku,i.unit,i.cost_price,i.sell_price,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='opening'),0) AS warehouse_initial,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='transfer_out'),0) AS warehouse_transferred_out,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='transfer_in'),0) AS warehouse_transferred_in,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='purchase'),0) AS warehouse_purchased,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type='return'),0) AS warehouse_returns,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='MKP Farms Warehouse' AND m.movement_type IN ('adjust','adjust_in','adjust_out')),0) AS warehouse_adjustments,
  COALESCE((SELECT quantity FROM public.stock_balances sb JOIN mkp_locations l ON l.id=sb.location_id WHERE sb.item_id=i.id AND l.name='MKP Farms Warehouse' LIMIT 1),0) AS warehouse_current,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='transfer_in'),0) AS chibombo_received,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='sale'),0) AS chibombo_sales,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='return'),0) AS chibombo_returns,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type IN ('adjust','adjust_in','adjust_out')),0) AS chibombo_adjustments,
  COALESCE((SELECT SUM(m.quantity) FROM mov m JOIN mkp_locations l ON l.id=m.location_id WHERE m.item_id=i.id AND l.name='Chibombo Store' AND m.movement_type='transfer_out'),0) AS chibombo_transferred_out,
  COALESCE((SELECT quantity FROM public.stock_balances sb JOIN mkp_locations l ON l.id=sb.location_id WHERE sb.item_id=i.id AND l.name='Chibombo Store' LIMIT 1),0) AS chibombo_current
FROM items i;

GRANT SELECT ON public.mkp_inventory_reconciliation TO authenticated;
