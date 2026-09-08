
-- ============ 1. Cashier assignment + hashed PIN ============
ALTER TABLE public.employee_pos_permissions
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS register_id uuid,
  ADD COLUMN IF NOT EXISTS drawer_name text,
  ADD COLUMN IF NOT EXISTS failed_pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_pin_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS pin_disabled boolean NOT NULL DEFAULT false;

-- Convert any legacy plain-text PIN to a bcrypt hash and erase the plain value.
UPDATE public.employee_pos_permissions
   SET pin_hash = extensions.crypt(pin, extensions.gen_salt('bf')),
       pin = NULL
 WHERE pin IS NOT NULL AND pin <> '' AND pin_hash IS NULL;

-- ============ 2. Shift review fields ============
ALTER TABLE public.pos_shifts
  ADD COLUMN IF NOT EXISTS cashier_user_id uuid,
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS station text,
  ADD COLUMN IF NOT EXISTS drawer_name text,
  ADD COLUMN IF NOT EXISTS cash_sales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_sales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS momo_sales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_sales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunds_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_comment text;

DO $$ BEGIN
  ALTER TABLE public.pos_shifts
    ADD CONSTRAINT pos_shifts_review_status_chk
    CHECK (review_status IN ('open','pending_review','approved','rejected','recount'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 3. Historical cashier record labelling ============
ALTER TABLE public.cashier_records
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'historical',
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.cashier_records
    ADD CONSTRAINT cashier_records_source_type_chk
    CHECK (source_type IN ('pos','manual','import','historical','adjustment'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 4. Cashier activity audit helper ============
CREATE OR REPLACE FUNCTION public.log_cashier_activity(
  _tenant uuid, _action text, _entity uuid DEFAULT NULL, _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, actor_email, action, entity_type, entity_id, details)
  VALUES (_tenant, COALESCE(auth.jwt() ->> 'email', 'terminal'), _action, 'cashier', _entity,
          COALESCE(_details, '{}'::jsonb) || jsonb_build_object('actor', auth.uid(), 'at', now()));
END $$;

-- ============ 5. Manager/owner sets a cashier PIN ============
CREATE OR REPLACE FUNCTION public.set_cashier_pin(_permission_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE r public.employee_pos_permissions;
BEGIN
  SELECT * INTO r FROM public.employee_pos_permissions WHERE id = _permission_id;
  IF r.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Cashier not found'); END IF;
  IF NOT (auth.uid() = r.user_id OR public.has_perm('users.manage', r.user_id) OR public.has_perm('pos.sales.view_all', r.user_id)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to manage this cashier');
  END IF;
  IF _pin IS NULL OR length(btrim(_pin)) < 4 OR _pin !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PIN must be at least 4 digits');
  END IF;

  UPDATE public.employee_pos_permissions
     SET pin_hash = extensions.crypt(_pin, extensions.gen_salt('bf')),
         pin = NULL, pin_locked = false, pin_disabled = false,
         failed_pin_attempts = 0, pin_locked_until = NULL, pin_set_at = now()
   WHERE id = _permission_id;

  PERFORM public.log_cashier_activity(r.user_id, 'cashier.pin_set', _permission_id, jsonb_build_object('cashier', r.full_name));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.set_cashier_pin_state(_permission_id uuid, _disabled boolean, _unlock boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE r public.employee_pos_permissions;
BEGIN
  SELECT * INTO r FROM public.employee_pos_permissions WHERE id = _permission_id;
  IF r.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Cashier not found'); END IF;
  IF NOT (auth.uid() = r.user_id OR public.has_perm('users.manage', r.user_id) OR public.has_perm('pos.sales.view_all', r.user_id)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to manage this cashier');
  END IF;
  UPDATE public.employee_pos_permissions
     SET pin_disabled = _disabled,
         failed_pin_attempts = CASE WHEN _unlock THEN 0 ELSE failed_pin_attempts END,
         pin_locked_until = CASE WHEN _unlock THEN NULL ELSE pin_locked_until END
   WHERE id = _permission_id;
  PERFORM public.log_cashier_activity(r.user_id, CASE WHEN _disabled THEN 'cashier.pin_disabled' ELSE 'cashier.pin_enabled' END, _permission_id, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END $$;

-- ============ 6. Backend PIN verification (rate limited) ============
-- Returns only pass/fail plus lock state. Never returns or logs the PIN.
CREATE OR REPLACE FUNCTION public.verify_cashier_pin(_permission_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE r public.employee_pos_permissions; ok boolean; attempts integer;
BEGIN
  SELECT * INTO r FROM public.employee_pos_permissions WHERE id = _permission_id AND is_active = true;
  IF r.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Cashier not found'); END IF;
  IF r.pin_disabled THEN RETURN jsonb_build_object('ok', false, 'error', 'PIN sign-in is disabled. Ask your manager.'); END IF;
  IF r.pin_locked THEN RETURN jsonb_build_object('ok', false, 'error', 'A PIN reset is pending manager approval.'); END IF;
  IF r.pin_locked_until IS NOT NULL AND r.pin_locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many wrong attempts. Try again shortly.', 'locked_until', r.pin_locked_until);
  END IF;
  IF r.pin_hash IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'No PIN set. Ask your manager.'); END IF;

  ok := extensions.crypt(COALESCE(_pin, ''), r.pin_hash) = r.pin_hash;

  IF ok THEN
    UPDATE public.employee_pos_permissions
       SET failed_pin_attempts = 0, pin_locked_until = NULL, last_pin_login_at = now()
     WHERE id = r.id;
    PERFORM public.log_cashier_activity(r.user_id, 'cashier.login', r.id, jsonb_build_object('cashier', r.full_name));
    RETURN jsonb_build_object('ok', true, 'worker_user_id', r.worker_user_id, 'tenant_id', r.user_id,
                              'email', r.email, 'full_name', r.full_name, 'pos_role', r.pos_role,
                              'branch_id', r.branch_id, 'location_id', r.location_id,
                              'register_id', r.register_id, 'drawer_name', r.drawer_name);
  END IF;

  attempts := COALESCE(r.failed_pin_attempts, 0) + 1;
  UPDATE public.employee_pos_permissions
     SET failed_pin_attempts = attempts,
         pin_locked_until = CASE WHEN attempts >= 5 THEN now() + interval '15 minutes' ELSE pin_locked_until END
   WHERE id = r.id;
  PERFORM public.log_cashier_activity(r.user_id, 'cashier.login_failed', r.id, jsonb_build_object('cashier', r.full_name, 'attempts', attempts));
  RETURN jsonb_build_object('ok', false, 'error',
    CASE WHEN attempts >= 5 THEN 'Too many wrong attempts. Locked for 15 minutes.' ELSE 'Incorrect PIN' END);
END $$;

REVOKE EXECUTE ON FUNCTION public.verify_cashier_pin(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cashier_pin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_cashier_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_cashier_pin_state(uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_cashier_activity(uuid, text, uuid, jsonb) TO authenticated, service_role;

-- ============ 7. Shift submit / review ============
CREATE OR REPLACE FUNCTION public.submit_cashier_shift(_shift_id uuid, _actual_cash numeric, _breakdown jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE s public.pos_shifts; expected numeric;
BEGIN
  SELECT * INTO s FROM public.pos_shifts WHERE id = _shift_id;
  IF s.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Shift not found'); END IF;
  IF NOT (auth.uid() = s.user_id OR auth.uid() = s.created_by OR auth.uid() = s.cashier_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This is not your shift');
  END IF;
  IF s.review_status IN ('pending_review','approved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Shift already submitted');
  END IF;

  expected := COALESCE(s.opening_float,0)
            + COALESCE((_breakdown->>'cash_sales')::numeric, s.cash_sales, 0)
            + COALESCE((_breakdown->>'cash_in')::numeric, s.cash_in, 0)
            - COALESCE((_breakdown->>'refunds_total')::numeric, s.refunds_total, 0)
            - COALESCE((_breakdown->>'cash_out')::numeric, s.cash_out, 0);

  UPDATE public.pos_shifts SET
    status = 'closed',
    closed_at = COALESCE(closed_at, now()),
    cash_sales = COALESCE((_breakdown->>'cash_sales')::numeric, cash_sales),
    card_sales = COALESCE((_breakdown->>'card_sales')::numeric, card_sales),
    momo_sales = COALESCE((_breakdown->>'momo_sales')::numeric, momo_sales),
    other_sales = COALESCE((_breakdown->>'other_sales')::numeric, other_sales),
    refunds_total = COALESCE((_breakdown->>'refunds_total')::numeric, refunds_total),
    cash_in = COALESCE((_breakdown->>'cash_in')::numeric, cash_in),
    cash_out = COALESCE((_breakdown->>'cash_out')::numeric, cash_out),
    expected_cash = expected,
    actual_cash = _actual_cash,
    variance = _actual_cash - expected,
    submitted_at = now(),
    review_status = 'pending_review'
  WHERE id = _shift_id;

  PERFORM public.log_cashier_activity(s.user_id, 'shift.submitted', _shift_id,
    jsonb_build_object('expected', expected, 'actual', _actual_cash, 'variance', _actual_cash - expected));
  RETURN jsonb_build_object('ok', true, 'expected_cash', expected, 'variance', _actual_cash - expected);
END $$;

CREATE OR REPLACE FUNCTION public.review_cashier_shift(_shift_id uuid, _decision text, _comment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE s public.pos_shifts;
BEGIN
  IF _decision NOT IN ('approved','rejected','recount') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid decision');
  END IF;
  SELECT * INTO s FROM public.pos_shifts WHERE id = _shift_id;
  IF s.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Shift not found'); END IF;
  IF auth.uid() = s.created_by OR auth.uid() = s.cashier_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot review your own shift');
  END IF;
  IF NOT (auth.uid() = s.user_id OR public.has_perm('pos.sales.view_all', s.user_id)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to review shifts');
  END IF;

  UPDATE public.pos_shifts
     SET review_status = _decision, reviewed_by = auth.uid(), reviewed_at = now(), manager_comment = _comment
   WHERE id = _shift_id;

  PERFORM public.log_cashier_activity(s.user_id, 'shift.' || _decision, _shift_id, jsonb_build_object('comment', _comment));
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.submit_cashier_shift(uuid, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_cashier_shift(uuid, text, text) TO authenticated;

-- Managers must be able to update the review columns through RLS too.
DROP POLICY IF EXISTS staff_review ON public.pos_shifts;
CREATE POLICY staff_review ON public.pos_shifts FOR UPDATE TO authenticated
  USING (public.is_staff_of(user_id) AND public.has_perm('pos.sales.view_all', user_id))
  WITH CHECK (public.is_staff_of(user_id) AND public.has_perm('pos.sales.view_all', user_id));
