
CREATE OR REPLACE FUNCTION public.rebuild_ledgers_for(_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record; _bills int := 0; _rcts int := 0; _exps int := 0; _pays int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'user required'; END IF;

  FOR r IN SELECT b.id FROM bills b
           WHERE b.user_id=_uid
             AND NOT EXISTS (SELECT 1 FROM journal_entries j WHERE j.user_id=_uid AND j.reference='BILL:'||b.bill_number)
  LOOP PERFORM post_bill(r.id); _bills:=_bills+1; END LOOP;

  FOR r IN SELECT rc.id FROM receipts rc
           WHERE rc.user_id=_uid
             AND NOT EXISTS (SELECT 1 FROM journal_entries j WHERE j.user_id=_uid AND j.reference='RCT:'||rc.number)
  LOOP PERFORM post_receipt(r.id); _rcts:=_rcts+1; END LOOP;

  FOR r IN SELECT e.id FROM expenses e
           WHERE e.user_id=_uid AND e.journal_entry_id IS NULL
  LOOP PERFORM post_expense(r.id); _exps:=_exps+1; END LOOP;

  FOR r IN SELECT p.id FROM bill_payments p
           WHERE p.user_id=_uid
             AND NOT EXISTS (SELECT 1 FROM journal_entries j WHERE j.user_id=_uid AND j.reference='PAY:'||p.id::text)
  LOOP PERFORM post_bill_payment(r.id); _pays:=_pays+1; END LOOP;

  RETURN jsonb_build_object(
    'user_id',_uid,'bills_posted',_bills,'receipts_posted',_rcts,
    'expenses_posted',_exps,'payments_posted',_pays
  );
END $$;

GRANT EXECUTE ON FUNCTION public.rebuild_ledgers_for(uuid) TO authenticated, service_role;

-- Run now for Design Links Engineering Ltd owner
SELECT public.rebuild_ledgers_for('dd585c9c-563b-4529-bbb4-b80a6f33d61d'::uuid);
