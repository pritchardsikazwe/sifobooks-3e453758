-- =====================================================================
-- TURN 1: FOUNDATION for 2026 ERP UPGRADE (non-destructive)
-- =====================================================================

-- ---------- 1. SUBSCRIPTION PLANS: configurable limits ----------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price_yearly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS max_companies integer,
  ADD COLUMN IF NOT EXISTS max_branches integer,
  ADD COLUMN IF NOT EXISTS max_warehouses integer,
  ADD COLUMN IF NOT EXISTS max_employees integer,
  ADD COLUMN IF NOT EXISTS max_customers integer,
  ADD COLUMN IF NOT EXISTS max_suppliers integer,
  ADD COLUMN IF NOT EXISTS max_storage_gb integer,
  ADD COLUMN IF NOT EXISTS api_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offline_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mobile_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allow NULL for "unlimited" plans on legacy NOT NULL columns
ALTER TABLE public.subscription_plans ALTER COLUMN max_users DROP NOT NULL;

-- Super admins may manage plans; everyone reads
DROP POLICY IF EXISTS "plans admin write" ON public.subscription_plans;
CREATE POLICY "plans admin write" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Seed / upsert standard plans
INSERT INTO public.subscription_plans
  (code, name, description, price_monthly, price_yearly, trial_days, max_users, max_companies,
   max_branches, max_warehouses, max_employees, max_invoices, max_customers, max_suppliers,
   max_storage_gb, api_access, offline_access, mobile_access, module_keys, features, sort_order)
VALUES
  ('free',        'Free / Demo',   'Explore SifoBooks with a single company.',
     0,     0, 30, 1, 1, 1, 1, 5, 25, 25, 25, 1, false, false, true,
     '["accounting","sales","purchases","banking"]'::jsonb,
     '["Core accounting","Manual receipts","Basic reports"]'::jsonb, 10),
  ('starter',     'Starter',       'For sole traders and micro-businesses.',
   349,  3490, 14, 3, 1, 2, 2, 25, NULL, 500, 500, 5, false, true, true,
     '["accounting","sales","purchases","banking","cashbook","receipts","payroll","reports"]'::jsonb,
     '["Everything in Free","Payroll (up to 25)","Bank imports","PDF exports"]'::jsonb, 20),
  ('professional','Professional',  'For growing SMEs that need full accounting.',
   799,  7990, 14, 10, 2, 5, 5, 100, NULL, 2000, 2000, 20, true, true, true,
     '["accounting","sales","purchases","banking","cashbook","receipts","payroll","inventory",
       "fixed_assets","reports","compliance","projects"]'::jsonb,
     '["Everything in Starter","Multi-company","Inventory & POs","Fixed Assets","API access"]'::jsonb, 30),
  ('business',    'Business',      'For established enterprises with multiple branches.',
  1599, 15990, 14, 25, 5, 20, 20, 500, NULL, NULL, NULL, 100, true, true, true,
     '["accounting","sales","purchases","banking","cashbook","receipts","payroll","inventory",
       "fixed_assets","reports","compliance","projects","approvals","budgets","crm","hr"]'::jsonb,
     '["Everything in Professional","Approvals workflow","Budgets","CRM"]'::jsonb, 40),
  ('enterprise',  'Enterprise',    'Unlimited, with dedicated support and custom modules.',
  3999, 39990, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 500, true, true, true,
     '[]'::jsonb,
     '["Unlimited everything","All modules","Priority support","Custom integrations","SLA"]'::jsonb, 50)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly  = EXCLUDED.price_yearly,
  trial_days    = EXCLUDED.trial_days,
  max_users     = EXCLUDED.max_users,
  max_companies = EXCLUDED.max_companies,
  max_branches  = EXCLUDED.max_branches,
  max_warehouses= EXCLUDED.max_warehouses,
  max_employees = EXCLUDED.max_employees,
  max_invoices  = EXCLUDED.max_invoices,
  max_customers = EXCLUDED.max_customers,
  max_suppliers = EXCLUDED.max_suppliers,
  max_storage_gb= EXCLUDED.max_storage_gb,
  api_access    = EXCLUDED.api_access,
  offline_access= EXCLUDED.offline_access,
  mobile_access = EXCLUDED.mobile_access,
  module_keys   = EXCLUDED.module_keys,
  features      = EXCLUDED.features,
  sort_order    = EXCLUDED.sort_order,
  updated_at    = now();

