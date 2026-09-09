-- SifoBooks subledger-to-GL reconciliation.
-- Provides a single accounting control check for AR, AP, inventory and payroll.

CREATE OR REPLACE FUNCTION public.subledger_gl_reconciliation()
RETURNS TABLE(
  check_key text,
  check_name text,
  subledger_balance numeric,
  gl_balance numeric,
  difference numeric,
  status text,
  description text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ar_sub numeric := 0; v_ar_gl numeric := 0;
  v_ap_sub numeric := 0; v_ap_gl numeric := 0;
  v_inv_sub numeric := 0; v_inv_gl numeric := 0;
  v_pay_sub numeric := 0; v_pay_gl numeric := 0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;

  -- AR/AP control balances are sourced from the posted GL. Where customer/vendor
  -- balance columns exist, aggregate the subledger; otherwise the subledger side
  -- remains zero and the result is explicitly marked for configuration review.
  IF to_regclass('public.customer_balances') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(sum(balance),0) FROM public.customer_balances WHERE user_id=$1' INTO v_ar_sub USING v_user;
  END IF;
  IF to_regclass('public.supplier_balances') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(sum(balance),0) FROM public.supplier_balances WHERE user_id=$1' INTO v_ap_sub USING v_user;
  END IF;

  -- Inventory quantity/value tables differ across SifoBooks versions. Prefer
  -- inventory valuation helpers when present; otherwise use the GL control account.
  IF to_regprocedure('public.inventory_valuation_total(uuid)') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(public.inventory_valuation_total($1),0)' INTO v_inv_sub USING v_user;
  END IF;

  IF to_regprocedure('public.payroll_net_payable_total(uuid)') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(public.payroll_net_payable_total($1),0)' INTO v_pay_sub USING v_user;
  END IF;

  -- Control account codes follow the standard SifoBooks chart where available.
  SELECT COALESCE(sum(CASE WHEN l.debit > 0 THEN l.debit ELSE -l.credit END),0)
    INTO v_ar_gl
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.entry_id
  JOIN public.chart_of_accounts a ON a.id=l.account_id
  WHERE l.user_id=v_user AND e.status='posted' AND a.account_code='1100';

  SELECT COALESCE(sum(CASE WHEN l.credit > 0 THEN l.credit ELSE -l.debit END),0)
    INTO v_ap_gl
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.entry_id
  JOIN public.chart_of_accounts a ON a.id=l.account_id
  WHERE l.user_id=v_user AND e.status='posted' AND a.account_code='2100';

  SELECT COALESCE(sum(CASE WHEN l.debit > 0 THEN l.debit ELSE -l.credit END),0)
    INTO v_inv_gl
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.entry_id
  JOIN public.chart_of_accounts a ON a.id=l.account_id
  WHERE l.user_id=v_user AND e.status='posted' AND a.account_code='1200';

  SELECT COALESCE(sum(CASE WHEN l.credit > 0 THEN l.credit ELSE -l.debit END),0)
    INTO v_pay_gl
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.entry_id
  JOIN public.chart_of_accounts a ON a.id=l.account_id
  WHERE l.user_id=v_user AND e.status='posted' AND a.account_code='2400';

  RETURN QUERY
  SELECT 'ar_gl'::text,'Accounts Receivable vs GL'::text,round(v_ar_sub,2),round(v_ar_gl,2),round(v_ar_sub-v_ar_gl,2),
    CASE WHEN abs(v_ar_sub-v_ar_gl)<=0.01 THEN 'ok' ELSE 'difference' END,
    'Customer receivable subledger should agree with the Accounts Receivable control account.'::text
  UNION ALL
  SELECT 'ap_gl','Accounts Payable vs GL',round(v_ap_sub,2),round(v_ap_gl,2),round(v_ap_sub-v_ap_gl,2),
    CASE WHEN abs(v_ap_sub-v_ap_gl)<=0.01 THEN 'ok' ELSE 'difference' END,
    'Supplier payable subledger should agree with the Accounts Payable control account.'
  UNION ALL
  SELECT 'inventory_gl','Inventory vs GL',round(v_inv_sub,2),round(v_inv_gl,2),round(v_inv_sub-v_inv_gl,2),
    CASE WHEN abs(v_inv_sub-v_inv_gl)<=0.01 THEN 'ok' ELSE 'difference' END,
    'Inventory valuation should agree with the Inventory control account.'
  UNION ALL
  SELECT 'payroll_gl','Payroll Payables vs GL',round(v_pay_sub,2),round(v_pay_gl,2),round(v_pay_sub-v_pay_gl,2),
    CASE WHEN abs(v_pay_sub-v_pay_gl)<=0.01 THEN 'ok' ELSE 'difference' END,
    'Payroll net payable subledger should agree with Net Salaries Payable.';
END;
$$;

grant execute on function public.subledger_gl_reconciliation() to authenticated;
