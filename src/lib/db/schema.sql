CREATE TABLE IF NOT EXISTS "auth_users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "afs_reports" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "fiscal_year" INTEGER NOT NULL,
  "period_end" TEXT NOT NULL,
  "currency" TEXT DEFAULT 'ZMW',
  "payload" TEXT NOT NULL,
  "ai_summary" TEXT,
  "ai_variance" TEXT,
  "ai_cashflow" TEXT,
  "ai_strategy" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "approval_actions" (
  "id" TEXT PRIMARY KEY,
  "request_id" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "approval_hierarchies" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "min_amount" REAL DEFAULT 0,
  "max_amount" REAL,
  "approver_role" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "approval_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "module" TEXT NOT NULL,
  "reference_type" TEXT NOT NULL,
  "reference_id" TEXT,
  "reference_number" TEXT,
  "description" TEXT,
  "amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "current_level" INTEGER NOT NULL DEFAULT 1,
  "max_level" INTEGER NOT NULL DEFAULT 1,
  "requested_by" TEXT NOT NULL,
  "decided_by" TEXT,
  "decided_at" TEXT,
  "decision_notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "asset_categories" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "useful_life_years" INTEGER NOT NULL DEFAULT 5,
  "depreciation_method" TEXT NOT NULL DEFAULT 'straight_line',
  "depreciation_rate" REAL,
  "capitalisation_threshold" REAL NOT NULL DEFAULT 0,
  "depreciation_expense_code" TEXT NOT NULL DEFAULT '5700',
  "accumulated_depreciation_code" TEXT NOT NULL DEFAULT '1590',
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "asset_disposals" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "disposal_date" TEXT NOT NULL DEFAULT (date('now')),
  "disposal_method" TEXT NOT NULL DEFAULT 'sale',
  "proceeds" REAL NOT NULL DEFAULT 0,
  "buyer" TEXT,
  "reason" TEXT,
  "gain_loss" REAL,
  "journal_entry_id" TEXT
);

CREATE TABLE IF NOT EXISTS "asset_transfers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "transfer_date" TEXT NOT NULL DEFAULT (date('now')),
  "from_location" TEXT,
  "from_department" TEXT,
  "from_custodian" TEXT,
  "reason" TEXT
);

CREATE TABLE IF NOT EXISTS "attendance" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "attendance_date" TEXT NOT NULL DEFAULT (date('now')),
  "clock_in" TEXT,
  "hours_worked" REAL DEFAULT 0,
  "status" TEXT DEFAULT 'present',
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "actor_email" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "details" TEXT,
  "ip_address" TEXT
);

CREATE TABLE IF NOT EXISTS "bank_accounts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "name" TEXT NOT NULL,
  "bank_name" TEXT,
  "account_number" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "opening_balance" REAL NOT NULL DEFAULT 0,
  "opening_date" TEXT DEFAULT (date('now')),
  "gl_account_id" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "cashbook_type" TEXT NOT NULL DEFAULT 'main'
);

CREATE TABLE IF NOT EXISTS "bank_allocations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "bank_txn_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "target_ref" TEXT,
  "amount" REAL NOT NULL,
  "memo" TEXT,
  "reference" TEXT,
  "journal_entry_id" TEXT,
  "allocated_by" TEXT,
  "allocated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "is_reversed" INTEGER NOT NULL DEFAULT 0,
  "reversed_at" TEXT,
  "reversed_by" TEXT,
  "reverse_reason" TEXT,
  "reversal_entry_id" TEXT,
  "bank_account_id" TEXT
);

CREATE TABLE IF NOT EXISTS "bank_documents" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "bank_txn_id" TEXT,
  "bank_account_id" TEXT,
  "file_path" TEXT NOT NULL,
  "file_name" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "uploaded_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "bank_rules" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "match_type" TEXT NOT NULL DEFAULT 'contains',
  "pattern" TEXT NOT NULL,
  "direction" TEXT,
  "suggested_account_id" TEXT,
  "suggested_target_type" TEXT DEFAULT 'gl',
  "auto_apply" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "hits" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "bank_transaction_events" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "bank_txn_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "previous_status" TEXT,
  "new_status" TEXT,
  "reason" TEXT,
  "journal_entry_id" TEXT,
  "actor_id" TEXT
);

CREATE TABLE IF NOT EXISTS "bank_transactions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "txn_date" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "balance" REAL,
  "reference" TEXT,
  "category" TEXT,
  "matched_invoice" TEXT,
  "source_file" TEXT,
  "reconciled" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "exchange_rate" REAL NOT NULL DEFAULT 1,
  "allocated_amount" REAL,
  "bank_account_id" TEXT,
  "payee" TEXT,
  "voucher_no" TEXT,
  "is_allocated" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "bill_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "bill_id" TEXT NOT NULL,
  "item_id" TEXT,
  "description" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit_price" REAL NOT NULL DEFAULT 0,
  "tax_rate" REAL DEFAULT 0,
  "line_total" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "bill_payments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "bill_id" TEXT NOT NULL,
  "supplier_id" TEXT,
  "payment_number" TEXT NOT NULL,
  "payment_date" TEXT NOT NULL DEFAULT (date('now')),
  "amount" REAL NOT NULL,
  "payment_method" TEXT NOT NULL DEFAULT 'bank',
  "reference" TEXT,
  "notes" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "exchange_rate" REAL NOT NULL DEFAULT 1,
  "bank_account_id" TEXT
);

CREATE TABLE IF NOT EXISTS "bills" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "supplier_id" TEXT,
  "po_id" TEXT,
  "bill_number" TEXT NOT NULL,
  "supplier_invoice_number" TEXT,
  "bill_date" TEXT NOT NULL DEFAULT (date('now')),
  "due_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'unpaid',
  "subtotal" REAL DEFAULT 0,
  "tax_amount" REAL DEFAULT 0,
  "total" REAL DEFAULT 0,
  "amount_paid" REAL DEFAULT 0,
  "balance_due" REAL DEFAULT 0,
  "currency" TEXT DEFAULT 'ZMW',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "exchange_rate" REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "branches" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "address" TEXT,
  "city" TEXT,
  "phone" TEXT,
  "manager_name" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "budgets" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fiscal_year" INTEGER NOT NULL,
  "account_id" TEXT,
  "department_id" TEXT,
  "budgeted_amount" REAL NOT NULL DEFAULT 0,
  "actual_amount" REAL DEFAULT 0,
  "period" TEXT DEFAULT 'annual',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "programme_code" TEXT
);

CREATE TABLE IF NOT EXISTS "business_presets" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "industry" TEXT,
  "description" TEXT,
  "icon" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "budget" REAL DEFAULT 0,
  "actual_cost" REAL DEFAULT 0,
  "start_date" TEXT,
  "end_date" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "cashbooks" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cashbook_type" TEXT NOT NULL DEFAULT 'bank',
  "bank_account_id" TEXT,
  "gl_account_id" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "opening_balance" REAL NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "cashier_records" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "location_id" TEXT,
  "cashier_name" TEXT,
  "cashier_user_id" TEXT,
  "period_start" TEXT,
  "period_end" TEXT,
  "item_id" TEXT,
  "delivered_qty" REAL NOT NULL DEFAULT 0,
  "sold_qty" REAL NOT NULL DEFAULT 0,
  "remaining_qty" REAL NOT NULL DEFAULT 0,
  "selling_price" REAL,
  "sales_value" REAL,
  "physical_count" REAL,
  "variance" REAL,
  "status" TEXT NOT NULL DEFAULT 'recorded',
  "notes" TEXT,
  "source_image_url" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "source_type" TEXT NOT NULL DEFAULT 'historical'
);

CREATE TABLE IF NOT EXISTS "chart_of_accounts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "account_code" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "account_type" TEXT NOT NULL,
  "parent_id" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "description" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "reporting_class" TEXT,
  "purpose" TEXT
);

CREATE TABLE IF NOT EXISTS "companies" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trading_name" TEXT,
  "tpin" TEXT,
  "vat_number" TEXT,
  "vat_registered" INTEGER NOT NULL DEFAULT 0,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT DEFAULT 'Zambia',
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "logo_url" TEXT,
  "financial_year_start_month" INTEGER NOT NULL DEFAULT 1,
  "base_currency" TEXT NOT NULL DEFAULT 'ZMW',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Lusaka',
  "is_primary" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "industry" TEXT,
  "payslip_header" TEXT,
  "workspace_mode" TEXT NOT NULL DEFAULT 'accounting',
  "status" TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS "company_members" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "invited_email" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "company_modules" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "module_key" TEXT NOT NULL,
  "config" TEXT NOT NULL,
  "installed_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "company_subscriptions" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'trialing',
  "started_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "current_period_end" TEXT NOT NULL,
  "cancel_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "billing_cycle" TEXT NOT NULL DEFAULT 'monthly'
);

