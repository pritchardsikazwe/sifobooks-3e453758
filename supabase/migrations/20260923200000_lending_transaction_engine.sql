-- SifoBooks Lending transactional engine — 2026
-- Atomic disbursement, repayment allocation, schedules and mobile-money matching.
create extension if not exists pgcrypto;

create table if not exists public.lending_accounting_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  source_type text not null,
  source_id uuid not null,
  reference text not null,
  entry_date date not null default current_date,
  description text not null,
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  status text not null default 'posted',
  created_at timestamptz not null default now()
);
create unique index if not exists lending_accounting_source_uq
  on public.lending_accounting_entries(user_id, source_type, source_id);
create table if not exists public.lending_accounting_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lending_accounting_entries(id) on delete cascade,
  user_id uuid not null,
  account_code text not null,
  account_name text not null,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lending_accounting_lines_entry_idx on public.lending_accounting_lines(entry_id);

create table if not exists public.lending_sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null,
  client_ref text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  retry_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);
create index if not exists lending_sync_queue_user_status_idx
  on public.lending_sync_queue(user_id,status,created_at);

alter table public.lending_accounting_entries enable row level security;
alter table public.lending_accounting_lines enable row level security;
alter table public.lending_sync_queue enable row level security;
create policy lending_accounting_entries_owner on public.lending_accounting_entries for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy lending_accounting_lines_owner on public.lending_accounting_lines for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy lending_sync_queue_owner on public.lending_sync_queue for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

