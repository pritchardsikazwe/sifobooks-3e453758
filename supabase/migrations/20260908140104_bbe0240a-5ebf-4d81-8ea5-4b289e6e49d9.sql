-- ============================================================
-- 1. Catalogue, roles, staff
-- ============================================================
CREATE TABLE public.rbac_permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  perm_group text NOT NULL,
  sort int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.rbac_permissions TO authenticated;
GRANT ALL ON public.rbac_permissions TO service_role;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm catalogue readable" ON public.rbac_permissions FOR SELECT TO authenticated USING (true);

INSERT INTO public.rbac_permissions(key,label,perm_group,sort) VALUES
 ('accounting.view','View accounting (invoices, bills, journals, banking)','Accounting',10),
 ('accounting.manage','Create/edit accounting records','Accounting',11),
 ('financial_reports.view','View financial statements (P&L, balance sheet, GL)','Reports',20),
 ('reports.view','View operational & sales reports','Reports',21),
 ('pos.retail.access','Access Retail POS','Retail POS',30),
 ('pos.restaurant.access','Access Restaurant POS','Restaurant POS',40),
 ('pos.sales.create','Create sales / orders & take payments','POS',50),
 ('pos.sales.view_own','View own sales & shifts','POS',51),
 ('pos.sales.view_all','View all cashiers'' sales & shifts','POS',52),
 ('pos.discount','Apply discounts','POS',53),
 ('pos.refund','Refund sales','POS',54),
 ('pos.void','Void sales / orders','POS',55),
 ('cash_shift.open','Open own cash shift','POS',56),
 ('cash_shift.close','Close own cash shift / end of day','POS',57),
 ('tables.manage','Manage restaurant floor & tables','Restaurant POS',58),
 ('kitchen.access','Kitchen display access','Restaurant POS',59),
 ('products.view','View products / menu (selling info)','Products',60),
 ('products.manage','Create/edit products & menu items','Products',61),
 ('prices.manage','Change selling prices','Products',62),
 ('inventory.view','View stock levels, costs & movements','Inventory',70),
 ('inventory.manage','Adjust, count & transfer stock','Inventory',71),
 ('hr.manage','HR & payroll','Administration',80),
 ('users.manage','Invite & manage staff','Administration',90),
 ('roles.manage','Create roles & assign permissions','Administration',91),
 ('settings.manage','Change system & POS settings','Administration',92);

