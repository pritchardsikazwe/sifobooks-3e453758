-- HR 360, contract generation, document vault and workflow foundation
-- SQLite/Windows runtime version. Cloud PostgreSQL has its own migration path.
CREATE TABLE IF NOT EXISTS hr_documents (
 id TEXT PRIMARY KEY,
 company_id TEXT,
 employee_id TEXT,
 document_type TEXT NOT NULL,
 document_name TEXT NOT NULL,
 document_url TEXT,
 document_text TEXT,
 issue_date TEXT,
 expiry_date TEXT,
 status TEXT NOT NULL DEFAULT 'active',
 uploaded_by TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hr_policy_acknowledgements (
 id TEXT PRIMARY KEY,
 company_id TEXT,
 employee_id TEXT,
 policy_code TEXT NOT NULL,
 policy_version TEXT NOT NULL,
 acknowledged_at TEXT,
 acknowledgement_method TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 UNIQUE(employee_id, policy_code, policy_version)
);
CREATE TABLE IF NOT EXISTS hr_leave_requests (
 id TEXT PRIMARY KEY,
 company_id TEXT,
 employee_id TEXT,
 leave_type TEXT NOT NULL,
 start_date TEXT NOT NULL,
 end_date TEXT NOT NULL,
 days REAL NOT NULL DEFAULT 0,
 reason TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 approved_by TEXT,
 approved_at TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
 id TEXT PRIMARY KEY,
 company_id TEXT,
 employee_id TEXT,
 task_code TEXT NOT NULL,
 task_name TEXT NOT NULL,
 due_date TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 completed_at TEXT,
 completed_by TEXT,
 notes TEXT,
 UNIQUE(employee_id, task_code)
);
CREATE TABLE IF NOT EXISTS hr_compliance_events (
 id TEXT PRIMARY KEY,
 company_id TEXT,
 employee_id TEXT,
 requirement_code TEXT NOT NULL,
 event_type TEXT NOT NULL,
 event_date TEXT NOT NULL DEFAULT (date('now')),
 status TEXT NOT NULL DEFAULT 'open',
 reference TEXT,
 notes TEXT,
 created_by TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON hr_documents(employee_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_hr_leave_employee ON hr_leave_requests(employee_id, start_date);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_employee ON hr_onboarding_tasks(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_compliance_events ON hr_compliance_events(requirement_code, status);