CREATE TABLE IF NOT EXISTS "complaints" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "assigned_to" TEXT,
  "resolution" TEXT,
  "resolved_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "compliance_documents" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "category" TEXT NOT NULL DEFAULT 'other',
  "title" TEXT NOT NULL,
  "reference" TEXT,
  "issuing_body" TEXT,
  "responsible_person" TEXT,
  "issue_date" TEXT,
  "expiry_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "document_url" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "compliance_obligations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "obligation_type" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "due_date" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'upcoming',
  "amount" REAL,
  "reference" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "cost_centres" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "annual_budget" REAL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "credit_note_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "credit_note_id" TEXT NOT NULL,
  "stock_item_id" TEXT,
  "description" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit_price" REAL NOT NULL DEFAULT 0,
  "vat_rate" REAL NOT NULL DEFAULT 0,
  "line_total" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "credit_notes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "invoice_id" TEXT,
  "number" TEXT NOT NULL,
  "issue_date" TEXT NOT NULL DEFAULT (date('now')),
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "reason" TEXT,
  "subtotal" REAL NOT NULL DEFAULT 0,
  "vat_amount" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "exchange_rate" REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "csat_responses" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "invoice_id" TEXT,
  "score" INTEGER NOT NULL,
  "response_date" TEXT NOT NULL DEFAULT (date('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "customer_communications" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'note',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'outbound',
  "occurred_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "name" TEXT NOT NULL,
  "contact_person" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "tpin" TEXT,
  "vat_number" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT DEFAULT 'Zambia',
  "credit_limit" REAL DEFAULT 0,
  "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
  "active" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "departments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "manager_name" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "division_id" TEXT
);

CREATE TABLE IF NOT EXISTS "divisions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "manager_name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "document_branding" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "legal_name" TEXT,
  "trading_name" TEXT,
  "tagline" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "tpin" TEXT,
  "vat_number" TEXT,
  "registration_number" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "locale" TEXT NOT NULL DEFAULT 'en-ZM',
  "logo_url" TEXT,
  "secondary_logo_url" TEXT,
  "signature_url" TEXT,
  "stamp_url" TEXT,
  "theme" TEXT NOT NULL DEFAULT 'corporate',
  "secondary_color" TEXT NOT NULL DEFAULT '#0f172a',
  "accent_color" TEXT NOT NULL DEFAULT '#c9a84c',
  "font_family" TEXT NOT NULL DEFAULT 'helvetica',
  "header_note" TEXT,
  "footer_note" TEXT,
  "payment_instructions" TEXT,
  "default_notes" TEXT,
  "terms_library" TEXT NOT NULL,
  "signatory_name" TEXT,
  "signatory_title" TEXT,
  "bank_details" TEXT NOT NULL,
  "payment_methods" TEXT NOT NULL,
  "social_links" TEXT NOT NULL,
  "document_prefixes" TEXT NOT NULL,
  "templates" TEXT NOT NULL,
  "show_provider_credit" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "donation_receipts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "donor_id" TEXT,
  "pledge_id" TEXT,
  "receipt_no" TEXT,
  "receipt_date" TEXT NOT NULL DEFAULT (date('now')),
  "amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "method" TEXT DEFAULT 'bank',
  "reference" TEXT,
  "fund_name" TEXT,
  "journal_entry_id" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "donor_pledges" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "donor_id" TEXT,
  "pledge_ref" TEXT,
  "pledge_date" TEXT NOT NULL DEFAULT (date('now')),
  "expected_date" TEXT,
  "amount" REAL NOT NULL DEFAULT 0,
  "received_amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "purpose" TEXT,
  "fund_name" TEXT,
  "is_restricted" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pledged',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "donors" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "donor_code" TEXT,
  "name" TEXT NOT NULL,
  "donor_type" TEXT NOT NULL DEFAULT 'institution',
  "contact_person" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "country" TEXT DEFAULT 'Zambia',
  "address" TEXT,
  "focus_area" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "employee_deductions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "employee_id" TEXT NOT NULL,
  "deduction_type_id" TEXT,
  "this_month" TEXT DEFAULT 'Show & Deduct',
  "date_taken" TEXT,
  "start_date" TEXT,
  "end_date" TEXT,
  "instalments" INTEGER DEFAULT 0,
  "outstanding_months" INTEGER DEFAULT 0,
  "total_amount" REAL DEFAULT 0,
  "initial_deposit" REAL DEFAULT 0,
  "monthly_amount" REAL DEFAULT 0,
  "outstanding_amount" REAL DEFAULT 0,
  "interest_rate" REAL DEFAULT 0,
  "total_interest" REAL DEFAULT 0,
  "interest_monthly" REAL DEFAULT 0,
  "interest_outstanding" REAL DEFAULT 0,
  "data1" REAL DEFAULT 0,
  "data2" REAL DEFAULT 0,
  "data3" REAL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "employee_incomes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "employee_id" TEXT NOT NULL,
  "income_type_id" TEXT,
  "amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "hours_days_worked" REAL DEFAULT 0,
  "data1" REAL DEFAULT 0,
  "data2" REAL DEFAULT 0,
  "data3" REAL DEFAULT 0,
  "effective_from" TEXT,
  "effective_to" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "employee_pos_permissions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "worker_user_id" TEXT,
  "employee_id" TEXT,
  "company_id" TEXT,
  "full_name" TEXT,
  "pos_role" TEXT NOT NULL DEFAULT 'cashier',
  "pin" TEXT,
  "allow" TEXT NOT NULL,
  "deny" TEXT NOT NULL,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "email" TEXT,
  "pin_locked" INTEGER NOT NULL DEFAULT 0,
  "pin_hash" TEXT
);

CREATE TABLE IF NOT EXISTS "employee_pos_sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "worker_user_id" TEXT,
  "permission_id" TEXT,
  "pos_role" TEXT,
  "device_type" TEXT,
  "terminal" TEXT,
  "started_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "ended_at" TEXT
);

CREATE TABLE IF NOT EXISTS "employees" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "employee_code" TEXT,
  "first_name" TEXT NOT NULL,
  "email" TEXT,
  "napsa_number" TEXT,
  "date_of_birth" TEXT,
  "hire_date" TEXT,
  "employment_type" TEXT DEFAULT 'permanent',
  "department_id" TEXT,
  "position_id" TEXT,
  "branch_id" TEXT,
  "manager_id" TEXT,
  "basic_salary" REAL DEFAULT 0,
  "bank_name" TEXT,
  "status" TEXT DEFAULT 'active',
  "address" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "marital_status" TEXT,
  "division_id" TEXT
);

CREATE TABLE IF NOT EXISTS "expense_category_rules" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "match_type" TEXT NOT NULL,
  "match_value" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "expense_number" TEXT,
  "expense_date" TEXT NOT NULL DEFAULT (date('now')),
  "category" TEXT,
  "supplier_id" TEXT,
  "payment_method" TEXT NOT NULL DEFAULT 'cash',
  "bank_account_id" TEXT,
  "expense_account_id" TEXT,
  "amount" REAL NOT NULL DEFAULT 0,
  "vat_amount" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "reference" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'posted',
  "journal_entry_id" TEXT,
  "reversed_by" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "exchange_rate" REAL NOT NULL DEFAULT 1,
  "charge_code" TEXT,
  "transaction_type" TEXT NOT NULL DEFAULT 'business_expense'
);

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "key" TEXT,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "updated_by" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "fee_payments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "student_id" TEXT,
  "student_fee_id" TEXT,
  "receipt_no" TEXT,
  "payment_date" TEXT NOT NULL DEFAULT (date('now')),
  "amount" REAL NOT NULL DEFAULT 0,
  "method" TEXT DEFAULT 'cash',
  "reference" TEXT,
  "journal_entry_id" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "fee_structures" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "fee_name" TEXT NOT NULL,
  "class_id" TEXT,
  "academic_year" INTEGER NOT NULL,
  "term" TEXT NOT NULL DEFAULT 'Term 1',
  "amount" REAL NOT NULL DEFAULT 0,
  "fee_type" TEXT DEFAULT 'tuition',
  "is_mandatory" INTEGER NOT NULL DEFAULT 1,
  "income_account_code" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "financial_periods" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "fiscal_year" INTEGER NOT NULL,
  "period_month" INTEGER,
  "period_type" TEXT NOT NULL DEFAULT 'month',
  "status" TEXT NOT NULL DEFAULT 'open',
  "closed_at" TEXT,
  "closed_by" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "fixed_assets" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "asset_number" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT,
  "purchase_date" TEXT NOT NULL,
  "supplier" TEXT,
  "cost" REAL NOT NULL DEFAULT 0,
  "salvage_value" REAL NOT NULL DEFAULT 0,
  "useful_life_years" REAL NOT NULL DEFAULT 5,
  "method" TEXT NOT NULL DEFAULT 'straight_line',
  "location" TEXT,
  "condition" TEXT DEFAULT 'good',
  "status" TEXT NOT NULL DEFAULT 'active',
  "disposal_date" TEXT,
  "disposal_proceeds" REAL DEFAULT 0,
  "accumulated_depreciation" REAL NOT NULL DEFAULT 0,
  "book_value" REAL NOT NULL DEFAULT 0,
  "asset_account_code" TEXT DEFAULT '1500',
  "depreciation_expense_code" TEXT DEFAULT '5700',
  "accumulated_depreciation_code" TEXT DEFAULT '1590',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "category_id" TEXT
);

