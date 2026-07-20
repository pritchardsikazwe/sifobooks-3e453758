
-- Fix bug in post_bill_payment (was referencing p.method; column is payment_method)
CREATE OR REPLACE FUNCTION public.post_bill_payment(_payment_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE p record; _entry uuid; _bank uuid; _ap uuid; _ref text;
BEGIN
  SELECT * INTO p FROM bill_payments WHERE id=_payment_id;
  IF NOT FOUND OR COALESCE(p.amount,0)=0 THEN RETURN NULL; END IF;
  _ref := 'PAY:'||p.id::text;
  SELECT id INTO _entry FROM journal_entries WHERE user_id=p.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;
  _bank := ensure_account(p.user_id,'1000','Cash & Bank','asset');
  _ap := ensure_account(p.user_id,'2100','Accounts Payable','liability');
  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (p.user_id, 'JE-PAY-'||substr(p.id::text,1,8), p.payment_date, _ref,
          'Bill payment '||COALESCE(p.reference,''), 'posted', p.amount, p.amount)
  RETURNING id INTO _entry;
  INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
    (p.user_id, _entry, _ap, p.amount, 0, 'Settle payable'),
    (p.user_id, _entry, _bank, 0, p.amount, COALESCE(p.payment_method,'bank')||' payment');
  RETURN _entry;
END $function$;

-- Now seed CDI
DO $$
DECLARE
  _uid uuid := '85af96c5-315b-4a82-84bb-645b7e0f576a';
  _co  uuid;
  _bank uuid; _cash uuid; _mv uuid; _ce uuid; _oe uuid; _fx uuid; _solar uuid; _af uuid;
  _grant uuid; _sal uuid; _paye uuid; _napsa uuid; _nhima uuid;
  _fuel uuid; _int uuid; _elec uuid; _water uuid; _clean uuid; _rep uuid;
  _stat uuid; _work uuid; _adv uuid; _pettyexp uuid;
  _je uuid;
  _sup_office uuid; _sup_mtn uuid; _sup_zesco uuid; _sup_venue uuid; _sup_cat uuid;
  _sup_print uuid; _sup_clean uuid; _sup_garage uuid; _sup_water uuid;
  _bill uuid;
BEGIN
  INSERT INTO companies (user_id, name, trading_name, email, phone, address, city, country, base_currency, is_primary, industry)
  VALUES (_uid, 'Community Development Initiative', 'CDI – WASH Project',
          'elvissikazwe52@gmail.com', '+260 000 000 000',
          'Head Office, Lusaka', 'Lusaka', 'Zambia', 'ZMW', false, 'ngo')
  RETURNING id INTO _co;

  _bank  := ensure_account(_uid,'1010','Zanaco Bank – CDI','asset');
  _cash  := ensure_account(_uid,'1020','Petty Cash – CDI','asset');
  _adv   := ensure_account(_uid,'1200','Staff Advances','asset');
  _mv    := ensure_account(_uid,'1500','Motor Vehicles','asset');
  _ce    := ensure_account(_uid,'1510','Computer Equipment','asset');
  _oe    := ensure_account(_uid,'1520','Office Equipment','asset');
  _fx    := ensure_account(_uid,'1530','Furniture & Fixtures','asset');
  _solar := ensure_account(_uid,'1540','Solar Backup System','asset');
  _af    := ensure_account(_uid,'3100','Accumulated Fund','equity');
  _grant := ensure_account(_uid,'4200','Grant Income','revenue');
  _sal   := ensure_account(_uid,'5010','Salaries & Wages','expense');
  _paye  := ensure_account(_uid,'2310','PAYE Payable','liability');
  _napsa := ensure_account(_uid,'2320','NAPSA Payable','liability');
  _nhima := ensure_account(_uid,'2330','NHIMA Payable','liability');
  _fuel  := ensure_account(_uid,'5110','Fuel & Vehicle Running','expense');
  _int   := ensure_account(_uid,'5120','Internet & Communication','expense');
  _elec  := ensure_account(_uid,'5130','Electricity','expense');
  _water := ensure_account(_uid,'5140','Water Utility','expense');
  _clean := ensure_account(_uid,'5150','Cleaning & Sanitation','expense');
  _rep   := ensure_account(_uid,'5160','Repairs & Maintenance','expense');
  _stat  := ensure_account(_uid,'5170','Office Stationery','expense');
  _work  := ensure_account(_uid,'5180','Workshops & Training','expense');
  _pettyexp := ensure_account(_uid,'5190','Petty Cash Expenses','expense');

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (_uid,'JE-OB-CDI','2026-07-01','OB:CDI','CDI opening balances 01 Jul 2026','posted',634000,634000) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id, entry_id, account_id, description, debit, credit) VALUES
    (_uid,_je,_bank,'Opening Zanaco',250000,0),
    (_uid,_je,_cash,'Opening petty cash',5000,0),
    (_uid,_je,_mv,'Toyota Hilux FA001',285000,0),
    (_uid,_je,_ce,'Dell Laptop FA002',18500,0),
    (_uid,_je,_oe,'HP Printer FA003',9500,0),
    (_uid,_je,_fx,'Office Furniture FA004',24000,0),
    (_uid,_je,_solar,'Solar System FA005',42000,0),
    (_uid,_je,_af,'Accumulated fund',0,634000);

  INSERT INTO suppliers(user_id,name) VALUES (_uid,'Office World Zambia') RETURNING id INTO _sup_office;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'MTN Zambia') RETURNING id INTO _sup_mtn;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'ZESCO Limited') RETURNING id INTO _sup_zesco;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'Workshop Venue Ltd') RETURNING id INTO _sup_venue;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'Catering Services') RETURNING id INTO _sup_cat;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'Printing House') RETURNING id INTO _sup_print;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'Clean Pro Services') RETURNING id INTO _sup_clean;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'City Garage') RETURNING id INTO _sup_garage;
  INSERT INTO suppliers(user_id,name) VALUES (_uid,'Lusaka Water & Sewerage') RETURNING id INTO _sup_water;

  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-GR-CDI001','2026-07-02','GR001','Grant – Global Water Foundation','posted',180000,180000) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_bank,'Grant received',180000,0),
    (_uid,_je,_grant,'Global Water Foundation',0,180000);

  -- Bills + payments (auto-post via triggers; reclass CoS to specific expense)
  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_office,'BILL-INV001','INV001','2026-07-03','2026-07-05',4500,0,4500,'paid',4500,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method,reference)
  VALUES (_uid,_bill,_sup_office,'PV001','2026-07-05',4500,'bank','PV001');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RC-INV001','2026-07-03','RC:INV001','Reclass stationery','posted',4500,4500) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_stat,'Stationery',4500,0),
    (_uid,_je,ensure_account(_uid,'5000','Cost of Sales','expense'),'Reverse default',0,4500);

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_mtn,'BILL-INV002','INV002','2026-07-09','2026-07-09',1500,0,1500,'paid',1500,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_mtn,'PV-INV002','2026-07-09',1500,'bank');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RC-INV002','2026-07-09','RC:INV002','Reclass internet','posted',1500,1500) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_int,'MTN Internet',1500,0),
    (_uid,_je,ensure_account(_uid,'5000','Cost of Sales','expense'),'Reverse',0,1500);

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_zesco,'BILL-INV003','INV003','2026-07-10','2026-07-10',950,0,950,'paid',950,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_zesco,'PV-INV003','2026-07-10',950,'bank');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RC-INV003','2026-07-10','RC:INV003','Reclass electricity','posted',950,950) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_elec,'ZESCO',950,0),
    (_uid,_je,ensure_account(_uid,'5000','Cost of Sales','expense'),'Reverse',0,950);

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_venue,'BILL-INV004','INV004','2026-07-14','2026-07-14',15000,0,15000,'paid',15000,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_venue,'PV-INV004','2026-07-14',15000,'bank');

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_cat,'BILL-INV005','INV005','2026-07-14','2026-07-14',10000,0,10000,'paid',10000,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_cat,'PV-INV005','2026-07-14',10000,'bank');

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_print,'BILL-INV006','INV006','2026-07-14','2026-07-14',5000,0,5000,'paid',5000,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_print,'PV-INV006','2026-07-14',5000,'bank');

  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RC-WK','2026-07-14','RC:WORKSHOP','Reclass workshop costs','posted',30000,30000) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_work,'Workshop venue/catering/printing',30000,0),
    (_uid,_je,ensure_account(_uid,'5000','Cost of Sales','expense'),'Reverse defaults',0,30000);

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_clean,'BILL-INV007','INV007','2026-07-21','2026-07-22',1800,0,1800,'paid',1800,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_clean,'PV002','2026-07-22',1800,'bank');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RC-INV007','2026-07-22','RC:INV007','Reclass cleaning','posted',1800,1800) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_clean,'Cleaning',1800,0),
    (_uid,_je,ensure_account(_uid,'5000','Cost of Sales','expense'),'Reverse',0,1800);

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_garage,'BILL-INV008','INV008','2026-07-24','2026-07-25',4200,0,4200,'paid',4200,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_garage,'PV003','2026-07-25',4200,'bank');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RC-INV008','2026-07-25','RC:INV008','Reclass garage','posted',4200,4200) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_rep,'Vehicle servicing',4200,0),
    (_uid,_je,ensure_account(_uid,'5000','Cost of Sales','expense'),'Reverse',0,4200);

  INSERT INTO bills(user_id,supplier_id,bill_number,supplier_invoice_number,bill_date,due_date,subtotal,tax_amount,total,status,amount_paid,balance_due)
  VALUES (_uid,_sup_water,'BILL-INV009','INV009','2026-07-30','2026-07-30',650,0,650,'paid',650,0) RETURNING id INTO _bill;
  INSERT INTO bill_payments(user_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method)
  VALUES (_uid,_bill,_sup_water,'PV-INV009','2026-07-30',650,'bank');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RC-INV009','2026-07-30','RC:INV009','Reclass water','posted',650,650) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_water,'Water',650,0),
    (_uid,_je,ensure_account(_uid,'5000','Cost of Sales','expense'),'Reverse',0,650);

  -- Expenses
  INSERT INTO expenses(user_id,expense_number,expense_date,category,payment_method,bank_account_id,expense_account_id,amount,vat_amount,total,reference,notes,status)
  VALUES (_uid,'REC001','2026-07-08','Fuel','bank',_bank,_fuel,2200,0,2200,'REC001','Diesel for project vehicle','posted');
  INSERT INTO expenses(user_id,expense_number,expense_date,category,payment_method,bank_account_id,expense_account_id,amount,vat_amount,total,reference,notes,status)
  VALUES (_uid,'PCV001','2026-07-19','Cleaning Materials','cash',_cash,_pettyexp,650,0,650,'PCV001','Cleaning materials (petty cash)','posted');
  INSERT INTO expenses(user_id,expense_number,expense_date,category,payment_method,bank_account_id,expense_account_id,amount,vat_amount,total,reference,notes,status)
  VALUES (_uid,'PCV002','2026-07-20','Refreshments','cash',_cash,_pettyexp,850,0,850,'PCV002','Tea, sugar & drinking water','posted');
  INSERT INTO expenses(user_id,expense_number,expense_date,category,payment_method,bank_account_id,expense_account_id,amount,vat_amount,total,reference,notes,status)
  VALUES (_uid,'REC002','2026-07-23','Fuel','bank',_bank,_fuel,1750,0,1750,'REC002','Fuel for monitoring visit','posted');

  -- Advances
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-ADV001','2026-07-06','ADV001','Advance – John Zulu','posted',8000,8000) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_adv,'J. Zulu',8000,0),(_uid,_je,_bank,'Bank',0,8000);
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-ADV002','2026-07-07','ADV002','Advance – Peter Banda','posted',5500,5500) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_adv,'P. Banda',5500,0),(_uid,_je,_bank,'Bank',0,5500);
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-ADV003','2026-07-18','ADV003','Advance – Kelvin Mbewe','posted',3500,3500) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_adv,'K. Mbewe',3500,0),(_uid,_je,_bank,'Bank',0,3500);

  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RET001','2026-07-16','RET001','Retirement – J. Zulu','posted',8000,8000) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_work,'Community sensitization',7650,0),
    (_uid,_je,_bank,'Refund unused advance',350,0),
    (_uid,_je,_adv,'Clear advance',0,8000);

  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RET002','2026-07-27','RET002','Retirement – K. Mbewe','posted',3500,3500) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_fuel,'Fuel & servicing',3420,0),
    (_uid,_je,_bank,'Refund unused advance',80,0),
    (_uid,_je,_adv,'Clear advance',0,3500);

  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-RET003','2026-07-28','RET003','Retirement – P. Banda','posted',5700,5700) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_work,'Donor meeting',5700,0),
    (_uid,_je,_adv,'Clear advance 5500',0,5500),
    (_uid,_je,ensure_account(_uid,'2400','Staff Reimbursements Payable','liability'),'Owed to P. Banda',0,200);
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-PV004','2026-07-29','PV004','Reimburse P. Banda excess','posted',200,200) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,ensure_account(_uid,'2400','Staff Reimbursements Payable','liability'),'Pay',200,0),
    (_uid,_je,_bank,'Bank',0,200);

  -- Payroll
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-PAY001','2026-07-12','PAY001','July payroll','posted',34000,34000) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_sal,'Gross salaries',34000,0),
    (_uid,_je,_paye,'PAYE',0,6200),
    (_uid,_je,_napsa,'NAPSA',0,4080),
    (_uid,_je,_nhima,'NHIMA',0,1020),
    (_uid,_je,_bank,'Net paid',0,22700);
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-PAY002','2026-07-31','PAY002','PAYE remitted','posted',6200,6200) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_paye,'Clear',6200,0),(_uid,_je,_bank,'Bank',0,6200);
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-PAY003','2026-07-31','PAY003','NAPSA remitted','posted',4080,4080) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_napsa,'Clear',4080,0),(_uid,_je,_bank,'Bank',0,4080);
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_uid,'JE-PAY004','2026-07-31','PAY004','NHIMA remitted','posted',1020,1020) RETURNING id INTO _je;
  INSERT INTO journal_lines(user_id,entry_id,account_id,description,debit,credit) VALUES
    (_uid,_je,_nhima,'Clear',1020,0),(_uid,_je,_bank,'Bank',0,1020);

  INSERT INTO employees(user_id,first_name,last_name,employee_code,basic_salary,hire_date,status) VALUES
    (_uid,'Peter','Banda','CDI-001',12000,'2025-01-01','active'),
    (_uid,'Mary','Phiri','CDI-002',9000,'2025-01-01','active'),
    (_uid,'John','Zulu','CDI-003',8000,'2025-01-01','active'),
    (_uid,'Kelvin','Mbewe','CDI-004',5000,'2025-01-01','active');
END $$;
