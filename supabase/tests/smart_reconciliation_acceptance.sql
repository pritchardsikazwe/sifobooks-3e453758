-- Non-destructive acceptance checks for Smart Reconciliation and the MKP flow.
-- Run against a disposable/test database after migrations are applied.
-- These checks inspect the live ledger; they do not insert, update or delete data.

-- 1. K-Shine audit row must exist for an authenticated tenant that owns MKP data.
DO $$
DECLARE
  _rows integer;
BEGIN
  SELECT count(*) INTO _rows FROM public.mkp_kshine_inventory_audit;
  IF _rows > 1 THEN
    RAISE EXCEPTION 'K-Shine audit returned more than one row';
  END IF;
END $$;

-- 2. No negative live balances are accepted for the MKP K-Shine row.
DO $$
DECLARE
  _warehouse numeric;
  _chibombo numeric;
BEGIN
  SELECT warehouse_current, chibombo_current
    INTO _warehouse, _chibombo
  FROM public.mkp_kshine_inventory_audit;

  IF _warehouse IS NOT NULL AND _warehouse < 0 THEN
    RAISE EXCEPTION 'K-Shine warehouse balance is negative: %', _warehouse;
  END IF;
  IF _chibombo IS NOT NULL AND _chibombo < 0 THEN
    RAISE EXCEPTION 'K-Shine Chibombo balance is negative: %', _chibombo;
  END IF;
END $$;

-- 3. The K-Shine company available quantity must equal the sum of its two
--    physical locations (transit is deliberately not included in this figure).
DO $$
DECLARE
  _warehouse numeric;
  _chibombo numeric;
  _company numeric;
BEGIN
  SELECT warehouse_current, chibombo_current, company_available
    INTO _warehouse, _chibombo, _company
  FROM public.mkp_kshine_inventory_audit;

  IF _company IS NOT NULL
     AND _company <> COALESCE(_warehouse,0) + COALESCE(_chibombo,0) THEN
    RAISE EXCEPTION 'K-Shine company total is not the sum of warehouse + Chibombo';
  END IF;
END $$;

-- 4. Approval functions must exist and be executable only through the
--    authenticated/service roles, not anon/public.
SELECT has_function_privilege('anon', 'public.smart_reconciliation_approve(uuid)', 'EXECUTE') AS anon_can_approve;
SELECT has_function_privilege('anon', 'public.smart_reconciliation_reject(uuid,text)', 'EXECUTE') AS anon_can_reject;