CREATE TABLE IF NOT EXISTS "fx_rates" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "from_currency" TEXT NOT NULL,
  "to_currency" TEXT NOT NULL,
  "rate" REAL NOT NULL,
  "as_of_date" TEXT NOT NULL DEFAULT (date('now')),
  "source" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "grant_milestones" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "donor_id" TEXT,
  "title" TEXT NOT NULL,
  "milestone_type" TEXT NOT NULL DEFAULT 'report',
  "due_date" TEXT,
  "completed_date" TEXT,
  "amount" REAL DEFAULT 0,
  "owner" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hospitality_tax_profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "name" TEXT NOT NULL DEFAULT 'Default',
  "vat_rate" REAL NOT NULL DEFAULT 16,
  "tourism_levy_rate" REAL NOT NULL DEFAULT 1.5,
  "service_charge_rate" REAL NOT NULL DEFAULT 0,
  "levy_on_accommodation" INTEGER NOT NULL DEFAULT 1,
  "levy_on_conference_package" INTEGER NOT NULL DEFAULT 1,
  "levy_on_food_beverage" INTEGER NOT NULL DEFAULT 0,
  "prices_tax_inclusive" INTEGER NOT NULL DEFAULT 0,
  "active" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_channel_sync_log" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "channel_id" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "message" TEXT,
  "records_in" INTEGER NOT NULL DEFAULT 0,
  "records_out" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "hotel_channels" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "channel_key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'not_connected',
  "credentials_present" INTEGER NOT NULL DEFAULT 0,
  "sync_mode" TEXT NOT NULL DEFAULT 'manual',
  "commission_rate" REAL NOT NULL DEFAULT 0,
  "last_sync_at" TEXT,
  "last_sync_status" TEXT,
  "notes" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_events" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "customer_id" TEXT,
  "folio_id" TEXT,
  "reference" TEXT,
  "name" TEXT NOT NULL,
  "venue" TEXT,
  "event_type" TEXT NOT NULL DEFAULT 'conference',
  "starts_at" TEXT NOT NULL,
  "ends_at" TEXT NOT NULL,
  "guests" INTEGER NOT NULL DEFAULT 0,
  "package_rate" REAL NOT NULL DEFAULT 0,
  "package_basis" TEXT NOT NULL DEFAULT 'per_person',
  "deposit" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'enquiry',
  "contact_name" TEXT,
  "contact_phone" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_folio_charges" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "folio_id" TEXT NOT NULL,
  "charge_date" TEXT NOT NULL DEFAULT (date('now')),
  "category" TEXT NOT NULL DEFAULT 'room',
  "description" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit_price" REAL NOT NULL DEFAULT 0,
  "amount" REAL NOT NULL DEFAULT 0,
  "vat_amount" REAL NOT NULL DEFAULT 0,
  "levy_amount" REAL NOT NULL DEFAULT 0,
  "service_charge" REAL NOT NULL DEFAULT 0,
  "payment_method" TEXT,
  "source_ref" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_folio_lines" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "posting_date" TEXT NOT NULL DEFAULT (date('now')),
  "quantity" REAL NOT NULL DEFAULT 1,
  "total_amount" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "hotel_folios" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "guest_id" TEXT NOT NULL DEFAULT 'open',
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "branch_id" TEXT,
  "reservation_id" TEXT,
  "customer_id" TEXT,
  "invoice_id" TEXT,
  "folio_number" TEXT NOT NULL,
  "guest_name" TEXT,
  "billing_type" TEXT NOT NULL DEFAULT 'guest',
  "status" TEXT NOT NULL DEFAULT 'open',
  "opened_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "closed_at" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_guests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "first_name" TEXT NOT NULL DEFAULT 'Zambia',
  "notes" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_housekeeping_tasks" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "task_date" TEXT NOT NULL DEFAULT (date('now')),
  "room_id" TEXT,
  "task_type" TEXT NOT NULL DEFAULT 'departure clean',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "assigned_to" TEXT,
  "notes" TEXT,
  "completed_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_maintenance_tasks" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS "hotel_night_audits" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "audit_date" TEXT NOT NULL,
  "rooms_available" INTEGER NOT NULL DEFAULT 0,
  "rooms_occupied" INTEGER NOT NULL DEFAULT 0,
  "room_revenue" REAL NOT NULL DEFAULT 0,
  "fnb_revenue" REAL NOT NULL DEFAULT 0,
  "other_revenue" REAL NOT NULL DEFAULT 0,
  "vat_total" REAL NOT NULL DEFAULT 0,
  "levy_total" REAL NOT NULL DEFAULT 0,
  "service_charge_total" REAL NOT NULL DEFAULT 0,
  "payments" TEXT NOT NULL,
  "exceptions" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "run_by" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_precheckin_links" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "expires_at" TEXT NOT NULL,
  "submitted_at" TEXT,
  "submitted_details" TEXT,
  "consent_given" INTEGER NOT NULL DEFAULT 0,
  "arrival_time" TEXT,
  "upsells" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_rate_plans" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "room_type_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nightly_rate" REAL NOT NULL DEFAULT 0,
  "weekend_rate" REAL,
  "min_stay" INTEGER NOT NULL DEFAULT 1,
  "max_occupancy" INTEGER,
  "extra_adult_rate" REAL NOT NULL DEFAULT 0,
  "extra_child_rate" REAL NOT NULL DEFAULT 0,
  "customer_id" TEXT,
  "rate_type" TEXT NOT NULL DEFAULT 'standard',
  "season_start" TEXT,
  "season_end" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "includes" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_reservations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "room_type_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT NOT NULL DEFAULT (datetime('now')),
  "branch_id" TEXT,
  "customer_id" TEXT,
  "room_id" TEXT,
  "reference" TEXT,
  "guest_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "company" TEXT,
  "adults" INTEGER NOT NULL DEFAULT 1,
  "children" INTEGER NOT NULL DEFAULT 0,
  "actual_check_in" TEXT,
  "actual_check_out" TEXT,
  "nightly_rate" REAL NOT NULL DEFAULT 0,
  "deposit" REAL NOT NULL DEFAULT 0,
  "source" TEXT,
  "walk_in" INTEGER NOT NULL DEFAULT 0,
  "special_requests" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_room_types" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "branch_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "base_rate" REAL NOT NULL DEFAULT 0,
  "amenities" TEXT NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "hotel_rooms" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "room_number" TEXT NOT NULL DEFAULT 'available',
  "active" INTEGER NOT NULL DEFAULT 1,
  "branch_id" TEXT,
  "room_type_id" TEXT,
  "number" TEXT NOT NULL,
  "floor" TEXT,
  "status" TEXT NOT NULL DEFAULT 'vacant',
  "housekeeping_status" TEXT NOT NULL DEFAULT 'clean',
  "rate_override" REAL,
  "out_of_order" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "imprest_register" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "imprest_no" TEXT NOT NULL,
  "officer_name" TEXT NOT NULL,
  "purpose" TEXT,
  "amount_issued" REAL NOT NULL DEFAULT 0,
  "amount_spent" REAL NOT NULL DEFAULT 0,
  "amount_returned" REAL NOT NULL DEFAULT 0,
  "date_issued" TEXT NOT NULL DEFAULT (date('now')),
  "retirement_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'issued',
  "receipt_url" TEXT,
  "bank_account_id" TEXT,
  "journal_entry_id" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "inventory_locations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "location_type" TEXT NOT NULL DEFAULT 'warehouse',
  "parent_id" TEXT,
  "warehouse_id" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "address" TEXT
);