DROP TRIGGER IF EXISTS subscription_plans_touch ON public.subscription_plans;
CREATE TRIGGER subscription_plans_touch BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. COMPANY SUBSCRIPTIONS: lifecycle fields ----------
ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_until   timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS discount_pct  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code   text,
  ADD COLUMN IF NOT EXISTS seats_used    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_used_mb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

-- ---------- 3. BUSINESS PRESETS ----------
CREATE TABLE IF NOT EXISTS public.business_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  industry text,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_presets TO authenticated, anon;
GRANT ALL ON public.business_presets TO service_role;
ALTER TABLE public.business_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presets read" ON public.business_presets;
CREATE POLICY "presets read" ON public.business_presets FOR SELECT USING (true);
DROP POLICY IF EXISTS "presets admin write" ON public.business_presets;
CREATE POLICY "presets admin write" ON public.business_presets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.preset_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.business_presets(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  UNIQUE (preset_id, module_key)
);
GRANT SELECT ON public.preset_modules TO authenticated;
GRANT ALL ON public.preset_modules TO service_role;
ALTER TABLE public.preset_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preset_modules read" ON public.preset_modules;
CREATE POLICY "preset_modules read" ON public.preset_modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "preset_modules admin write" ON public.preset_modules;
CREATE POLICY "preset_modules admin write" ON public.preset_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.preset_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.business_presets(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL,
  purpose text,
  normal_balance text,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (preset_id, account_code)
);
GRANT SELECT ON public.preset_accounts TO authenticated;
GRANT ALL ON public.preset_accounts TO service_role;
ALTER TABLE public.preset_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preset_accounts read" ON public.preset_accounts;
CREATE POLICY "preset_accounts read" ON public.preset_accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "preset_accounts admin write" ON public.preset_accounts;
CREATE POLICY "preset_accounts admin write" ON public.preset_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Seed presets
INSERT INTO public.business_presets (code, name, industry, description, icon, sort_order) VALUES
  ('general',      'General Business',     'general',       'A balanced setup for most SMEs.',                    'Briefcase',   10),
  ('retail',       'Retail',               'retail',        'Shop / storefront with POS-ready inventory.',        'Store',       20),
  ('wholesale',    'Wholesale',            'wholesale',     'Bulk sales, warehouses and multi-tier pricing.',     'Warehouse',   30),
  ('restaurant',   'Restaurant / Bar',     'hospitality',   'Menu, tabs, tips and daily takings.',                'UtensilsCrossed', 40),
  ('school',       'School',               'education',     'Fees, grants, tuck-shop and school payroll.',        'GraduationCap', 50),
  ('ngo',          'NGO / Non-profit',     'ngo',           'Grants, donor funds, program budgets and reporting.', 'Heart',       60),
  ('church',       'Church',               'religious',     'Offerings, tithes, projects and members.',           'Church',      70),
  ('mining',       'Mining',               'mining',        'Site costs, royalties, PPE and heavy plant assets.', 'Mountain',    80),
  ('construction', 'Construction',         'construction',  'Projects, retentions, subcontractors and BOQs.',     'HardHat',     90),
  ('real_estate',  'Real Estate',          'real_estate',   'Land, rentals, installments and property register.', 'Home',       100),
  ('services',     'Professional Services','services',      'Time sheets, retainers and project billing.',        'Briefcase',  110),
  ('manufacturing','Manufacturing',        'manufacturing', 'BOM, work orders and finished goods.',               'Factory',    120),
  ('agriculture',  'Agriculture',          'agriculture',   'Fields, livestock and seasonal input costs.',        'Sprout',     130),
  ('transport',    'Transport / Logistics','transport',     'Fleet, trips, fuel and driver allowances.',          'Truck',      140),
  ('hospitality',  'Hospitality / Hotel',  'hospitality',   'Rooms, bookings, F&B and events.',                   'BedDouble',  150)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, industry = EXCLUDED.industry, description = EXCLUDED.description,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, updated_at = now();

