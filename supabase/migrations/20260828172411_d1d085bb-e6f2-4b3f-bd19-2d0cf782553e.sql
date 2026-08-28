-- ============ WORKER ACCESS ============
CREATE TABLE IF NOT EXISTS public.employee_pos_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                    -- tenant/owner account that owns the books
  worker_user_id uuid,                      -- auth user of the worker (nullable until invited)
  employee_id uuid,
  company_id uuid,
  full_name text,
  pos_role text NOT NULL DEFAULT 'cashier',
  pin text,
  allow jsonb NOT NULL DEFAULT '[]'::jsonb,
  deny jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_pos_permissions TO authenticated;
GRANT ALL ON public.employee_pos_permissions TO service_role;
ALTER TABLE public.employee_pos_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages worker access" ON public.employee_pos_permissions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "worker reads own access" ON public.employee_pos_permissions
  FOR SELECT TO authenticated USING (auth.uid() = worker_user_id);
CREATE TRIGGER trg_epp_updated BEFORE UPDATE ON public.employee_pos_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_epp_worker ON public.employee_pos_permissions(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_epp_user ON public.employee_pos_permissions(user_id);

CREATE TABLE IF NOT EXISTS public.employee_pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  worker_user_id uuid,
  permission_id uuid REFERENCES public.employee_pos_permissions(id) ON DELETE SET NULL,
  pos_role text,
  device_type text,
  terminal text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_pos_sessions TO authenticated;
GRANT ALL ON public.employee_pos_sessions TO service_role;
ALTER TABLE public.employee_pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner sees sessions" ON public.employee_pos_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "worker manages own sessions" ON public.employee_pos_sessions
  FOR ALL TO authenticated USING (auth.uid() = worker_user_id) WITH CHECK (auth.uid() = worker_user_id);

-- ============ PERMISSION MATRIX IN THE DATABASE ============
CREATE OR REPLACE FUNCTION public.pos_matrix(_role text, _feature text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'manager' THEN CASE WHEN _feature IN ('dine_in','kitchen_display') THEN 'full' ELSE 'full' END
    WHEN _role = 'supervisor' THEN CASE
        WHEN _feature IN ('pos_sales','dine_in','takeaway','delivery','tables','kitchen_display','hold_order','void_item','discount','cash_drawer','cash_payout','stock_view','stock_transfer','reports') THEN 'full'
        WHEN _feature = 'settings' THEN 'limited'
        ELSE 'none' END
    WHEN _role = 'cashier' THEN CASE
        WHEN _feature IN ('pos_sales','takeaway','delivery','hold_order','cash_drawer') THEN 'full'
        WHEN _feature IN ('void_item','discount') THEN 'limited'
        ELSE 'none' END
    WHEN _role = 'waiter' THEN CASE
        WHEN _feature IN ('pos_sales','dine_in','takeaway','tables','kitchen_display','hold_order') THEN 'full'
        WHEN _feature IN ('void_item','stock_view') THEN 'limited'
        ELSE 'none' END
    WHEN _role = 'kitchen' THEN CASE WHEN _feature = 'kitchen_display' THEN 'full' ELSE 'none' END
    ELSE 'none' END
$$;

-- Owner of the books the current worker is attached to (NULL when not a worker)
CREATE OR REPLACE FUNCTION public.pos_tenant_for(_worker uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.employee_pos_permissions
  WHERE worker_user_id = _worker AND is_active LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.pos_can(_worker uuid, _feature text, _tenant uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; lvl text;
BEGIN
  IF _worker IS NULL THEN RETURN false; END IF;
  SELECT * INTO r FROM public.employee_pos_permissions
   WHERE worker_user_id = _worker AND is_active
     AND (_tenant IS NULL OR user_id = _tenant)
   LIMIT 1;
  IF NOT FOUND THEN
    -- not a worker: this is an owner acting on their own books
    RETURN _tenant IS NULL OR _tenant = _worker;
  END IF;
  IF r.deny ? _feature THEN RETURN false; END IF;
  IF r.allow ? _feature THEN RETURN true; END IF;
  lvl := public.pos_matrix(r.pos_role, _feature);
  RETURN lvl IN ('full','limited');
END $$;

-- Convenience: does the current auth user have access to these books at all?
CREATE OR REPLACE FUNCTION public.pos_has_books(_tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = _tenant OR EXISTS (
    SELECT 1 FROM public.employee_pos_permissions
    WHERE worker_user_id = auth.uid() AND user_id = _tenant AND is_active)
$$;

-- ============ ENFORCE ON SENSITIVE OPERATIONS ============
-- Cash drawer
CREATE POLICY "worker cash drawer" ON public.restaurant_cash_drawers
  FOR ALL TO authenticated
  USING (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'cash_drawer', user_id))
  WITH CHECK (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'cash_drawer', user_id));

CREATE POLICY "worker cash transactions" ON public.restaurant_cash_transactions
  FOR ALL TO authenticated
  USING (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'cash_drawer', user_id))
  WITH CHECK (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'cash_drawer', user_id));

-- End of day (manager only)
CREATE POLICY "worker end of day" ON public.restaurant_end_of_day
  FOR ALL TO authenticated
  USING (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'end_of_day', user_id))
  WITH CHECK (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'end_of_day', user_id));

-- Orders: any POS-capable worker on the tenant books
CREATE POLICY "worker restaurant orders" ON public.restaurant_orders
  FOR ALL TO authenticated
  USING (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'pos_sales', user_id))
  WITH CHECK (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'pos_sales', user_id));

CREATE POLICY "worker restaurant order items" ON public.restaurant_order_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurant_orders o WHERE o.id = order_id AND public.pos_has_books(o.user_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurant_orders o WHERE o.id = order_id AND public.pos_has_books(o.user_id)));

CREATE POLICY "worker restaurant tables" ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'tables', user_id))
  WITH CHECK (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'tables', user_id));

CREATE POLICY "worker menu read" ON public.restaurant_menu_items
  FOR SELECT TO authenticated USING (public.pos_has_books(user_id));

-- ============ STOCK LOCATIONS & TRANSFERS ============
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  name text NOT NULL,
  code text,
  location_type text NOT NULL DEFAULT 'warehouse', -- warehouse|store|kitchen|bar|pos
  parent_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  warehouse_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_locations TO authenticated;
GRANT ALL ON public.inventory_locations TO service_role;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books access locations" ON public.inventory_locations
  FOR ALL TO authenticated USING (public.pos_has_books(user_id)) WITH CHECK (public.pos_has_books(user_id));
CREATE TRIGGER trg_invloc_updated BEFORE UPDATE ON public.inventory_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  reference text,
  from_location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',  -- draft|sent|received|cancelled
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transfers TO authenticated;
GRANT ALL ON public.inventory_transfers TO service_role;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner transfers" ON public.inventory_transfers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "worker transfers" ON public.inventory_transfers
  FOR ALL TO authenticated
  USING (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'stock_transfer', user_id))
  WITH CHECK (public.pos_has_books(user_id) AND public.pos_can(auth.uid(), 'stock_transfer', user_id));
CREATE TRIGGER trg_invtr_updated BEFORE UPDATE ON public.inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transfer_items TO authenticated;
GRANT ALL ON public.inventory_transfer_items TO service_role;
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfer items follow transfer" ON public.inventory_transfer_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inventory_transfers t WHERE t.id = transfer_id AND public.pos_has_books(t.user_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_transfers t WHERE t.id = transfer_id AND public.pos_has_books(t.user_id)));