CREATE TABLE IF NOT EXISTS "inventory_transfer_items" (
  "id" TEXT PRIMARY KEY,
  "transfer_id" TEXT NOT NULL,
  "item_id" TEXT,
  "description" TEXT,
  "quantity" REAL NOT NULL DEFAULT 0,
  "unit_cost" REAL NOT NULL DEFAULT 0,
  "qty_received" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "inventory_transfers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "reference" TEXT,
  "from_location_id" TEXT,
  "to_location_id" TEXT,
  "transfer_date" TEXT NOT NULL DEFAULT (date('now')),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "transfer_number" TEXT
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "stock_item_id" TEXT,
  "description" TEXT NOT NULL,
  "hs_code" TEXT,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit_price" REAL NOT NULL DEFAULT 0,
  "vat_rate" REAL NOT NULL DEFAULT 16,
  "line_total" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "quote_id" TEXT,
  "number" TEXT NOT NULL,
  "issue_date" TEXT NOT NULL DEFAULT (date('now')),
  "due_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "subtotal" REAL NOT NULL DEFAULT 0,
  "vat_amount" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "amount_paid" REAL NOT NULL DEFAULT 0,
  "balance_due" REAL NOT NULL DEFAULT 0,
  "seller_tpin" TEXT,
  "buyer_tpin" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "voided_at" TEXT,
  "void_reason" TEXT,
  "exchange_rate" REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "job_cards" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "job_number" TEXT,
  "customer_id" TEXT,
  "technician" TEXT,
  "service_date" TEXT NOT NULL DEFAULT (date('now')),
  "description" TEXT,
  "parts_cost" REAL DEFAULT 0,
  "labour_cost" REAL DEFAULT 0,
  "total_cost" REAL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'open',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "job_categories" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "entry_number" TEXT NOT NULL,
  "entry_date" TEXT NOT NULL DEFAULT (date('now')),
  "reference" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "total_debit" REAL DEFAULT 0,
  "total_credit" REAL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "reversal_of" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "exchange_rate" REAL NOT NULL DEFAULT 1,
  "batch_id" TEXT,
  "attachment_url" TEXT,
  "reversal_reason" TEXT
);

CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "entry_id" TEXT NOT NULL,
  "account_id" TEXT,
  "description" TEXT,
  "debit" REAL DEFAULT 0,
  "credit" REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "company" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'new',
  "owner" TEXT,
  "estimated_value" REAL DEFAULT 0,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "leave_register" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "employee_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "opening_balance" REAL DEFAULT 0,
  "normal_accrual" REAL DEFAULT 2,
  "total_days" REAL DEFAULT 0,
  "leave_days_taken" REAL DEFAULT 0,
  "closing_balance" REAL DEFAULT 0,
  "leave_value" REAL DEFAULT 0,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "leave_type" TEXT NOT NULL DEFAULT 'annual',
  "start_date" TEXT NOT NULL,
  "days" REAL NOT NULL DEFAULT 1,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approved_by" TEXT,
  "approved_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "loan_repayments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "loan_id" TEXT NOT NULL,
  "payment_date" TEXT NOT NULL DEFAULT (date('now')),
  "amount" REAL NOT NULL DEFAULT 0,
  "principal_portion" REAL NOT NULL DEFAULT 0,
  "interest_portion" REAL NOT NULL DEFAULT 0,
  "method" TEXT DEFAULT 'bank',
  "reference" TEXT,
  "payroll_run_id" TEXT,
  "journal_entry_id" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "loan_schedule" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "loan_id" TEXT NOT NULL,
  "period_no" INTEGER NOT NULL,
  "due_date" TEXT NOT NULL,
  "opening_balance" REAL NOT NULL DEFAULT 0,
  "principal_due" REAL NOT NULL DEFAULT 0,
  "interest_due" REAL NOT NULL DEFAULT 0,
  "total_due" REAL NOT NULL DEFAULT 0,
  "closing_balance" REAL NOT NULL DEFAULT 0,
  "amount_paid" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'due',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "loans" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "loan_number" TEXT NOT NULL,
  "loan_type" TEXT NOT NULL DEFAULT 'staff',
  "counterparty" TEXT,
  "employee_id" TEXT,
  "customer_id" TEXT,
  "supplier_id" TEXT,
  "principal" REAL NOT NULL DEFAULT 0,
  "interest_rate" REAL NOT NULL DEFAULT 0,
  "interest_method" TEXT NOT NULL DEFAULT 'straight_line',
  "term_months" INTEGER NOT NULL DEFAULT 12,
  "start_date" TEXT NOT NULL DEFAULT (date('now')),
  "first_due_date" TEXT,
  "instalment_amount" REAL DEFAULT 0,
  "total_interest" REAL DEFAULT 0,
  "total_repayable" REAL DEFAULT 0,
  "amount_repaid" REAL NOT NULL DEFAULT 0,
  "outstanding_balance" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "deduct_from_payroll" INTEGER NOT NULL DEFAULT 0,
  "control_account_code" TEXT,
  "interest_account_code" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "management_reports" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "period" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "prepared_by" TEXT,
  "prepared_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "reviewed_by" TEXT,
  "approved_at" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "snapshot" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "module_dependencies" (
  "id" TEXT PRIMARY KEY,
  "module_key" TEXT NOT NULL,
  "depends_on" TEXT NOT NULL,
  "is_hard" INTEGER NOT NULL DEFAULT 1,
  "note" TEXT,
  "unit" TEXT,
  "base_qty" REAL,
  "base_unit" TEXT
);

CREATE TABLE IF NOT EXISTS "moe_charge_codes" (
  "id" TEXT PRIMARY KEY,
  "charge_code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "code_type" TEXT NOT NULL,
  "suggested_account_code" TEXT
);

CREATE TABLE IF NOT EXISTS "moe_programmes" (
  "id" TEXT PRIMARY KEY,
  "programme_code" TEXT NOT NULL,
  "programme_name" TEXT NOT NULL,
  "sub_programme_code" TEXT NOT NULL,
  "sub_programme_name" TEXT NOT NULL,
  "school_level" TEXT NOT NULL,
  "default_percentage" REAL
);

