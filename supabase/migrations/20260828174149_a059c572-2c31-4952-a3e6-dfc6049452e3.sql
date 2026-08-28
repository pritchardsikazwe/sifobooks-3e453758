ALTER TABLE public.employee_pos_permissions
  ADD COLUMN IF NOT EXISTS pin_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_set_at timestamptz;

CREATE TABLE IF NOT EXISTS public.pos_pin_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_id uuid NOT NULL REFERENCES public.employee_pos_permissions(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  worker_user_id uuid,
  requested_by uuid,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  new_pin text,
  approved_by uuid,
  approved_at timestamptz,
  confirmed_at timestamptz,
  denied_reason text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pos_pin_resets TO authenticated;
GRANT ALL ON public.pos_pin_resets TO service_role;

ALTER TABLE public.pos_pin_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages pin resets" ON public.pos_pin_resets
  FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "worker reads own pin resets" ON public.pos_pin_resets
  FOR SELECT TO authenticated
  USING (auth.uid() = worker_user_id);

CREATE INDEX IF NOT EXISTS idx_pin_resets_owner ON public.pos_pin_resets (owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pin_resets_worker ON public.pos_pin_resets (worker_user_id, status);

CREATE TRIGGER trg_pin_resets_updated
  BEFORE UPDATE ON public.pos_pin_resets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Worker-side request: wipes the old PIN and locks the terminal immediately.
CREATE OR REPLACE FUNCTION public.request_pos_pin_reset(_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _perm public.employee_pos_permissions%ROWTYPE;
  _id uuid;
BEGIN
  SELECT * INTO _perm FROM public.employee_pos_permissions
   WHERE worker_user_id = auth.uid() AND is_active LIMIT 1;
  IF _perm.id IS NULL THEN
    RAISE EXCEPTION 'No active POS access for this user';
  END IF;

  UPDATE public.pos_pin_resets
     SET status = 'cancelled', updated_at = now()
   WHERE permission_id = _perm.id AND status IN ('pending','approved');

  INSERT INTO public.pos_pin_resets (permission_id, owner_user_id, worker_user_id, requested_by, reason)
  VALUES (_perm.id, _perm.user_id, _perm.worker_user_id, auth.uid(), nullif(trim(coalesce(_reason,'')),''))
  RETURNING id INTO _id;

  -- old PIN is void from this second onwards
  UPDATE public.employee_pos_permissions
     SET pin = NULL, pin_locked = true, updated_at = now()
   WHERE id = _perm.id;

  RETURN _id;
END;
$$;

-- Owner approves and issues the replacement PIN (still locked until the worker confirms).
CREATE OR REPLACE FUNCTION public.approve_pos_pin_reset(_reset_id uuid, _new_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _r public.pos_pin_resets%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.pos_pin_resets WHERE id = _reset_id;
  IF _r.id IS NULL OR _r.owner_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _r.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending';
  END IF;
  IF _new_pin !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION 'PIN must be 4-8 digits';
  END IF;

  UPDATE public.pos_pin_resets
     SET status = 'approved', new_pin = _new_pin, approved_by = auth.uid(),
         approved_at = now(), attempts = 0, updated_at = now()
   WHERE id = _reset_id;

  UPDATE public.employee_pos_permissions
     SET pin = _new_pin, pin_locked = true, pin_set_at = now(), updated_at = now()
   WHERE id = _r.permission_id;

  RETURN jsonb_build_object('ok', true, 'status', 'approved');
END;
$$;

-- Owner declines: access stays locked, no PIN restored.
CREATE OR REPLACE FUNCTION public.deny_pos_pin_reset(_reset_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _r public.pos_pin_resets%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.pos_pin_resets WHERE id = _reset_id;
  IF _r.id IS NULL OR _r.owner_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.pos_pin_resets
     SET status = 'denied', denied_reason = nullif(trim(coalesce(_reason,'')),''), updated_at = now()
   WHERE id = _reset_id AND status = 'pending';
  RETURN jsonb_build_object('ok', true, 'status', 'denied');
END;
$$;

-- Worker confirms the new PIN on the terminal; only then is the lock released.
CREATE OR REPLACE FUNCTION public.confirm_pos_pin_reset(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _r public.pos_pin_resets%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.pos_pin_resets
   WHERE worker_user_id = auth.uid() AND status = 'approved'
   ORDER BY approved_at DESC LIMIT 1;

  IF _r.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No approved PIN reset to confirm');
  END IF;

  IF _r.attempts >= 5 THEN
    UPDATE public.pos_pin_resets SET status = 'voided', updated_at = now() WHERE id = _r.id;
    UPDATE public.employee_pos_permissions SET pin = NULL, pin_locked = true, updated_at = now()
     WHERE id = _r.permission_id;
    RETURN jsonb_build_object('ok', false, 'error', 'Too many attempts. Ask your manager for a new PIN.');
  END IF;

  IF _r.new_pin IS DISTINCT FROM _pin THEN
    UPDATE public.pos_pin_resets SET attempts = attempts + 1, updated_at = now() WHERE id = _r.id;
    RETURN jsonb_build_object('ok', false, 'error', 'PIN does not match', 'attempts_left', 4 - _r.attempts);
  END IF;

  UPDATE public.pos_pin_resets
     SET status = 'completed', confirmed_at = now(), new_pin = NULL, updated_at = now()
   WHERE id = _r.id;

  UPDATE public.employee_pos_permissions
     SET pin_locked = false, updated_at = now()
   WHERE id = _r.permission_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_pos_pin_reset(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_pos_pin_reset(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deny_pos_pin_reset(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_pos_pin_reset(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_pos_pin_reset(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pos_pin_reset(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_pos_pin_reset(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pos_pin_reset(text) TO authenticated;