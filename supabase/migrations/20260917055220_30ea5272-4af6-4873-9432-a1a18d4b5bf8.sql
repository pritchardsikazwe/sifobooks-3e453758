DO $$
DECLARE v_role uuid;
BEGIN
  SELECT id INTO v_role FROM public.rbac_roles
   WHERE tenant_id = 'e54d7679-cd55-4fee-8811-6b8e260cba75' AND key = 'retail_cashier';

  IF v_role IS NULL THEN
    INSERT INTO public.rbac_roles (tenant_id, key, name, description, pos_channel, is_system)
    VALUES ('e54d7679-cd55-4fee-8811-6b8e260cba75', 'retail_cashier', 'Retail Cashier',
            'Till operator: sell, own sales, shift and view-only store stock', 'retail', false)
    RETURNING id INTO v_role;
  END IF;

  INSERT INTO public.rbac_role_permissions (role_id, permission_key)
  SELECT v_role, k
  FROM unnest(ARRAY['cash_shift.close','cash_shift.open','pos.retail.access',
                    'pos.sales.create','pos.sales.view_own','products.view','inventory.view']) AS k
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions rp
    WHERE rp.role_id = v_role AND rp.permission_key = k
  );

  INSERT INTO public.staff_members (user_id, tenant_id, role_id, full_name, email, is_active)
  SELECT 'c2177a55-19cc-4e73-88de-b778144ca0c9',
         'e54d7679-cd55-4fee-8811-6b8e260cba75', v_role, 'lupupa', 'lupupakamz@gmail.com', true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = 'c2177a55-19cc-4e73-88de-b778144ca0c9'
      AND tenant_id = 'e54d7679-cd55-4fee-8811-6b8e260cba75'
  );
END $$;

UPDATE public.staff_members
SET is_active = false, updated_at = now()
WHERE user_id = 'c2177a55-19cc-4e73-88de-b778144ca0c9'
  AND tenant_id = '49ccf1c2-fd20-4912-a200-d48f6467d099';

UPDATE public.employee_pos_permissions
SET company_id = NULL, location_id = NULL, register_id = NULL, updated_at = now()
WHERE id = 'd928f9b6-502a-46ed-a4cb-cb1c5f67e643'::uuid;