CREATE TABLE IF NOT EXISTS "napsa_icare_entries" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "employee_id" TEXT,
  "employer_acc_no" TEXT,
  "social_security_no" TEXT,
  "id_no" TEXT,
  "surname" TEXT,
  "forename" TEXT,
  "other_names" TEXT,
  "date_of_birth" TEXT,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "gross_pay" REAL DEFAULT 0,
  "employer_contribution" REAL DEFAULT 0,
  "employee_contribution" REAL DEFAULT 0,
  "process" TEXT DEFAULT 'TRIAL',
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "type" TEXT DEFAULT 'info',
  "link" TEXT,
  "read" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "lead_id" TEXT,
  "customer_id" TEXT,
  "name" TEXT NOT NULL,
  "stage" TEXT NOT NULL DEFAULT 'prospecting',
  "amount" REAL DEFAULT 0,
  "probability" INTEGER DEFAULT 50,
  "expected_close_date" TEXT,
  "owner" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "pay_grades" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "notch" TEXT,
  "min_salary" REAL DEFAULT 0,
  "mid_salary" REAL DEFAULT 0,
  "max_salary" REAL DEFAULT 0,
  "housing_allowance" REAL DEFAULT 0,
  "transport_allowance" REAL DEFAULT 0,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "payroll_deduction_types" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'DEDUCTION',
  "rate" REAL DEFAULT 0,
  "employer_rate" REAL DEFAULT 0,
  "basis" TEXT DEFAULT 'Gross',
  "earn_inclusion" TEXT DEFAULT 'Taxable',
  "earn_exclusion" TEXT,
  "earnings_max" REAL DEFAULT 0,
  "annual_tax_limit" REAL DEFAULT 0,
  "tax_pct" REAL DEFAULT 0,
  "statutory" INTEGER NOT NULL DEFAULT 0,
  "before_tax" INTEGER NOT NULL DEFAULT 0,
  "show_on" TEXT DEFAULT 'Payslip Only',
  "employee_formula" TEXT,
  "employer_formula" TEXT,
  "account_ref" TEXT,
  "employer_account_ref" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "payroll_income_types" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'ALLOWANCE',
  "short_name" TEXT,
  "basis" TEXT DEFAULT 'Monthly',
  "taxable" INTEGER NOT NULL DEFAULT 1,
  "taxable_pct" REAL DEFAULT 100,
  "has_napsa" INTEGER NOT NULL DEFAULT 0,
  "has_nhima" INTEGER NOT NULL DEFAULT 0,
  "deductible" INTEGER NOT NULL DEFAULT 0,
  "to_all" INTEGER NOT NULL DEFAULT 0,
  "gross_up" INTEGER NOT NULL DEFAULT 0,
  "recover_days" INTEGER NOT NULL DEFAULT 0,
  "freeze_me" INTEGER NOT NULL DEFAULT 0,
  "show_on" TEXT DEFAULT 'Payslip Only',
  "employee_formula" TEXT,
  "employer_formula" TEXT,
  "account_ref" TEXT,
  "employer_account_ref" TEXT,
  "default_amount" REAL DEFAULT 0,
  "sort_order" INTEGER DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "payroll_payment_batches" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "payroll_run_id" TEXT NOT NULL,
  "bank_account_id" TEXT,
  "payment_method" TEXT NOT NULL DEFAULT 'bank_transfer',
  "pay_date" TEXT NOT NULL,
  "total_amount" REAL NOT NULL DEFAULT 0,
  "employees_count" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "reference" TEXT,
  "bank_transaction_id" TEXT,
  "notes" TEXT,
  "paid_by" TEXT,
  "paid_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "payroll_runs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "run_number" TEXT NOT NULL,
  "period_month" INTEGER NOT NULL,
  "period_year" INTEGER NOT NULL,
  "pay_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "total_gross" REAL DEFAULT 0,
  "total_paye" REAL DEFAULT 0,
  "total_napsa" REAL DEFAULT 0,
  "total_nhima" REAL DEFAULT 0,
  "total_net" REAL DEFAULT 0,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "total_wcf" REAL,
  "prepared_by" TEXT
);

CREATE TABLE IF NOT EXISTS "payroll_statutory_filings" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "payroll_run_id" TEXT,
  "filing_type" TEXT NOT NULL,
  "period_year" INTEGER NOT NULL,
  "period_month" INTEGER NOT NULL,
  "employees_count" INTEGER NOT NULL DEFAULT 0,
  "employee_amount" REAL NOT NULL DEFAULT 0,
  "employer_amount" REAL NOT NULL DEFAULT 0,
  "total_amount" REAL NOT NULL DEFAULT 0,
  "payroll_amount" REAL NOT NULL DEFAULT 0,
  "difference" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "file_name" TEXT,
  "submission_reference" TEXT,
  "submitted_at" TEXT,
  "acted_by" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "payroll_statutory_rules" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "effective_from" TEXT NOT NULL,
  "paye_bands" TEXT NOT NULL,
  "napsa_rate" REAL NOT NULL DEFAULT 0.05,
  "napsa_employer_rate" REAL NOT NULL DEFAULT 0.05,
  "napsa_cap" REAL NOT NULL DEFAULT 0,
  "nhima_rate" REAL NOT NULL DEFAULT 0.01,
  "nhima_employer_rate" REAL NOT NULL DEFAULT 0.01,
  "wcf_rate" REAL NOT NULL DEFAULT 0.015,
  "sdl_rate" REAL NOT NULL DEFAULT 0.005,
  "housing_exempt_pct" REAL NOT NULL DEFAULT 0.30,
  "source_note" TEXT,
  "verified_by" TEXT,
  "verified_on" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "payslips" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "payroll_run_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "basic_salary" REAL DEFAULT 0,
  "allowances" REAL DEFAULT 0,
  "overtime" REAL DEFAULT 0,
  "gross_pay" REAL DEFAULT 0,
  "paye" REAL DEFAULT 0,
  "napsa" REAL DEFAULT 0,
  "nhima" REAL DEFAULT 0,
  "other_deductions" REAL DEFAULT 0,
  "net_pay" REAL DEFAULT 0,
  "earnings" TEXT NOT NULL,
  "housing_allowance" REAL,
  "currency" TEXT NOT NULL DEFAULT 'ZMW'
);

CREATE TABLE IF NOT EXISTS "petty_cash" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "voucher_no" TEXT,
  "txn_date" TEXT NOT NULL DEFAULT (date('now')),
  "txn_type" TEXT NOT NULL DEFAULT 'payment',
  "payee" TEXT,
  "description" TEXT,
  "charge_code" TEXT,
  "amount" REAL NOT NULL DEFAULT 0,
  "balance_after" REAL,
  "approved_by" TEXT,
  "journal_entry_id" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "pos_favorites" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "group_name" TEXT NOT NULL DEFAULT 'Fast sellers',
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "pos_manager_overrides" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "cashier_user_id" TEXT NOT NULL,
  "manager_user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity_id" TEXT,
  "expires_at" TEXT NOT NULL,
  "used_at" TEXT
);

CREATE TABLE IF NOT EXISTS "pos_payments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'cash',
  "amount" REAL NOT NULL DEFAULT 0,
  "reference" TEXT
);

CREATE TABLE IF NOT EXISTS "pos_pin_resets" (
  "id" TEXT PRIMARY KEY,
  "permission_id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "worker_user_id" TEXT,
  "requested_by" TEXT,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "new_pin" TEXT,
  "approved_by" TEXT,
  "approved_at" TEXT,
  "confirmed_at" TEXT,
  "denied_reason" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "pos_registers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "branch" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "pos_reversal_actions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "original_sale_id" TEXT NOT NULL,
  "reversal_sale_id" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "refund_method" TEXT
);

CREATE TABLE IF NOT EXISTS "pos_sale_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "item_id" TEXT,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "qty" REAL NOT NULL DEFAULT 1,
  "price" REAL NOT NULL DEFAULT 0,
  "unit_cost" REAL NOT NULL DEFAULT 0,
  "discount" REAL NOT NULL DEFAULT 0,
  "tax_rate" REAL NOT NULL DEFAULT 0,
  "line_total" REAL NOT NULL DEFAULT 0,
  "note" TEXT,
  "unit" TEXT,
  "base_qty" REAL,
  "base_unit" TEXT
);

CREATE TABLE IF NOT EXISTS "pos_sales" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "sale_no" TEXT,
  "client_ref" TEXT,
  "shift_id" TEXT,
  "register_id" TEXT,
  "customer_id" TEXT,
  "customer_name" TEXT NOT NULL DEFAULT 'Walk-in Customer',
  "price_level" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "subtotal" REAL NOT NULL DEFAULT 0,
  "discount" REAL NOT NULL DEFAULT 0,
  "tax" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "paid" REAL NOT NULL DEFAULT 0,
  "change_due" REAL NOT NULL DEFAULT 0,
  "cost_total" REAL NOT NULL DEFAULT 0,
  "note" TEXT,
  "void_reason" TEXT,
  "refund_of" TEXT,
  "sold_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "journal_entry_id" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "created_by" TEXT,
  "location_id" TEXT
);

CREATE TABLE IF NOT EXISTS "pos_settings" (
  "user_id" TEXT,
  "show_images" INTEGER NOT NULL DEFAULT 1,
  "show_stock" INTEGER NOT NULL DEFAULT 1,
  "show_sku" INTEGER NOT NULL DEFAULT 1,
  "products_per_row" INTEGER NOT NULL DEFAULT 4,
  "allow_price_change" INTEGER NOT NULL DEFAULT 1,
  "allow_negative_stock" INTEGER NOT NULL DEFAULT 0,
  "default_customer" TEXT NOT NULL DEFAULT 'Walk-in Customer',
  "default_price_level" TEXT NOT NULL DEFAULT 'normal',
  "default_payment" TEXT NOT NULL DEFAULT 'cash',
  "tax_rate" REAL NOT NULL DEFAULT 16,
  "tax_inclusive" INTEGER NOT NULL DEFAULT 1,
  "auto_new_sale" INTEGER NOT NULL DEFAULT 1,
  "auto_print_receipt" INTEGER NOT NULL DEFAULT 0,
  "silent_print" INTEGER NOT NULL DEFAULT 0,
  "receipt_footer" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "pos_shifts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "register_id" TEXT,
  "cashier_name" TEXT,
  "opened_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "closed_at" TEXT,
  "opening_float" REAL NOT NULL DEFAULT 0,
  "cash_in" REAL NOT NULL DEFAULT 0,
  "cash_out" REAL NOT NULL DEFAULT 0,
  "expected_cash" REAL NOT NULL DEFAULT 0,
  "actual_cash" REAL,
  "variance" REAL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "created_by" TEXT,
  "cashier_user_id" TEXT,
  "variance_reason" TEXT
);

