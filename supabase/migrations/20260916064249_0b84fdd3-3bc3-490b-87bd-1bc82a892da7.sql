-- 1. Name the company that actually holds MKP's stock, sales and tills
UPDATE public.companies
SET name = 'MKP FARMS LIMTED1'
WHERE id = '0b9bdfc0-6a56-40b7-86de-5171d4316f1e';

-- 2. Point the cashier's active till at Chibombo Store / Register 01
UPDATE public.employee_pos_permissions
SET company_id = '0b9bdfc0-6a56-40b7-86de-5171d4316f1e',
    location_id = '02049a94-d19c-42da-bf81-d9be315bb5b0',
    register_id = 'e301cd08-0632-4b6b-ab50-35100e9c8f5a',
    pos_role = 'cashier',
    is_active = true,
    updated_at = now()
WHERE id = 'd928f9b6-502a-46ed-a4cb-cb1c5f67e643'::uuid
   OR id = '689690e2-914b-49d7-9c57-805ac4e9ce75'::uuid
  AND false;

UPDATE public.employee_pos_permissions
SET company_id = '0b9bdfc0-6a56-40b7-86de-5171d4316f1e',
    location_id = '02049a94-d19c-42da-bf81-d9be315bb5b0',
    register_id = 'e301cd08-0632-4b6b-ab50-35100e9c8f5a',
    pos_role = 'cashier',
    is_active = true,
    updated_at = now()
WHERE id = '689690e2-914b-49d7-9c57-805ac4e9ce75'::uuid;

-- 3. Switch off the duplicate till link in the empty "MKP FARMS" record
UPDATE public.employee_pos_permissions
SET is_active = false, updated_at = now()
WHERE id = 'd928f9b6-502a-46ed-a4cb-cb1c5f67e643'::uuid;

-- 4. Show the company on the cashier's profile
INSERT INTO public.company_members (company_id, user_id, role)
VALUES ('0b9bdfc0-6a56-40b7-86de-5171d4316f1e', 'c2177a55-19cc-4e73-88de-b778144ca0c9', 'staff')
ON CONFLICT DO NOTHING;

UPDATE public.profiles
SET active_company_id = '0b9bdfc0-6a56-40b7-86de-5171d4316f1e'
WHERE id = 'c2177a55-19cc-4e73-88de-b778144ca0c9';