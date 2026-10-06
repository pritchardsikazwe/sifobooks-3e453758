-- SifoBooks module-gating backfill
-- INSERT ONLY. Idempotent and reversible by deleting only rows whose config
-- source is "module-gating-backfill". Do NOT run this in production yet.
-- This script intentionally does not create __gate__:on rows.
-- Existing explicit modules and __off__ suppression rows are preserved.

WITH desired(company_id, user_id, module_key) AS (
  SELECT id, user_id, 'hotel_erp' FROM companies WHERE lower(COALESCE(industry,'')) IN ('hotel','hospitality','lodge')
  UNION ALL SELECT id, user_id, 'school_erp' FROM companies WHERE lower(COALESCE(industry,'')) IN ('school','college','university')
  UNION ALL SELECT id, user_id, 'property_management' FROM companies WHERE lower(COALESCE(industry,'')) IN ('property','property_management','real_estate')
  UNION ALL SELECT id, user_id, 'lending' FROM companies WHERE lower(COALESCE(industry,'')) IN ('lending','microfinance','sacco')
  UNION ALL SELECT id, user_id, 'boarding_house' FROM companies WHERE lower(COALESCE(industry,'')) IN ('boarding_house','boarding')
  UNION ALL SELECT id, user_id, 'restaurant' FROM companies WHERE lower(COALESCE(industry,'')) = 'restaurant'
  UNION ALL SELECT id, user_id, 'butchery' FROM companies WHERE lower(COALESCE(industry,'')) = 'butchery'
)
INSERT INTO company_modules (id, user_id, company_id, module_key, config)
SELECT
  lower(hex(randomblob(16))),
  d.user_id,
  d.company_id,
  d.module_key,
  '{"source":"module-gating-backfill"}'
FROM desired d
WHERE NOT EXISTS (
  SELECT 1 FROM company_modules x
  WHERE x.company_id = d.company_id
    AND x.module_key IN (d.module_key, '__off__:' || d.module_key)
);

-- Reversal proposal (DO NOT execute as part of this script):
-- DELETE FROM company_modules
-- WHERE config = '{"source":"module-gating-backfill"}';
