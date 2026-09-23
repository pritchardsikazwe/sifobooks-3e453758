-- SifoBooks Lending / Microfinance foundation — 2026
-- Zambia-first lending engine. Transactions are user/company scoped and auditable.
create extension if not exists pgcrypto;

create table if not exists public.lending_borrowers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  borrower_no text not null,
  borrower_type text not null default 'individual',
  full_name text not null,
  phone text,
  email text,
  national_id text,
  address text,
  employment text,
  monthly_income numeric(18,2) not null default 0,
  status text not null default 'active',
  kyc_status text not null default 'pending',
  credit_score integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lending_borrowers_user_no_uq on public.lending_borrowers(user_id, borrower_no);
create index if not exists lending_borrowers_user_status_idx on public.lending_borrowers(user_id, status);
create index if not exists lending_borrowers_user_phone_idx on public.lending_borrowers(user_id, phone);

create table if not exists public.lending_loan_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  code text not null,
  name text not null,
  min_amount numeric(18,2) not null default 0,
  max_amount numeric(18,2) not null default 0,
  interest_rate numeric(12,4) not null default 0,
  interest_method text not null default 'reducing_balance',
  term_min integer not null default 1,
  term_max integer not null default 12,
  repayment_frequency text not null default 'monthly',
  processing_fee_rate numeric(12,4) not null default 0,
  penalty_rate numeric(12,4) not null default 0,
  grace_days integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create unique index if not exists lending_products_user_code_uq on public.lending_loan_products(user_id, code);

create table if not exists public.lending_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  application_no text not null,
  borrower_id uuid not null references public.lending_borrowers(id),
  product_id uuid references public.lending_loan_products(id),
  amount_requested numeric(18,2) not null default 0,
  term integer not null default 1,
  purpose text,
  monthly_income numeric(18,2) not null default 0,
  monthly_expenses numeric(18,2) not null default 0,
  credit_score integer,
  affordability_status text not null default 'pending',
  kyc_status text not null default 'pending',
  status text not null default 'draft',
  notes text,
  applied_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists lending_apps_user_no_uq on public.lending_applications(user_id, application_no);
create index if not exists lending_apps_user_status_idx on public.lending_applications(user_id, status);

create table if not exists public.lending_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  loan_no text not null,
  borrower_id uuid not null references public.lending_borrowers(id),
  application_id uuid references public.lending_applications(id),
  product_id uuid references public.lending_loan_products(id),
  principal numeric(18,2) not null default 0,
  interest_amount numeric(18,2) not null default 0,
  fees_amount numeric(18,2) not null default 0,
  penalty_amount numeric(18,2) not null default 0,
  total_payable numeric(18,2) not null default 0,
  principal_paid numeric(18,2) not null default 0,
  interest_paid numeric(18,2) not null default 0,
  fees_paid numeric(18,2) not null default 0,
  penalty_paid numeric(18,2) not null default 0,
  balance numeric(18,2) not null default 0,
  term integer not null default 1,
  repayment_frequency text not null default 'monthly',
  interest_method text not null default 'reducing_balance',
  status text not null default 'approved',
  disbursement_method text,
  disbursed_at timestamptz,
  maturity_date date,
  created_at timestamptz not null default now()
);

create unique index if not exists lending_loans_user_no_uq on public.lending_loans(user_id, loan_no);
create index if not exists lending_loans_user_status_idx on public.lending_loans(user_id, status);
create index if not exists lending_loans_user_borrower_idx on public.lending_loans(user_id, borrower_id);

create table if not exists public.lending_loan_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  loan_id uuid not null references public.lending_loans(id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  principal_due numeric(18,2) not null default 0,
  interest_due numeric(18,2) not null default 0,
  fees_due numeric(18,2) not null default 0,
  penalty_due numeric(18,2) not null default 0,
  amount_due numeric(18,2) not null default 0,
  amount_paid numeric(18,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists lending_schedule_loan_due_idx on public.lending_loan_schedules(loan_id, due_date);

create table if not exists public.lending_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  receipt_no text not null,
  loan_id uuid not null references public.lending_loans(id),
  borrower_id uuid not null references public.lending_borrowers(id),
  amount numeric(18,2) not null default 0,
  principal_amount numeric(18,2) not null default 0,
  interest_amount numeric(18,2) not null default 0,
  fees_amount numeric(18,2) not null default 0,
  penalty_amount numeric(18,2) not null default 0,
  method text not null default 'cash',
  reference text,
  payment_date date not null default current_date,
  status text not null default 'posted',
  created_at timestamptz not null default now()
);

create unique index if not exists lending_repayments_user_receipt_uq on public.lending_repayments(user_id, receipt_no);
create index if not exists lending_repayments_user_date_idx on public.lending_repayments(user_id, payment_date);

create table if not exists public.lending_collateral (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  loan_id uuid references public.lending_loans(id),
  borrower_id uuid not null references public.lending_borrowers(id),
  collateral_type text not null,
  description text,
  estimated_value numeric(18,2) not null default 0,
  document_ref text,
  status text not null default 'pledged',
  created_at timestamptz not null default now()
);

create table if not exists public.lending_promises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  loan_id uuid not null references public.lending_loans(id),
  borrower_id uuid not null references public.lending_borrowers(id),
  promised_amount numeric(18,2) not null default 0,
  promise_date date not null,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.lending_mobile_money (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  provider text not null,
  transaction_ref text not null,
  phone text,
  amount numeric(18,2) not null default 0,
  transaction_date timestamptz not null default now(),
  status text not null default 'unallocated',
  loan_id uuid references public.lending_loans(id),
  repayment_id uuid references public.lending_repayments(id),
  created_at timestamptz not null default now()
);

create unique index if not exists lending_momo_user_ref_uq on public.lending_mobile_money(user_id, transaction_ref);

create table if not exists public.lending_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lending_audit_user_created_idx on public.lending_audit_log(user_id, created_at desc);

alter table public.lending_borrowers enable row level security;
alter table public.lending_loan_products enable row level security;
alter table public.lending_applications enable row level security;
alter table public.lending_loans enable row level security;
alter table public.lending_loan_schedules enable row level security;
alter table public.lending_repayments enable row level security;
alter table public.lending_collateral enable row level security;
alter table public.lending_promises enable row level security;
alter table public.lending_mobile_money enable row level security;
alter table public.lending_audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'lending_borrowers','lending_loan_products','lending_applications','lending_loans',
    'lending_loan_schedules','lending_repayments','lending_collateral','lending_promises',
    'lending_mobile_money','lending_audit_log'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_owner', t);
  end loop;
end $$;