CREATE TABLE public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  pos_channel text CHECK (pos_channel IN ('retail','restaurant')),
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rbac_roles_tenant_key ON public.rbac_roles (COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_roles TO authenticated;
GRANT ALL ON public.rbac_roles TO service_role;
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rbac_role_permissions (
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.rbac_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_role_permissions TO authenticated;
GRANT ALL ON public.rbac_role_permissions TO service_role;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text,
  full_name text,
  role_id uuid REFERENCES public.rbac_roles(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX staff_members_user ON public.staff_members(user_id) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pos_manager_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  cashier_user_id uuid NOT NULL,
  manager_user_id uuid NOT NULL,
  action text NOT NULL,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at timestamptz
);
GRANT SELECT ON public.pos_manager_overrides TO authenticated;
GRANT ALL ON public.pos_manager_overrides TO service_role;
ALTER TABLE public.pos_manager_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "override visible to parties" ON public.pos_manager_overrides FOR SELECT TO authenticated
  USING (cashier_user_id = auth.uid() OR manager_user_id = auth.uid() OR tenant_id = auth.uid());

CREATE TRIGGER rbac_roles_updated BEFORE UPDATE ON public.rbac_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER staff_members_updated BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. System role templates
-- ============================================================
INSERT INTO public.rbac_roles(tenant_id,key,name,description,pos_channel,is_system) VALUES
 (NULL,'accountant','Accountant','Full accounting: invoices, expenses, payments, journals, banking, financial reports. No cashier or user management.',NULL,true),
 (NULL,'retail_manager','Retail Manager','Retail POS, retail stock, products & prices, refunds/voids, all cashier activity and sales reports.','retail',true),
 (NULL,'retail_cashier','Retail Cashier','Retail POS only: sell, take payments, print receipts, own shift and own sales.','retail',true),
 (NULL,'restaurant_manager','Restaurant Manager','Restaurant POS, tables, kitchen, menu & prices, refunds/voids, all waiter activity and restaurant reports.','restaurant',true),
 (NULL,'restaurant_cashier','Restaurant Cashier / Waiter','Restaurant POS only: orders, tables, payments, receipts, own shift and own orders.','restaurant',true);

INSERT INTO public.rbac_role_permissions(role_id, permission_key)
SELECT r.id, p FROM public.rbac_roles r, unnest(ARRAY[
  'accounting.view','accounting.manage','financial_reports.view','reports.view','inventory.view','products.view','pos.sales.view_all']) p WHERE r.tenant_id IS NULL AND r.key='accountant';
INSERT INTO public.rbac_role_permissions(role_id, permission_key)
SELECT r.id, p FROM public.rbac_roles r, unnest(ARRAY[
  'pos.retail.access','pos.sales.create','pos.sales.view_own','pos.sales.view_all','pos.discount','pos.refund','pos.void','cash_shift.open','cash_shift.close',
  'products.view','products.manage','prices.manage','inventory.view','inventory.manage','reports.view']) p WHERE r.tenant_id IS NULL AND r.key='retail_manager';
INSERT INTO public.rbac_role_permissions(role_id, permission_key)
SELECT r.id, p FROM public.rbac_roles r, unnest(ARRAY[
  'pos.retail.access','pos.sales.create','pos.sales.view_own','cash_shift.open','cash_shift.close','products.view']) p WHERE r.tenant_id IS NULL AND r.key='retail_cashier';
INSERT INTO public.rbac_role_permissions(role_id, permission_key)
SELECT r.id, p FROM public.rbac_roles r, unnest(ARRAY[
  'pos.restaurant.access','pos.sales.create','pos.sales.view_own','pos.sales.view_all','pos.discount','pos.refund','pos.void','cash_shift.open','cash_shift.close',
  'tables.manage','kitchen.access','products.view','products.manage','prices.manage','inventory.view','inventory.manage','reports.view']) p WHERE r.tenant_id IS NULL AND r.key='restaurant_manager';
INSERT INTO public.rbac_role_permissions(role_id, permission_key)
SELECT r.id, p FROM public.rbac_roles r, unnest(ARRAY[
  'pos.restaurant.access','pos.sales.create','pos.sales.view_own','cash_shift.open','cash_shift.close','kitchen.access','products.view']) p WHERE r.tenant_id IS NULL AND r.key='restaurant_cashier';

-- ============================================================
-- 3. Core functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_tenant() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.staff_members WHERE user_id = auth.uid() AND is_active ORDER BY created_at LIMIT 1),
    auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_staff_of(_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_members WHERE user_id = auth.uid() AND tenant_id = _tenant AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.has_perm(_perm text, _tenant uuid DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t uuid; me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  t := COALESCE(_tenant, public.current_tenant());
  IF me = t THEN RETURN true; END IF;                       -- owner of the books
  IF public.has_role(me, 'super_admin') THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.staff_members sm
    JOIN public.rbac_role_permissions rp ON rp.role_id = sm.role_id
    WHERE sm.user_id = me AND sm.tenant_id = t AND sm.is_active AND rp.permission_key = _perm);
END $$;

CREATE OR REPLACE FUNCTION public.staff_branch() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT branch_id FROM public.staff_members WHERE user_id = auth.uid() AND is_active ORDER BY created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.branch_ok(_row_branch uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.staff_branch() IS NULL OR _row_branch IS NULL OR _row_branch = public.staff_branch();
$$;

CREATE OR REPLACE FUNCTION public.has_override(_action text, _entity uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.pos_manager_overrides
    WHERE cashier_user_id = auth.uid() AND action = _action AND (entity_id IS NULL OR entity_id = _entity) AND expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.my_access() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); sm record; perms text[]; t uuid;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  SELECT s.*, r.key AS role_key, r.name AS role_name, r.pos_channel, b.name AS branch_name
    INTO sm FROM public.staff_members s
    LEFT JOIN public.rbac_roles r ON r.id = s.role_id
    LEFT JOIN public.branches b ON b.id = s.branch_id
    WHERE s.user_id = me AND s.is_active ORDER BY s.created_at LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('tenant_id', me, 'is_owner', true,
      'is_super_admin', public.has_role(me,'super_admin'), 'permissions', '[]'::jsonb);
  END IF;
  SELECT COALESCE(array_agg(rp.permission_key ORDER BY rp.permission_key), '{}') INTO perms
    FROM public.rbac_role_permissions rp WHERE rp.role_id = sm.role_id;
  RETURN jsonb_build_object(
    'tenant_id', sm.tenant_id, 'is_owner', false, 'is_super_admin', public.has_role(me,'super_admin'),
    'staff_id', sm.id, 'full_name', sm.full_name, 'role_key', sm.role_key, 'role_name', sm.role_name,
    'pos_channel', sm.pos_channel, 'branch_id', sm.branch_id, 'branch_name', sm.branch_name,
    'permissions', to_jsonb(perms));
END $$;

REVOKE EXECUTE ON FUNCTION public.current_tenant(), public.is_staff_of(uuid), public.has_perm(text,uuid), public.staff_branch(), public.branch_ok(uuid), public.has_override(text,uuid), public.my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant(), public.is_staff_of(uuid), public.has_perm(text,uuid), public.staff_branch(), public.branch_ok(uuid), public.has_override(text,uuid), public.my_access() TO authenticated, service_role;

-- ============================================================
-- 4. RBAC table policies
-- ============================================================
CREATE POLICY "roles visible" ON public.rbac_roles FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant() OR tenant_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "roles insert" ON public.rbac_roles FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND is_system = false AND public.has_perm('roles.manage', tenant_id));
CREATE POLICY "roles update" ON public.rbac_roles FOR UPDATE TO authenticated
  USING (tenant_id IS NOT NULL AND public.has_perm('roles.manage', tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND is_system = false AND public.has_perm('roles.manage', tenant_id));
CREATE POLICY "roles delete" ON public.rbac_roles FOR DELETE TO authenticated
  USING (tenant_id IS NOT NULL AND public.has_perm('roles.manage', tenant_id));

CREATE POLICY "role perms visible" ON public.rbac_role_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rbac_roles r WHERE r.id = role_id
     AND (r.tenant_id IS NULL OR r.tenant_id = public.current_tenant() OR r.tenant_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))));
