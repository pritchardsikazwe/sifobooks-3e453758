-- Restaurant runtime compatibility: older local databases predate fields used by
-- the current POS, kitchen, tables, orders and supplier workflows.
-- Safe on existing databases because the migration runner ignores duplicate columns.

ALTER TABLE suppliers ADD COLUMN email TEXT;
ALTER TABLE suppliers ADD COLUMN phone TEXT;
ALTER TABLE suppliers ADD COLUMN vat_number TEXT;
ALTER TABLE suppliers ADD COLUMN address TEXT;

ALTER TABLE restaurant_menu_items ADD COLUMN prices TEXT NOT NULL DEFAULT '{}';
ALTER TABLE restaurant_menu_items ADD COLUMN is_86 INTEGER NOT NULL DEFAULT 0;

ALTER TABLE restaurant_orders ADD COLUMN customer_name TEXT;
ALTER TABLE restaurant_orders ADD COLUMN notes TEXT;
ALTER TABLE restaurant_orders ADD COLUMN service_charge REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN gratuity REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN delivery_fee REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN journal_entry_id TEXT;
ALTER TABLE restaurant_orders ADD COLUMN void_reason TEXT;

ALTER TABLE restaurant_order_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_order_items ADD COLUMN discount REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_order_items ADD COLUMN modifiers TEXT NOT NULL DEFAULT '[]';

ALTER TABLE restaurant_tables ADD COLUMN shape TEXT NOT NULL DEFAULT 'square';
ALTER TABLE restaurant_tables ADD COLUMN occupied_since TEXT;
ALTER TABLE restaurant_tables ADD COLUMN current_order_id TEXT;
ALTER TABLE restaurant_tables ADD COLUMN server_name TEXT;

CREATE INDEX IF NOT EXISTS idx_restaurant_menu_active ON restaurant_menu_items(user_id,active,category);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_business_date ON restaurant_orders(user_id,business_date,status);
CREATE INDEX IF NOT EXISTS idx_restaurant_payments_order ON restaurant_payments(user_id,order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(user_id,status);
