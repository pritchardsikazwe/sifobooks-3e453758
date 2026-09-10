ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'business_expense',
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_by uuid,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_transaction_type_check') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_transaction_type_check
      CHECK (transaction_type IN ('business_expense','supplier_expense','reimbursement'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_payment_status_check') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_payment_status_check
      CHECK (payment_status IN ('unpaid','partially_paid','paid','not_applicable'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_approval_status_check') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_approval_status_check
      CHECK (approval_status IN ('draft','submitted','approved','rejected'));
  END IF;
END $$;

-- Classify pre-existing records to match how they were actually recorded:
-- they were captured as directly-paid cash/bank/mobile business expenses.
UPDATE public.expenses
SET transaction_type = 'business_expense',
    payment_status = 'paid',
    amount_paid = total,
    approval_status = 'approved',
    posted_at = COALESCE(posted_at, created_at)
WHERE journal_entry_id IS NOT NULL
  AND amount_paid = 0
  AND payment_status = 'unpaid';

CREATE INDEX IF NOT EXISTS expenses_transaction_type_idx ON public.expenses(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS expenses_supplier_idx ON public.expenses(user_id, supplier_id);
CREATE INDEX IF NOT EXISTS expenses_bill_idx ON public.expenses(bill_id);