CREATE POLICY "role perms manage" ON public.rbac_role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rbac_roles r WHERE r.id = role_id AND r.tenant_id IS NOT NULL AND public.has_perm('roles.manage', r.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rbac_roles r WHERE r.id = role_id AND r.tenant_id IS NOT NULL AND public.has_perm('roles.manage', r.tenant_id))
     AND public.has_perm(permission_key, (SELECT tenant_id FROM public.rbac_roles WHERE id = role_id)));

CREATE POLICY "staff see self" ON public.staff_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff managed" ON public.staff_members FOR ALL TO authenticated
  USING (public.has_perm('users.manage', tenant_id)) WITH CHECK (public.has_perm('users.manage', tenant_id));

-- No privilege escalation: whoever assigns a role must hold every permission in it.
CREATE OR REPLACE FUNCTION public.guard_staff_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE missing text;
BEGIN
  IF NEW.user_id = NEW.tenant_id THEN RAISE EXCEPTION 'The owner cannot be added as staff'; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> NEW.tenant_id AND NOT public.has_role(auth.uid(),'super_admin') AND NEW.role_id IS NOT NULL THEN
    SELECT rp.permission_key INTO missing FROM public.rbac_role_permissions rp
      WHERE rp.role_id = NEW.role_id AND NOT public.has_perm(rp.permission_key, NEW.tenant_id) LIMIT 1;
    IF missing IS NOT NULL THEN RAISE EXCEPTION 'You cannot assign a role that grants % (you do not hold it)', missing; END IF;
    IF (SELECT tenant_id FROM public.rbac_roles WHERE id = NEW.role_id) IS DISTINCT FROM NEW.tenant_id
       AND (SELECT tenant_id FROM public.rbac_roles WHERE id = NEW.role_id) IS NOT NULL THEN
      RAISE EXCEPTION 'Role belongs to another business';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_staff_assignment BEFORE INSERT OR UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.guard_staff_assignment();

-- ============================================================
-- 5. Tenant scoping + audit columns
-- ============================================================
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid(), ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE public.pos_shifts ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid(), ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE public.restaurant_orders ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.restaurant_shifts ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid(), ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE public.restaurant_cash_drawers ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS branch_id uuid;

-- Staff inserts are filed under the owner's books and stamped with creator / branch.
CREATE OR REPLACE FUNCTION public.rbac_scope_tenant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    t := public.current_tenant();
    IF NEW.user_id IS NULL OR NEW.user_id = auth.uid() THEN NEW.user_id := t; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.rbac_stamp_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE j jsonb := to_jsonb(NEW);
BEGIN
  IF j ? 'created_by' AND (j->>'created_by') IS NULL THEN NEW := jsonb_populate_record(NEW, jsonb_build_object('created_by', auth.uid())); END IF;
  IF j ? 'branch_id' AND (j->>'branch_id') IS NULL AND public.staff_branch() IS NOT NULL THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('branch_id', public.staff_branch()));
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_name = c.table_name AND tb.table_schema = 'public' AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'user_id'
      AND c.table_name NOT IN ('user_roles','company_members','employee_pos_permissions','employee_pos_sessions','notifications',
                               'audit_logs','approval_requests','approval_actions','staff_members','pos_manager_overrides','profiles')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS rbac_scope_tenant ON public.%I', t);
    EXECUTE format('CREATE TRIGGER rbac_scope_tenant BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.rbac_scope_tenant()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['pos_sales','pos_shifts','restaurant_orders','restaurant_shifts','restaurant_cash_drawers'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS rbac_stamp_row ON public.%I', t);
    EXECUTE format('CREATE TRIGGER rbac_stamp_row BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.rbac_stamp_row()', t);
  END LOOP;
END $$;

