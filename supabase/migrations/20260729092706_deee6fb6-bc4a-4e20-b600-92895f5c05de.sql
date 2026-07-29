
-- 1. School grants: Ministry taxonomy
ALTER TABLE public.school_grants
  ADD COLUMN IF NOT EXISTS programme_code text,
  ADD COLUMN IF NOT EXISTS programme_name text,
  ADD COLUMN IF NOT EXISTS sub_programme_code text,
  ADD COLUMN IF NOT EXISTS sub_programme_name text,
  ADD COLUMN IF NOT EXISTS charge_code text,
  ADD COLUMN IF NOT EXISTS allocation_percentage numeric,
  ADD COLUMN IF NOT EXISTS allocation_source text,
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- 2. Budgets: Ministry taxonomy + quarter/company
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS programme_code text,
  ADD COLUMN IF NOT EXISTS programme_name text,
  ADD COLUMN IF NOT EXISTS sub_programme_code text,
  ADD COLUMN IF NOT EXISTS sub_programme_name text,
  ADD COLUMN IF NOT EXISTS charge_code text,
  ADD COLUMN IF NOT EXISTS quarter text,
  ADD COLUMN IF NOT EXISTS allocation_percentage numeric,
  ADD COLUMN IF NOT EXISTS funding_source text,
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- 3. MoE Programmes catalogue (shared reference)
CREATE TABLE IF NOT EXISTS public.moe_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_code text NOT NULL,
  programme_name text NOT NULL,
  sub_programme_code text NOT NULL,
  sub_programme_name text NOT NULL,
  school_level text NOT NULL,   -- 'primary' | 'secondary' | 'management'
  default_percentage numeric,   -- e.g. 0.30, 0.60
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_level, sub_programme_code)
);
GRANT SELECT ON public.moe_programmes TO authenticated;
GRANT SELECT ON public.moe_programmes TO anon;
GRANT ALL ON public.moe_programmes TO service_role;
ALTER TABLE public.moe_programmes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moe_programmes_read" ON public.moe_programmes;
CREATE POLICY "moe_programmes_read" ON public.moe_programmes FOR SELECT USING (true);

-- 4. MoE Charge codes catalogue (shared reference)
CREATE TABLE IF NOT EXISTS public.moe_charge_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_code text NOT NULL UNIQUE,
  description text NOT NULL,
  code_type text NOT NULL,      -- 'income' | 'expense'
  suggested_account_code text,  -- COA account code
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moe_charge_codes TO authenticated;
GRANT SELECT ON public.moe_charge_codes TO anon;
GRANT ALL ON public.moe_charge_codes TO service_role;
ALTER TABLE public.moe_charge_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moe_charge_codes_read" ON public.moe_charge_codes;
CREATE POLICY "moe_charge_codes_read" ON public.moe_charge_codes FOR SELECT USING (true);

-- 5. Seed Programmes (Secondary + Primary + Management)
INSERT INTO public.moe_programmes (school_level, programme_code, programme_name, sub_programme_code, sub_programme_name, default_percentage) VALUES
  ('secondary','5503','Secondary Education','3001','Secondary Education Provision',0),
  ('secondary','5503','Secondary Education','3002','Teacher Education and Specialized Services',0.10),
  ('secondary','5503','Secondary Education','3003','Curriculum and Materials Development',0.30),
  ('secondary','5503','Secondary Education','3003C','Co-curricular',0.25),
  ('secondary','5503','Secondary Education','3004','Educational Standards, Assessment and Evaluation',0.15),
  ('secondary','5503','Secondary Education','3005','Open and Distance Learning',0.05),
  ('secondary','5503','Secondary Education','3006','Infrastructure Development',0.15),
  ('primary','5501','Primary Education','1001','Primary Education Provision',0),
  ('primary','5501','Primary Education','3002','Teacher Education and Specialized Services',0.15),
  ('primary','5501','Primary Education','3003','Curriculum and Materials Development',0.25),
  ('primary','5501','Primary Education','3003C','Co-curricular',0.25),
  ('primary','5501','Primary Education','3004','Educational Standards, Assessment and Evaluation',0.15),
  ('primary','5501','Primary Education','3005','Open and Distance Learning',0.05),
  ('primary','5501','Primary Education','3006','Infrastructure Development',0.15),
  ('management','5599','Management and Other Support Services','9001','Executive Office Management',0),
  ('management','5599','Management and Other Support Services','9002','Human Resources and Administration',0.60),
  ('management','5599','Management and Other Support Services','9003','Financial Management - Accounting',0.10),
  ('management','5599','Management and Other Support Services','9005','Procurement Management',0.05),
  ('management','5599','Management and Other Support Services','9006','Planning, Policy, Coordination & Equity',0.25)
ON CONFLICT (school_level, sub_programme_code) DO NOTHING;

-- 6. Seed Charge codes (10xxx income, 20xxx expense)
INSERT INTO public.moe_charge_codes (charge_code, description, code_type, suggested_account_code) VALUES
  ('10001','School grant','income','4100'),
  ('10002','School fundraising activities','income','4200'),
  ('10003','Contributions and donations','income','4300'),
  ('10004','Learner fees / other','income','4400'),
  ('20001','Purchase of books for teachers','expense','5101'),
  ('20002','Purchase of books and learning materials for learners','expense','5102'),
  ('20003','Purchase of chalk, pencils, paper and similar materials','expense','5103'),
  ('20004','Conducting school tests (paper, photocopying)','expense','5104'),
  ('20005','Purchase of office equipment and materials','expense','5105'),
  ('20006','Maintenance of office equipment, classrooms and infrastructure','expense','5106'),
  ('20007','Head teacher travelling expenses to Education Offices','expense','5200'),
  ('20008','Remuneration of support staff','expense','5300'),
  ('20009','Sports and other co-curricular activities','expense','5401'),
  ('20010','Contribution to provincial and district mock tests','expense','5402'),
  ('20011','Purchase / photocopy of report cards and registers','expense','5403'),
  ('20012','Purchase of school signposts','expense','5404'),
  ('20013','Purchase of first aid materials','expense','5405'),
  ('20014','Utility bills (water, electricity, telephone)','expense','5501'),
  ('20015','Subsistence and travelling allowances (DSA)','expense','5502'),
  ('20016','Bank charges and accountable documents','expense','5503'),
  ('20017','Cleaning and sanitary materials','expense','5504'),
  ('20018','Refreshments during meetings','expense','5505'),
  ('20019','Security services','expense','5506'),
  ('20020','Waste management','expense','5507'),
  ('20021','School feeding','expense','5508'),
  ('20022','ICT and data bundles','expense','5509'),
  ('20023','Consumables and general supply','expense','5510'),
  ('20024','Capacity building workshops','expense','5511'),
  ('20025','OVC support','expense','5512'),
  ('20026','Riso Ink and Master','expense','5513'),
  ('20027','Sports jerseys and equipment','expense','5514'),
  ('20028','Board employee wages','expense','5301'),
  ('20029','NAPSA and statutory (school staff)','expense','5302'),
  ('20030','Other school expenditure','expense','5900')
ON CONFLICT (charge_code) DO NOTHING;
