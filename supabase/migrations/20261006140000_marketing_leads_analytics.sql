create table if not exists public.site_visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null unique,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  landing_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  country text,
  device_type text,
  user_agent text,
  language text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  event_name text not null,
  page_path text,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  industry text,
  interest text,
  source text,
  landing_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default 'new' check (status in ('new','contacted','qualified','won','lost')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_visitors_last_seen_idx on public.site_visitors(last_seen desc);
create index if not exists site_events_created_at_idx on public.site_events(created_at desc);
create index if not exists site_events_event_target_idx on public.site_events(event_name,target);
create index if not exists sales_leads_created_at_idx on public.sales_leads(created_at desc);
create index if not exists sales_leads_status_idx on public.sales_leads(status);

alter table public.site_visitors enable row level security;
alter table public.site_events enable row level security;
alter table public.sales_leads enable row level security;

drop policy if exists "public can create visitor profile" on public.site_visitors;
create policy "public can create visitor profile" on public.site_visitors
for insert to anon, authenticated with check (true);

drop policy if exists "public can update visitor profile" on public.site_visitors;
create policy "public can update visitor profile" on public.site_visitors
for update to anon, authenticated using (visitor_id is not null) with check (visitor_id is not null);

drop policy if exists "public can create site events" on public.site_events;
create policy "public can create site events" on public.site_events
for insert to anon, authenticated with check (visitor_id is not null and length(visitor_id) between 8 and 128);

drop policy if exists "public can create sales leads" on public.sales_leads;
create policy "public can create sales leads" on public.sales_leads
for insert to anon, authenticated
with check (length(trim(name)) between 2 and 120 and length(trim(email)) between 5 and 254);

drop policy if exists "super admins can read visitors" on public.site_visitors;
create policy "super admins can read visitors" on public.site_visitors
for select to authenticated using (has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "super admins can read site events" on public.site_events;
create policy "super admins can read site events" on public.site_events
for select to authenticated using (has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "super admins can read sales leads" on public.sales_leads;
create policy "super admins can read sales leads" on public.sales_leads
for select to authenticated using (has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "super admins can update sales leads" on public.sales_leads;
create policy "super admins can update sales leads" on public.sales_leads
for update to authenticated using (has_role(auth.uid(), 'super_admin'::app_role))
with check (has_role(auth.uid(), 'super_admin'::app_role));

grant insert, update on public.site_visitors to anon, authenticated;
grant insert on public.site_events to anon, authenticated;
grant insert on public.sales_leads to anon, authenticated;
grant select on public.site_visitors, public.site_events, public.sales_leads to authenticated;
grant update on public.sales_leads to authenticated;
