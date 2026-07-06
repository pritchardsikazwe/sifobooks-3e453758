
CREATE TABLE IF NOT EXISTS public.financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fiscal_year integer NOT NULL,
  period_month integer,
  period_type text NOT NULL DEFAULT 'month',
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fiscal_year, period_month, period_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_periods TO authenticated;
GRANT ALL ON public.financial_periods TO service_role;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own periods" ON public.financial_periods FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_financial_periods_updated_at BEFORE UPDATE ON public.financial_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: block journal_entries in closed period
CREATE OR REPLACE FUNCTION public.prevent_posting_in_closed_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _y int; _m int;
BEGIN
  _y := EXTRACT(YEAR FROM NEW.entry_date)::int;
  _m := EXTRACT(MONTH FROM NEW.entry_date)::int;
  IF EXISTS (
    SELECT 1 FROM public.financial_periods
    WHERE user_id = NEW.user_id
      AND status = 'closed'
      AND (
        (period_type = 'year'  AND fiscal_year = _y) OR
        (period_type = 'month' AND fiscal_year = _y AND period_month = _m)
      )
  ) THEN
    RAISE EXCEPTION 'Period % is closed — cannot post entries dated %', _y, NEW.entry_date;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period ON public.journal_entries;
CREATE TRIGGER trg_prevent_closed_period
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_posting_in_closed_period();

-- Close / reopen a month
CREATE OR REPLACE FUNCTION public.close_month(_year int, _month int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.financial_periods (user_id, fiscal_year, period_month, period_type, status, closed_at, closed_by)
  VALUES (_uid, _year, _month, 'month', 'closed', now(), _uid)
  ON CONFLICT (user_id, fiscal_year, period_month, period_type)
  DO UPDATE SET status='closed', closed_at=now(), closed_by=_uid, updated_at=now();
  RETURN jsonb_build_object('closed', true, 'year', _year, 'month', _month);
END $$;

CREATE OR REPLACE FUNCTION public.reopen_period(_year int, _month int, _period_type text DEFAULT 'month')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  UPDATE public.financial_periods
     SET status='open', closed_at=NULL, closed_by=NULL, updated_at=now()
   WHERE user_id=_uid AND fiscal_year=_year
     AND period_type=_period_type
     AND (_period_type='year' OR period_month=_month);
  RETURN jsonb_build_object('reopened', true);
END $$;

-- Year-end close: compute P&L, post closing JE into Retained Earnings, mark year closed
CREATE OR REPLACE FUNCTION public.close_year(_year int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _revenue numeric := 0;
  _expense numeric := 0;
  _net numeric := 0;
  _re_id uuid;
  _income_summary_id uuid;
  _entry_id uuid;
  _entry_no text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;

  SELECT COALESCE(SUM(CASE WHEN a.account_type='revenue' THEN jl.credit - jl.debit ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN a.account_type='expense' THEN jl.debit - jl.credit ELSE 0 END),0)
    INTO _revenue, _expense
    FROM public.journal_lines jl
    JOIN public.journal_entries je ON je.id = jl.entry_id
    JOIN public.chart_of_accounts a ON a.id = jl.account_id
   WHERE je.user_id=_uid AND EXTRACT(YEAR FROM je.entry_date)::int = _year;

  _net := _revenue - _expense;

  -- Find (or create) Retained Earnings account
  SELECT id INTO _re_id FROM public.chart_of_accounts
   WHERE user_id=_uid AND account_type='equity' AND lower(account_name) LIKE '%retained earnings%'
   LIMIT 1;
  IF _re_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (user_id, account_code, account_name, account_type, is_active)
    VALUES (_uid, '3900', 'Retained Earnings', 'equity', true)
    RETURNING id INTO _re_id;
  END IF;

  -- Post closing JE if there is a net result
  IF _net <> 0 THEN
    _entry_no := 'CLOSE-' || _year::text;
    INSERT INTO public.journal_entries (user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
    VALUES (_uid, _entry_no, make_date(_year,12,31), _entry_no,
            'Year-end close for FY '||_year, 'posted', abs(_net), abs(_net))
    RETURNING id INTO _entry_id;

    -- Use RE both sides via a suspense-style single-account move against itself is invalid;
    -- Instead, post net to Retained Earnings against an offset "Income Summary" account.
    SELECT id INTO _income_summary_id FROM public.chart_of_accounts
     WHERE user_id=_uid AND account_type='equity' AND lower(account_name) LIKE '%income summary%'
     LIMIT 1;
    IF _income_summary_id IS NULL THEN
      INSERT INTO public.chart_of_accounts (user_id, account_code, account_name, account_type, is_active)
      VALUES (_uid, '3990', 'Income Summary', 'equity', true)
      RETURNING id INTO _income_summary_id;
    END IF;

    IF _net > 0 THEN
      -- Profit: DR Income Summary, CR Retained Earnings
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, description, debit, credit)
      VALUES (_uid, _entry_id, _income_summary_id, 'Close net income', _net, 0),
             (_uid, _entry_id, _re_id, 'To Retained Earnings', 0, _net);
    ELSE
      -- Loss: DR Retained Earnings, CR Income Summary
      INSERT INTO public.journal_lines (user_id, entry_id, account_id, description, debit, credit)
      VALUES (_uid, _entry_id, _re_id, 'Absorb net loss', abs(_net), 0),
             (_uid, _entry_id, _income_summary_id, 'From Income Summary', 0, abs(_net));
    END IF;
  END IF;

  -- Mark year closed
  INSERT INTO public.financial_periods (user_id, fiscal_year, period_month, period_type, status, closed_at, closed_by, notes)
  VALUES (_uid, _year, NULL, 'year', 'closed', now(), _uid,
          'Net '||_net::text||' (revenue '||_revenue::text||', expense '||_expense::text||')')
  ON CONFLICT (user_id, fiscal_year, period_month, period_type)
  DO UPDATE SET status='closed', closed_at=now(), closed_by=_uid, updated_at=now();

  RETURN jsonb_build_object(
    'year', _year, 'revenue', _revenue, 'expense', _expense, 'net_income', _net,
    'closing_entry_id', _entry_id
  );
END $$;

GRANT EXECUTE ON FUNCTION public.close_month(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_period(int,int,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_year(int) TO authenticated;
