
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  module text NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid,
  reference_number text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  status text NOT NULL DEFAULT 'pending',
  current_level smallint NOT NULL DEFAULT 1,
  max_level smallint NOT NULL DEFAULT 1,
  requested_by uuid NOT NULL,
  decided_by uuid,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages own requests" ON public.approval_requests;
CREATE POLICY "owner manages own requests" ON public.approval_requests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = requested_by
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR auth.uid() = requested_by);

DROP TRIGGER IF EXISTS trg_approval_requests_updated ON public.approval_requests;
CREATE TRIGGER trg_approval_requests_updated BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_module ON public.approval_requests(module);

-- ============ Actions log ============
CREATE TABLE IF NOT EXISTS public.approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  level smallint NOT NULL,
  action text NOT NULL,   -- 'approve' | 'reject' | 'comment'
  actor_id uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.approval_actions TO authenticated;
GRANT ALL ON public.approval_actions TO service_role;

ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actors see and log" ON public.approval_actions;
CREATE POLICY "actors see and log" ON public.approval_actions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.approval_requests r
            WHERE r.id = approval_actions.request_id
              AND (r.user_id = auth.uid() OR r.requested_by = auth.uid()
                   OR public.has_role(auth.uid(), 'admin')
                   OR public.has_role(auth.uid(), 'super_admin')))
    OR actor_id = auth.uid()
  )
  WITH CHECK (actor_id = auth.uid());

-- ============ Helper: current-level approver role for a request ============
CREATE OR REPLACE FUNCTION public.approver_role_for_request(_req uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.approver_role
  FROM public.approval_requests r
  JOIN public.approval_hierarchies h
    ON h.module = r.module
   AND h.level = r.current_level
   AND (h.company_id = r.company_id OR h.company_id IS NULL)
   AND r.amount BETWEEN COALESCE(h.min_amount,0) AND COALESCE(h.max_amount, 9e15)
  WHERE r.id = _req
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.approver_role_for_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approver_role_for_request(uuid) TO authenticated;

-- ============ Helper: can current user act on request ============
CREATE OR REPLACE FUNCTION public.can_act_on_request(_req uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user, 'super_admin')
    OR public.has_role(_user, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.approval_requests r
      JOIN public.approval_hierarchies h
        ON h.module = r.module
       AND h.level = r.current_level
       AND (h.company_id = r.company_id OR h.company_id IS NULL)
       AND r.amount BETWEEN COALESCE(h.min_amount,0) AND COALESCE(h.max_amount, 9e15)
      WHERE r.id = _req
        AND public.has_role(_user, h.approver_role::app_role)
    );
$$;

REVOKE ALL ON FUNCTION public.can_act_on_request(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_act_on_request(uuid, uuid) TO authenticated;
