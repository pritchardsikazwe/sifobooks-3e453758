-- SifoBooks module-gating backfill report
-- READ ONLY. Do not enable gating or modify data with this script.
-- Confirmed source tables in src/lib/db/schema.sql:
-- companies, company_modules, hotel_rooms, hotel_reservations, students,
-- loans, restaurant_orders, butchery_products.
-- Not found/confirmed in schema.sql or searchable migrations:
-- borrowers, boarding_houses, property_tenants/property_tenants equivalent.
-- Those are reported as "not found" rather than guessed.

WITH company_base AS (
  SELECT id AS company_id, user_id, name, industry
  FROM companies
),
data_presence AS (
  SELECT
    c.company_id,
    (SELECT COUNT(*) FROM hotel_rooms r WHERE r.user_id = c.user_id) AS hotel_rooms_count,
    (SELECT COUNT(*) FROM hotel_reservations r WHERE r.user_id = c.user_id) AS hotel_reservations_count,
    (SELECT COUNT(*) FROM students s WHERE s.company_id = c.company_id) AS students_count,
    (SELECT COUNT(*) FROM loans l WHERE l.user_id = c.user_id) AS loans_count,
    (SELECT COUNT(*) FROM restaurant_orders o WHERE o.user_id = c.user_id) AS restaurant_orders_count,
    (SELECT COUNT(*) FROM butchery_products b WHERE b.user_id = c.user_id) AS butchery_products_count
  FROM company_base c
),
desired AS (
  SELECT company_id, user_id, industry, 'hotel_erp' AS module_key FROM company_base WHERE lower(COALESCE(industry,'')) IN ('hotel','hospitality','lodge')
  UNION ALL SELECT company_id, user_id, industry, 'school_erp' FROM company_base WHERE lower(COALESCE(industry,'')) IN ('school','college','university')
  UNION ALL SELECT company_id, user_id, industry, 'property_management' FROM company_base WHERE lower(COALESCE(industry,'')) IN ('property','property_management','real_estate')
  UNION ALL SELECT company_id, user_id, industry, 'lending' FROM company_base WHERE lower(COALESCE(industry,'')) IN ('lending','microfinance','sacco')
  UNION ALL SELECT company_id, user_id, industry, 'boarding_house' FROM company_base WHERE lower(COALESCE(industry,'')) IN ('boarding_house','boarding')
  UNION ALL SELECT company_id, user_id, industry, 'restaurant' FROM company_base WHERE lower(COALESCE(industry,'')) = 'restaurant'
  UNION ALL SELECT company_id, user_id, industry, 'butchery' FROM company_base WHERE lower(COALESCE(industry,'')) = 'butchery'
)
SELECT
  c.company_id,
  c.name,
  c.industry,
  d.module_key AS suggested_module,
  CASE
    WHEN cm.module_key IS NOT NULL THEN 'installed'
    WHEN off.module_key IS NOT NULL THEN 'suppressed'
    ELSE 'missing'
  END AS current_state,
  CASE d.module_key
    WHEN 'hotel_erp' THEN CASE WHEN p.hotel_rooms_count + p.hotel_reservations_count > 0 THEN 'data present' ELSE 'no confirmed hotel data' END
    WHEN 'school_erp' THEN CASE WHEN p.students_count > 0 THEN 'data present' ELSE 'no confirmed school data' END
    WHEN 'lending' THEN CASE WHEN p.loans_count > 0 THEN 'data present; borrowers table not found' ELSE 'no confirmed loan data; borrowers table not found' END
    WHEN 'boarding_house' THEN 'boarding house tables not found'
    WHEN 'restaurant' THEN CASE WHEN p.restaurant_orders_count > 0 THEN 'data present' ELSE 'no confirmed restaurant order data' END
    WHEN 'butchery' THEN CASE WHEN p.butchery_products_count > 0 THEN 'data present' ELSE 'no confirmed butchery product data' END
    WHEN 'property_management' THEN 'property tenant table not found'
    ELSE 'not assessed'
  END AS data_presence
FROM company_base c
JOIN desired d ON d.company_id = c.company_id
LEFT JOIN company_modules cm ON cm.company_id = d.company_id AND cm.module_key = d.module_key
LEFT JOIN company_modules off ON off.company_id = d.company_id AND off.module_key = '__off__:' || d.module_key
JOIN data_presence p ON p.company_id = c.company_id
ORDER BY c.name, d.module_key;

-- Also show the current company module rows, including gate/suppression markers.
SELECT company_id, user_id, module_key, config, installed_at, updated_at
FROM company_modules
ORDER BY company_id, module_key;