-- ============================================================
-- 6. Staff data policies (owner policies remain untouched)
-- ============================================================
CREATE OR REPLACE FUNCTION public.rbac_add_policies(_tbl text, _view text, _manage text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS staff_select ON public.%I', _tbl);
  EXECUTE format('DROP POLICY IF EXISTS staff_insert ON public.%I', _tbl);
  EXECUTE format('DROP POLICY IF EXISTS staff_update ON public.%I', _tbl);
  EXECUTE format('DROP POLICY IF EXISTS staff_delete ON public.%I', _tbl);
  EXECUTE format('CREATE POLICY staff_select ON public.%I FOR SELECT TO authenticated USING (public.is_staff_of(user_id) AND public.has_perm(%L, user_id))', _tbl, _view);
  IF _manage IS NOT NULL THEN
    EXECUTE format('CREATE POLICY staff_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff_of(user_id) AND public.has_perm(%L, user_id))', _tbl, _manage);
    EXECUTE format('CREATE POLICY staff_update ON public.%I FOR UPDATE TO authenticated USING (public.is_staff_of(user_id) AND public.has_perm(%L, user_id)) WITH CHECK (public.is_staff_of(user_id) AND public.has_perm(%L, user_id))', _tbl, _manage, _manage);
    EXECUTE format('CREATE POLICY staff_delete ON public.%I FOR DELETE TO authenticated USING (public.is_staff_of(user_id) AND public.has_perm(%L, user_id))', _tbl, _manage);
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  -- Accounting
  FOREACH t IN ARRAY ARRAY['invoices','invoice_items','quotes','quote_items','credit_notes','credit_note_items','receipts','receipt_allocations',
    'customer_communications','suppliers','supplier_quotations','bills','bill_items','bill_payments','purchase_orders','purchase_order_items',
    'expenses','expense_category_rules','journal_entries','journal_lines','chart_of_accounts','bank_accounts','bank_transactions','bank_allocations',
    'bank_rules','bank_documents','bank_transaction_events','reconciliation_sessions','reconciliation_lines','cashbooks','petty_cash','imprest_register',
    'fixed_assets','asset_categories','asset_disposals','asset_transfers','budgets','cost_centres','fx_rates','tax_settings','financial_periods',
    'posting_batches','afs_reports','management_reports','compliance_obligations','loans','loan_repayments','loan_schedule','departments','divisions'] LOOP
    PERFORM public.rbac_add_policies(t, 'accounting.view', 'accounting.manage');
  END LOOP;
  -- Inventory
  FOREACH t IN ARRAY ARRAY['stock_movements','stock_adjustments','stock_batches','stock_serials','stock_counts','stock_count_lines','warehouses',
    'inventory_locations','inventory_transfers','restaurant_recipes'] LOOP
    PERFORM public.rbac_add_policies(t, 'inventory.view', 'inventory.manage');
  END LOOP;
  -- Products / menu
  FOREACH t IN ARRAY ARRAY['stock_items','restaurant_menu_items','restaurant_modifier_groups','restaurant_modifiers','restaurant_menu_item_groups',
    'restaurant_order_types','restaurant_kitchen_stations','restaurant_delivery_zones'] LOOP
    PERFORM public.rbac_add_policies(t, 'products.view', 'products.manage');
  END LOOP;
  -- Settings-managed
  FOREACH t IN ARRAY ARRAY['pos_settings','restaurant_settings','print_devices','print_printers','print_routing','print_jobs','companies','branches','company_modules'] LOOP
    PERFORM public.rbac_add_policies(t, 'products.view', 'settings.manage');
  END LOOP;
  -- Restaurant floor / guests
  FOREACH t IN ARRAY ARRAY['restaurant_reservations','restaurant_waitlist','restaurant_loyalty_accounts','restaurant_gift_cards'] LOOP
    PERFORM public.rbac_add_policies(t, 'pos.restaurant.access', 'pos.sales.create');
  END LOOP;
  -- Retail registers / favourites
  PERFORM public.rbac_add_policies('pos_registers', 'pos.retail.access', 'pos.retail.access');
  PERFORM public.rbac_add_policies('pos_favorites', 'pos.retail.access', 'pos.retail.access');
END $$;

-- Every staff member may read their business & branches (name in header); print jobs need creation by POS
DROP POLICY IF EXISTS staff_select ON public.companies;
CREATE POLICY staff_select ON public.companies FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
DROP POLICY IF EXISTS staff_select ON public.branches;
CREATE POLICY staff_select ON public.branches FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
DROP POLICY IF EXISTS staff_select ON public.company_modules;
CREATE POLICY staff_select ON public.company_modules FOR SELECT TO authenticated USING (public.is_staff_of(user_id));
DROP POLICY IF EXISTS staff_insert ON public.print_jobs;
CREATE POLICY staff_insert ON public.print_jobs FOR INSERT TO authenticated WITH CHECK (public.is_staff_of(user_id) AND (public.has_perm('pos.sales.create', user_id)));
DROP POLICY IF EXISTS staff_select ON public.pos_settings;
CREATE POLICY staff_select ON public.pos_settings FOR SELECT TO authenticated USING (public.is_staff_of(user_id) AND public.has_perm('pos.retail.access', user_id));
DROP POLICY IF EXISTS staff_select ON public.restaurant_settings;
CREATE POLICY staff_select ON public.restaurant_settings FOR SELECT TO authenticated USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id));

-- Customers: accounting OR any seller (quick-add at the till)
DROP POLICY IF EXISTS staff_select ON public.customers;  DROP POLICY IF EXISTS staff_insert ON public.customers;
DROP POLICY IF EXISTS staff_update ON public.customers;  DROP POLICY IF EXISTS staff_delete ON public.customers;
CREATE POLICY staff_select ON public.customers FOR SELECT TO authenticated USING (public.is_staff_of(user_id) AND (public.has_perm('accounting.view', user_id) OR public.has_perm('pos.sales.create', user_id)));
CREATE POLICY staff_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_staff_of(user_id) AND (public.has_perm('accounting.manage', user_id) OR public.has_perm('pos.sales.create', user_id)));
CREATE POLICY staff_update ON public.customers FOR UPDATE TO authenticated USING (public.is_staff_of(user_id) AND public.has_perm('accounting.manage', user_id));
CREATE POLICY staff_delete ON public.customers FOR DELETE TO authenticated USING (public.is_staff_of(user_id) AND public.has_perm('accounting.manage', user_id));

-- Retail sales: own-vs-all, branch scoped, no staff deletes of completed sales
CREATE POLICY staff_select ON public.pos_sales FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.retail.access', user_id) AND public.branch_ok(branch_id)
         AND (public.has_perm('pos.sales.view_all', user_id) OR (public.has_perm('pos.sales.view_own', user_id) AND created_by = auth.uid())));
