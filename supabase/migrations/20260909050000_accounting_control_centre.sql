-- Accounting Control Centre: read-only diagnostics for accounting integrity.
-- All checks are scoped to the authenticated user's company through user_has_company_access.

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
begin
  return query
  with checks as (
    select 'unbalanced_postings'::text, 'Unbalanced posted journals'::text, 'critical'::text,
      count(*)::bigint,
      'Posted journals whose debit and credit totals do not agree.'::text
    from public.journal_entries je
    where je.status = 'posted'
      and exists (select 1 from public.companies c where c.id = je.company_id and public.user_has_company_access(c.id))
      and abs(coalesce(je.total_debit,0) - coalesce(je.total_credit,0)) > 0.005
    union all
    select 'empty_postings','Posted journals without lines','critical',count(*),
      'Posted journals must contain at least one journal line.'
    from public.journal_entries je
    where je.status = 'posted'
      and exists (select 1 from public.companies c where c.id = je.company_id and public.user_has_company_access(c.id))
      and not exists (select 1 from public.journal_lines jl where jl.entry_id = je.id)
    union all
    select 'draft_journals','Draft journals pending posting','warning',count(*),
      'Draft journals are excluded from the posted ledger and should be reviewed.'
    from public.journal_entries je
    where je.status = 'draft'
      and exists (select 1 from public.companies c where c.id = je.company_id and public.user_has_company_access(c.id))
    union all
    select 'orphan_lines','Orphan journal lines','critical',count(*),
      'Journal lines whose parent journal entry cannot be found.'
    from public.journal_lines jl
    where not exists (select 1 from public.journal_entries je where je.id = jl.entry_id)
      and public.user_has_company_access(jl.company_id)
    union all
    select 'unallocated_bank','Unallocated bank transactions','warning',count(*),
      'Imported bank transactions still require allocation or matching.'
    from public.bank_transactions bt
    where coalesce(bt.status,'unallocated') in ('unallocated','partial')
      and public.user_has_company_access(bt.company_id)
    union all
    select 'unreconciled_bank','Unreconciled bank transactions','warning',count(*),
      'Posted/allocated bank activity has not completed reconciliation.'
    from public.bank_transactions bt
    where coalesce(bt.status,'unallocated') not in ('reconciled','reversed')
      and public.user_has_company_access(bt.company_id)
  )
  select * from checks;
end;
$$;

grant execute on function public.accounting_control_centre() to authenticated;