create or replace function public.lending_approve_application(_application_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare a record; b record;
begin
  select * into a from lending_applications where id=_application_id and user_id=auth.uid() for update;
  if not found then raise exception 'Application not found'; end if;
  if a.status not in ('pending','under_review','assessed') then raise exception 'Application is not awaiting approval'; end if;
  select * into b from lending_borrowers where id=a.borrower_id and user_id=auth.uid();
  if not found then raise exception 'Borrower not found'; end if;
  if coalesce(b.kyc_status,'pending') <> 'verified' then
    raise exception 'Borrower KYC must be verified before approval';
  end if;
  update lending_applications set status='approved', approved_at=now() where id=a.id;
  insert into lending_audit_log(user_id,company_id,entity_type,entity_id,action,old_value,new_value)
  values(auth.uid(),a.company_id,'loan_application',a.id,'approved',jsonb_build_object('status',a.status),jsonb_build_object('status','approved'));
  return jsonb_build_object('application_id',a.id,'status','approved');
end $$;

create or replace function public.lending_disburse_application(
  _application_id uuid, _method text default 'cash', _disbursement_date date default current_date
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  a record; p record; existing uuid; loan_id uuid; loan_no text;
  principal numeric(18,2); rate numeric(12,4); total_interest numeric(18,2);
  fee numeric(18,2); total_payable numeric(18,2); inst numeric(18,2);
  i integer; due date; pp numeric(18,2); ip numeric(18,2); amt numeric(18,2); allocated_p numeric(18,2):=0; allocated_i numeric(18,2):=0;
  entry_id uuid;
begin
  select * into a from lending_applications where id=_application_id and user_id=auth.uid() for update;
  if not found then raise exception 'Application not found'; end if;
  if a.status <> 'approved' then raise exception 'Application must be approved before disbursement'; end if;
  select id into existing from lending_loans where application_id=a.id and user_id=auth.uid() limit 1;
  if existing is not null then return jsonb_build_object('loan_id',existing,'status','already_disbursed'); end if;

  select * into p from lending_loan_products where id=a.product_id and user_id=auth.uid();
  principal := a.amount_requested;
  rate := coalesce(p.interest_rate,0);
  fee := round(principal * coalesce(p.processing_fee_rate,0) / 100,2);
  if lower(coalesce(p.interest_method,'reducing_balance'))='flat' then
    total_interest := round(principal * rate / 100 * a.term / 12,2);
  else
    if rate=0 then total_interest:=0;
    else total_interest := round((ceil(principal * (rate/1200) * power(1+rate/1200,a.term) / nullif(power(1+rate/1200,a.term)-1,0))*a.term-principal),2);
    end if;
  end if;
  total_interest := greatest(0,total_interest);
  total_payable := principal + total_interest + fee;
  loan_no := 'LN-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS');
  insert into lending_loans(user_id,company_id,loan_no,borrower_id,application_id,product_id,principal,interest_amount,fees_amount,total_payable,balance,term,repayment_frequency,interest_method,status,disbursement_method,disbursed_at,maturity_date)
  values(auth.uid(),a.company_id,loan_no,a.borrower_id,a.id,a.product_id,principal,total_interest,fee,total_payable,total_payable,a.term,coalesce(p.repayment_frequency,'monthly'),coalesce(p.interest_method,'reducing_balance'),'active',_method,_disbursement_date,_disbursement_date + make_interval(months=>a.term))
  returning id into loan_id;

  for i in 1..a.term loop
    due := case lower(coalesce(p.repayment_frequency,'monthly'))
      when 'weekly' then _disbursement_date + make_interval(days=>7*i)
      when 'biweekly' then _disbursement_date + make_interval(days=>14*i)
      when 'daily' then _disbursement_date + make_interval(days=>i)
      else _disbursement_date + make_interval(months=>i)
    end;
    pp := round(principal/a.term,2);
    ip := round(total_interest/a.term,2);
    if i=a.term then
      pp := principal-allocated_p;
      ip := total_interest-allocated_i;
    end if;
    allocated_p := allocated_p + pp;
    allocated_i := allocated_i + ip;
    amt := pp+ip+(case when i=1 then fee else 0 end);
    insert into lending_loan_schedules(user_id,loan_id,installment_no,due_date,principal_due,interest_due,fees_due,amount_due)
    values(auth.uid(),loan_id,i,due,pp,ip,case when i=1 then fee else 0 end,amt);
  end loop;

  insert into lending_accounting_entries(user_id,company_id,source_type,source_id,reference,description,total_debit,total_credit)
  values(auth.uid(),a.company_id,'disbursement',loan_id,loan_no,'Loan disbursement',principal,principal)
  returning id into entry_id;
  insert into lending_accounting_lines(entry_id,user_id,account_code,account_name,debit,credit) values
    (entry_id,auth.uid(),'1300','Loans Receivable',principal,0),
    (entry_id,auth.uid(),case when lower(_method) in ('bank','bank_transfer') then '1100' else '1000' end,case when lower(_method) in ('bank','bank_transfer') then 'Bank' else 'Cash' end,0,principal);
  update lending_applications set status='disbursed' where id=a.id;
  insert into lending_audit_log(user_id,company_id,entity_type,entity_id,action,new_value)
  values(auth.uid(),a.company_id,'loan',loan_id,'disbursed',jsonb_build_object('method',_method,'amount',principal));
  insert into lending_sync_queue(user_id,entity_type,entity_id,operation,client_ref,payload)
  values(auth.uid(),'loan',loan_id,'upsert',loan_no,jsonb_build_object('loan_no',loan_no,'amount',principal));

  return jsonb_build_object('loan_id',loan_id,'loan_no',loan_no,'total_payable',total_payable);
end $$;

create or replace function public.lending_post_repayment(
  _loan_id uuid, _amount numeric, _method text default 'cash', _reference text default null,
  _payment_date date default current_date, _client_ref text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare l record; r_id uuid; receipt text; remaining numeric; pp numeric:=0; ii numeric:=0; ff numeric:=0; pen numeric:=0;
  entry_id uuid; sched record; alloc numeric; total_balance numeric;
begin
  if _amount <= 0 then raise exception 'Repayment amount must be greater than zero'; end if;
  select * into l from lending_loans where id=_loan_id and user_id=auth.uid() for update;
  if not found then raise exception 'Loan not found'; end if;
  if l.status='settled' then raise exception 'Loan is already settled'; end if;
  if _amount > l.balance + 0.01 then raise exception 'Payment exceeds outstanding balance'; end if;
  if _client_ref is not null then
    select id into r_id from lending_repayments where user_id=auth.uid() and reference=_client_ref limit 1;
    if r_id is not null then return jsonb_build_object('repayment_id',r_id,'status','already_posted'); end if;
  end if;
  remaining := _amount;
  for sched in select * from lending_loan_schedules where loan_id=l.id and user_id=auth.uid() and amount_due>amount_paid order by due_date,installment_no for update loop
    alloc := least(remaining,greatest(0,sched.penalty_due-sched.amount_paid));
    pen := pen+alloc; remaining:=remaining-alloc;
    alloc := least(remaining,greatest(0,sched.fees_due-greatest(0,sched.amount_paid-sched.penalty_due)));
    ff := ff+alloc; remaining:=remaining-alloc;
    alloc := least(remaining,greatest(0,sched.interest_due-greatest(0,sched.amount_paid-sched.penalty_due-sched.fees_due)));
    ii := ii+alloc; remaining:=remaining-alloc;
    alloc := least(remaining,greatest(0,sched.principal_due-greatest(0,sched.amount_paid-sched.penalty_due-sched.fees_due-sched.interest_due)));
    pp := pp+alloc; remaining:=remaining-alloc;
    update lending_loan_schedules set amount_paid=least(amount_due,amount_paid+(_amount-remaining)), status=case when amount_paid+(_amount-remaining)>=amount_due then 'paid' else 'partial' end where id=sched.id;
    exit when remaining<=0;
  end loop;
  if remaining>0.01 then raise exception 'Payment allocation could not be completed'; end if;
  receipt := 'RCP-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS');
  insert into lending_repayments(user_id,company_id,receipt_no,loan_id,borrower_id,amount,principal_amount,interest_amount,fees_amount,penalty_amount,method,reference,payment_date,status)
  values(auth.uid(),l.company_id,receipt,l.id,l.borrower_id,_amount,pp,ii,ff,pen,_method,_reference,_payment_date,'posted') returning id into r_id;
  total_balance := greatest(0,l.balance-_amount);
  update lending_loans set principal_paid=principal_paid+pp,interest_paid=interest_paid+ii,fees_paid=fees_paid+ff,penalty_paid=penalty_paid+pen,balance=total_balance,status=case when total_balance<=0.01 then 'settled' else 'active' end where id=l.id;

  insert into lending_accounting_entries(user_id,company_id,source_type,source_id,reference,description,total_debit,total_credit)
  values(auth.uid(),l.company_id,'repayment',r_id,receipt,'Loan repayment',_amount,_amount) returning id into entry_id;
  insert into lending_accounting_lines(entry_id,user_id,account_code,account_name,debit,credit) values
    (entry_id,auth.uid(),case when lower(_method) in ('bank','bank_transfer') or lower(_method) like '%money%' then '1100' else '1000' end,case when lower(_method) in ('bank','bank_transfer') or lower(_method) like '%money%' then 'Bank / Mobile Money' else 'Cash' end,_amount,0),
    (entry_id,auth.uid(),'1300','Loans Receivable',0,pp),
    (entry_id,auth.uid(),'4100','Interest Income',0,ii),
    (entry_id,auth.uid(),'4200','Lending Fee Income',0,ff),
    (entry_id,auth.uid(),'4300','Penalty Income',0,pen);
  update lending_accounting_entries set total_debit=_amount,total_credit=pp+ii+ff+pen where id=entry_id;
  insert into lending_audit_log(user_id,company_id,entity_type,entity_id,action,new_value)
  values(auth.uid(),l.company_id,'repayment',r_id,'posted',jsonb_build_object('amount',_amount,'principal',pp,'interest',ii,'fees',ff,'penalty',pen));
  insert into lending_sync_queue(user_id,entity_type,entity_id,operation,client_ref,payload)
  values(auth.uid(),'repayment',r_id,'upsert',coalesce(_client_ref,receipt),jsonb_build_object('receipt_no',receipt,'loan_id',l.id,'amount',_amount));
  return jsonb_build_object('repayment_id',r_id,'receipt_no',receipt,'principal',pp,'interest',ii,'fees',ff,'penalty',pen,'balance',total_balance);
end $$;

create or replace function public.lending_match_mobile_money(_mobile_id uuid, _loan_id uuid, _client_ref text default null)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare m record; result jsonb;
begin
  select * into m from lending_mobile_money where id=_mobile_id and user_id=auth.uid() for update;
  if not found then raise exception 'Mobile-money transaction not found'; end if;
  if m.status='matched' then return jsonb_build_object('status','already_matched','repayment_id',m.repayment_id); end if;
  if _loan_id is null then raise exception 'Loan is required'; end if;
  result := lending_post_repayment(_loan_id,m.amount,m.provider,m.transaction_ref,m.transaction_date::date,coalesce(_client_ref,m.transaction_ref));
  update lending_mobile_money set status='matched',loan_id=_loan_id,repayment_id=(result->>'repayment_id')::uuid where id=m.id;
  insert into lending_audit_log(user_id,company_id,entity_type,entity_id,action,new_value)
  values(auth.uid(),m.company_id,'mobile_money',m.id,'matched',jsonb_build_object('loan_id',_loan_id,'amount',m.amount));
  return result || jsonb_build_object('mobile_money_id',m.id);
end $$;

create or replace function public.lending_enqueue_sync(_entity_type text,_entity_id uuid,_operation text,_client_ref text,_payload jsonb)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare id uuid;
begin
  insert into lending_sync_queue(user_id,entity_type,entity_id,operation,client_ref,payload)
  values(auth.uid(),_entity_type,_entity_id,_operation,_client_ref,coalesce(_payload,'{}'::jsonb))
  returning lending_sync_queue.id into id;
  return id;
end $$;
