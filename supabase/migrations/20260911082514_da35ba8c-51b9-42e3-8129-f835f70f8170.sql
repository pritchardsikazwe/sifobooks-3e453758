-- 1. Company lifecycle columns -------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text;

DO $$ BEGIN
  ALTER TABLE public.companies ADD CONSTRAINT companies_status_chk CHECK (status IN ('active','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Authorisation helper -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_company(_company uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND (
    public.has_role(_user, 'super_admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = _company AND c.user_id = _user)
    OR EXISTS (SELECT 1 FROM public.company_members m
               WHERE m.company_id = _company AND m.user_id = _user AND m.role IN ('owner','admin'))
  )
$$;

-- 3. Read-only dependency inventory --------------------------------------------
CREATE OR REPLACE FUNCTION public.company_data_inventory(_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _owner uuid; _name text; _status text; _sole boolean;
  r record; n bigint; tables_out jsonb := '[]'::jsonb; blocking_out jsonb := '[]'::jsonb; total_block bigint := 0;
  _blocking text[] := ARRAY[
    'journal_entries','journal_lines','account_balances','pos_sales','pos_sale_items','pos_payments','pos_shifts',
    'cashier_records','invoices','invoice_items','receipts','receipt_allocations','credit_notes','credit_note_items',
    'bills','bill_items','bill_payments','expenses','petty_cash','imprest_register','cashbooks','bank_transactions',
    'bank_allocations','reconciliation_sessions','fixed_assets','asset_disposals','asset_transfers',
    'stock_movements','stock_balances','stock_adjustments','stock_counts','stock_count_lines','inventory_transfers',
    'production_batches','payroll_runs','payslips','payroll_payment_batches','payroll_statutory_filings',
    'hotel_reservations','hotel_folios','hotel_folio_charges','hotel_night_audits','restaurant_orders',
    'restaurant_payments','fee_payments','student_fees','donation_receipts','loans','loan_repayments',
    'posting_batches','financial_periods'
  ];
  _exclude text[] := ARRAY['profiles','user_roles','audit_logs','notifications','email_send_log','email_send_state',
                           'email_unsubscribe_tokens','suppressed_emails','feature_flags','subscription_plans',
                           'business_presets','preset_accounts','preset_modules','module_dependencies'];
BEGIN
  SELECT c.user_id, c.name, c.status INTO _owner, _name, _status FROM public.companies c WHERE c.id = _company;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;
  IF NOT public.can_manage_company(_company, auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden — you are not authorised to manage this company';
  END IF;

  SELECT count(*) = 1 INTO _sole FROM public.companies WHERE user_id = _owner;

  FOR r IN
    SELECT c.table_name,
           bool_or(c.column_name = 'company_id') AS has_company,
           bool_or(c.column_name = 'user_id') AS has_user
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.column_name IN ('company_id','user_id')
      AND c.table_name <> 'companies'
      AND NOT (c.table_name = ANY(_exclude))
    GROUP BY c.table_name
  LOOP
    IF r.has_company THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE company_id = $1', r.table_name) INTO n USING _company;
    ELSIF _sole AND r.has_user THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', r.table_name) INTO n USING _owner;
    ELSE
      n := 0;
    END IF;

    IF n > 0 THEN
      tables_out := tables_out || jsonb_build_object(
        'table', r.table_name, 'count', n,
        'scope', CASE WHEN r.has_company THEN 'company' ELSE 'owner' END,
        'blocking', r.table_name = ANY(_blocking));
      IF r.table_name = ANY(_blocking) THEN
        total_block := total_block + n;
        blocking_out := blocking_out || jsonb_build_object('table', r.table_name, 'count', n);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'company_id', _company, 'company_name', _name, 'status', _status,
    'sole_company_of_owner', _sole, 'tables', tables_out,
    'blocking', blocking_out, 'blocking_rows', total_block,
    'deletable', total_block = 0,
    'recommendation', CASE WHEN total_block = 0 THEN 'delete_allowed' ELSE 'archive' END);
END $$;

-- 4. Archive / restore ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_company(_company uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT name INTO _name FROM public.companies WHERE id = _company;
  IF _name IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;
  IF NOT public.can_manage_company(_company, auth.uid()) THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'company.archive.blocked', 'company', _company,
            jsonb_build_object('reason','not_authorised'));
    RAISE EXCEPTION 'Forbidden — you are not authorised to manage this company';
  END IF;

  UPDATE public.companies
     SET status = 'archived', archived_at = now(), archived_by = auth.uid(),
         archive_reason = _reason, updated_at = now()
   WHERE id = _company;

  UPDATE public.profiles SET active_company_id = NULL WHERE active_company_id = _company;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'company.archived', 'company', _company,
          jsonb_build_object('company_name', _name, 'reason', _reason, 'result','success'));

  RETURN jsonb_build_object('ok', true, 'status','archived');
END $$;

CREATE OR REPLACE FUNCTION public.restore_company(_company uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT name INTO _name FROM public.companies WHERE id = _company;
  IF _name IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;
  IF NOT public.can_manage_company(_company, auth.uid()) THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'company.restore.blocked', 'company', _company,
            jsonb_build_object('reason','not_authorised'));
    RAISE EXCEPTION 'Forbidden — you are not authorised to manage this company';
  END IF;

  UPDATE public.companies
     SET status = 'active', archived_at = NULL, archived_by = NULL, archive_reason = NULL, updated_at = now()
   WHERE id = _company;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'company.restored', 'company', _company,
          jsonb_build_object('company_name', _name, 'result','success'));

  RETURN jsonb_build_object('ok', true, 'status','active');
END $$;

-- 5. Hard delete (empty companies only, atomic) ---------------------------------
CREATE OR REPLACE FUNCTION public.delete_company(_company uuid, _confirm_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _name text; inv jsonb; r record; pass int := 0; remaining int; _err text;
BEGIN
  SELECT name INTO _name FROM public.companies WHERE id = _company;
  IF _name IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;

  IF NOT public.can_manage_company(_company, auth.uid()) THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'company.delete.blocked', 'company', _company,
            jsonb_build_object('reason','not_authorised'));
    RAISE EXCEPTION 'Forbidden — you are not authorised to manage this company';
  END IF;

  IF _confirm_name IS DISTINCT FROM _name THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'company.delete.blocked', 'company', _company,
            jsonb_build_object('company_name', _name, 'reason','name_confirmation_mismatch'));
    RAISE EXCEPTION 'Company name confirmation does not match';
  END IF;

  inv := public.company_data_inventory(_company);
  IF NOT (inv->>'deletable')::boolean THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'company.delete.blocked', 'company', _company,
            jsonb_build_object('company_name', _name, 'reason','company_has_history',
                               'blocking', inv->'blocking', 'blocking_rows', inv->>'blocking_rows'));
    RAISE EXCEPTION 'This company has financial or operational history and cannot be deleted. Archive it instead.';
  END IF;

  UPDATE public.profiles SET active_company_id = NULL WHERE active_company_id = _company;

  -- Remove remaining company-scoped setup rows, retrying to satisfy foreign keys.
  LOOP
    pass := pass + 1;
    remaining := 0;
    FOR r IN
      SELECT c.table_name FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.column_name = 'company_id' AND c.table_name <> 'companies'
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE company_id = $1', r.table_name) USING _company;
      EXCEPTION WHEN foreign_key_violation THEN
        remaining := remaining + 1;
      END;
    END LOOP;
    EXIT WHEN remaining = 0 OR pass >= 6;
  END LOOP;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Could not remove all dependent setup records safely — deletion rolled back';
  END IF;

  DELETE FROM public.companies WHERE id = _company;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'company.deleted', 'company', _company,
          jsonb_build_object('company_name', _name, 'result','success', 'inventory', inv));

  RETURN jsonb_build_object('ok', true, 'deleted_company', _name);
END $$;

-- 6. Archived companies are read-only for membership and workspace selection ----
CREATE OR REPLACE FUNCTION public.block_archived_company_members()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.company_id AND status = 'archived') THEN
    RAISE EXCEPTION 'This company is archived — restore it before adding or changing people';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_archived_company_members ON public.company_members;
CREATE TRIGGER trg_block_archived_company_members
BEFORE INSERT OR UPDATE ON public.company_members
FOR EACH ROW EXECUTE FUNCTION public.block_archived_company_members();

CREATE OR REPLACE FUNCTION public.block_archived_active_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active_company_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.active_company_id AND status = 'archived') THEN
    RAISE EXCEPTION 'That company is archived and cannot be opened until it is restored';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_archived_active_company ON public.profiles;
CREATE TRIGGER trg_block_archived_active_company
BEFORE INSERT OR UPDATE OF active_company_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.block_archived_active_company();

GRANT EXECUTE ON FUNCTION public.can_manage_company(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_data_inventory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_company(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_company(uuid, text) TO authenticated;