CREATE TABLE IF NOT EXISTS "positions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "department_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "level" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "posting_batches" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "batch_number" TEXT NOT NULL,
  "batch_type" TEXT NOT NULL,
  "source_module" TEXT,
  "description" TEXT,
  "batch_date" TEXT NOT NULL DEFAULT (date('now')),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "total_debit" REAL NOT NULL DEFAULT 0,
  "total_credit" REAL NOT NULL DEFAULT 0,
  "entry_count" INTEGER NOT NULL DEFAULT 0,
  "posted_at" TEXT,
  "posted_by" TEXT,
  "reversed_at" TEXT,
  "reversed_by" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "preset_accounts" (
  "id" TEXT PRIMARY KEY,
  "preset_id" TEXT NOT NULL,
  "account_code" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "account_type" TEXT NOT NULL,
  "purpose" TEXT,
  "normal_balance" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "preset_modules" (
  "id" TEXT PRIMARY KEY,
  "preset_id" TEXT NOT NULL,
  "module_key" TEXT NOT NULL,
  "is_enabled" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "print_devices" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "device_type" TEXT NOT NULL DEFAULT 'web',
  "terminal_name" TEXT,
  "branch_name" TEXT,
  "company_name" TEXT,
  "printer_config" TEXT NOT NULL,
  "last_seen_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "company_id" TEXT
);

CREATE TABLE IF NOT EXISTS "print_jobs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "device_id" TEXT,
  "job_type" TEXT NOT NULL,
  "title" TEXT,
  "reference_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "error" TEXT,
  "payload" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "job_key" TEXT
);

CREATE TABLE IF NOT EXISTS "print_printers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "branch_id" TEXT,
  "device_id" TEXT,
  "name" TEXT NOT NULL,
  "label" TEXT,
  "printer_type" TEXT NOT NULL DEFAULT 'receipt',
  "connection" TEXT NOT NULL DEFAULT 'agent',
  "status" TEXT NOT NULL DEFAULT 'unknown',
  "is_default" INTEGER NOT NULL DEFAULT 0,
  "is_system_default" INTEGER NOT NULL DEFAULT 0,
  "ip_address" TEXT,
  "port" INTEGER,
  "protocol" TEXT,
  "last_seen_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "print_routing" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "branch_id" TEXT,
  "device_id" TEXT,
  "job_type" TEXT NOT NULL,
  "printer_name" TEXT,
  "printer_id" TEXT,
  "copies" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "product_price_history" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "location_id" TEXT,
  "price_type" TEXT NOT NULL DEFAULT 'selling',
  "price" REAL NOT NULL,
  "quantity" REAL,
  "effective_date" TEXT NOT NULL DEFAULT (date('now')),
  "source_type" TEXT,
  "source_id" TEXT,
  "cashier_name" TEXT,
  "note" TEXT
);

CREATE TABLE IF NOT EXISTS "production_batch_lines" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 0,
  "unit_cost" REAL,
  "note" TEXT
);

CREATE TABLE IF NOT EXISTS "production_batches" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "batch_no" TEXT NOT NULL,
  "batch_date" TEXT NOT NULL DEFAULT (date('now')),
  "location_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "posted_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT,
  "full_name" TEXT,
  "business_name" TEXT,
  "country" TEXT,
  "currency" TEXT DEFAULT 'USD',
  "tax_id" TEXT,
  "phone" TEXT,
  "team_size" TEXT,
  "industry" TEXT,
  "onboarded" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "tpin" TEXT,
  "vat_registered" INTEGER NOT NULL DEFAULT 0,
  "active_company_id" TEXT
);

CREATE TABLE IF NOT EXISTS "project_tasks" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT,
  "title" TEXT NOT NULL,
  "assignee" TEXT,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "due_date" TEXT,
  "estimated_hours" REAL DEFAULT 0,
  "actual_hours" REAL DEFAULT 0,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "customer_id" TEXT,
  "manager" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "start_date" TEXT,
  "end_date" TEXT,
  "budget" REAL DEFAULT 0,
  "actual_cost" REAL DEFAULT 0,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "purchase_order_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "po_id" TEXT NOT NULL,
  "item_id" TEXT,
  "description" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit_price" REAL NOT NULL DEFAULT 0,
  "tax_rate" REAL DEFAULT 0,
  "line_total" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "supplier_id" TEXT,
  "po_number" TEXT NOT NULL,
  "order_date" TEXT NOT NULL DEFAULT (date('now')),
  "expected_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "subtotal" REAL DEFAULT 0,
  "tax_amount" REAL DEFAULT 0,
  "total" REAL DEFAULT 0,
  "currency" TEXT DEFAULT 'ZMW',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "exchange_rate" REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "quote_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "quote_id" TEXT NOT NULL,
  "stock_item_id" TEXT,
  "description" TEXT NOT NULL,
  "hs_code" TEXT,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit_price" REAL NOT NULL DEFAULT 0,
  "vat_rate" REAL NOT NULL DEFAULT 16,
  "line_total" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "quotes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "number" TEXT NOT NULL,
  "issue_date" TEXT NOT NULL DEFAULT (date('now')),
  "valid_until" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "subtotal" REAL NOT NULL DEFAULT 0,
  "vat_amount" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "converted_invoice_id" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "voided_at" TEXT,
  "void_reason" TEXT,
  "exchange_rate" REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "rbac_permissions" (
  "key" TEXT,
  "label" TEXT NOT NULL,
  "perm_group" TEXT NOT NULL,
  "sort" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "rbac_role_permissions" (
  "role_id" TEXT NOT NULL,
  "permission_key" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "rbac_roles" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "pos_channel" TEXT,
  "is_system" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "receipt_allocations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "receipt_id" TEXT NOT NULL,
  "invoice_id" TEXT,
  "account_id" TEXT,
  "amount" REAL NOT NULL,
  "memo" TEXT
);

CREATE TABLE IF NOT EXISTS "receipts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "invoice_id" TEXT,
  "number" TEXT NOT NULL,
  "receipt_date" TEXT NOT NULL DEFAULT (date('now')),
  "amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "method" TEXT NOT NULL DEFAULT 'cash',
  "reference" TEXT,
  "notes" TEXT,
  "exchange_rate" REAL NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'posted'
);

