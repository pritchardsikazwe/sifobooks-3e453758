-- Restaurant/purchasing compatibility for existing local SQLite databases.
-- These columns are used by the current restaurant POS, tables, menu, reports and supplier UI.
ALTER TABLE suppliers ADD COLUMN email TEXT;
ALTER TABLE suppliers ADD COLUMN phone TEXT;
ALTER TABLE suppliers ADD COLUMN vat_number TEXT;
ALTER TABLE suppliers ADD COLUMN address TEXT;

ALTER TABLE restaurant_menu_items ADD COLUMN is_86 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE restaurant_menu_items ADD COLUMN prices TEXT;

ALTER TABLE restaurant_order_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_order_items ADD COLUMN discount REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_order_items ADD COLUMN modifiers TEXT NOT NULL DEFAULT '[]';

ALTER TABLE restaurant_orders ADD COLUMN service_charge REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN gratuity REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN delivery_fee REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN customer_name TEXT;
ALTER TABLE restaurant_orders ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN journal_entry_id TEXT;

ALTER TABLE restaurant_tables ADD COLUMN shape TEXT NOT NULL DEFAULT 'square';
ALTER TABLE restaurant_tables ADD COLUMN occupied_since TEXT;
ALTER TABLE restaurant_tables ADD COLUMN current_order_id TEXT;
ALTER TABLE restaurant_tables ADD COLUMN server_name TEXT;

ALTER TABLE restaurant_order_types ADD COLUMN delivery_fee REAL NOT NULL DEFAULT 0;
