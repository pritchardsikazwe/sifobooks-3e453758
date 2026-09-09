-- Subledger vs GL reconciliation checks.
-- These checks are read-only and scoped to the authenticated user's records.
-- A non-zero difference is surfaced in the Accounting Control Centre.

create or replace function public.accounting_control_centre()
returns table (
  check_key text,
  check_name text,
  severity text,
  issue_count bigint,
  description text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ar_subledger numeric := 0;
  v_ar_gl numeric := 0;
  v_ap_subledger numeric := 0;
  v_ap_gl numeric := 0;
  v_inventory_subledger numeric := 0;
  v_inventory_gl numeric := 0;
  v_ar_diff numeric := 0;
  v_ap_diff numeric := 0;
  v_inventory_diff numeric := 0;
  v_inventory_mapped_count bigint := 0;
begin
  if v_user is null then
    return;
  end if;

  -- AR subledger: outstanding non-void customer invoices.
  select coalesce(sum(greatest(coalesce(i.balance_due,0),0)),0)
    into v_ar_subledger
  from public.invoices i
  where i.user_id = v_user
    and lower(coalesce(i.status,'')) not in ('void','voided','cancelled','canceled');

  -- AR control balance: debit-normal accounts whose name identifies receivables.
  select coalesce(sum(coalesce(jl.debit,0) - coalesce(jl.credit,0)),0)
    into v_ar_gl
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.entry_id
  join public.chart_of_accounts coa on coa.id = jl.account_id
  where jl.user_id = v_user
    and je.user_id = v_user
    and je.status = 'posted'
    and coa.user_id = v_user
    and (
      lower(coalesce(coa.account_name,'')) like '%accounts receivable%'
      or lower(coalesce(coa.account_name,'')) like '%trade receivable%'
      or lower(coalesce(coa.account_name,'')) like '%trade debtor%'
      or lower(coalesce(coa.account_name,'')) = 'receivables'
    );

  v_ar_diff := abs(v_ar_subledger - v_ar_gl);

  -- AP subledger: outstanding non-cancelled supplier bills.
  select coalesce(sum(greatest(coalesce(b.balance_due,0),0)),0)
    into v_ap_subledger
  from public.bills b
  where b.user_id = v_user
    and lower(coalesce(b.status,'')) not in ('void','voided','cancelled','canceled');

  -- AP control balance: credit-normal accounts whose name identifies payables.
  select coalesce(sum(coalesce(jl.credit,0) - coalesce(jl.debit,0)),0)
    into v_ap_gl
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.entry_id
  join public.chart_of_accounts coa on coa.id = jl.account_id
  where jl.user_id = v_user
    and je.user_id = v_user
    and je.status = 'posted'
    and coa.user_id = v_user
    and (
      lower(coalesce(coa.account_name,'')) like '%accounts payable%'
      or lower(coalesce(coa.account_name,'')) like '%trade payable%'
      or lower(coalesce(coa.account_name,'')) like '%trade creditor%'
      or lower(coalesce(coa.account_name,'')) = 'payables'
    );

  v_ap_diff := abs(v_ap_subledger - v_ap_gl);

  -- Inventory subledger: quantity on hand x current item cost, using each item's mapped inventory account.
  select count(*)::bigint, coalesce(sum(greatest(coalesce(si.quantity_on_hand,0),0) * greatest(coalesce(si.cost_price,0),0)),0)
    into v_inventory_mapped_count, v_inventory_subledger
  from public.stock_items si
  where si.user_id = v_user
    and si.inventory_account_id is not null;

  select coalesce(sum(coalesce(jl.debit,0) - coalesce(jl.credit,0)),0)
    into v_inventory_gl
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.entry_id
  where jl.user_id = v_user
    and je.user_id = v_user
    and je.status = 'posted'
    and jl.account_id in (
      select distinct si.inventory_account_id
      from public.stock_items si
      where si.user_id = v_user
        and si.inventory_account_id is not null
    );

  v_inventory_diff := abs(v_inventory_subledger - v_inventory_gl);

  return query
  with checks as (
    select 'unbalanced_postings'::text, 'Unbalanced posted journals'::text, 'critical'::text,
      count(*)::bigint,
      'Posted journals whose debit and credit totals do not agree.'::text
    from public.journal_entries je
    where je.status = 'posted'
      and je.user_id = v_user
      and abs(coalesce(je.total_debit,0) - coalesce(je.total_credit,0)) > 0.005
    union all
    select 'empty_postings','Posted journals without lines','critical',count(*),
      'Posted journals must contain at least one journal line.'
    from public.journal_entries je
    where je.status = 'posted'
      and je.user_id = v_user
      and not exists (select 1 from public.journal_lines jl where jl.entry_id = je.id)
    union all
    select 'draft_journals','Draft journals pending posting','warning',count(*),
      'Draft journals are excluded from the posted ledger and should be reviewed.'
    from public.journal_entries je
    where je.status = 'draft' and je.user_id = v_user
    union all
    select 'orphan_lines','Orphan journal lines','critical',count(*),
      'Journal lines whose parent journal entry cannot be found.'
    from public.journal_lines jl
    where jl.user_id = v_user
      and not exists (select 1 from public.journal_entries je where je.id = jl.entry_id)
    union all
    select 'unallocated_bank','Unallocated bank transactions','warning',count(*),
      'Imported bank transactions still require allocation or matching.'
    from public.bank_transactions bt
    where bt.user_id = v_user
      and coalesce(bt.status,'unallocated') in ('unallocated','partial')
    union all
    select 'unreconciled_bank','Unreconciled bank transactions','warning',count(*),
      'Posted/allocated bank activity has not completed reconciliation.'
    from public.bank_transactions bt
    where bt.user_id = v_user
      and coalesce(bt.status,'unallocated') not in ('reconciled','reversed')
    union all
    select 'ar_gl_reconciliation','Accounts Receivable vs GL','critical',
      case when v_ar_diff > 0.005 then 1 else 0 end,
      format('AR subledger %s; GL control %s; difference %s.', to_char(v_ar_subledger,'FM999999999990.00'), to_char(v_ar_gl,'FM999999999990.00'), to_char(v_ar_diff,'FM999999999990.00'))
    union all
    select 'ap_gl_reconciliation','Accounts Payable vs GL','critical',
      case when v_ap_diff > 0.005 then 1 else 0 end,
      format('AP subledger %s; GL control %s; difference %s.', to_char(v_ap_subledger,'FM999999999990.00'), to_char(v_ap_gl,'FM999999999990.00'), to_char(v_ap_diff,'FM999999999990.00'))
    union all
    select 'inventory_gl_reconciliation','Inventory vs GL','critical',
      case when v_inventory_mapped_count = 0 then 0 when v_inventory_diff > 0.005 then 1 else 0 end,
      case when v_inventory_mapped_count = 0
        then 'No inventory items are mapped to a GL inventory account; configure item-to-GL mappings before reconciliation.'
        else format('Inventory subledger %s; GL control %s; difference %s.', to_char(v_inventory_subledger,'FM999999999990.00'), to_char(v_inventory_gl,'FM999999999990.00'), to_char(v_inventory_diff,'FM999999999990.00'))
      end
  )
  select * from checks;
end;
$$;

grant execute on function public.accounting_control_centre() to authenticated;
