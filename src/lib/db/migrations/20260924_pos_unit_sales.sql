-- POS unit-aware selling: retain sale unit/quantity while posting base-unit stock movements.
ALTER TABLE pos_sale_items ADD COLUMN unit TEXT;
ALTER TABLE pos_sale_items ADD COLUMN base_qty REAL;
ALTER TABLE pos_sale_items ADD COLUMN base_unit TEXT;
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_unit ON pos_sale_items(user_id,item_id,unit);
