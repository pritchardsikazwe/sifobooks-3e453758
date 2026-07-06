
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  balance NUMERIC(14,2),
  reference TEXT,
  category TEXT,
  matched_invoice TEXT,
  source_file TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank txns select" ON public.bank_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own bank txns insert" ON public.bank_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bank txns update" ON public.bank_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bank txns delete" ON public.bank_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX bank_txns_user_date_idx ON public.bank_transactions(user_id, txn_date DESC);

CREATE TABLE public.compliance_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  obligation_type TEXT NOT NULL,
  period TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  amount NUMERIC(14,2),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_obligations TO authenticated;
GRANT ALL ON public.compliance_obligations TO service_role;
ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own oblig select" ON public.compliance_obligations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own oblig insert" ON public.compliance_obligations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own oblig update" ON public.compliance_obligations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own oblig delete" ON public.compliance_obligations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX oblig_user_due_idx ON public.compliance_obligations(user_id, due_date);

CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compliance_obligations_updated_at BEFORE UPDATE ON public.compliance_obligations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
