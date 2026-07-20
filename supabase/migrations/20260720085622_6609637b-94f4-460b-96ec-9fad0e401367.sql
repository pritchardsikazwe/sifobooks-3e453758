
DO $$
DECLARE
  _old uuid := '85af96c5-315b-4a82-84bb-645b7e0f576a';
  _new uuid := 'fd5d097e-fb6e-4ca8-9b53-f89a72f94446';
  _co  uuid;
  _je_refs text[] := ARRAY[
    'OB:CDI','GR001','RC:INV001','RC:INV002','RC:INV003','RC:WORKSHOP',
    'RC:INV007','RC:INV008','RC:INV009',
    'ADV001','ADV002','ADV003','RET001','RET002','RET003','PV004',
    'PAY001','PAY002','PAY003','PAY004'
  ];
  _bill_nos text[] := ARRAY['BILL-INV001','BILL-INV002','BILL-INV003','BILL-INV004','BILL-INV005','BILL-INV006','BILL-INV007','BILL-INV008','BILL-INV009'];
  _sup_names text[] := ARRAY['Office World Zambia','MTN Zambia','ZESCO Limited','Workshop Venue Ltd','Catering Services','Printing House','Clean Pro Services','City Garage','Lusaka Water & Sewerage'];
  _emp_codes text[] := ARRAY['CDI-001','CDI-002','CDI-003','CDI-004'];
  _acct_codes text[] := ARRAY['1010','1020','1200','1500','1510','1520','1530','1540','3100','4200','5010','5110','5120','5130','5140','5150','5160','5170','5180','5190','2310','2320','2330','2400'];
  _exp_nos text[] := ARRAY['REC001','REC002','PCV001','PCV002'];
BEGIN
  SELECT id INTO _co FROM public.companies
   WHERE user_id=_old AND name='Community Development Initiative' LIMIT 1;

  -- Transfer company ownership
  UPDATE public.companies SET user_id=_new WHERE id=_co;

  -- Journal entries + their lines (bills' auto-posted JEs included via BILL: refs)
  UPDATE public.journal_lines jl SET user_id=_new
   FROM public.journal_entries je
   WHERE jl.entry_id=je.id AND je.user_id=_old
     AND (je.reference = ANY(_je_refs)
          OR je.reference LIKE 'BILL:BILL-INV00%'
          OR je.reference LIKE 'PAY:%'
          OR je.reference LIKE 'EXP:REC00%'
          OR je.reference LIKE 'EXP:PCV00%');
  UPDATE public.journal_entries SET user_id=_new
   WHERE user_id=_old
     AND (reference = ANY(_je_refs)
          OR reference LIKE 'BILL:BILL-INV00%'
          OR reference LIKE 'PAY:%'
          OR reference LIKE 'EXP:REC00%'
          OR reference LIKE 'EXP:PCV00%');

  -- Chart of accounts (CDI-specific codes)
  UPDATE public.chart_of_accounts SET user_id=_new
   WHERE user_id=_old AND account_code = ANY(_acct_codes);

  -- Suppliers
  UPDATE public.suppliers SET user_id=_new
   WHERE user_id=_old AND name = ANY(_sup_names);

  -- Bill payments (before bills so we can still identify by bill link)
  UPDATE public.bill_payments bp SET user_id=_new
    FROM public.bills b
   WHERE bp.bill_id=b.id AND b.user_id=_old AND b.bill_number = ANY(_bill_nos);

  -- Bills
  UPDATE public.bills SET user_id=_new
   WHERE user_id=_old AND bill_number = ANY(_bill_nos);

  -- Expenses
  UPDATE public.expenses SET user_id=_new
   WHERE user_id=_old AND expense_number = ANY(_exp_nos);

  -- Employees
  UPDATE public.employees SET user_id=_new
   WHERE user_id=_old AND employee_code = ANY(_emp_codes);

  -- Add elvis as owner in company_members (if table used)
  INSERT INTO public.company_members(company_id, user_id, role, created_by, invited_email)
  VALUES (_co, _new, 'owner', _new, 'elvissikazwe52@gmail.com')
  ON CONFLICT DO NOTHING;
END $$;