CREATE TABLE IF NOT EXISTS "reconciliation_lines" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "bank_txn_id" TEXT NOT NULL,
  "cleared" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "reconciliation_sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "bank_account_id" TEXT,
  "statement_date" TEXT NOT NULL,
  "statement_start_date" TEXT,
  "statement_balance" REAL NOT NULL DEFAULT 0,
  "opening_balance" REAL NOT NULL DEFAULT 0,
  "book_balance" REAL NOT NULL DEFAULT 0,
  "cleared_deposits" REAL NOT NULL DEFAULT 0,
  "cleared_payments" REAL NOT NULL DEFAULT 0,
  "difference" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "locked_at" TEXT,
  "locked_by" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "restaurant_cash_drawers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Drawer 1',
  "station" TEXT,
  "business_date" TEXT NOT NULL DEFAULT (date('now')),
  "opened_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "closed_at" TEXT,
  "opening_float" REAL NOT NULL DEFAULT 0,
  "cash_sales" REAL NOT NULL DEFAULT 0,
  "cash_payouts" REAL NOT NULL DEFAULT 0,
  "cash_drops" REAL NOT NULL DEFAULT 0,
  "expected_cash" REAL NOT NULL DEFAULT 0,
  "counted_cash" REAL NOT NULL DEFAULT 0,
  "variance" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'open',
  "opened_by" TEXT,
  "closed_by" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "created_by" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_cash_transactions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "drawer_id" TEXT,
  "txn_type" TEXT NOT NULL DEFAULT 'payout',
  "amount" REAL NOT NULL DEFAULT 0,
  "reason" TEXT,
  "reference" TEXT,
  "approved_by" TEXT,
  "journal_entry_id" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_delivery_zones" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fee" REAL NOT NULL DEFAULT 0,
  "min_order" REAL NOT NULL DEFAULT 0,
  "eta_minutes" INTEGER NOT NULL DEFAULT 30,
  "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "restaurant_end_of_day" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "business_date" TEXT NOT NULL DEFAULT (date('now')),
  "orders_count" INTEGER NOT NULL DEFAULT 0,
  "gross_sales" REAL NOT NULL DEFAULT 0,
  "discounts" REAL NOT NULL DEFAULT 0,
  "tax" REAL NOT NULL DEFAULT 0,
  "service_charge" REAL NOT NULL DEFAULT 0,
  "gratuity" REAL NOT NULL DEFAULT 0,
  "delivery_fees" REAL NOT NULL DEFAULT 0,
  "cash_sales" REAL NOT NULL DEFAULT 0,
  "card_sales" REAL NOT NULL DEFAULT 0,
  "momo_sales" REAL NOT NULL DEFAULT 0,
  "other_sales" REAL NOT NULL DEFAULT 0,
  "cash_payouts" REAL NOT NULL DEFAULT 0,
  "cash_variance" REAL NOT NULL DEFAULT 0,
  "net_total" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'closed',
  "approved_by" TEXT,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_gift_cards" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "customer_id" TEXT,
  "initial_value" REAL NOT NULL DEFAULT 0,
  "balance" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expires_on" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "restaurant_kitchen_stations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categories" TEXT NOT NULL DEFAULT '{}',
  "printer" TEXT,
  "colour" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "restaurant_loyalty_accounts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "member_name" TEXT,
  "phone" TEXT,
  "points" REAL NOT NULL DEFAULT 0,
  "lifetime_spend" REAL NOT NULL DEFAULT 0,
  "tier" TEXT NOT NULL DEFAULT 'bronze',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "restaurant_menu_item_groups" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "menu_item_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "restaurant_menu_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Mains',
  "price" REAL NOT NULL DEFAULT 0,
  "cost" REAL NOT NULL DEFAULT 0,
  "station" TEXT NOT NULL DEFAULT 'Kitchen',
  "active" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_modifier_groups" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "required" INTEGER NOT NULL DEFAULT 0,
  "min_select" INTEGER NOT NULL DEFAULT 0,
  "max_select" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "applies_to_categories" TEXT NOT NULL DEFAULT '{}',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "restaurant_modifiers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" REAL NOT NULL DEFAULT 0,
  "active" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "restaurant_order_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "item_name" TEXT NOT NULL,
  "station" TEXT NOT NULL DEFAULT 'Kitchen',
  "qty" REAL NOT NULL DEFAULT 1,
  "price" REAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "kds_status" TEXT NOT NULL DEFAULT 'queued',
  "menu_item_id" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_order_types" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1,
  "requires_table" INTEGER NOT NULL DEFAULT 0,
  "requires_customer" INTEGER NOT NULL DEFAULT 0,
  "requires_address" INTEGER NOT NULL DEFAULT 0,
  "service_charge_pct" REAL NOT NULL DEFAULT 0,
  "packaging_fee" REAL NOT NULL DEFAULT 0,
  "default_gratuity_pct" REAL NOT NULL DEFAULT 0,
  "price_key" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "settings" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "restaurant_orders" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "order_no" TEXT,
  "table_id" TEXT,
  "order_type" TEXT NOT NULL DEFAULT 'DINE IN',
  "status" TEXT NOT NULL DEFAULT 'open',
  "server_name" TEXT,
  "guests" INTEGER NOT NULL DEFAULT 1,
  "subtotal" REAL NOT NULL DEFAULT 0,
  "tax" REAL NOT NULL DEFAULT 0,
  "discount" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "payment_method" TEXT,
  "opened_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "closed_at" TEXT,
  "business_date" TEXT NOT NULL,
  "customer_id" TEXT,
  "driver_name" TEXT,
  "created_by" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_payments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'cash',
  "amount" REAL NOT NULL DEFAULT 0,
  "tendered" REAL NOT NULL DEFAULT 0,
  "change_given" REAL NOT NULL DEFAULT 0,
  "reference" TEXT,
  "drawer_id" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_recipes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "menu_item_id" TEXT NOT NULL,
  "stock_item_id" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_reservations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "guest_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "guests" INTEGER NOT NULL DEFAULT 2,
  "reserved_date" TEXT NOT NULL DEFAULT (date('now')),
  "reserved_time" TEXT NOT NULL DEFAULT '18:00',
  "table_id" TEXT,
  "order_id" TEXT,
  "special_requests" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "source" TEXT NOT NULL DEFAULT 'walk-in',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "restaurant_settings" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "business_name" TEXT,
  "vat_rate" REAL NOT NULL DEFAULT 0.16,
  "service_charge_pct" REAL NOT NULL DEFAULT 0,
  "gratuity_options" TEXT NOT NULL,
  "packaging_fee" REAL NOT NULL DEFAULT 0,
  "auto_post_sales" INTEGER NOT NULL DEFAULT 1,
  "deplete_ingredients" INTEGER NOT NULL DEFAULT 1,
  "receipt_footer" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "restaurant_shifts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "employee_id" TEXT,
  "staff_name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'server',
  "clock_in" TEXT NOT NULL DEFAULT (datetime('now')),
  "clock_out" TEXT,
  "declared_tips" REAL NOT NULL DEFAULT 0,
  "business_date" TEXT NOT NULL DEFAULT (date('now')),
  "created_by" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_tables" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "seats" INTEGER NOT NULL DEFAULT 4,
  "area" TEXT NOT NULL DEFAULT 'Main',
  "status" TEXT NOT NULL DEFAULT 'free',
  "pos_x" INTEGER NOT NULL DEFAULT 0,
  "branch_id" TEXT
);

CREATE TABLE IF NOT EXISTS "restaurant_waitlist" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "guest_name" TEXT NOT NULL,
  "phone" TEXT,
  "guests" INTEGER NOT NULL DEFAULT 2,
  "quoted_minutes" INTEGER NOT NULL DEFAULT 15,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "role_module_permissions" (
  "id" TEXT PRIMARY KEY,
  "module_key" TEXT NOT NULL,
  "can_view" INTEGER NOT NULL DEFAULT 0,
  "can_manage" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "school_admissions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS "school_assessments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS "school_attendance" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "school_classes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "name" TEXT NOT NULL,
  "grade_level" TEXT,
  "stream" TEXT,
  "academic_year" INTEGER NOT NULL,
  "class_teacher" TEXT,
  "capacity" INTEGER DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "school_fee_accounts" (
  "id" TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "school_grants" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'ministry',
  "funding_institution" TEXT,
  "approved_amount" REAL NOT NULL DEFAULT 0,
  "received_amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT DEFAULT 'ZMW',
  "date_received" TEXT,
  "quarter" TEXT,
  "fiscal_year" INTEGER,
  "purpose" TEXT,
  "bank_account_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attachment_url" TEXT,
  "journal_entry_id" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "programme_code" TEXT
);

CREATE TABLE IF NOT EXISTS "school_marks" (
  "id" TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "school_parents" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "school_student_parents" (
  "student_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "school_students" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "date_of_birth" TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS "school_subjects" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "service_tickets" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "ticket_number" TEXT,
  "customer_id" TEXT,
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "assigned_to" TEXT,
  "resolution" TEXT,
  "opened_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "resolved_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "staff_members" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "email" TEXT,
  "full_name" TEXT,
  "role_id" TEXT,
  "branch_id" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "stock_adjustments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "adjustment_number" TEXT NOT NULL,
  "adjustment_date" TEXT NOT NULL DEFAULT (date('now')),
  "item_id" TEXT,
  "warehouse_id" TEXT,
  "adjustment_type" TEXT NOT NULL DEFAULT 'count',
  "quantity_before" REAL DEFAULT 0,
  "quantity_after" REAL NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "location_id" TEXT
);

CREATE TABLE IF NOT EXISTS "stock_balances" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "stock_batches" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "warehouse_id" TEXT,
  "batch_no" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 0,
  "unit_cost" REAL NOT NULL DEFAULT 0,
  "manufactured_date" TEXT,
  "expiry_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "note" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "stock_count_lines" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "count_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "expected_qty" REAL NOT NULL DEFAULT 0,
  "counted_qty" REAL,
  "variance" REAL,
  "note" TEXT,
  "location_id" TEXT
);

CREATE TABLE IF NOT EXISTS "stock_counts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "count_number" TEXT,
  "count_date" TEXT NOT NULL DEFAULT (date('now')),
  "warehouse_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "posted_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "location_id" TEXT
);