CREATE POLICY staff_insert ON public.pos_sales FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('pos.sales.create', user_id) AND public.branch_ok(branch_id));
CREATE POLICY staff_update ON public.pos_sales FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.branch_ok(branch_id) AND (
      (status = 'held' AND created_by = auth.uid())
      OR public.has_perm('pos.void', user_id) OR public.has_perm('pos.refund', user_id)
      OR public.has_override('pos.void', id) OR public.has_override('pos.refund', id)));
CREATE POLICY staff_delete ON public.pos_sales FOR DELETE TO authenticated
  USING (public.is_staff_of(user_id) AND status = 'held' AND created_by = auth.uid());

CREATE POLICY staff_select ON public.pos_sale_items FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND EXISTS (SELECT 1 FROM public.pos_sales s WHERE s.id = sale_id));
CREATE POLICY staff_insert ON public.pos_sale_items FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('pos.sales.create', user_id));
CREATE POLICY staff_delete ON public.pos_sale_items FOR DELETE TO authenticated
  USING (public.is_staff_of(user_id) AND EXISTS (SELECT 1 FROM public.pos_sales s WHERE s.id = sale_id AND s.status = 'held' AND s.created_by = auth.uid()));
CREATE POLICY staff_select ON public.pos_payments FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND EXISTS (SELECT 1 FROM public.pos_sales s WHERE s.id = sale_id));
CREATE POLICY staff_insert ON public.pos_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('pos.sales.create', user_id));

CREATE POLICY staff_select ON public.pos_shifts FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.retail.access', user_id) AND public.branch_ok(branch_id)
         AND (public.has_perm('pos.sales.view_all', user_id) OR created_by = auth.uid()));
CREATE POLICY staff_insert ON public.pos_shifts FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('cash_shift.open', user_id) AND public.branch_ok(branch_id));
CREATE POLICY staff_update ON public.pos_shifts FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('cash_shift.close', user_id) AND (created_by = auth.uid() OR public.has_perm('pos.sales.view_all', user_id)));

-- Restaurant: replace the old blanket worker policies
DROP POLICY IF EXISTS "worker restaurant orders" ON public.restaurant_orders;
DROP POLICY IF EXISTS "worker restaurant order items" ON public.restaurant_order_items;
DROP POLICY IF EXISTS "worker restaurant tables" ON public.restaurant_tables;

CREATE POLICY staff_select ON public.restaurant_orders FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id) AND public.branch_ok(branch_id)
         AND (public.has_perm('pos.sales.view_all', user_id) OR created_by = auth.uid() OR status NOT IN ('paid','void','cancelled')));
CREATE POLICY staff_insert ON public.restaurant_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('pos.sales.create', user_id) AND public.branch_ok(branch_id));
CREATE POLICY staff_update ON public.restaurant_orders FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id) AND public.branch_ok(branch_id));
-- (no staff delete on orders)

CREATE POLICY staff_select ON public.restaurant_order_items FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND EXISTS (SELECT 1 FROM public.restaurant_orders o WHERE o.id = order_id));
CREATE POLICY staff_insert ON public.restaurant_order_items FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('pos.sales.create', user_id));
CREATE POLICY staff_update ON public.restaurant_order_items FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.sales.create', user_id));
CREATE POLICY staff_delete ON public.restaurant_order_items FOR DELETE TO authenticated
  USING (public.is_staff_of(user_id) AND (public.has_perm('pos.void', user_id)
         OR EXISTS (SELECT 1 FROM public.restaurant_orders o WHERE o.id = order_id AND o.status NOT IN ('paid','void','cancelled'))));

CREATE POLICY staff_select ON public.restaurant_payments FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND EXISTS (SELECT 1 FROM public.restaurant_orders o WHERE o.id = order_id));
CREATE POLICY staff_insert ON public.restaurant_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('pos.sales.create', user_id));

CREATE POLICY staff_select ON public.restaurant_tables FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id) AND public.branch_ok(branch_id));
CREATE POLICY staff_update ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id) AND public.branch_ok(branch_id));
CREATE POLICY staff_insert ON public.restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('tables.manage', user_id));
CREATE POLICY staff_delete ON public.restaurant_tables FOR DELETE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('tables.manage', user_id));

CREATE POLICY staff_select ON public.restaurant_shifts FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id) AND (public.has_perm('pos.sales.view_all', user_id) OR created_by = auth.uid()));
CREATE POLICY staff_insert ON public.restaurant_shifts FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('cash_shift.open', user_id));
CREATE POLICY staff_update ON public.restaurant_shifts FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('cash_shift.close', user_id) AND (created_by = auth.uid() OR public.has_perm('pos.sales.view_all', user_id)));

CREATE POLICY staff_select ON public.restaurant_cash_drawers FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id) AND (public.has_perm('pos.sales.view_all', user_id) OR created_by = auth.uid()));
CREATE POLICY staff_insert ON public.restaurant_cash_drawers FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('cash_shift.open', user_id));
CREATE POLICY staff_update ON public.restaurant_cash_drawers FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('cash_shift.close', user_id) AND (created_by = auth.uid() OR public.has_perm('pos.sales.view_all', user_id)));
CREATE POLICY staff_select ON public.restaurant_cash_transactions FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.restaurant.access', user_id));
CREATE POLICY staff_insert ON public.restaurant_cash_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('cash_shift.open', user_id));
CREATE POLICY staff_select ON public.restaurant_end_of_day FOR SELECT TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('reports.view', user_id));
CREATE POLICY staff_insert ON public.restaurant_end_of_day FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('cash_shift.close', user_id) AND public.has_perm('pos.sales.view_all', user_id));

