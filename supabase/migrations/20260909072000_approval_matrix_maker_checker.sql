-- SifoBooks maker-checker controls for accounting journals.
-- Approval is opt-in per journal so existing automated module postings remain compatible.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_reason text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='journal_entries_approval_status_check') THEN
    ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_approval_status_check
      CHECK (approval_status IN ('not_required','pending','approved','rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS journal_entries_approval_idx
  ON public.journal_entries(user_id,approval_required,approval_status,submitted_at DESC);

CREATE OR REPLACE FUNCTION public.submit_journal_for_approval(_entry_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_user uuid := auth.uid(); v_entry public.journal_entries%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO v_entry FROM public.journal_entries WHERE id=_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry not found'; END IF;
  IF v_entry.user_id <> v_user THEN RAISE EXCEPTION 'Only the journal creator can submit it'; END IF;
  IF v_entry.status <> 'draft' THEN RAISE EXCEPTION 'Only draft journals can be submitted'; END IF;
  IF NOT v_entry.approval_required THEN RAISE EXCEPTION 'Approval is not required for this journal'; END IF;
  IF v_entry.approval_status = 'pending' THEN RETURN; END IF;
  UPDATE public.journal_entries SET approval_status='pending',submitted_at=now(),submitted_by=v_user,approval_reason=NULL WHERE id=_entry_id;
END;
$$;

grant execute on function public.submit_journal_for_approval(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.approve_journal_entry(_entry_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_user uuid := auth.uid(); v_entry public.journal_entries%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'Decision must be approve or reject'; END IF;
  SELECT * INTO v_entry FROM public.journal_entries WHERE id=_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry not found'; END IF;
  IF NOT public.user_has_company_access(v_entry.company_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF v_entry.status <> 'draft' THEN RAISE EXCEPTION 'Only draft journals can be approved'; END IF;
  IF NOT v_entry.approval_required OR v_entry.approval_status <> 'pending' THEN RAISE EXCEPTION 'Journal is not awaiting approval'; END IF;
  IF v_entry.submitted_by = v_user THEN RAISE EXCEPTION 'Maker-checker control: the submitter cannot approve their own journal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.user_id=v_user AND COALESCE(sm.is_active,true)=true) THEN
    -- Owners/super-admins may approve; ordinary staff must have accounting.manage.
    IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=v_user AND ur.role IN ('owner','super_admin','admin','accountant')) THEN
      RAISE EXCEPTION 'Approval requires an authorised accounting approver';
    END IF;
  END IF;
  IF _decision='approve' THEN
    UPDATE public.journal_entries SET approval_status='approved',approved_at=now(),approved_by=v_user,approval_reason=_reason WHERE id=_entry_id;
  ELSE
    UPDATE public.journal_entries SET approval_status='rejected',approved_at=now(),approved_by=v_user,approval_reason=coalesce(_reason,'Rejected by approver') WHERE id=_entry_id;
  END IF;
END;
$$;

grant execute on function public.approve_journal_entry(uuid,text,text) to authenticated;

-- Posting gate: approval-required journals cannot be posted until approved.
CREATE OR REPLACE FUNCTION public.guard_journal_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status='posted' AND COALESCE(NEW.approval_required,false) AND COALESCE(NEW.approval_status,'not_required') <> 'approved' THEN
    RAISE EXCEPTION 'Journal requires approval before posting';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_journal_approval ON public.journal_entries;
CREATE TRIGGER trg_guard_journal_approval
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_journal_approval();

CREATE OR REPLACE FUNCTION public.approval_queue()
RETURNS TABLE(id uuid,entry_number text,entry_date date,reference text,description text,total_debit numeric,total_credit numeric,submitted_at timestamptz,submitted_by uuid,approval_status text)
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  SELECT e.id,e.entry_number,e.entry_date,e.reference,e.description,e.total_debit,e.total_credit,e.submitted_at,e.submitted_by,e.approval_status
  FROM public.journal_entries e
  WHERE e.approval_required=true AND e.approval_status='pending'
    AND public.user_has_company_access(e.company_id)
    AND (e.submitted_by IS DISTINCT FROM auth.uid())
  ORDER BY e.submitted_at ASC;
$$;

grant execute on function public.approval_queue() to authenticated;
