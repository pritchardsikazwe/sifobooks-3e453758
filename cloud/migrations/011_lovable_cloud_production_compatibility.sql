-- SifoBooks Lovable Cloud production compatibility
-- Date: 2026-09-29
--
-- IMPORTANT:
-- This migration is intentionally additive and non-destructive.
-- It targets the existing Lovable Cloud/Supabase production schema discovered
-- during the 2026-09-29 production audit.
--
-- DO NOT run cloud:migrate against Lovable Cloud for this file.
-- Apply this SQL only after a production database backup/snapshot and a final
-- schema check. Existing rows are preserved.

BEGIN;

-- Accounting integrity / controlled reversals.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reversal_of TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- POS selling location compatibility.
ALTER TABLE pos_registers ADD COLUMN IF NOT EXISTS location_id TEXT;

-- POS item unit compatibility used by the current POS/catalogue code.
ALTER TABLE pos_sale_items ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE pos_sale_items ADD COLUMN IF NOT EXISTS base_qty DOUBLE PRECISION;
ALTER TABLE pos_sale_items ADD COLUMN IF NOT EXISTS base_unit TEXT;

-- Warehouse compatibility.
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS reserved_stock DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ZRA item mapping fields used by the live item-mapping UI and fiscal payload builder.
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_item_code TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_item_class_code TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_item_type_code TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_origin_country_code TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_pkg_unit_code TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_qty_unit_code TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_vat_category_code TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_tax_rate DOUBLE PRECISION;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_sync_status TEXT NOT NULL DEFAULT 'unmapped';
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_last_sync_at TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS zra_raw_data TEXT;

-- Durable ZRA queue fields used for retry/result tracking.
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS last_attempt_at TEXT;
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS zra_receipt_number TEXT;
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS zra_internal_data TEXT;
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS zra_receipt_signature TEXT;
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS zra_qr_url TEXT;
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS error_code TEXT;
ALTER TABLE zra_invoice_queue ADD COLUMN IF NOT EXISTS zra_device_id TEXT;

-- ZRA dictionary/device tables required by the existing ZRA workflow.
CREATE TABLE IF NOT EXISTS zra_standard_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  branch_id TEXT,
  code_class TEXT NOT NULL,
  code_class_name TEXT,
  code TEXT NOT NULL,
  name TEXT,
  description TEXT,
  raw_data TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id, code_class, code)
);

CREATE TABLE IF NOT EXISTS zra_item_classes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  branch_id TEXT,
  item_cls_cd TEXT NOT NULL,
  item_cls_nm TEXT,
  item_cls_lvl INTEGER,
  tax_ty_cd TEXT,
  use_yn TEXT,
  raw_data TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id, item_cls_cd)
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
  branch_code TEXT NOT NULL,
  device_serial TEXT NOT NULL,
  vsdc_endpoint TEXT,
  connector_endpoint TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  initialization_status TEXT NOT NULL DEFAULT 'not_initialized',
  taxpayer_name TEXT,
  branch_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,
  last_submission_at TIMESTAMPTZ,
  last_submission_status TEXT,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_serial),
  UNIQUE(user_id, terminal_id)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_registers_location
  ON pos_registers(location_id);

CREATE INDEX IF NOT EXISTS idx_zra_invoice_queue_status
  ON zra_invoice_queue(user_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_zra_standard_codes_lookup
  ON zra_standard_codes(user_id, branch_id, code_class, code);

CREATE INDEX IF NOT EXISTS idx_zra_item_classes_lookup
  ON zra_item_classes(user_id, branch_id, item_cls_cd);

CREATE INDEX IF NOT EXISTS idx_zra_devices_user_branch
  ON zra_devices(user_id, branch_code, is_active);

CREATE INDEX IF NOT EXISTS idx_zra_devices_terminal
  ON zra_devices(user_id, terminal_id);

CREATE INDEX IF NOT EXISTS idx_zra_device_events_device
  ON zra_device_events(zra_device_id, created_at);

COMMIT;
