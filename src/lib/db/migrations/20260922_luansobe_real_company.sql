-- Convert the previously installed Luansobe source dataset from demo labeling to the real company record.
-- No financial amounts, references, descriptions, or running balances are changed.
UPDATE companies
SET name='LUANSOBE SECONDARY SCHOOL',
    trading_name='Luansobe Secondary School',
    address='P O BOX 40463 LUANSOBE SECONDARY SCHOOL MUFULIRA COPPERBELT',
    city='Mufulira',
    country='Zambia',
    base_currency='ZMW',
    timezone='Africa/Lusaka',
    industry='School / Education',
    status='active'
WHERE name='LUANSOBE SECONDARY SCHOOL — DEMO';

UPDATE bank_transactions
SET category='REAL_SOURCE_PENDING',
    voucher_no=REPLACE(voucher_no,'DEMO-','REAL-')
WHERE category='DEMO_SOURCE_PENDING';

UPDATE reconciliation_sessions
SET notes=REPLACE(notes,'DEMO: July working paper.','July working paper.')
WHERE notes LIKE 'DEMO:%';

UPDATE bank_accounts
SET notes=REPLACE(notes,'Demo source account.','Source account.')
WHERE notes LIKE '%Demo source account.%';
