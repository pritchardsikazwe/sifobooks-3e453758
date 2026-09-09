-- Payroll-to-GL reconciliation coverage.
-- A payroll run marked paid must have a corresponding posted payroll journal.

create or replace function public.accounting_payroll_reconciliation()
returns table (
  check_key text,
  check_name text,
  severity text,
  issue_count bigint,
  description text
)
language sql
security definer
set search_path = public
as $$
  select
    'payroll_gl_reconciliation'::text,
    'Payroll vs GL posting coverage'::text,
    'critical'::text,
    count(*)::bigint,
    case when count(*) = 0
      then 'All paid payroll runs have a corresponding payroll journal in the posted ledger.'::text
      else format('%s paid payroll run(s) have no matching payroll journal (reference PR:<run number>).', count(*))::text
    end
  from public.payroll_runs pr
  where pr.user_id = auth.uid()
    and lower(coalesce(pr.status,'')) in ('paid','posted','completed')
    and not exists (
      select 1
      from public.journal_entries je
      where je.user_id = pr.user_id
        and je.reference = 'PR:' || pr.run_number
        and je.status = 'posted'
    );
$$;

grant execute on function public.accounting_payroll_reconciliation() to authenticated;
