CREATE OR REPLACE FUNCTION public.run_notification_scans()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  _count integer := 0;
BEGIN
  -- 1) Low stock (quantity_on_hand <= reorder_level, reorder_level > 0)
  FOR r IN
    SELECT id, user_id, name, quantity_on_hand, reorder_level
    FROM public.stock_items
    WHERE reorder_level > 0 AND quantity_on_hand <= reorder_level
  LOOP
    PERFORM public.notify_once(
      r.user_id,
      'lowstock:'||r.id::text||':'||CURRENT_DATE::text,
      'Low stock: '||r.name,
      'On hand '||r.quantity_on_hand||' is at or below reorder level '||r.reorder_level||'.',
      'warning',
      '/inventory'
    );
    _count := _count + 1;
  END LOOP;

  -- 2) Overdue invoices (invoices store the document number in "number")
  FOR r IN
    SELECT id, user_id, number, total, balance_due, due_date
    FROM public.invoices
    WHERE COALESCE(balance_due,0) > 0
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
  LOOP
    PERFORM public.notify_once(
      r.user_id,
      'invdue:'||r.id::text||':'||CURRENT_DATE::text,
      'Overdue invoice '||COALESCE(r.number,'#'),
      'Balance '||r.balance_due||' overdue since '||r.due_date::text||'.',
      'error',
      '/invoices'
    );
    _count := _count + 1;
  END LOOP;

  -- 3) Overdue bills
  FOR r IN
    SELECT id, user_id, bill_number, balance_due, due_date
    FROM public.bills
    WHERE COALESCE(balance_due,0) > 0
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
  LOOP
    PERFORM public.notify_once(
      r.user_id,
      'billdue:'||r.id::text||':'||CURRENT_DATE::text,
      'Overdue bill '||COALESCE(r.bill_number,'#'),
      'Balance '||r.balance_due||' overdue since '||r.due_date::text||'.',
      'error',
      '/bills'
    );
    _count := _count + 1;
  END LOOP;

  -- 4) Budget overruns (actual > budgeted)
  FOR r IN
    SELECT id, user_id, name, fiscal_year, budgeted_amount, actual_amount
    FROM public.budgets
    WHERE COALESCE(actual_amount,0) > COALESCE(budgeted_amount,0)
      AND COALESCE(budgeted_amount,0) > 0
  LOOP
    PERFORM public.notify_once(
      r.user_id,
      'budget:'||r.id::text||':'||CURRENT_DATE::text,
      'Budget overrun: '||r.name,
      'Actual '||r.actual_amount||' exceeds budget '||r.budgeted_amount||' ('||r.fiscal_year||').',
      'warning',
      '/budgets'
    );
    _count := _count + 1;
  END LOOP;

  -- 5) Compliance obligations due within 7 days and unpaid
  FOR r IN
    SELECT id, user_id, obligation_type, due_date, status, amount
    FROM public.compliance_obligations
    WHERE due_date IS NOT NULL
      AND due_date <= CURRENT_DATE + INTERVAL '7 days'
      AND COALESCE(status,'pending') <> 'paid'
  LOOP
    PERFORM public.notify_once(
      r.user_id,
      'compl:'||r.id::text||':'||CURRENT_DATE::text,
      'Compliance due: '||r.obligation_type,
      'Due '||r.due_date::text||COALESCE(' — amount '||r.amount::text,'')||'.',
      CASE WHEN r.due_date < CURRENT_DATE THEN 'error' ELSE 'warning' END,
      '/compliance'
    );
    _count := _count + 1;
  END LOOP;

  -- 6) Employee birthdays today
  FOR r IN
    SELECT id, user_id, first_name, last_name
    FROM public.employees
    WHERE date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY   FROM date_of_birth) = EXTRACT(DAY   FROM CURRENT_DATE)
      AND COALESCE(status,'active') = 'active'
  LOOP
    PERFORM public.notify_once(
      r.user_id,
      'bday:'||r.id::text||':'||CURRENT_DATE::text,
      'Birthday today: '||r.first_name||' '||r.last_name,
      'Send them your best wishes.',
      'info',
      '/employees'
    );
    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('scanned_at', now(), 'notifications_considered', _count);
END;
$function$;