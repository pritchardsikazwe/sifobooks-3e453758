-- The posting engine creates a posted header and its lines in one transaction.
-- Protect edits/deletes to lines after posting without blocking that atomic insert.

DROP TRIGGER IF EXISTS trg_protect_posted_journal_line ON public.journal_lines;
CREATE TRIGGER trg_protect_posted_journal_line
BEFORE UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION public.protect_posted_journal_line();
