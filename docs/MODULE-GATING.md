# Module Gating

## Purpose

Module gating is a staged rollout mechanism for SifoBooks. It is **OFF by default** and does not change existing customer behaviour until both gates are enabled:

1. Build flag: `VITE_MODULE_GATING=on`.
2. Per-company row: `company_modules.module_key = '__gate__:on'`.

No `__gate__:on` rows are created by this PR.

## Current rollout

1. Merge this PR with `VITE_MODULE_GATING` left off.
2. Run `scripts/module-gating-backfill-report.sql` read-only and review the output.
3. Run `scripts/module-gating-backfill.sql` only against a staging copy after review.
4. Enable `__gate__:on` for one test company.
5. Check both a brand-new company and an existing/old company.
6. Enable the gate per tenant only after validation.

## Turning gating on for a company

A SuperAdmin/service-side operational process should insert:

```sql
INSERT INTO company_modules (id, user_id, company_id, module_key, config)
VALUES ('<id>', '<user_id>', '<company_id>', '__gate__:on', '{}');
```

This PR does not add an admin UI, migration, edge function, or RLS policy for that operation.

## Rolling back one company

Delete only the gate marker:

```sql
DELETE FROM company_modules
WHERE company_id = '<company_id>'
  AND module_key = '__gate__:on';
```

With the build flag still on, removing the marker returns that company to the legacy module-resolution behaviour. If the build flag is turned off, all customers return to the pre-gating behaviour.

## Suppression convention

For a module whose legacy registry default is on, uninstalling writes `__off__:<module>`. Reinstalling removes the suppression row and writes the normal module row.

## Proposed RLS design — NOT IMPLEMENTED

The current browser-side `company_modules` writes should eventually be restricted. Proposed design:

- Normal tenant users: SELECT only for their own company.
- Tenant users: no INSERT/UPDATE/DELETE of paid-module activation rows.
- SuperAdmin or a trusted server-side provisioning path: INSERT/UPDATE/DELETE module activation rows.
- Allow the server-side provisioning path to manage `__gate__:on` and `__off__:<module>`.
- Keep company membership checks in every SELECT/management policy.
- Avoid trusting a client-supplied `company_id` without verifying membership/administrative authority.

This is a proposal only. No RLS migration is included.

## Data limitations

The backfill report uses only tables confirmed in `src/lib/db/schema.sql`. Hotel rooms/reservations, students, loans, restaurant orders and butchery products are confirmed. A borrowers table, boarding-house table, and property-tenant table were not confirmed in the checked schema/searchable migrations, so the report says **not found** rather than inventing table names.

## Protected paths

This PR does not modify:

- `src/lib/zra/**`
- VSDC connector
- `src/core/contracts/fiscal.ts`
- POS checkout/numbering
- `src/lib/tax-reports.ts`
- ZRA/fiscalization/POS/payroll/ledger migrations
- `src/lib/licensing.ts`
- `scripts/license-*.ts`
