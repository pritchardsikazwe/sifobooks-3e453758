
-- Ensure auto-posting triggers exist (previous migration created functions but triggers weren't installed)
DROP TRIGGER IF EXISTS bills_auto_post ON public.bills;
CREATE TRIGGER bills_auto_post AFTER INSERT ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_bill();

DROP TRIGGER IF EXISTS receipts_auto_post ON public.receipts;
CREATE TRIGGER receipts_auto_post AFTER INSERT ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_receipt();

DROP TRIGGER IF EXISTS expenses_auto_post ON public.expenses;
CREATE TRIGGER expenses_auto_post AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_expense();

-- Auto-post bill_payments to GL (DR AP / CR Bank) - was missing
CREATE OR REPLACE FUNCTION public.post_bill_payment(_payment_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; _entry uuid; _bank uuid; _ap uuid; _ref text;
BEGIN
  SELECT * INTO p FROM bill_payments WHERE id=_payment_id;
  IF NOT FOUND OR COALESCE(p.amount,0)=0 THEN RETURN NULL; END IF;
  _ref := 'PAY:'||p.id::text;
  SELECT id INTO _entry FROM journal_entries WHERE user_id=p.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;
  _bank := ensure_account(p.user_id,'1000','Cash & Bank','asset');
  _ap := ensure_account(p.user_id,'2100','Accounts Payable','liability');
  INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
  VALUES (p.user_id, 'JE-PAY-'||substr(p.id::text,1,8), p.payment_date, _ref,
          'Bill payment '||COALESCE(p.reference,''), 'posted', p.amount, p.amount)
  RETURNING id INTO _entry;
  INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
    (p.user_id, _entry, _ap, p.amount, 0, 'Settle payable'),
    (p.user_id, _entry, _bank, 0, p.amount, COALESCE(p.method,'bank')||' payment');
  RETURN _entry;
END $$;

CREATE OR REPLACE FUNCTION public.trg_post_bill_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM post_bill_payment(NEW.id); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS bill_payments_auto_post ON public.bill_payments;
CREATE TRIGGER bill_payments_auto_post AFTER INSERT ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_bill_payment();

-- Account balance view: opening + movements + closing per COA row for signed-in user
CREATE OR REPLACE VIEW public.account_balances AS
SELECT
  a.user_id,
  a.id AS account_id,
  a.account_code,
  a.account_name,
  a.account_type,
  COALESCE(SUM(jl.debit),0)  AS total_debit,
  COALESCE(SUM(jl.credit),0) AS total_credit,
  CASE
    WHEN a.account_type IN ('asset','expense','cogs')
      THEN COALESCE(SUM(jl.debit),0) - COALESCE(SUM(jl.credit),0)
    ELSE COALESCE(SUM(jl.credit),0) - COALESCE(SUM(jl.debit),0)
  END AS balance,
  COUNT(jl.id) AS entry_count
FROM public.chart_of_accounts a
LEFT JOIN public.journal_lines jl ON jl.account_id = a.id
LEFT JOIN public.journal_entries je ON je.id = jl.entry_id AND je.status='posted'
GROUP BY a.user_id, a.id, a.account_code, a.account_name, a.account_type;

GRANT SELECT ON public.account_balances TO authenticated;

GRANT EXECUTE ON FUNCTION public.post_bill_payment(uuid) TO authenticated;
