-- Period close hardening: validate close/reopen permissions and create an audit trail.

CREATE TABLE IF NOT EXISTS public.period_close_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  period_month integer,
  period_type text NOT NULL,
  action text NOT NULL CHECK (action IN ('close','reopen')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS period_close_audit_lookup_idx
  ON public.period_close_audit(user_id,fiscal_year,period_month,created_at DESC);

ALTER TABLE public.period_close_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS period_close_audit_select ON public.period_close_audit;
CREATE POLICY period_close_audit_select
ON public.period_close_audit FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_period_close_audit(
  _year integer,
  _month integer,
  _period_type text,
  _action text,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _year < 1900 OR _year > 2200 THEN RAISE EXCEPTION 'Invalid fiscal year'; END IF;
  IF _period_type NOT IN ('month','year') THEN RAISE EXCEPTION 'Invalid period type'; END IF;
  IF _action NOT IN ('close','reopen') THEN RAISE EXCEPTION 'Invalid period action'; END IF;
  IF _period_type = 'month' AND (_month IS NULL OR _month NOT BETWEEN 1 AND 12) THEN
    RAISE EXCEPTION 'Invalid month';
  END IF;
  INSERT INTO public.period_close_audit(user_id,fiscal_year,period_month,period_type,action,notes)
  VALUES(auth.uid(),_year,CASE WHEN _period_type='month' THEN _month ELSE NULL END,_period_type,_action,_notes)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

grant execute on function public.record_period_close_audit(integer,integer,text,text,text) to authenticated;

-- Replace close_month with a guarded implementation that refuses to close a month
-- while posted journals are unbalanced or missing lines.
CREATE OR REPLACE FUNCTION public.close_month(_year integer, _month integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_period_id uuid;
  v_bad bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _year < 1900 OR _year > 2200 OR _month NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Invalid accounting period'; END IF;

  SELECT count(*) INTO v_bad
  FROM public.journal_entries e
  WHERE e.user_id=v_user AND e.status='posted'
    AND EXTRACT(YEAR FROM e.entry_date)=_year
    AND EXTRACT(MONTH FROM e.entry_date)=_month
    AND (abs(COALESCE(e.total_debit,0)-COALESCE(e.total_credit,0)) > 0.01
      OR NOT EXISTS (SELECT 1 FROM public.journal_lines l WHERE l.entry_id=e.id));
  IF v_bad > 0 THEN RAISE EXCEPTION 'Cannot close period: % invalid posted journal(s) require correction', v_bad; END IF;

  INSERT INTO public.financial_periods(user_id,fiscal_year,period_month,period_type,status,closed_at)
  VALUES(v_user,_year,_month,'month','closed',now())
  ON CONFLICT (user_id,fiscal_year,period_month,period_type)
  DO UPDATE SET status='closed',closed_at=now();

  PERFORM public.record_period_close_audit(_year,_month,'month','close','Month closed after accounting control validation');
END;
$$;

grant execute on function public.close_month(integer,integer) to authenticated;

-- Reopening is explicit and leaves an audit record. It does not delete history.
CREATE OR REPLACE FUNCTION public.reopen_period(_year integer, _month integer, _period_type text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _year < 1900 OR _year > 2200 THEN RAISE EXCEPTION 'Invalid fiscal year'; END IF;
  IF _period_type NOT IN ('month','year') THEN RAISE EXCEPTION 'Invalid period type'; END IF;
  IF _period_type='month' AND (_month IS NULL OR _month NOT BETWEEN 1 AND 12) THEN RAISE EXCEPTION 'Invalid month'; END IF;

  UPDATE public.financial_periods
  SET status='open',closed_at=NULL
  WHERE user_id=v_user AND fiscal_year=_year AND period_type=_period_type
    AND ((_period_type='year') OR period_month=_month);

  PERFORM public.record_period_close_audit(_year,_month,_period_type,'reopen','Accounting period reopened for authorized correction');
END;
$$;

grant execute on function public.reopen_period(integer,integer,text) to authenticated;
