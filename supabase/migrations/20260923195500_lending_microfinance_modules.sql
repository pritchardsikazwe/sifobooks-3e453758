-- SifoBooks Lending / Microfinance expansion — 2026
-- Adds the operational modules needed for group lending, savings, investors,
-- guarantors, restructuring, write-offs, branches, field collections,
-- communications, risk/fraud and customer documents.
create extension if not exists pgcrypto;

create table if not exists public.lending_guarantors (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid,
  loan_id uuid references public.lending_loans(id) on delete cascade,
  borrower_id uuid not null references public.lending_borrowers(id) on delete cascade,
  full_name text not null, phone text, national_id text, relationship text,
  guarantee_amount numeric(18,2) not null default 0, verification_status text not null default 'pending',
  notes text, created_at timestamptz not null default now()
);

create table if not exists public.lending_groups (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid,
  group_no text not null, name text not null, leader_borrower_id uuid references public.lending_borrowers(id),
  meeting_day text, meeting_location text, status text not null default 'active',
  created_at timestamptz not null default now()
);
create unique index if not exists lending_groups_user_no_uq on public.lending_groups(user_id, group_no);

create table if not exists public.lending_group_members (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  group_id uuid not null references public.lending_groups(id) on delete cascade,
  borrower_id uuid not null references public.lending_borrowers(id) on delete cascade,
  role text not null default 'member', joined_at date not null default current_date,
  status text not null default 'active'
);

create table if not exists public.lending_group_loans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  group_id uuid not null references public.lending_groups(id) on delete cascade,
  loan_id uuid not null references public.lending_loans(id) on delete cascade,
  liability_type text not null default 'individual'
);

create table if not exists public.lending_savings_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid,
  account_no text not null, borrower_id uuid not null references public.lending_borrowers(id),
  product_name text not null default 'Savings', balance numeric(18,2) not null default 0,
  status text not null default 'active', opened_at date not null default current_date,
  created_at timestamptz not null default now()
);
create unique index if not exists lending_savings_user_no_uq on public.lending_savings_accounts(user_id, account_no);

create table if not exists public.lending_savings_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  account_id uuid not null references public.lending_savings_accounts(id) on delete cascade,
  transaction_type text not null, amount numeric(18,2) not null default 0,
  reference text, transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.lending_investors (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid,
  investor_no text not null, full_name text not null, phone text, email text,
  capital_invested numeric(18,2) not null default 0, return_earned numeric(18,2) not null default 0,
  status text not null default 'active', created_at timestamptz not null default now()
);
create unique index if not exists lending_investors_user_no_uq on public.lending_investors(user_id, investor_no);

create table if not exists public.lending_investor_allocations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  investor_id uuid not null references public.lending_investors(id) on delete cascade,
  loan_id uuid references public.lending_loans(id), amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lending_restructures (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  loan_id uuid not null references public.lending_loans(id), old_balance numeric(18,2) not null default 0,
  new_balance numeric(18,2) not null default 0, old_term integer, new_term integer,
  new_interest_rate numeric(12,4), reason text, status text not null default 'pending',
  approved_by uuid, approved_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.lending_writeoffs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  loan_id uuid not null references public.lending_loans(id), amount numeric(18,2) not null default 0,
  reason text, status text not null default 'pending', approved_by uuid,
  approved_at timestamptz, recovered_amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lending_field_visits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  loan_id uuid references public.lending_loans(id), borrower_id uuid references public.lending_borrowers(id),
  officer_id uuid, visit_date timestamptz not null default now(), outcome text,
  promise_amount numeric(18,2) not null default 0, promise_date date, notes text,
  latitude numeric(10,7), longitude numeric(10,7), created_at timestamptz not null default now()
);

create table if not exists public.lending_communications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  borrower_id uuid references public.lending_borrowers(id), loan_id uuid references public.lending_loans(id),
  channel text not null, template text, recipient text, message text, status text not null default 'queued',
  sent_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.lending_risk_flags (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  borrower_id uuid references public.lending_borrowers(id), loan_id uuid references public.lending_loans(id),
  flag_type text not null, severity text not null default 'medium', score numeric(8,2),
  description text, status text not null default 'open', resolved_by uuid, resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lending_documents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  borrower_id uuid references public.lending_borrowers(id), loan_id uuid references public.lending_loans(id),
  document_type text not null, file_name text not null, storage_path text,
  verification_status text not null default 'pending', created_at timestamptz not null default now()
);

create table if not exists public.lending_branches (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid,
  branch_code text not null, name text not null, location text, manager_name text,
  status text not null default 'active', created_at timestamptz not null default now()
);
create unique index if not exists lending_branches_user_code_uq on public.lending_branches(user_id, branch_code);

create table if not exists public.lending_promise_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  promise_id uuid references public.lending_promises(id) on delete cascade,
  outcome text not null, checked_at timestamptz not null default now(), notes text
);

alter table public.lending_guarantors enable row level security;
alter table public.lending_groups enable row level security;
alter table public.lending_group_members enable row level security;
alter table public.lending_group_loans enable row level security;
alter table public.lending_savings_accounts enable row level security;
alter table public.lending_savings_transactions enable row level security;
alter table public.lending_investors enable row level security;
alter table public.lending_investor_allocations enable row level security;
alter table public.lending_restructures enable row level security;
alter table public.lending_writeoffs enable row level security;
alter table public.lending_field_visits enable row level security;
alter table public.lending_communications enable row level security;
alter table public.lending_risk_flags enable row level security;
alter table public.lending_documents enable row level security;
alter table public.lending_branches enable row level security;
alter table public.lending_promise_history enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'lending_guarantors','lending_groups','lending_group_members','lending_group_loans',
    'lending_savings_accounts','lending_savings_transactions','lending_investors','lending_investor_allocations',
    'lending_restructures','lending_writeoffs','lending_field_visits','lending_communications',
    'lending_risk_flags','lending_documents','lending_branches','lending_promise_history'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_owner', t);
  end loop;
end $$;