-- ============================================================
-- 7. Guards enforced regardless of client
-- ============================================================
-- Prices: staff need prices.manage to touch selling / cost prices
CREATE OR REPLACE FUNCTION public.guard_price_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o jsonb := to_jsonb(OLD); nw jsonb := to_jsonb(NEW); changed boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = NEW.user_id THEN RETURN NEW; END IF;
  IF (o->>'sell_price') IS DISTINCT FROM (nw->>'sell_price') OR (o->>'cost_price') IS DISTINCT FROM (nw->>'cost_price')
     OR (o->>'price') IS DISTINCT FROM (nw->>'price') OR (o->>'cost') IS DISTINCT FROM (nw->>'cost') OR (o->>'prices') IS DISTINCT FROM (nw->>'prices') THEN
    changed := true;
  END IF;
  IF changed AND NOT public.has_perm('prices.manage', NEW.user_id) THEN
    RAISE EXCEPTION 'Changing prices requires the prices.manage permission';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_price_change ON public.stock_items;
CREATE TRIGGER guard_price_change BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.guard_price_change();
DROP TRIGGER IF EXISTS guard_price_change ON public.restaurant_menu_items;
CREATE TRIGGER guard_price_change BEFORE UPDATE ON public.restaurant_menu_items FOR EACH ROW EXECUTE FUNCTION public.guard_price_change();

-- Completed sales: void/refund needs permission or a live manager override
CREATE OR REPLACE FUNCTION public.guard_sale_reversal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = NEW.user_id THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'pos_sales' THEN
    IF NEW.status = 'voided' AND OLD.status <> 'voided' AND NOT (public.has_perm('pos.void', NEW.user_id) OR public.has_override('pos.void', NEW.id)) THEN
      RAISE EXCEPTION 'Voiding a sale requires manager authorisation';
    END IF;
    IF NEW.status = 'refunded' AND OLD.status <> 'refunded' AND NOT (public.has_perm('pos.refund', NEW.user_id) OR public.has_override('pos.refund', NEW.id)) THEN
      RAISE EXCEPTION 'Refunding a sale requires manager authorisation';
    END IF;
    IF NEW.refund_of IS NOT NULL AND TG_OP = 'INSERT' AND NOT (public.has_perm('pos.refund', NEW.user_id) OR public.has_override('pos.refund', NEW.refund_of)) THEN
      RAISE EXCEPTION 'Refunding a sale requires manager authorisation';
    END IF;
  ELSIF TG_TABLE_NAME = 'restaurant_orders' THEN
    IF OLD.status = 'paid' AND NEW.status IS DISTINCT FROM OLD.status AND NOT (public.has_perm('pos.void', NEW.user_id) OR public.has_perm('pos.refund', NEW.user_id) OR public.has_override('pos.void', NEW.id) OR public.has_override('pos.refund', NEW.id)) THEN
      RAISE EXCEPTION 'Changing a paid order requires manager authorisation';
    END IF;
    IF NEW.status IN ('void','cancelled') AND OLD.status NOT IN ('void','cancelled') AND OLD.status = 'paid'
       AND NOT (public.has_perm('pos.void', NEW.user_id) OR public.has_override('pos.void', NEW.id)) THEN
      RAISE EXCEPTION 'Voiding an order requires manager authorisation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_sale_reversal ON public.pos_sales;
CREATE TRIGGER guard_sale_reversal BEFORE INSERT OR UPDATE ON public.pos_sales FOR EACH ROW EXECUTE FUNCTION public.guard_sale_reversal();
DROP TRIGGER IF EXISTS guard_sale_reversal ON public.restaurant_orders;
CREATE TRIGGER guard_sale_reversal BEFORE UPDATE ON public.restaurant_orders FOR EACH ROW EXECUTE FUNCTION public.guard_sale_reversal();

-- Discounts at the till need pos.discount
CREATE OR REPLACE FUNCTION public.guard_discount() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = NEW.user_id THEN RETURN NEW; END IF;
  IF COALESCE(NEW.discount,0) > 0 AND NOT (public.has_perm('pos.discount', NEW.user_id) OR public.has_override('pos.discount', NULL)) THEN
    RAISE EXCEPTION 'Discounts require manager authorisation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_discount ON public.pos_sales;
CREATE TRIGGER guard_discount BEFORE INSERT OR UPDATE ON public.pos_sales FOR EACH ROW EXECUTE FUNCTION public.guard_discount();
DROP TRIGGER IF EXISTS guard_discount ON public.restaurant_orders;
CREATE TRIGGER guard_discount BEFORE INSERT OR UPDATE ON public.restaurant_orders FOR EACH ROW EXECUTE FUNCTION public.guard_discount();

