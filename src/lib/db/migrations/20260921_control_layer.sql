CREATE TABLE IF NOT EXISTS compliance_checks (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, check_type TEXT NOT NULL,
  name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', last_checked_at TEXT,
  due_date TEXT, reference TEXT, notes TEXT, metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS business_alerts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, severity TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, entity_type TEXT, entity_id TEXT,
  action_url TEXT, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT (datetime('now')), resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS control_exceptions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, category TEXT NOT NULL, title TEXT NOT NULL,
  description TEXT, severity TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open',
  entity_type TEXT, entity_id TEXT, action_url TEXT, owner_id TEXT, due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, request_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, reference TEXT, amount REAL,
  status TEXT NOT NULL DEFAULT 'pending', current_level INTEGER NOT NULL DEFAULT 1, max_level INTEGER NOT NULL DEFAULT 1,
  requested_by TEXT, approved_by TEXT, requested_at TEXT NOT NULL DEFAULT (datetime('now')), decided_at TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS zra_item_mappings (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, item_id TEXT NOT NULL,
  zra_item_code TEXT, zra_item_class_code TEXT, zra_item_type_code TEXT, zra_origin_country_code TEXT,
  zra_pkg_unit_code TEXT, zra_qty_unit_code TEXT, zra_vat_category_code TEXT, zra_tax_rate REAL,
  sync_status TEXT NOT NULL DEFAULT 'unmapped', raw_response_json TEXT, last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, item_id)
);
CREATE TABLE IF NOT EXISTS supplier_invoice_control (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, supplier_id TEXT, bill_id TEXT,
  supplier_invoice_no TEXT, invoice_date TEXT, invoice_total REAL, duplicate_hash TEXT,
  match_status TEXT NOT NULL DEFAULT 'unmatched', control_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  candidate_entity_id TEXT NOT NULL, reason TEXT NOT NULL, similarity REAL, status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS import_shipments (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, reference TEXT NOT NULL,
  supplier_id TEXT, status TEXT NOT NULL DEFAULT 'draft', currency TEXT, exchange_rate REAL DEFAULT 1,
  goods_value REAL DEFAULT 0, freight REAL DEFAULT 0, duty REAL DEFAULT 0, insurance REAL DEFAULT 0,
  other_costs REAL DEFAULT 0, landed_cost REAL DEFAULT 0, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS landed_cost_allocations (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT, shipment_id TEXT NOT NULL, item_id TEXT NOT NULL,
  allocation_basis TEXT NOT NULL DEFAULT 'value', allocated_cost REAL NOT NULL DEFAULT 0, unit_cost_impact REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS accountant_client_links (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT NOT NULL, accountant_user_id TEXT,
  role TEXT NOT NULL DEFAULT 'accountant', status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(user_id, company_id, accountant_user_id)
);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_user_status ON compliance_checks(user_id,status);
CREATE INDEX IF NOT EXISTS idx_business_alerts_user_status ON business_alerts(user_id,status);
CREATE INDEX IF NOT EXISTS idx_control_exceptions_user_status ON control_exceptions(user_id,status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_status ON approval_requests(user_id,status);
CREATE INDEX IF NOT EXISTS idx_zra_item_mappings_user_status ON zra_item_mappings(user_id,sync_status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_control_user ON supplier_invoice_control(user_id,control_status);
CREATE INDEX IF NOT EXISTS idx_import_shipments_user_status ON import_shipments(user_id,status);