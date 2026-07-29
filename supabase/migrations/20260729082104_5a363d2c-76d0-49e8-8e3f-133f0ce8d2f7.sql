
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS normal_balance text CHECK (normal_balance IN ('Dr','Cr'));

-- Backfill normal balance from account type where missing
UPDATE public.chart_of_accounts SET normal_balance = 'Dr'
  WHERE normal_balance IS NULL AND account_type IN ('asset','expense');
UPDATE public.chart_of_accounts SET normal_balance = 'Cr'
  WHERE normal_balance IS NULL AND account_type IN ('liability','equity','revenue');

-- Backfill purpose for the standard codes the app uses
WITH descs(code, purpose) AS (VALUES
  ('1000','Cash & Bank — all money held in cash, tills, mobile money and bank accounts. Debited when money comes in, credited when money goes out.'),
  ('1100','Accounts Receivable — amounts owed by customers on invoices you have issued. Debited when you invoice a customer, credited when they pay.'),
  ('1200','Imprest / Advances — cash floats or advances issued to staff to be accounted for later. Debited on issue, credited on retirement.'),
  ('1500','Property, Plant & Equipment — cost of long-term physical assets (vehicles, equipment, buildings).'),
  ('1590','Accumulated Depreciation — the total depreciation charged against PPE over time. Credited each period, reduces the book value of assets.'),
  ('2100','Accounts Payable — amounts you owe suppliers on bills received. Credited when you receive a bill, debited when you pay.'),
  ('2210','VAT Input — VAT you paid on purchases that can be reclaimed from ZRA.'),
  ('2220','VAT Output — VAT you charged customers on sales that is owed to ZRA.'),
  ('2300','PAYE Payable — employee income tax withheld from payroll, owed to ZRA (due by 14th).'),
  ('2310','NAPSA Payable — pension contributions owed to NAPSA (due by 10th).'),
  ('2320','NHIMA Payable — health insurance contributions owed to NHIMA (due by 10th).'),
  ('2330','Skills Development Levy — 0.5% of gross wages owed to ZRA.'),
  ('2340','Workers'' Compensation — 1.5% of gross wages owed to Workers'' Compensation Fund.'),
  ('3000','Capital / Owners'' Equity — funds contributed by the owners of the business.'),
  ('3900','Retained Earnings — accumulated profits that have not been distributed. Increased each year by net profit at year-end close.'),
  ('3990','Income Summary — temporary account used only during year-end close to move profit/loss into Retained Earnings.'),
  ('4000','Sales Revenue — income from your main trading activity.'),
  ('4200','Grant Income — funds received from donors and grantors (NGO/school use).'),
  ('4300','Tuckshop Sales — income from school tuckshop operations.'),
  ('5000','Cost of Sales — the direct cost of goods or services you sold.'),
  ('5300','Workshops & Allowances — costs of workshops, trainings and participant allowances.'),
  ('5400','Tuckshop Purchases — cost of goods bought for the tuckshop.'),
  ('5700','Depreciation Expense — periodic charge that spreads the cost of PPE over its useful life.')
)
UPDATE public.chart_of_accounts a
   SET purpose = d.purpose
  FROM descs d
 WHERE a.account_code = d.code
   AND (a.purpose IS NULL OR a.purpose = '');
