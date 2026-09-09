-- Posted ledger protection.
-- Financially posted journals are immutable; corrections must use the audited reversal workflow.

CREATE OR REPLACE FUNCTION public.protect_posted_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Posted journal entries cannot be deleted. Reverse the entry instead.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    IF NEW.entry_number IS DISTINCT FROM OLD.entry_number
       OR NEW.entry_date IS DISTINCT FROM OLD.entry_date
       OR NEW.reference IS DISTINCT FROM OLD.reference
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.total_debit IS DISTINCT FROM OLD.total_debit
       OR NEW.total_credit IS DISTINCT FROM OLD.total_credit
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.status IS DISTINCT FROM OLD.status THEN
      -- The reversal routine may mark the original entry as reversed; that is
      -- an allowed audit-state transition, but its accounting content remains frozen.
      IF NEW.status = 'reversed'
         AND NEW.entry_number IS NOT DISTINCT FROM OLD.entry_number
         AND NEW.entry_date IS NOT DISTINCT FROM OLD.entry_date
         AND NEW.reference IS NOT DISTINCT FROM OLD.reference
         AND NEW.description IS NOT DISTINCT FROM OLD.description
         AND NEW.total_debit IS NOT DISTINCT FROM OLD.total_debit
         AND NEW.total_credit IS NOT DISTINCT FROM OLD.total_credit
         AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
         AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Posted journal entries are immutable. Use reversal/correction workflow.';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_posted_journal_entry ON public.journal_entries;
CREATE TRIGGER trg_protect_posted_journal_entry
BEFORE UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_posted_journal_entry();

CREATE OR REPLACE FUNCTION public.protect_posted_journal_line()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status text;
BEGIN
  SELECT status INTO parent_status
  FROM public.journal_entries
  WHERE id = COALESCE(OLD.entry_id, NEW.entry_id);

  IF parent_status = 'posted' THEN
    RAISE EXCEPTION 'Journal lines belonging to a posted journal are immutable. Reverse the journal instead.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_posted_journal_line ON public.journal_lines;
CREATE TRIGGER trg_protect_posted_journal_line
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION public.protect_posted_journal_line();
