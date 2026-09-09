CREATE OR REPLACE FUNCTION public.post_bank_allocation_atomic(
  _user_id uuid,
  _bank_txn_id uuid,
  _account_id uuid,
  _amount numeric,
  _memo text DEFAULT NULL,
  _target_type text DEFAULT 'account',
  _target_id uuid DEFAULT NULL,
  _target_ref text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  txn record;
  bank_id uuid;
  remaining numeric(18,2);
  amt numeric(18,2);
  ref text;
  entry_id uuid;
  allocation_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO txn FROM public.bank_transactions WHERE id=_bank_txn_id AND user_id=_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank transaction not found'; END IF;
  SELECT id INTO bank_id FROM public.chart_of_accounts WHERE user_id=_user_id AND account_code='1000' AND is_active=true LIMIT 1;
  IF bank_id IS NULL THEN RAISE EXCEPTION 'Cash & Bank GL account is missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE id=_account_id AND user_id=_user_id AND is_active=true) THEN RAISE EXCEPTION 'Invalid allocation account'; END IF;

  SELECT greatest(0, abs(txn.amount) - coalesce(sum(amount),0)) INTO remaining
  FROM public.bank_allocations WHERE bank_txn_id=txn.id AND is_reversed=false;
  amt := round(coalesce(_amount, remaining),2);
  IF amt <= 0 THEN RAISE EXCEPTION 'Nothing left to allocate'; END IF;
  IF amt > remaining + 0.005 THEN RAISE EXCEPTION 'Amount exceeds remaining %', remaining; END IF;

  ref := 'BANK:' || left(txn.id::text,8) || ':' || substr(md5(clock_timestamp()::text || random()::text),1,8);
  IF txn.amount > 0 THEN
    SELECT public.post_journal_entry(_user_id, 'JE-'||ref, txn.txn_date, ref, coalesce(_memo,txn.description,'Bank receipt'),
      jsonb_build_array(jsonb_build_object('account_id',bank_id,'debit',amt,'credit',0,'description','Bank inflow'),
                        jsonb_build_object('account_id',_account_id,'debit',0,'credit',amt,'description',coalesce(_memo,'Allocation')))) INTO entry_id;
  ELSE
    SELECT public.post_journal_entry(_user_id, 'JE-'||ref, txn.txn_date, ref, coalesce(_memo,txn.description,'Bank payment'),
      jsonb_build_array(jsonb_build_object('account_id',_account_id,'debit',amt,'credit',0,'description',coalesce(_memo,'Allocation')),
                        jsonb_build_object('account_id',bank_id,'debit',0,'credit',amt,'description','Bank outflow'))) INTO entry_id;
  END IF;

  INSERT INTO public.bank_allocations(user_id,bank_txn_id,target_type,target_id,target_ref,amount,memo,reference,journal_entry_id,allocated_by)
  VALUES(_user_id,txn.id,coalesce(_target_type,'account'),_target_id,_target_ref,amt,_memo,ref,entry_id,_user_id)
  RETURNING id INTO allocation_id;

  RETURN jsonb_build_object('entryId',entry_id,'allocationId',allocation_id,'amount',amt,'remaining',round(remaining-amt,2));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.post_bank_allocation_atomic(uuid,uuid,uuid,numeric,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_bank_allocation_atomic(uuid,uuid,uuid,numeric,text,text,uuid,text) TO authenticated, service_role;
