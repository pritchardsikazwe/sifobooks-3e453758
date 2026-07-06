
-- Voided status support on invoices & quotes
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.quotes  ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.quotes  ADD COLUMN IF NOT EXISTS void_reason text;

-- Credit Notes
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  currency text NOT NULL DEFAULT 'ZMW',
  reason text,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credit notes" ON public.credit_notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER credit_notes_touch BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_note_id uuid NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_note_items TO authenticated;
GRANT ALL ON public.credit_note_items TO service_role;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credit note items" ON public.credit_note_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Company members (multi-user per company with role)
DO $$ BEGIN
  CREATE TYPE public.company_role AS ENUM ('owner','admin','manager','staff','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  role public.company_role NOT NULL DEFAULT 'staff',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company AND user_id = _user AND role IN ('owner','admin')
  ) OR EXISTS (
    SELECT 1 FROM public.companies WHERE id = _company AND user_id = _user
  );
$$;

CREATE POLICY "members view own company members" ON public.company_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "company admins manage members" ON public.company_members FOR ALL
  USING (public.is_company_admin(company_id, auth.uid()))
  WITH CHECK (public.is_company_admin(company_id, auth.uid()));
CREATE TRIGGER company_members_touch BEFORE UPDATE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  max_users int NOT NULL DEFAULT 1,
  max_invoices int,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.subscription_plans FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'trialing',
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancel_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_subscriptions TO authenticated;
GRANT ALL ON public.company_subscriptions TO service_role;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company subscriptions" ON public.company_subscriptions FOR ALL
  USING (auth.uid() = user_id OR public.is_company_admin(company_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_company_admin(company_id, auth.uid()));
CREATE TRIGGER company_subscriptions_touch BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed baseline plans
INSERT INTO public.subscription_plans (code, name, price_monthly, currency, max_users, features, sort_order) VALUES
  ('free',       'Free',        0,    'ZMW', 1,  '["1 user","10 invoices/mo","Basic reports"]'::jsonb, 1),
  ('starter',    'Starter',     299,  'ZMW', 3,  '["3 users","Unlimited invoices","VAT & TPIN","Bank reconciliation"]'::jsonb, 2),
  ('business',   'Business',    799,  'ZMW', 10, '["10 users","Multi-warehouse","Payroll","Full reports","API access"]'::jsonb, 3),
  ('enterprise', 'Enterprise',  1999, 'ZMW', 100,'["Unlimited users","Multi-company","Priority support","Custom compliance"]'::jsonb, 4)
ON CONFLICT (code) DO NOTHING;