CREATE TABLE IF NOT EXISTS "stock_items" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "description" TEXT,
  "hs_code" TEXT,
  "tax_category" TEXT NOT NULL DEFAULT 'standard',
  "vat_rate" REAL NOT NULL DEFAULT 16,
  "unit" TEXT NOT NULL DEFAULT 'each',
  "cost_price" REAL NOT NULL DEFAULT 0,
  "sell_price" REAL NOT NULL DEFAULT 0,
  "quantity_on_hand" REAL NOT NULL DEFAULT 0,
  "reorder_level" REAL NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "warehouse_id" TEXT,
  "branch_id" TEXT,
  "brand" TEXT,
  "source_unit" TEXT,
  "zra_item_code" TEXT,
  "zra_item_class_code" TEXT,
  "zra_item_type_code" TEXT,
  "zra_origin_country_code" TEXT,
  "zra_pkg_unit_code" TEXT,
  "zra_qty_unit_code" TEXT,
  "zra_vat_category_code" TEXT,
  "zra_tax_rate" REAL,
  "zra_sync_status" TEXT NOT NULL DEFAULT 'unmapped',
  "zra_last_sync_at" TEXT,
  "zra_raw_data" TEXT
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "movement_type" TEXT NOT NULL,
  "quantity" REAL NOT NULL,
  "unit_cost" REAL,
  "reference" TEXT,
  "note" TEXT,
  "location_id" TEXT
);

CREATE TABLE IF NOT EXISTS "stock_serials" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "batch_id" TEXT,
  "warehouse_id" TEXT,
  "serial_no" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_stock',
  "received_date" TEXT DEFAULT (date('now')),
  "sold_date" TEXT,
  "reference" TEXT,
  "note" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "student_fees" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "student_id" TEXT,
  "fee_structure_id" TEXT,
  "academic_year" INTEGER NOT NULL,
  "term" TEXT NOT NULL DEFAULT 'Term 1',
  "description" TEXT,
  "amount_due" REAL NOT NULL DEFAULT 0,
  "amount_paid" REAL NOT NULL DEFAULT 0,
  "balance" REAL NOT NULL DEFAULT 0,
  "due_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'unpaid',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "students" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "student_no" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "gender" TEXT,
  "date_of_birth" TEXT,
  "class_id" TEXT,
  "enrolment_date" TEXT DEFAULT (date('now')),
  "guardian_name" TEXT,
  "guardian_phone" TEXT,
  "guardian_email" TEXT,
  "guardian_relationship" TEXT,
  "address" TEXT,
  "boarding" TEXT DEFAULT 'day',
  "sponsorship" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price_monthly" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZMW',
  "max_users" INTEGER NOT NULL DEFAULT 1,
  "max_invoices" INTEGER,
  "features" TEXT NOT NULL,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "supplier_quotations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "request_id" TEXT,
  "supplier_id" TEXT,
  "supplier_name" TEXT NOT NULL,
  "quoted_amount" REAL NOT NULL DEFAULT 0,
  "quote_date" TEXT DEFAULT (date('now')),
  "is_selected" INTEGER NOT NULL DEFAULT 0,
  "attachment_url" TEXT,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "supplier_code" TEXT,
  "name" TEXT NOT NULL,
  "contact_person" TEXT,
  "tpin" TEXT,
  "payment_terms" INTEGER DEFAULT 30,
  "currency" TEXT DEFAULT 'ZMW',
  "opening_balance" REAL DEFAULT 0,
  "current_balance" REAL DEFAULT 0,
  "status" TEXT DEFAULT 'active',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "tax_settings" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "tax_name" TEXT NOT NULL,
  "rate" REAL NOT NULL DEFAULT 0,
  "is_default" INTEGER NOT NULL DEFAULT 0,
  "applies_to" TEXT NOT NULL DEFAULT 'sales',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "teaching_material_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "request_no" TEXT NOT NULL,
  "request_date" TEXT NOT NULL DEFAULT (date('now')),
  "category" TEXT NOT NULL DEFAULT 'classroom',
  "item_name" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 1,
  "estimated_cost" REAL NOT NULL DEFAULT 0,
  "actual_cost" REAL,
  "requested_by" TEXT,
  "approved_by" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "supplier_id" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT,
  "task_id" TEXT,
  "employee_id" TEXT,
  "work_date" TEXT NOT NULL DEFAULT (date('now')),
  "hours" REAL NOT NULL DEFAULT 0,
  "billable" INTEGER NOT NULL DEFAULT 1,
  "hourly_rate" REAL DEFAULT 0,
  "description" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "tuckshop_transactions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "txn_date" TEXT NOT NULL DEFAULT (date('now')),
  "txn_type" TEXT NOT NULL,
  "description" TEXT,
  "quantity" REAL DEFAULT 1,
  "amount" REAL NOT NULL DEFAULT 0,
  "payment_method" TEXT DEFAULT 'cash',
  "journal_entry_id" TEXT,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "branch_id" TEXT,
  "manager" TEXT DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "workshop_allowances" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "workshop_id" TEXT,
  "recipient_name" TEXT NOT NULL,
  "role" TEXT,
  "allowance_type" TEXT,
  "amount" REAL NOT NULL DEFAULT 0,
  "paid" INTEGER NOT NULL DEFAULT 0,
  "paid_date" TEXT,
  "payment_method" TEXT,
  "journal_entry_id" TEXT
);

CREATE TABLE IF NOT EXISTS "workshops" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "workshop_name" TEXT NOT NULL,
  "start_date" TEXT NOT NULL,
  "end_date" TEXT,
  "venue" TEXT,
  "participants_count" INTEGER DEFAULT 0,
  "budget" REAL NOT NULL DEFAULT 0,
  "actual_spent" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "zra_invoice_queue" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL DEFAULT 'invoice',
  "source_id" TEXT,
  "invoice_number" TEXT,
  "total" REAL NOT NULL DEFAULT 0,
  "vat_amount" REAL NOT NULL DEFAULT 0,
  "levy_amount" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "submitted_at" TEXT,
  "response_code" TEXT,
  "response_message" TEXT,
  "payload" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TEXT,
  "zra_receipt_number" TEXT,
  "zra_internal_data" TEXT,
  "zra_receipt_signature" TEXT,
  "zra_qr_url" TEXT,
  "error_code" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "zra_smart_invoice_config" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'not_configured',
  "taxpayer_name" TEXT,
  "tpin" TEXT,
  "branch_code" TEXT,
  "device_serial" TEXT,
  "vsdc_endpoint" TEXT,
  "last_verified_at" TEXT,
  "notes" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIEW IF NOT EXISTS "account_balances" AS
SELECT a.user_id, a.id AS account_id, a.account_code, a.account_name, a.account_type,
  COALESCE(SUM(jl.debit), 0) AS total_debit, COALESCE(SUM(jl.credit), 0) AS total_credit,
  CASE WHEN a.account_type IN ('asset','expense','cogs') THEN COALESCE(SUM(jl.debit),0)-COALESCE(SUM(jl.credit),0) ELSE COALESCE(SUM(jl.credit),0)-COALESCE(SUM(jl.debit),0) END AS balance,
  COUNT(jl.id) AS entry_count
FROM chart_of_accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.entry_id AND je.status='posted'
GROUP BY a.user_id, a.id, a.account_code, a.account_name, a.account_type;

CREATE VIEW IF NOT EXISTS "bank_running_balance" AS
SELECT ba.id AS bank_account_id, ba.user_id, ba.name, ba.currency,
  ba.opening_balance + COALESCE((SELECT SUM(bt.amount) FROM bank_transactions bt WHERE bt.bank_account_id = ba.id), 0) AS current_balance,
  (SELECT COUNT(*) FROM bank_transactions bt WHERE bt.bank_account_id = ba.id AND NOT COALESCE(bt.reconciled,0)) AS unreconciled_count,
  (SELECT COUNT(*) FROM bank_transactions bt WHERE bt.bank_account_id = ba.id AND COALESCE(bt.status,'unallocated')='unallocated') AS unallocated_count
FROM bank_accounts ba;

CREATE TABLE IF NOT EXISTS zra_standard_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  branch_id TEXT,
  code_class TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT,
  description TEXT,
  raw_data TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
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
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, branch_id, item_cls_cd)
);

CREATE INDEX IF NOT EXISTS idx_zra_invoice_queue_status ON zra_invoice_queue(user_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_zra_standard_codes_lookup ON zra_standard_codes(user_id, branch_id, code_class, code);
CREATE INDEX IF NOT EXISTS idx_zra_item_classes_lookup ON zra_item_classes(user_id, branch_id, item_cls_cd);
