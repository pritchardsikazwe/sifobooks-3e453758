-- Offline/manual subscription payment requests
create table if not exists public.subscription_payment_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.company_subscriptions(id) on delete set null,
  requested_plan text not null check (requested_plan in ('starter','standard','full')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'ZMW',
  payment_method text not null check (payment_method in ('bank_transfer','mtn_momo','airtel_money','cash','other')),
  reference text not null,
  payment_date date not null,
  proof_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','needs_info')),
  customer_notes text,
  admin_notes text,
  submitted_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_payment_requests_company_idx
  on public.subscription_payment_requests(company_id);
create index if not exists subscription_payment_requests_status_idx
  on public.subscription_payment_requests(status);
create index if not exists subscription_payment_requests_reference_idx
  on public.subscription_payment_requests(reference);

create or replace function public.set_subscription_payment_request_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists subscription_payment_requests_updated_at on public.subscription_payment_requests;
create trigger subscription_payment_requests_updated_at
before update on public.subscription_payment_requests
for each row execute function public.set_subscription_payment_request_updated_at();

alter table public.subscription_payment_requests enable row level security;

drop policy if exists "payment requests select" on public.subscription_payment_requests;
drop policy if exists "payment requests insert" on public.subscription_payment_requests;
drop policy if exists "payment requests update" on public.subscription_payment_requests;

create policy "payment requests select"
on public.subscription_payment_requests for select
using (public.user_has_company_access(company_id));

create policy "payment requests insert"
on public.subscription_payment_requests for insert
with check (public.user_has_company_access(company_id) and (submitted_by = auth.uid() or submitted_by is null));

create policy "payment requests update"
on public.subscription_payment_requests for update
using (public.user_has_company_access(company_id))
with check (public.user_has_company_access(company_id));

-- Verification is intentionally performed through the application's privileged admin workflow.
-- Do not grant customer-facing code permission to turn a payment request into an active subscription.