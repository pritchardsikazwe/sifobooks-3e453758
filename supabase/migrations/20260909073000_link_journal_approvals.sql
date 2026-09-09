-- Integrate accounting journals with SifoBooks' existing approval_hierarchies /
-- approval_requests / approval_actions workflow instead of creating a second queue.

CREATE OR REPLACE FUNCTION public.submit_journal_for_approval(_entry_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_user uuid := auth.uid();
  e public.journal_entries%ROWTYPE;
  v_company uuid;
  v_max integer := 1;
  v_req uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO e FROM public.journal_entries WHERE id=_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry not found'; END IF;
  IF e.user_id <> v_user THEN RAISE EXCEPTION 'Only the journal creator can submit it'; END IF;
  IF e.status <> 'draft' THEN RAISE EXCEPTION 'Only draft journals can be submitted'; END IF;
  IF NOT e.approval_required THEN RAISE EXCEPTION 'Approval is not required for this journal'; END IF;

  SELECT c.id INTO v_company FROM public.companies c WHERE c.user_id=v_user LIMIT 1;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;

  SELECT COALESCE(MAX(h.level),1) INTO v_max
  FROM public.approval_hierarchies h
  WHERE h.module='journal'
    AND h.min_amount <= GREATEST(COALESCE(e.total_debit,0),COALESCE(e.total_credit,0))
    AND GREATEST(COALESCE(e.total_debit,0),COALESCE(e.total_credit,0)) <= COALESCE(h.max_amount,999999999999999);

  SELECT ar.id INTO v_req FROM public.approval_requests ar
  WHERE ar.reference_id=e.id::text AND ar.reference_type='journal' AND ar.status='pending' LIMIT 1;
  IF v_req IS NOT NULL THEN RETURN v_req; END IF;

  INSERT INTO public.approval_requests(
    user_id,company_id,module,reference_type,reference_id,reference_number,
    amount,currency,description,requested_by,status,current_level,max_level
  ) VALUES (
    v_user,v_company,'journal','journal',e.id::text,e.entry_number,
    COALESCE(e.total_debit,e.total_credit,0),'ZMW',e.description,v_user,'pending',1,v_max
  ) RETURNING id INTO v_req;

  UPDATE public.journal_entries
  SET approval_status='pending',submitted_at=now(),submitted_by=v_user,approval_reason=NULL
  WHERE id=e.id;
  RETURN v_req;
END;
$$;

grant execute on function public.submit_journal_for_approval(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.sync_journal_approval_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_entry uuid;
BEGIN
  IF NEW.reference_type='journal' AND NEW.reference_id IS NOT NULL THEN
    BEGIN v_entry := NEW.reference_id::uuid; EXCEPTION WHEN others THEN v_entry := NULL; END;
    IF v_entry IS NOT NULL THEN
      UPDATE public.journal_entries
      SET approval_status = CASE
        WHEN NEW.status='approved' THEN 'approved'
        WHEN NEW.status='rejected' THEN 'rejected'
        WHEN NEW.status='cancelled' THEN 'rejected'
        ELSE 'pending' END,
        approved_at = CASE WHEN NEW.status IN ('approved','rejected','cancelled') THEN COALESCE(NEW.decided_at,now()) ELSE approved_at END,
        approved_by = CASE WHEN NEW.status IN ('approved','rejected','cancelled') THEN NEW.decided_by ELSE approved_by END,
        approval_reason = CASE WHEN NEW.status IN ('approved','rejected','cancelled') THEN NEW.decision_notes ELSE approval_reason END
      WHERE id=v_entry AND approval_required=true;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_journal_approval_request ON public.approval_requests;
CREATE TRIGGER trg_sync_journal_approval_request
AFTER INSERT OR UPDATE OF status,current_level,decided_by,decided_at,decision_notes
ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_journal_approval_request();
