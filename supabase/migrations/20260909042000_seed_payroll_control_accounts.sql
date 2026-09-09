-- Payroll posting must separate payroll accrual from the later bank payment.
-- Net salary is therefore a liability until the salary payment is made.
INSERT INTO public.chart_of_accounts(user_id, account_code, account_name, account_type, is_active, is_control_account, reconciliation_required)
SELECT u.user_id, '2400', 'Net Salaries Payable', 'liability', true, true, true
FROM (SELECT DISTINCT user_id FROM public.chart_of_accounts) u
WHERE NOT EXISTS (
  SELECT 1 FROM public.chart_of_accounts a WHERE a.user_id=u.user_id AND a.account_code='2400'
);
