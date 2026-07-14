
-- ============================================================
-- Ensure account helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_account(_uid uuid, _code text, _name text, _type text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM chart_of_accounts WHERE user_id=_uid AND account_code=_code;
  IF _id IS NULL THEN
    INSERT INTO chart_of_accounts(user_id, account_code, account_name, account_type, is_active)
    VALUES (_uid, _code, _name, _type, true) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END $$;

-- ============================================================
-- Post a bill
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_bill(_bill_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  b record; _entry uuid; _ap uuid; _vat uuid; _cos uuid; _ref text;
  _sub numeric; _vat_amt numeric; _tot numeric;
BEGIN
  SELECT * INTO b FROM bills WHERE id=_bill_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  _ref := 'BILL:'||b.bill_number;
  SELECT id INTO _entry FROM journal_entries WHERE user_id=b.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;

  _sub := COALESCE(b.subtotal,0); _vat_amt := COALESCE(b.tax_amount,0); _tot := COALESCE(b.total,0);
  IF _tot = 0 THEN _tot := _sub + _vat_amt; END IF;
  IF _tot = 0 THEN RETURN NULL; END IF;

  _ap  := ensure_account(b.user_id,'2100','Accounts Payable','liability');
  _vat := ensure_account(b.user_id,'2210','VAT Input','asset');
  _cos := ensure_account(b.user_id,'5000','Cost of Sales','expense');

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (b.user_id, 'JE-'||b.bill_number, b.bill_date, _ref,
          'Purchase bill '||b.bill_number, 'posted', _tot, _tot)
  RETURNING id INTO _entry;

  INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
  VALUES
    (b.user_id, _entry, _cos, _sub, 0, 'Purchases'),
    (b.user_id, _entry, _ap, 0, _tot, 'Trade payable');
  IF _vat_amt > 0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (b.user_id, _entry, _vat, _vat_amt, 0, 'VAT input');
  END IF;
  RETURN _entry;
END $$;

-- ============================================================
-- Post a receipt (customer payment against invoice)
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_receipt(_receipt_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; _entry uuid; _bank uuid; _ar uuid; _ref text;
BEGIN
  SELECT * INTO r FROM receipts WHERE id=_receipt_id;
  IF NOT FOUND OR COALESCE(r.amount,0)=0 THEN RETURN NULL; END IF;
  _ref := 'RCT:'||r.number;
  SELECT id INTO _entry FROM journal_entries WHERE user_id=r.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;

  _bank := ensure_account(r.user_id,'1000','Cash & Bank','asset');
  _ar   := ensure_account(r.user_id,'1100','Accounts Receivable','asset');

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (r.user_id, 'JE-'||r.number, r.receipt_date, _ref,
          'Customer receipt '||r.number, 'posted', r.amount, r.amount)
  RETURNING id INTO _entry;

  INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
    (r.user_id, _entry, _bank, r.amount, 0, COALESCE(r.method,'cash')||' receipt'),
    (r.user_id, _entry, _ar, 0, r.amount, 'Settle receivable');
  RETURN _entry;
END $$;

-- ============================================================
-- Post an expense (safety net)
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_expense(_expense_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e record; _entry uuid; _bank uuid; _cash uuid; _exp uuid; _vat uuid; _ap uuid; _ref text; _tot numeric; _credit uuid;
BEGIN
  SELECT * INTO e FROM expenses WHERE id=_expense_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  _tot := COALESCE(e.total, COALESCE(e.amount,0)+COALESCE(e.vat_amount,0));
  IF _tot=0 THEN RETURN NULL; END IF;
  _ref := 'EXP:'||COALESCE(e.expense_number, e.id::text);
  SELECT id INTO _entry FROM journal_entries WHERE user_id=e.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;

  _bank := ensure_account(e.user_id,'1000','Cash & Bank','asset');
  _vat  := ensure_account(e.user_id,'2210','VAT Input','asset');
  _ap   := ensure_account(e.user_id,'2100','Accounts Payable','liability');
  _exp  := COALESCE(e.expense_account_id, ensure_account(e.user_id,'5100','General Expense','expense'));
  _credit := CASE WHEN e.payment_method='credit' THEN _ap ELSE _bank END;

  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (e.user_id, 'JE-'||COALESCE(e.expense_number, substr(e.id::text,1,8)), e.expense_date, _ref,
          'Expense '||COALESCE(e.category,'general'), 'posted', _tot, _tot)
  RETURNING id INTO _entry;

  INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
    (e.user_id, _entry, _exp, COALESCE(e.amount,0), 0, COALESCE(e.notes,'Expense')),
    (e.user_id, _entry, _credit, 0, _tot, 'Payment');
  IF COALESCE(e.vat_amount,0)>0 THEN
    INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description)
    VALUES (e.user_id, _entry, _vat, e.vat_amount, 0, 'VAT input');
  END IF;
  UPDATE expenses SET journal_entry_id=_entry WHERE id=e.id AND journal_entry_id IS NULL;
  RETURN _entry;
END $$;

-- ============================================================
-- Triggers: auto-post on insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_post_bill() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM post_bill(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS bills_auto_post ON bills;
CREATE TRIGGER bills_auto_post AFTER INSERT ON bills FOR EACH ROW EXECUTE FUNCTION trg_post_bill();

CREATE OR REPLACE FUNCTION public.trg_post_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM post_receipt(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS receipts_auto_post ON receipts;
CREATE TRIGGER receipts_auto_post AFTER INSERT ON receipts FOR EACH ROW EXECUTE FUNCTION trg_post_receipt();

CREATE OR REPLACE FUNCTION public.trg_post_expense() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM post_expense(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS expenses_auto_post ON expenses;
CREATE TRIGGER expenses_auto_post AFTER INSERT ON expenses FOR EACH ROW EXECUTE FUNCTION trg_post_expense();

-- ============================================================
-- Rebuild ledgers backfill (current user)
-- ============================================================
CREATE OR REPLACE FUNCTION public.rebuild_ledgers()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); r record;
  _bills int := 0; _rcts int := 0; _exps int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;

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

  RETURN jsonb_build_object('bills_posted',_bills,'receipts_posted',_rcts,'expenses_posted',_exps);
END $$;

-- ============================================================
-- Auto-match bank transactions to invoices / bills
-- Inflows -> invoice receipt; Outflows -> bill payment.
-- Match: same user, amount equal within 0.01, date within +/- 5 days,
-- open (balance_due > 0). If multiple candidates, take closest by date.
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_match_bank_transactions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  bt record; inv record; bl record;
  _bank uuid; _ar uuid; _ap uuid; _entry uuid;
  _matched_inv int := 0; _matched_bill int := 0;
  _amt numeric; _rcpt_id uuid; _pay_id uuid; _rcpt_no text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  _bank := ensure_account(_uid,'1000','Cash & Bank','asset');
  _ar   := ensure_account(_uid,'1100','Accounts Receivable','asset');
  _ap   := ensure_account(_uid,'2100','Accounts Payable','liability');

  FOR bt IN
    SELECT * FROM bank_transactions
    WHERE user_id=_uid AND NOT COALESCE(reconciled,false)
    ORDER BY txn_date
  LOOP
    _amt := abs(bt.amount);
    IF _amt=0 THEN CONTINUE; END IF;

    IF bt.amount > 0 THEN
      -- inflow -> match invoice
      SELECT * INTO inv FROM invoices
      WHERE user_id=_uid AND COALESCE(balance_due,total)>0
        AND abs(COALESCE(balance_due,total) - _amt) < 0.01
        AND abs(issue_date - bt.txn_date) <= 15
      ORDER BY abs(issue_date - bt.txn_date) LIMIT 1;
      IF FOUND THEN
        _rcpt_no := 'AUTO-'||substr(bt.id::text,1,8);
        INSERT INTO receipts(user_id, customer_id, invoice_id, number, receipt_date, amount, method, reference, notes)
        VALUES (_uid, inv.customer_id, inv.id, _rcpt_no, bt.txn_date, _amt, 'bank', bt.reference,
                'Auto-matched from bank statement')
        RETURNING id INTO _rcpt_id;
        UPDATE bank_transactions SET reconciled=true, matched_type='receipt', matched_id=_rcpt_id,
          reconciled_at=now() WHERE id=bt.id;
        _matched_inv := _matched_inv+1;
      END IF;
    ELSE
      -- outflow -> match bill
      SELECT * INTO bl FROM bills
      WHERE user_id=_uid AND COALESCE(balance_due,total)>0
        AND abs(COALESCE(balance_due,total) - _amt) < 0.01
        AND abs(bill_date - bt.txn_date) <= 15
      ORDER BY abs(bill_date - bt.txn_date) LIMIT 1;
      IF FOUND THEN
        INSERT INTO bill_payments(user_id, bill_id, payment_date, amount, method, reference, notes)
        VALUES (_uid, bl.id, bt.txn_date, _amt, 'bank', bt.reference, 'Auto-matched from bank statement')
        RETURNING id INTO _pay_id;
        UPDATE bills SET amount_paid = COALESCE(amount_paid,0)+_amt,
          balance_due = GREATEST(COALESCE(total,0) - (COALESCE(amount_paid,0)+_amt),0),
          status = CASE WHEN COALESCE(total,0) - (COALESCE(amount_paid,0)+_amt) <= 0.01 THEN 'paid' ELSE 'partial' END
          WHERE id=bl.id;
        -- Journal for the payment
        INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
        VALUES (_uid, 'JE-PAY-'||substr(_pay_id::text,1,8), bt.txn_date, 'PAY:'||_pay_id::text,
                'Payment of bill '||bl.bill_number, 'posted', _amt, _amt)
        RETURNING id INTO _entry;
        INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
          (_uid, _entry, _ap, _amt, 0, 'Settle payable'),
          (_uid, _entry, _bank, 0, _amt, 'Bank outflow');
        UPDATE bank_transactions SET reconciled=true, matched_type='bill_payment', matched_id=_pay_id,
          reconciled_at=now() WHERE id=bt.id;
        _matched_bill := _matched_bill+1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('invoice_matches',_matched_inv,'bill_matches',_matched_bill);
END $$;

GRANT EXECUTE ON FUNCTION public.rebuild_ledgers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_match_bank_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_bill(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_expense(uuid) TO authenticated;