-- Default module bundle for every preset (each row-set overrides in-app later)
INSERT INTO public.preset_modules (preset_id, module_key)
SELECT p.id, m FROM public.business_presets p,
  UNNEST(ARRAY['accounting','sales','purchases','banking','cashbook','receipts','reports','compliance']) m
ON CONFLICT DO NOTHING;

-- Extra modules per preset
INSERT INTO public.preset_modules (preset_id, module_key)
SELECT p.id, x.mk FROM public.business_presets p
JOIN (VALUES
  ('retail','inventory'),('retail','pos'),
  ('wholesale','inventory'),('wholesale','warehouses'),
  ('restaurant','inventory'),('restaurant','pos'),
  ('school','school_erp'),('school','payroll'),('school','fixed_assets'),
  ('ngo','grants'),('ngo','projects'),('ngo','budgets'),
  ('church','projects'),('church','budgets'),
  ('mining','fixed_assets'),('mining','projects'),('mining','inventory'),('mining','payroll'),
  ('construction','projects'),('construction','fixed_assets'),('construction','inventory'),
  ('real_estate','fixed_assets'),('real_estate','projects'),
  ('services','projects'),('services','time_entries'),('services','payroll'),
  ('manufacturing','inventory'),('manufacturing','warehouses'),('manufacturing','fixed_assets'),
  ('agriculture','inventory'),('agriculture','fixed_assets'),
  ('transport','fixed_assets'),('transport','payroll'),
  ('hospitality','inventory'),('hospitality','pos'),('hospitality','payroll')
) AS x(code, mk) ON x.code = p.code
ON CONFLICT DO NOTHING;

-- ---------- 4. MODULE DEPENDENCIES ----------
CREATE TABLE IF NOT EXISTS public.module_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  depends_on text NOT NULL,
  is_hard boolean NOT NULL DEFAULT true,
  note text,
  UNIQUE (module_key, depends_on)
);
GRANT SELECT ON public.module_dependencies TO authenticated;
GRANT ALL ON public.module_dependencies TO service_role;
ALTER TABLE public.module_dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moddeps read" ON public.module_dependencies;
CREATE POLICY "moddeps read" ON public.module_dependencies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "moddeps admin write" ON public.module_dependencies;
CREATE POLICY "moddeps admin write" ON public.module_dependencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

INSERT INTO public.module_dependencies (module_key, depends_on, note) VALUES
  ('payroll','accounting','Payroll posts wages, PAYE, NAPSA to the ledger'),
  ('payroll','banking','Salaries pay through bank/cashbook'),
  ('inventory','accounting','Stock movements post to COS/Inventory'),
  ('inventory','purchases','Stock is received via bills / POs'),
  ('inventory','sales','Stock is issued via invoices'),
  ('fixed_assets','accounting','Depreciation posts to the ledger'),
  ('fixed_assets','purchases','Assets are acquired via bills'),
  ('receipts','accounting','Receipts post to bank and AR'),
  ('receipts','banking','Receipts flow into the cashbook'),
  ('cashbook','banking','Cashbook is a bank-account view'),
  ('reconciliation','banking','Reconciliation matches bank transactions'),
  ('reports','accounting','All reports read from the ledger'),
  ('compliance','payroll','PAYE/NAPSA/NHIMA schedules come from payroll'),
  ('pos','inventory','POS decrements stock on sale'),
  ('pos','banking','POS takings hit the cashbook'),
  ('grants','accounting','Grants post as income and restricted funds'),
  ('school_erp','accounting','Fees and expenses hit the ledger'),
  ('projects','accounting','Project WIP and revenue post to the ledger')
ON CONFLICT DO NOTHING;

