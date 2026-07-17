
-- ============ SCHOOL GRANTS & FUNDS MODULE ============

-- 1. Grants
CREATE TABLE public.school_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  grant_name text NOT NULL,
  grant_ref text,
  source text NOT NULL DEFAULT 'ministry',
  funding_institution text,
  approved_amount numeric(14,2) NOT NULL DEFAULT 0,
  received_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'ZMW',
  date_received date,
  quarter text,
  fiscal_year int,
  purpose text,
  bank_account_id uuid,
  status text NOT NULL DEFAULT 'pending',
  attachment_url text,
  journal_entry_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_grants TO authenticated;
GRANT ALL ON public.school_grants TO service_role;
ALTER TABLE public.school_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own grants" ON public.school_grants FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 2. Teaching Materials Requests
CREATE TABLE public.teaching_material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_no text NOT NULL,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'classroom', -- classroom | equipment
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  estimated_cost numeric(14,2) NOT NULL DEFAULT 0,
  actual_cost numeric(14,2),
  requested_by text,
  approved_by text,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|purchased|received|rejected
  supplier_id uuid,
  grant_id uuid REFERENCES public.school_grants(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teaching_material_requests TO authenticated;
GRANT ALL ON public.teaching_material_requests TO service_role;
ALTER TABLE public.teaching_material_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tm" ON public.teaching_material_requests FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 3. Supplier Quotations (3-quote compare)
CREATE TABLE public.supplier_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id uuid REFERENCES public.teaching_material_requests(id) ON DELETE CASCADE,
  supplier_id uuid,
  supplier_name text NOT NULL,
  quoted_amount numeric(14,2) NOT NULL DEFAULT 0,
  quote_date date DEFAULT CURRENT_DATE,
  is_selected boolean NOT NULL DEFAULT false,
  attachment_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_quotations TO authenticated;
GRANT ALL ON public.supplier_quotations TO service_role;
ALTER TABLE public.supplier_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quotes" ON public.supplier_quotations FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 4. Workshops
CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workshop_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  venue text,
  participants_count int DEFAULT 0,
  budget numeric(14,2) NOT NULL DEFAULT 0,
  actual_spent numeric(14,2) NOT NULL DEFAULT 0,
  grant_id uuid REFERENCES public.school_grants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshops TO authenticated;
GRANT ALL ON public.workshops TO service_role;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ws" ON public.workshops FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 5. Allowance payments per workshop
CREATE TABLE public.workshop_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  role text, -- facilitator|participant|coordinator
  allowance_type text, -- transport|accommodation|lunch|facilitation|sitting
  amount numeric(14,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  paid_date date,
  payment_method text,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_allowances TO authenticated;
GRANT ALL ON public.workshop_allowances TO service_role;
ALTER TABLE public.workshop_allowances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own al" ON public.workshop_allowances FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 6. Imprest Register
CREATE TABLE public.imprest_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  imprest_no text NOT NULL,
  officer_name text NOT NULL,
  purpose text,
  amount_issued numeric(14,2) NOT NULL DEFAULT 0,
  amount_spent numeric(14,2) NOT NULL DEFAULT 0,
  amount_returned numeric(14,2) NOT NULL DEFAULT 0,
  date_issued date NOT NULL DEFAULT CURRENT_DATE,
  retirement_date date,
  status text NOT NULL DEFAULT 'issued', -- issued|retired|overdue
  receipt_url text,
  bank_account_id uuid,
  journal_entry_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imprest_register TO authenticated;
GRANT ALL ON public.imprest_register TO service_role;
ALTER TABLE public.imprest_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own imp" ON public.imprest_register FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 7. Tuckshop transactions
CREATE TABLE public.tuckshop_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  txn_type text NOT NULL, -- sale|purchase|expense
  description text,
  quantity numeric DEFAULT 1,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash',
  journal_entry_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tuckshop_transactions TO authenticated;
GRANT ALL ON public.tuckshop_transactions TO service_role;
ALTER TABLE public.tuckshop_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tuck" ON public.tuckshop_transactions FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- updated_at trigger
CREATE TRIGGER trg_grants_updated BEFORE UPDATE ON public.school_grants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tm_updated BEFORE UPDATE ON public.teaching_material_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ws_updated BEFORE UPDATE ON public.workshops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_imp_updated BEFORE UPDATE ON public.imprest_register FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-POSTING FUNCTIONS ============

-- Grant received -> DR Bank, CR Grant Income
CREATE OR REPLACE FUNCTION public.post_school_grant(_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g record; _entry uuid; _bank uuid; _inc uuid; _ref text;
BEGIN
  SELECT * INTO g FROM school_grants WHERE id=_id;
  IF NOT FOUND OR COALESCE(g.received_amount,0)=0 THEN RETURN NULL; END IF;
  _ref := 'GRANT:'||COALESCE(g.grant_ref, g.id::text);
  SELECT id INTO _entry FROM journal_entries WHERE user_id=g.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;
  _bank := ensure_account(g.user_id,'1000','Cash & Bank','asset');
  _inc  := ensure_account(g.user_id,'4200','Grant Income','revenue');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (g.user_id,'JE-GR-'||substr(g.id::text,1,8),COALESCE(g.date_received,CURRENT_DATE),_ref,
          'Grant received: '||g.grant_name,'posted',g.received_amount,g.received_amount)
  RETURNING id INTO _entry;
  INSERT INTO journal_lines(user_id,entry_id,account_id,debit,credit,description) VALUES
    (g.user_id,_entry,_bank,g.received_amount,0,'Bank inflow'),
    (g.user_id,_entry,_inc,0,g.received_amount,'Grant income');
  UPDATE school_grants SET journal_entry_id=_entry, status='received' WHERE id=g.id;
  RETURN _entry;
END $$;

-- Imprest issued -> DR Imprest (asset), CR Bank
CREATE OR REPLACE FUNCTION public.post_imprest(_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i record; _entry uuid; _bank uuid; _imp uuid; _ref text;
BEGIN
  SELECT * INTO i FROM imprest_register WHERE id=_id;
  IF NOT FOUND OR COALESCE(i.amount_issued,0)=0 THEN RETURN NULL; END IF;
  _ref := 'IMP:'||i.imprest_no;
  SELECT id INTO _entry FROM journal_entries WHERE user_id=i.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;
  _bank := ensure_account(i.user_id,'1000','Cash & Bank','asset');
  _imp  := ensure_account(i.user_id,'1200','Imprest / Advances','asset');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (i.user_id,'JE-IMP-'||substr(i.id::text,1,8),i.date_issued,_ref,
          'Imprest issued to '||i.officer_name,'posted',i.amount_issued,i.amount_issued)
  RETURNING id INTO _entry;
  INSERT INTO journal_lines(user_id,entry_id,account_id,debit,credit,description) VALUES
    (i.user_id,_entry,_imp,i.amount_issued,0,'Imprest advance'),
    (i.user_id,_entry,_bank,0,i.amount_issued,'Bank outflow');
  UPDATE imprest_register SET journal_entry_id=_entry WHERE id=i.id;
  RETURN _entry;
END $$;

-- Allowance paid -> DR Workshop Expense, CR Bank
CREATE OR REPLACE FUNCTION public.post_allowance(_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a record; _entry uuid; _bank uuid; _exp uuid; _ref text;
BEGIN
  SELECT * INTO a FROM workshop_allowances WHERE id=_id;
  IF NOT FOUND OR COALESCE(a.amount,0)=0 OR NOT a.paid THEN RETURN NULL; END IF;
  _ref := 'ALW:'||a.id::text;
  SELECT id INTO _entry FROM journal_entries WHERE user_id=a.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;
  _bank := ensure_account(a.user_id,'1000','Cash & Bank','asset');
  _exp  := ensure_account(a.user_id,'5300','Workshops & Allowances','expense');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (a.user_id,'JE-ALW-'||substr(a.id::text,1,8),COALESCE(a.paid_date,CURRENT_DATE),_ref,
          'Allowance: '||a.recipient_name||COALESCE(' ('||a.allowance_type||')',''),'posted',a.amount,a.amount)
  RETURNING id INTO _entry;
  INSERT INTO journal_lines(user_id,entry_id,account_id,debit,credit,description) VALUES
    (a.user_id,_entry,_exp,a.amount,0,'Allowance expense'),
    (a.user_id,_entry,_bank,0,a.amount,COALESCE(a.payment_method,'bank'));
  UPDATE workshop_allowances SET journal_entry_id=_entry WHERE id=a.id;
  UPDATE workshops SET actual_spent = COALESCE(actual_spent,0)+a.amount WHERE id=a.workshop_id;
  RETURN _entry;
END $$;

-- Tuckshop -> DR Bank / CR Sales (for sale) or DR Tuckshop Expense / CR Bank (for purchase/expense)
CREATE OR REPLACE FUNCTION public.post_tuckshop(_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t record; _entry uuid; _bank uuid; _sales uuid; _exp uuid; _ref text;
BEGIN
  SELECT * INTO t FROM tuckshop_transactions WHERE id=_id;
  IF NOT FOUND OR COALESCE(t.amount,0)=0 THEN RETURN NULL; END IF;
  _ref := 'TUCK:'||t.id::text;
  SELECT id INTO _entry FROM journal_entries WHERE user_id=t.user_id AND reference=_ref;
  IF _entry IS NOT NULL THEN RETURN _entry; END IF;
  _bank  := ensure_account(t.user_id,'1000','Cash & Bank','asset');
  _sales := ensure_account(t.user_id,'4300','Tuckshop Sales','revenue');
  _exp   := ensure_account(t.user_id,'5400','Tuckshop Purchases','expense');
  INSERT INTO journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (t.user_id,'JE-TCK-'||substr(t.id::text,1,8),t.txn_date,_ref,
          'Tuckshop '||t.txn_type||COALESCE(' - '||t.description,''),'posted',t.amount,t.amount)
  RETURNING id INTO _entry;
  IF t.txn_type = 'sale' THEN
    INSERT INTO journal_lines(user_id,entry_id,account_id,debit,credit,description) VALUES
      (t.user_id,_entry,_bank,t.amount,0,'Cash from sale'),
      (t.user_id,_entry,_sales,0,t.amount,'Tuckshop sale');
  ELSE
    INSERT INTO journal_lines(user_id,entry_id,account_id,debit,credit,description) VALUES
      (t.user_id,_entry,_exp,t.amount,0,'Tuckshop cost'),
      (t.user_id,_entry,_bank,0,t.amount,'Cash paid');
  END IF;
  UPDATE tuckshop_transactions SET journal_entry_id=_entry WHERE id=t.id;
  RETURN _entry;
END $$;

-- Triggers to auto-post
CREATE OR REPLACE FUNCTION public.trg_post_grant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF COALESCE(NEW.received_amount,0)>0 THEN PERFORM post_school_grant(NEW.id); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_grants_post AFTER INSERT OR UPDATE OF received_amount ON public.school_grants
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_grant();

CREATE OR REPLACE FUNCTION public.trg_post_imprest() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM post_imprest(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER trg_imprest_post AFTER INSERT ON public.imprest_register
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_imprest();

CREATE OR REPLACE FUNCTION public.trg_post_allowance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NEW.paid THEN PERFORM post_allowance(NEW.id); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_allowance_post AFTER INSERT OR UPDATE OF paid ON public.workshop_allowances
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_allowance();

CREATE OR REPLACE FUNCTION public.trg_post_tuckshop() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM post_tuckshop(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER trg_tuckshop_post AFTER INSERT ON public.tuckshop_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_post_tuckshop();
