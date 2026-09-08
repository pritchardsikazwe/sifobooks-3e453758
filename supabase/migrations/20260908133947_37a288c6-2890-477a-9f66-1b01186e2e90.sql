DROP POLICY IF EXISTS "owner manages own requests" ON public.approval_requests;

CREATE POLICY "approval_requests_select" ON public.approval_requests
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() = requested_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.can_act_on_request(id, auth.uid())
);

CREATE POLICY "approval_requests_insert" ON public.approval_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requested_by AND auth.uid() = user_id AND status = 'pending' AND decided_by IS NULL);

CREATE POLICY "approval_requests_update" ON public.approval_requests
FOR UPDATE TO authenticated
USING (
  auth.uid() = requested_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.can_act_on_request(id, auth.uid())
)
WITH CHECK (
  auth.uid() = requested_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.can_act_on_request(id, auth.uid())
);

CREATE POLICY "approval_requests_delete" ON public.approval_requests
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.guard_approval_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decision_changed boolean;
  is_admin boolean;
  is_approver boolean;
BEGIN
  decision_changed :=
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
    OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
    OR NEW.decision_notes IS DISTINCT FROM OLD.decision_notes
    OR NEW.current_level IS DISTINCT FROM OLD.current_level
    OR NEW.max_level IS DISTINCT FROM OLD.max_level
    OR NEW.amount IS DISTINCT FROM OLD.amount;

  IF NOT decision_changed THEN
    RETURN NEW;
  END IF;

  -- A requester may only cancel their own still-pending request.
  IF auth.uid() = OLD.requested_by
     AND OLD.status = 'pending'
     AND NEW.status = 'cancelled'
     AND NEW.current_level = OLD.current_level
     AND NEW.max_level = OLD.max_level
     AND NEW.amount = OLD.amount
  THEN
    NEW.decided_by := auth.uid();
    RETURN NEW;
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin'::app_role)
           OR public.has_role(auth.uid(), 'super_admin'::app_role);
  is_approver := public.can_act_on_request(OLD.id, auth.uid());

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Approvers may never decide on a request they raised themselves.
  IF is_approver AND auth.uid() <> OLD.requested_by AND auth.uid() <> OLD.user_id THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorised to decide on this approval request';
END;
$$;

DROP TRIGGER IF EXISTS guard_approval_decision_trg ON public.approval_requests;
CREATE TRIGGER guard_approval_decision_trg
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_approval_decision();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;