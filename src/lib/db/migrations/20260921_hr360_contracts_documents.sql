-- HR 360, contract generation, document vault and workflow foundation
CREATE TABLE IF NOT EXISTS hr_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
 document_type text NOT NULL, document_name text NOT NULL, document_url text, document_text text, issue_date date, expiry_date date,
 status text NOT NULL DEFAULT 'active', uploaded_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hr_policy_acknowledgements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
 policy_code text NOT NULL, policy_version text NOT NULL, acknowledged_at timestamptz, acknowledgement_method text, status text NOT NULL DEFAULT 'pending',
 UNIQUE(employee_id, policy_code, policy_version)
);
CREATE TABLE IF NOT EXISTS hr_leave_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
 leave_type text NOT NULL, start_date date NOT NULL, end_date date NOT NULL, days numeric(8,2) NOT NULL DEFAULT 0,
 reason text, status text NOT NULL DEFAULT 'pending', approved_by uuid, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
 task_code text NOT NULL, task_name text NOT NULL, due_date date, status text NOT NULL DEFAULT 'pending', completed_at timestamptz,
 completed_by uuid, notes text, UNIQUE(employee_id, task_code)
);
CREATE TABLE IF NOT EXISTS hr_compliance_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
 requirement_code text NOT NULL, event_type text NOT NULL, event_date date NOT NULL DEFAULT current_date,
 status text NOT NULL DEFAULT 'open', reference text, notes text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON hr_documents(employee_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_hr_leave_employee ON hr_leave_requests(employee_id, start_date);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_employee ON hr_onboarding_tasks(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_compliance_events ON hr_compliance_events(requirement_code, status);
