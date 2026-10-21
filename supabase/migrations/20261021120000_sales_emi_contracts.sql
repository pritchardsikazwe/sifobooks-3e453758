-- Sales instalment / EMI foundation.
-- Additive only: no existing sales, invoice, inventory or ledger rows are changed.
-- Payment posting must be performed by the existing accounting workflow; this migration
-- stores contract schedules and allocation references, not duplicate ledger entries.

create extension if not exists pgcrypto;

create table if not exists public.sales_emi_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid,
  customer_id uuid,
  invoice_id uuid,
  contract_number text not null,
  currency text not null default 'ZMW',
  contract_date date not null default current_date,
  first_due_date date not null,
  invoice_total numeric(18,2) not null check (invoice_total > 0),
  down_payment numeric(18,2) not null default 0 check (down_payment >= 0),
  financed_amount numeric(18,2) generated always as (invoice_total - down_payment) stored,
  interest_amount numeric(18,2) not null default 0 check (interest_amount >= 0),
  fees_amount numeric(18,2) not null default 0 check (fees_amount >= 0),
  instalment_count integer not null check (instalment_count between 1 and 600),
  total_payable numeric(18,2) generated always as (invoice_total - down_payment + interest_amount + fees_amount) stored,
  status text not null default 'draft' check (status in ('draft','active','completed','cancelled','defaulted')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, contract_number),
  check (down_payment <= invoice_total)
);

create table if not exists public.sales_emi_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id uuid not null references public.sales_emi_contracts(id) on delete cascade,
  instalment_no integer not null check (instalment_no > 0),
  due_date date not null,
  principal_due numeric(18,2) not null default 0 check (principal_due >= 0),
  interest_due numeric(18,2) not null default 0 check (interest_due >= 0),
  fees_due numeric(18,2) not null default 0 check (fees_due >= 0),
  amount_due numeric(18,2) not null check (amount_due >= 0),
  amount_paid numeric(18,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'due' check (status in ('due','partial','paid','waived')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contract_id, instalment_no),
  check (amount_paid <= amount_due)
);

create table if not exists public.sales_emi_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id uuid not null references public.sales_emi_contracts(id) on delete restrict,
  receipt_reference text not null,
  payment_date date not null default current_date,
  amount numeric(18,2) not null check (amount > 0),
  method text not null default 'cash',
  source_receipt_id uuid,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  unique (user_id, receipt_reference)
);

create table if not exists public.sales_emi_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.sales_emi_payments(id) on delete cascade,
  schedule_id uuid not null references public.sales_emi_schedule(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, schedule_id)
);

create index if not exists sales_emi_contracts_user_status_due_idx
  on public.sales_emi_contracts(user_id, status, first_due_date);
create index if not exists sales_emi_schedule_user_due_idx
  on public.sales_emi_schedule(user_id, due_date, status);
create index if not exists sales_emi_schedule_contract_idx
  on public.sales_emi_schedule(contract_id, instalment_no);
create index if not exists sales_emi_payments_contract_idx
  on public.sales_emi_payments(contract_id, payment_date);

alter table public.sales_emi_contracts enable row level security;
alter table public.sales_emi_schedule enable row level security;
alter table public.sales_emi_payments enable row level security;
alter table public.sales_emi_payment_allocations enable row level security;

drop policy if exists sales_emi_contracts_owner on public.sales_emi_contracts;
create policy sales_emi_contracts_owner on public.sales_emi_contracts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists sales_emi_schedule_owner on public.sales_emi_schedule;
create policy sales_emi_schedule_owner on public.sales_emi_schedule
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists sales_emi_payments_owner on public.sales_emi_payments;
create policy sales_emi_payments_owner on public.sales_emi_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists sales_emi_allocations_owner on public.sales_emi_payment_allocations;
create policy sales_emi_allocations_owner on public.sales_emi_payment_allocations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Prevent cross-user references even when the caller knows a UUID.
create or replace function public.validate_sales_emi_relationships()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if tg_table_name = 'sales_emi_schedule' then
    if not exists (select 1 from sales_emi_contracts c where c.id = new.contract_id and c.user_id = new.user_id) then
      raise exception 'EMI schedule contract is not available to this user';
    end if;
  elsif tg_table_name = 'sales_emi_payments' then
    if not exists (select 1 from sales_emi_contracts c where c.id = new.contract_id and c.user_id = new.user_id) then
      raise exception 'EMI payment contract is not available to this user';
    end if;
  elsif tg_table_name = 'sales_emi_payment_allocations' then
    if not exists (select 1 from sales_emi_payments p where p.id = new.payment_id and p.user_id = new.user_id)
       or not exists (select 1 from sales_emi_schedule s where s.id = new.schedule_id and s.user_id = new.user_id) then
      raise exception 'EMI allocation references are not available to this user';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists sales_emi_schedule_relationship_guard on public.sales_emi_schedule;
create trigger sales_emi_schedule_relationship_guard before insert or update on public.sales_emi_schedule
for each row execute function public.validate_sales_emi_relationships();
drop trigger if exists sales_emi_payments_relationship_guard on public.sales_emi_payments;
create trigger sales_emi_payments_relationship_guard before insert or update on public.sales_emi_payments
for each row execute function public.validate_sales_emi_relationships();
drop trigger if exists sales_emi_allocations_relationship_guard on public.sales_emi_payment_allocations;
create trigger sales_emi_allocations_relationship_guard before insert or update on public.sales_emi_payment_allocations
for each row execute function public.validate_sales_emi_relationships();
