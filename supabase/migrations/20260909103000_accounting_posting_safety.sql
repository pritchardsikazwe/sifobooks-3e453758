-- Prevent the generic Cash & Bank account from silently absorbing bank settlements.
alter table public.bill_payments
  add column if not exists bank_account_id uuid references public.bank_accounts(id);

create or replace function public.post_receipt(_receipt_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  _entry uuid;
  _bank uuid;
  _ar uuid;
  _ref text;
begin
  select * into r from receipts where id=_receipt_id;
  if not found or coalesce(r.amount,0)=0 then return null; end if;

  _ref := 'RCT:'||r.number;
  select id into _entry from journal_entries where user_id=r.user_id and reference=_ref;
  if _entry is not null then return _entry; end if;

  _ar := ensure_account(r.user_id,'1100','Accounts Receivable','asset');
  if lower(coalesce(r.method,'')) in ('bank','bank_transfer') and r.bank_account_id is not null then
    select gl_account_id into _bank
      from bank_accounts
     where id=r.bank_account_id and user_id=r.user_id and is_active=true;
    if _bank is null then
      raise exception 'Selected receipt bank account has no active GL mapping';
    end if;
  else
    _bank := ensure_account(r.user_id,'1000','Cash & Bank','asset');
  end if;

  insert into journal_entries(
    user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate
  ) values (
    r.user_id,'JE-'||r.number,r.receipt_date,_ref,'Customer receipt '||r.number,
    'posted',r.amount,r.amount,coalesce(r.currency,'ZMW'),coalesce(r.exchange_rate,1)
  ) returning id into _entry;

  insert into journal_lines(user_id,entry_id,account_id,debit,credit,description) values
    (r.user_id,_entry,_bank,r.amount,0,coalesce(r.method,'cash')||' receipt'),
    (r.user_id,_entry,_ar,0,r.amount,'Settle receivable');

  return _entry;
end $function$;

create or replace function public.post_bill_payment(_payment_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  p record;
  _entry uuid;
  _bank uuid;
  _ap uuid;
  _ref text;
  _bank_count int;
begin
  select * into p from bill_payments where id=_payment_id;
  if not found or coalesce(p.amount,0)=0 then return null; end if;

  _ref := 'PAY:'||p.id::text;
  select id into _entry from journal_entries where user_id=p.user_id and reference=_ref;
  if _entry is not null then return _entry; end if;

  _ap := ensure_account(p.user_id,'2100','Accounts Payable','liability');

  if lower(coalesce(p.payment_method,'')) in ('bank','bank_transfer') then
    if p.bank_account_id is not null then
      select gl_account_id into _bank
        from bank_accounts
       where id=p.bank_account_id and user_id=p.user_id and is_active=true;
      if _bank is null then
        raise exception 'Selected bank account has no active GL mapping';
      end if;
    else
      select count(*) into _bank_count
        from bank_accounts
       where user_id=p.user_id and is_active=true and cashbook_type='bank';
      if _bank_count<>1 then
        raise exception 'Bank payment requires a selected bank account';
      end if;
      select gl_account_id into _bank
        from bank_accounts
       where user_id=p.user_id and is_active=true and cashbook_type='bank'
       limit 1;
      if _bank is null then
        raise exception 'Bank account has no GL mapping';
      end if;
    end if;
  else
    _bank := ensure_account(p.user_id,'1000','Cash & Bank','asset');
  end if;

  insert into journal_entries(
    user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate
  ) values (
    p.user_id,'JE-PAY-'||substr(p.id::text,1,8),p.payment_date,_ref,
    'Bill payment '||coalesce(p.reference,''),'posted',p.amount,p.amount,
    coalesce(p.currency,'ZMW'),coalesce(p.exchange_rate,1)
  ) returning id into _entry;

  insert into journal_lines(user_id,entry_id,account_id,debit,credit,description) values
    (p.user_id,_entry,_ap,p.amount,0,'Settle payable'),
    (p.user_id,_entry,_bank,0,p.amount,coalesce(p.payment_method,'cash')||' payment');

  return _entry;
end $function$;
