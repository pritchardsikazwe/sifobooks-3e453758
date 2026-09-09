create table if not exists public.posting_failures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_module text not null default 'unknown',
  source_type text,
  source_id uuid,
  source_reference text,
  operation text not null default 'post',
  error_code text,
  error_message text not null,
  payload jsonb,
  status text not null default 'open' check (status in ('open','retrying','resolved','ignored')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posting_failures_company_status_idx on public.posting_failures(company_id,status,created_at desc);
create index if not exists posting_failures_source_idx on public.posting_failures(source_module,source_id);

alter table public.posting_failures enable row level security;

drop policy if exists posting_failures_select on public.posting_failures;
create policy posting_failures_select on public.posting_failures for select to authenticated using (public.user_has_company_access(company_id));

drop policy if exists posting_failures_insert on public.posting_failures;
create policy posting_failures_insert on public.posting_failures for insert to authenticated with check (public.user_has_company_access(company_id) and user_id = auth.uid());

drop policy if exists posting_failures_update on public.posting_failures;
create policy posting_failures_update on public.posting_failures for update to authenticated using (public.user_has_company_access(company_id)) with check (public.user_has_company_access(company_id));

create or replace function public.log_posting_failure(
  _company_id uuid,
  _source_module text,
  _source_type text,
  _source_id uuid,
  _source_reference text,
  _operation text,
  _error_code text,
  _error_message text,
  _payload jsonb default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.user_has_company_access(_company_id) then raise exception 'Not authorized'; end if;
  insert into public.posting_failures(company_id,user_id,source_module,source_type,source_id,source_reference,operation,error_code,error_message,payload)
  values (_company_id,auth.uid(),coalesce(_source_module,'unknown'),_source_type,_source_id,_source_reference,coalesce(_operation,'post'),_error_code,coalesce(_error_message,'Unknown posting error'),_payload)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_posting_failure(uuid,text,text,uuid,text,text,text,text,jsonb) to authenticated;

create or replace function public.posting_failure_queue()
returns table(id uuid,source_module text,source_type text,source_reference text,operation text,error_code text,error_message text,status text,attempts integer,last_attempt_at timestamptz,created_at timestamptz)
language sql security definer set search_path=public
as $$
  select pf.id,pf.source_module,pf.source_type,pf.source_reference,pf.operation,pf.error_code,pf.error_message,pf.status,pf.attempts,pf.last_attempt_at,pf.created_at
  from public.posting_failures pf
  where public.user_has_company_access(pf.company_id)
    and pf.status in ('open','retrying')
  order by pf.created_at desc;
$$;

grant execute on function public.posting_failure_queue() to authenticated;