-- ---------- 5. FIXED ASSETS: categories / transfers / disposals ----------
CREATE TABLE IF NOT EXISTS public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  useful_life_years integer NOT NULL DEFAULT 5,
  depreciation_method text NOT NULL DEFAULT 'straight_line',
  depreciation_rate numeric,
  capitalisation_threshold numeric NOT NULL DEFAULT 0,
  depreciation_expense_code text NOT NULL DEFAULT '5700',
  accumulated_depreciation_code text NOT NULL DEFAULT '1590',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_categories TO service_role;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own asset categories" ON public.asset_categories;
CREATE POLICY "own asset categories" ON public.asset_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS asset_categories_touch ON public.asset_categories;
CREATE TRIGGER asset_categories_touch BEFORE UPDATE ON public.asset_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.asset_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  from_location text, to_location text,
  from_department text, to_department text,
  from_custodian text, to_custodian text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_transfers TO authenticated;
GRANT ALL ON public.asset_transfers TO service_role;
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own asset transfers" ON public.asset_transfers;
CREATE POLICY "own asset transfers" ON public.asset_transfers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.asset_disposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  disposal_date date NOT NULL DEFAULT CURRENT_DATE,
  disposal_method text NOT NULL DEFAULT 'sale',   -- sale | scrap | donation | write_off
  proceeds numeric NOT NULL DEFAULT 0,
  buyer text,
  reason text,
  gain_loss numeric,
  journal_entry_id uuid REFERENCES public.journal_entries(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_disposals TO authenticated;
GRANT ALL ON public.asset_disposals TO service_role;
ALTER TABLE public.asset_disposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own asset disposals" ON public.asset_disposals;
CREATE POLICY "own asset disposals" ON public.asset_disposals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Link fixed_assets to the (optional) category
ALTER TABLE public.fixed_assets
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.asset_categories(id),
  ADD COLUMN IF NOT EXISTS warranty_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS custodian text,
  ADD COLUMN IF NOT EXISTS department text;

-- ---------- 6. RECEIPT ALLOCATIONS ----------
CREATE TABLE IF NOT EXISTS public.receipt_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS receipt_allocations_receipt_idx ON public.receipt_allocations(receipt_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_allocations TO authenticated;
GRANT ALL ON public.receipt_allocations TO service_role;
ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own receipt allocations" ON public.receipt_allocations;
CREATE POLICY "own receipt allocations" ON public.receipt_allocations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id),
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS voucher_no text,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS receipts_touch ON public.receipts;
CREATE TRIGGER receipts_touch BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 7. CASHBOOKS master list ----------
CREATE TABLE IF NOT EXISTS public.cashbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  cashbook_type text NOT NULL DEFAULT 'bank',   -- bank | cash | petty_cash | mobile_money | other
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  gl_account_id   uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  opening_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashbooks TO authenticated;
GRANT ALL ON public.cashbooks TO service_role;
ALTER TABLE public.cashbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own cashbooks" ON public.cashbooks;
CREATE POLICY "own cashbooks" ON public.cashbooks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS cashbooks_touch ON public.cashbooks;
CREATE TRIGGER cashbooks_touch BEFORE UPDATE ON public.cashbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 8. POSTING BATCHES ----------
CREATE TABLE IF NOT EXISTS public.posting_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  batch_type text NOT NULL,          -- payroll | depreciation | import | manual | recurring
  source_module text,
  description text,
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',   -- draft | posted | reversed
  total_debit numeric NOT NULL DEFAULT 0,
  total_credit numeric NOT NULL DEFAULT 0,
  entry_count integer NOT NULL DEFAULT 0,
  posted_at timestamptz,
  posted_by uuid,
  reversed_at timestamptz,
  reversed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, batch_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posting_batches TO authenticated;
GRANT ALL ON public.posting_batches TO service_role;
ALTER TABLE public.posting_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own posting batches" ON public.posting_batches;
CREATE POLICY "own posting batches" ON public.posting_batches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS posting_batches_touch ON public.posting_batches;
CREATE TRIGGER posting_batches_touch BEFORE UPDATE ON public.posting_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.posting_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS journal_entries_batch_idx ON public.journal_entries(batch_id);

-- ---------- 9. Hygiene: recalc every bank transaction's allocation status ----------
-- Cleans up any historical rows still tagged 'unallocated' after posting.
UPDATE public.bank_transactions SET updated_at = now();
