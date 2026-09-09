-- POS transaction-integrity checks. READ ONLY: run against live data any time.
-- Every query should return zero rows. Historical rows created before the
-- hardening are excluded by date so old NULL context is not flagged forever.
\set cutoff '2026-09-09'

-- 1. Journals must balance
SELECT e.id, e.entry_number, SUM(l.debit) AS dr, SUM(l.credit) AS cr
FROM journal_entries e JOIN journal_lines l ON l.entry_id = e.id
WHERE e.reference LIKE 'POS:%' AND e.entry_date >= :'cutoff'
GROUP BY e.id, e.entry_number
HAVING ROUND(SUM(l.debit),2) <> ROUND(SUM(l.credit),2);

-- 2. Every completed sale is posted once, with full context
SELECT id, sale_no FROM pos_sales
WHERE status = 'completed' AND sold_at::date >= :'cutoff'
  AND (journal_entry_id IS NULL OR shift_id IS NULL OR register_id IS NULL OR location_id IS NULL);

-- 3. Stock leaves the selling location exactly once per sale line
SELECT s.sale_no, i.item_id, COUNT(m.id) AS movements
FROM pos_sales s JOIN pos_sale_items i ON i.sale_id = s.id
LEFT JOIN stock_movements m ON m.source_type = 'pos_sale' AND m.source_id = s.id AND m.item_id = i.item_id
WHERE s.status = 'completed' AND s.sold_at::date >= :'cutoff' AND i.item_id IS NOT NULL
GROUP BY s.sale_no, i.item_id HAVING COUNT(m.id) <> 1;

-- 4. New movements carry resolved unit cost and total cost
SELECT id, item_id, movement_type FROM stock_movements
WHERE transaction_date >= :'cutoff'
  AND (unit_cost IS NULL OR total_cost IS NULL
       OR ROUND(total_cost,2) <> ROUND(unit_cost * quantity, 2));

-- 5. Cost of sales matches the valuation service, not client figures
SELECT s.sale_no, s.cost_total,
       ROUND(SUM(i.qty * public.inventory_unit_cost(i.item_id, s.location_id)),2) AS expected
FROM pos_sales s JOIN pos_sale_items i ON i.sale_id = s.id
WHERE s.status = 'completed' AND s.sold_at::date >= :'cutoff'
GROUP BY s.sale_no, s.cost_total
HAVING ROUND(s.cost_total,2) <> ROUND(SUM(i.qty * public.inventory_unit_cost(i.item_id, s.location_id)),2);

-- 6. No duplicate sale for the same client_ref (offline retry safety)
SELECT user_id, client_ref, COUNT(*) FROM pos_sales
WHERE client_ref IS NOT NULL GROUP BY user_id, client_ref HAVING COUNT(*) > 1;

-- 7. Payments cover the sale total
SELECT s.sale_no, s.total, COALESCE(SUM(p.amount),0) AS paid
FROM pos_sales s LEFT JOIN pos_payments p ON p.sale_id = s.id
WHERE s.status = 'completed' AND s.sold_at::date >= :'cutoff'
GROUP BY s.sale_no, s.total HAVING ROUND(COALESCE(SUM(p.amount),0),2) + 0.01 < ROUND(s.total,2);
