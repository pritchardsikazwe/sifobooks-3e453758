-- SifoBooks SaaS subscription foundation
-- Provider-neutral: payment integrations can populate provider fields later.
-- Non-destructive: existing companies default to an active Full subscription.

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan text not null check (plan in ('starter','standard','full')),
  status text not null default 'active' check (status in ('trialing','active','past_due','cancelled','expired')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  currency text not null default 'ZMW',
  amount numeric(14,2) not null default 0,
  trial_start_at timestamptz,
  trial_end_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);

create index if not exists company_subscriptions_company_id_idx
  on public.company_subscriptions(company_id);
create index if not exists company_subscriptions_status_idx
  on public.company_subscriptions(status);

create or replace function public.set_company_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_subscriptions_updated_at on public.company_subscriptions;
create trigger company_subscriptions_updated_at
before update on public.company_subscriptions
for each row execute function public.set_company_subscription_updated_at();

-- Seed existing companies as Full so introducing billing never removes access.
insert into public.company_subscriptions (
  company_id, plan, status, billing_cycle, currency, amount,
  current_period_start, current_period_end
)
select
  c.id,
  'full',
  'active',
  'annual',
  coalesce(nullif(c.currency, ''), 'ZMW'),
  0,
  now(),
  now() + interval '100 years'
from public.companies c
where not exists (
  select 1 from public.company_subscriptions s where s.company_id = c.id
);

alter table public.company_subscriptions enable row level security;

-- Access is restricted to members of the company through the existing company-membership model.
-- Policies intentionally use the application's existing company access function when available.
-- If the project uses a different membership helper, these policies should be aligned before production deployment.

drop policy if exists "company subscriptions select" on public.company_subscriptions;
drop policy if exists "company subscriptions insert" on public.company_subscriptions;
drop policy if exists "company subscriptions update" on public.company_subscriptions;

create policy "company subscriptions select"
on public.company_subscriptions
for select
using (public.user_has_company_access(company_id));

create policy "company subscriptions insert"
on public.company_subscriptions
for insert
with check (public.user_has_company_access(company_id));

create policy "company subscriptions update"
on public.company_subscriptions
for update
using (public.user_has_company_access(company_id))
with check (public.user_has_company_access(company_id));