-- ============================================================
-- 8. Legacy POS worker bridge → new permissions
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_has_books(_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() = _tenant
    OR public.is_staff_of(_tenant)
    OR EXISTS (SELECT 1 FROM public.employee_pos_permissions WHERE worker_user_id = auth.uid() AND user_id = _tenant AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.pos_can(_worker uuid, _feature text, _tenant uuid DEFAULT NULL::uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; lvl text; t uuid; perm text;
BEGIN
  IF _worker IS NULL THEN RETURN false; END IF;
  t := COALESCE(_tenant, (SELECT tenant_id FROM public.staff_members WHERE user_id = _worker AND is_active ORDER BY created_at LIMIT 1));
  IF t IS NOT NULL AND t <> _worker AND EXISTS (SELECT 1 FROM public.staff_members WHERE user_id = _worker AND tenant_id = t AND is_active) THEN
    perm := CASE _feature
      WHEN 'pos_sales' THEN 'pos.sales.create' WHEN 'hold_order' THEN 'pos.sales.create'
      WHEN 'dine_in' THEN 'pos.restaurant.access' WHEN 'takeaway' THEN 'pos.sales.create' WHEN 'delivery' THEN 'pos.sales.create'
      WHEN 'tables' THEN 'pos.restaurant.access' WHEN 'kitchen_display' THEN 'kitchen.access'
      WHEN 'void_item' THEN 'pos.void' WHEN 'discount' THEN 'pos.discount'
      WHEN 'cash_drawer' THEN 'cash_shift.open' WHEN 'cash_payout' THEN 'pos.refund'
      WHEN 'stock_view' THEN 'inventory.view' WHEN 'stock_transfer' THEN 'inventory.manage'
      WHEN 'reports' THEN 'reports.view' WHEN 'end_of_day' THEN 'cash_shift.close' WHEN 'settings' THEN 'settings.manage'
      ELSE _feature END;
    RETURN EXISTS (SELECT 1 FROM public.staff_members sm JOIN public.rbac_role_permissions rp ON rp.role_id = sm.role_id
                   WHERE sm.user_id = _worker AND sm.tenant_id = t AND sm.is_active AND rp.permission_key = perm);
  END IF;
  SELECT * INTO r FROM public.employee_pos_permissions
   WHERE worker_user_id = _worker AND is_active AND (_tenant IS NULL OR user_id = _tenant) LIMIT 1;
  IF NOT FOUND THEN RETURN _tenant IS NULL OR _tenant = _worker; END IF;
  IF r.deny ? _feature THEN RETURN false; END IF;
  IF r.allow ? _feature THEN RETURN true; END IF;
  lvl := public.pos_matrix(r.pos_role, _feature);
  RETURN lvl IN ('full','limited');
END $$;

-- Sale posting routines: permission-based instead of owner-only
CREATE OR REPLACE FUNCTION public.complete_pos_sale(_sale_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  s record; li record; p record;
  _entry uuid; _ref text; _uid uuid;
  _sales uuid; _vat uuid; _cogs uuid; _inv uuid; _ar uuid; _acct uuid;
  _cogs_amt numeric := 0; _net numeric := 0; _paytotal numeric := 0;
BEGIN
  SELECT * INTO s FROM pos_sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF NOT public.has_perm('pos.sales.create', s.user_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF s.journal_entry_id IS NOT NULL THEN RETURN s.journal_entry_id; END IF;
  _uid := s.user_id;
  _ref := 'POS:' || _sale_id::text;

  _sales := ensure_account(_uid,'4000','Retail Sales','revenue');
  _vat   := ensure_account(_uid,'2200','VAT Output','liability');
  _cogs  := ensure_account(_uid,'5000','Cost of Sales','expense');
  _inv   := ensure_account(_uid,'1300','Inventory','asset');
  _ar    := ensure_account(_uid,'1100','Accounts Receivable','asset');

  SELECT COALESCE(SUM(qty * unit_cost),0) INTO _cogs_amt FROM pos_sale_items WHERE sale_id = _sale_id;
  _net := COALESCE(s.subtotal,0) - COALESCE(s.discount,0);

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (_uid, 'JE-POS-'||substr(_sale_id::text,1,8), s.sold_at::date, _ref,
          'Retail sale '||COALESCE(s.sale_no,''), 'posted',
          COALESCE(s.total,0)+_cogs_amt, COALESCE(s.total,0)+_cogs_amt)
  RETURNING id INTO _entry;

  FOR p IN SELECT method, SUM(amount) AS amt FROM pos_payments WHERE sale_id = _sale_id GROUP BY method LOOP
    _paytotal := _paytotal + p.amt;
    _acct := CASE lower(p.method)
      WHEN 'cash' THEN ensure_account(_uid,'1010','Cash on Hand','asset')
      WHEN 'card' THEN ensure_account(_uid,'1020','Card Clearing','asset')
      WHEN 'mobile money' THEN ensure_account(_uid,'1030','Mobile Money','asset')
      WHEN 'momo' THEN ensure_account(_uid,'1030','Mobile Money','asset')
      WHEN 'bank' THEN ensure_account(_uid,'1000','Cash & Bank','asset')
      WHEN 'credit' THEN _ar
      ELSE ensure_account(_uid,'1000','Cash & Bank','asset') END;
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _acct, p.amt, 0, initcap(p.method)||' received');
  END LOOP;

  IF _paytotal = 0 AND COALESCE(s.total,0) > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, ensure_account(_uid,'1010','Cash on Hand','asset'), s.total, 0, 'Cash received');
  END IF;

  IF _net > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _sales, 0, _net, 'Retail sales');
  END IF;
  IF COALESCE(s.tax,0) > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _vat, 0, s.tax, 'VAT output');
  END IF;
  IF _cogs_amt > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (_uid, _entry, _cogs, _cogs_amt, 0, 'Cost of goods sold'),
           (_uid, _entry, _inv, 0, _cogs_amt, 'Inventory consumed');
  END IF;

  FOR li IN SELECT * FROM pos_sale_items WHERE sale_id = _sale_id AND item_id IS NOT NULL LOOP
    INSERT INTO stock_movements(user_id, item_id, movement_type, quantity, unit_cost, reference, note)
    VALUES (_uid, li.item_id, 'out', li.qty, li.unit_cost, COALESCE(s.sale_no,_ref), 'Retail POS sale');
  END LOOP;

  UPDATE pos_sales
    SET status='completed', journal_entry_id=_entry, cost_total=_cogs_amt, updated_at=now()
    WHERE id=_sale_id;

  RETURN _entry;
END $function$;

CREATE OR REPLACE FUNCTION public.sync_pos_sale(_sale jsonb, _items jsonb DEFAULT '[]'::jsonb, _payments jsonb DEFAULT '[]'::jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _uid uuid := public.current_tenant();
  _ref text := _sale->>'client_ref';
  _id uuid;
  _je uuid;
  it jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_perm('pos.sales.create', _uid) THEN RAISE EXCEPTION 'Not allowed to create sales'; END IF;
  IF _ref IS NULL OR _ref = '' THEN RAISE EXCEPTION 'client_ref required'; END IF;

  SELECT id, journal_entry_id INTO _id, _je FROM pos_sales WHERE user_id = _uid AND client_ref = _ref;

  IF _id IS NULL THEN
    INSERT INTO pos_sales(user_id, sale_no, client_ref, shift_id, register_id, customer_id, customer_name,
      price_level, status, subtotal, discount, tax, total, paid, change_due, cost_total, note, sold_at, created_by, branch_id)
    VALUES (_uid, _sale->>'sale_no', _ref,
      NULLIF(_sale->>'shift_id','')::uuid, NULLIF(_sale->>'register_id','')::uuid, NULLIF(_sale->>'customer_id','')::uuid,
      COALESCE(NULLIF(_sale->>'customer_name',''),'Walk-in Customer'),
      COALESCE(NULLIF(_sale->>'price_level',''),'retail'), 'completed',
      COALESCE((_sale->>'subtotal')::numeric,0), COALESCE((_sale->>'discount')::numeric,0),
      COALESCE((_sale->>'tax')::numeric,0), COALESCE((_sale->>'total')::numeric,0),
      COALESCE((_sale->>'paid')::numeric,0), COALESCE((_sale->>'change_due')::numeric,0),
      COALESCE((_sale->>'cost_total')::numeric,0), _sale->>'note',
      COALESCE((_sale->>'sold_at')::timestamptz, now()), auth.uid(), public.staff_branch())
    RETURNING id INTO _id;
  ELSIF _je IS NOT NULL THEN
    RETURN _id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pos_sale_items WHERE sale_id = _id) THEN
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) LOOP
      INSERT INTO pos_sale_items(user_id, sale_id, item_id, name, sku, qty, price, unit_cost, discount, tax_rate, line_total, note)
      VALUES (_uid, _id, NULLIF(it->>'item_id','')::uuid, COALESCE(it->>'name','Item'), it->>'sku',
        COALESCE((it->>'qty')::numeric,0), COALESCE((it->>'price')::numeric,0), COALESCE((it->>'unit_cost')::numeric,0),
        COALESCE((it->>'discount')::numeric,0), COALESCE((it->>'tax_rate')::numeric,0),
        COALESCE((it->>'line_total')::numeric,0), it->>'note');
    END LOOP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pos_payments WHERE sale_id = _id) THEN
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_payments,'[]'::jsonb)) LOOP
      INSERT INTO pos_payments(user_id, sale_id, method, amount, reference)
      VALUES (_uid, _id, COALESCE(it->>'method','cash'), COALESCE((it->>'amount')::numeric,0), it->>'reference');
    END LOOP;
  END IF;

  PERFORM complete_pos_sale(_id);
  RETURN _id;
END $function$;

-- ============================================================
-- 9. Safe migration of existing users
-- ============================================================
INSERT INTO public.staff_members(tenant_id, user_id, email, full_name, role_id, is_active)
SELECT e.user_id, e.worker_user_id, e.email, e.full_name,
  (SELECT id FROM public.rbac_roles r WHERE r.tenant_id IS NULL AND r.key = CASE e.pos_role
      WHEN 'cashier' THEN 'retail_cashier'
      WHEN 'waiter' THEN 'restaurant_cashier'
      WHEN 'kitchen' THEN 'restaurant_cashier'
      WHEN 'supervisor' THEN 'restaurant_manager'
      WHEN 'manager' THEN 'restaurant_manager'
      ELSE 'retail_cashier' END),
  e.is_active
FROM public.employee_pos_permissions e
WHERE e.worker_user_id IS NOT NULL AND e.worker_user_id <> e.user_id
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Staff logins must not carry platform-wide admin/manager roles
DELETE FROM public.user_roles ur
 WHERE ur.role <> 'super_admin' AND ur.user_id IN (SELECT user_id FROM public.staff_members);

DROP FUNCTION public.rbac_add_policies(text,text,text);