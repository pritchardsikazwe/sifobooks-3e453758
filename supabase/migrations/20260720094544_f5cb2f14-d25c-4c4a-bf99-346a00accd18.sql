
CREATE TABLE public.fixed_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  asset_number text NOT NULL,
  description text NOT NULL,
  category text,
  purchase_date date NOT NULL,
  supplier text,
  cost numeric NOT NULL DEFAULT 0,
  salvage_value numeric NOT NULL DEFAULT 0,
  useful_life_years numeric NOT NULL DEFAULT 5,
  method text NOT NULL DEFAULT 'straight_line',
  location text,
  condition text DEFAULT 'good',
  status text NOT NULL DEFAULT 'active', -- active | disposed | written_off
  disposal_date date,
  disposal_proceeds numeric DEFAULT 0,
  accumulated_depreciation numeric NOT NULL DEFAULT 0,
  book_value numeric NOT NULL DEFAULT 0,
  asset_account_code text DEFAULT '1500',
  depreciation_expense_code text DEFAULT '5700',
  accumulated_depreciation_code text DEFAULT '1590',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_assets TO authenticated;
GRANT ALL ON public.fixed_assets TO service_role;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_fixed_assets" ON public.fixed_assets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_fixed_assets_updated
BEFORE UPDATE ON public.fixed_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_fixed_assets_user ON public.fixed_assets(user_id, status);

-- Auto-calc book value on write
CREATE OR REPLACE FUNCTION public.fixed_assets_calc_bv()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.book_value := GREATEST(COALESCE(NEW.cost,0) - COALESCE(NEW.accumulated_depreciation,0), COALESCE(NEW.salvage_value,0));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fixed_assets_bv ON public.fixed_assets;
CREATE TRIGGER trg_fixed_assets_bv
BEFORE INSERT OR UPDATE ON public.fixed_assets
FOR EACH ROW EXECUTE FUNCTION public.fixed_assets_calc_bv();

-- Monthly depreciation posting
CREATE OR REPLACE FUNCTION public.post_depreciation(_year integer, _month integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  a record; _monthly numeric; _dep_exp uuid; _acc_dep uuid;
  _period_end date; _ref text; _entry uuid; _posted int := 0; _total numeric := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  _period_end := (make_date(_year, _month, 1) + interval '1 month - 1 day')::date;

  FOR a IN
    SELECT * FROM fixed_assets
    WHERE user_id=_uid
      AND status='active'
      AND purchase_date <= _period_end
      AND COALESCE(cost,0) > COALESCE(salvage_value,0)
      AND COALESCE(useful_life_years,0) > 0
      AND COALESCE(accumulated_depreciation,0) < (COALESCE(cost,0) - COALESCE(salvage_value,0))
  LOOP
    _monthly := round(((a.cost - a.salvage_value) / (a.useful_life_years * 12))::numeric, 2);
    IF a.accumulated_depreciation + _monthly > (a.cost - a.salvage_value) THEN
      _monthly := (a.cost - a.salvage_value) - a.accumulated_depreciation;
    END IF;
    IF _monthly <= 0 THEN CONTINUE; END IF;

    _ref := 'DEP:' || a.asset_number || ':' || to_char(_period_end, 'YYYY-MM');
    IF EXISTS (SELECT 1 FROM journal_entries WHERE user_id=_uid AND reference=_ref) THEN CONTINUE; END IF;

    _dep_exp := ensure_account(_uid, COALESCE(a.depreciation_expense_code,'5700'), 'Depreciation Expense', 'expense');
    _acc_dep := ensure_account(_uid, COALESCE(a.accumulated_depreciation_code,'1590'), 'Accumulated Depreciation', 'asset');

    INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
    VALUES (_uid, 'JE-DEP-'||a.asset_number||'-'||to_char(_period_end,'YYYYMM'), _period_end, _ref,
            'Monthly depreciation — '||a.description, 'posted', _monthly, _monthly)
    RETURNING id INTO _entry;

    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
      (_uid, _entry, _dep_exp, _monthly, 0, 'Depreciation '||a.asset_number),
      (_uid, _entry, _acc_dep, 0, _monthly, 'Accumulated depreciation');

    UPDATE fixed_assets SET accumulated_depreciation = accumulated_depreciation + _monthly WHERE id=a.id;
    _posted := _posted + 1;
    _total := _total + _monthly;
  END LOOP;

  RETURN jsonb_build_object('assets_posted', _posted, 'total_depreciation', _total, 'period_end', _period_end);
END $$;
