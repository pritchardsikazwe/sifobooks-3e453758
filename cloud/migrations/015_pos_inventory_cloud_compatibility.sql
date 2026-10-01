-- 015_pos_inventory_cloud_compatibility.sql
-- Additive compatibility layer for POS, inventory, invoicing, auth, tenancy and ZRA.
-- Safe to run against databases that already contain any of these objects.

ALTER TABLE IF EXISTS stock_items
  ADD COLUMN IF NOT EXISTS base_unit TEXT NOT NULL DEFAULT 'each',
  ADD COLUMN IF NOT EXISTS sales_unit TEXT,
  ADD COLUMN IF NOT EXISTS purchase_unit TEXT,
  ADD COLUMN IF NOT EXISTS track_stock INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retail_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS wholesale_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS min_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TEXT NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS invoice_items
  ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'amount';

ALTER TABLE IF EXISTS pos_registers
  ADD COLUMN IF NOT EXISTS location_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TEXT NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS pos_shifts
  ADD COLUMN IF NOT EXISTS location_id TEXT,
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS cash_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS momo_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drawer_name TEXT,
  ADD COLUMN IF NOT EXISTS station TEXT,
  ADD COLUMN IF NOT EXISTS manager_comment TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TEXT,
  ADD COLUMN IF NOT EXISTS cash_denominations TEXT;

ALTER TABLE IF EXISTS warehouses
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Warehouse',
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TEXT NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS item_unit_conversions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  multiplier DOUBLE PRECISION NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_unit_conversions_lookup
  ON item_unit_conversions(user_id,item_id,from_unit,to_unit,is_active);

CREATE TABLE IF NOT EXISTS item_unit_conversion_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  conversion_id TEXT,
  action TEXT NOT NULL,
  from_unit TEXT,
  to_unit TEXT,
  multiplier DOUBLE PRECISION,
  actor_id TEXT,
  created_at TEXT NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_end_of_day (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  business_date TEXT NOT NULL,
  location_id TEXT NOT NULL,
  register_id TEXT,
  shift_id TEXT UNIQUE,
  cashier_name TEXT,
  opening_float DOUBLE PRECISION NOT NULL DEFAULT 0,
  cash_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  card_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  mobile_money_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  other_sales DOUBLE PRECISION NOT NULL DEFAULT 0,
  payouts DOUBLE PRECISION NOT NULL DEFAULT 0,
  refunds DOUBLE PRECISION NOT NULL DEFAULT 0,
  expected_cash DOUBLE PRECISION NOT NULL DEFAULT 0,
  declared_cash DOUBLE PRECISION,
  cash_variance DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  submitted_at TEXT,
  closed_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_cash_declarations (
  id TEXT PRIMARY KEY,
  end_of_day_id TEXT NOT NULL,
  denomination DOUBLE PRECISION NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now(),
  UNIQUE(end_of_day_id,denomination)
);

CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 0,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  password_changed_at TEXT,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_tenants (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  company_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Zambia',
  base_currency TEXT NOT NULL DEFAULT 'ZMW',
  trial_ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_members (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_cloud_members_user ON cloud_members(user_id,status);
CREATE INDEX IF NOT EXISTS idx_cloud_tenants_company ON cloud_tenants(company_id);

CREATE TABLE IF NOT EXISTS cloud_transaction_batches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  client_ref TEXT,
  total_debit DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_credit DOUBLE PRECISION NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,transaction_type,client_ref)
);

CREATE TABLE IF NOT EXISTS cloud_transaction_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zra_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  branch_id TEXT,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  terminal_id TEXT,
  deployment_mode TEXT NOT NULL DEFAULT 'local',
  environment TEXT NOT NULL DEFAULT 'test',
  tpin TEXT,
  branch_code TEXT NOT NULL DEFAULT 'MAIN',
  device_serial TEXT NOT NULL,
  vsdc_endpoint TEXT,
  connector_endpoint TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  initialization_status TEXT NOT NULL DEFAULT 'not_initialized',
  taxpayer_name TEXT,
  branch_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_verified_at TEXT,
  last_submission_at TEXT,
  last_submission_status TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT now(),
  updated_at TEXT NOT NULL DEFAULT now(),
  UNIQUE(user_id,device_serial),
  UNIQUE(user_id,terminal_id)
);

CREATE TABLE IF NOT EXISTS zra_device_events (
  id TEXT PRIMARY KEY,
  zra_device_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'info',
  message TEXT,
  response_code TEXT,
  response_json TEXT,
  created_at TEXT NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zra_devices_user_branch ON zra_devices(user_id,branch_code,is_active);
CREATE INDEX IF NOT EXISTS idx_zra_device_events_device ON zra_device_events(zra_device_id,created_at);
