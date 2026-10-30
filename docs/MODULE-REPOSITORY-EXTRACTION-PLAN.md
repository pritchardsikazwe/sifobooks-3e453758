# SifoBooks Independent Repository Plan

Updated scope (user-confirmed):

## Target repositories

1. `sifobooks-platform` — central customer portal, module catalogue, subscriptions/billing, entitlement checks, support and launch links.
2. `sifobooks-hotel` — hotel management as a standalone application and dedicated Supabase project.
3. `sifobooks-restaurant` — restaurant management as a standalone application and dedicated Supabase project.
4. `sifobooks-property` — property/real-estate management as a standalone application and dedicated Supabase project.
5. `sifobooks-school` — school management as a standalone application and dedicated Supabase project.
6. `sifobooks-business-suite` — one combined application and dedicated Supabase project for Butchery + POS + Accounting. These three remain integrated in this suite because sales, stock movements, till operations and financial postings must reconcile.

## Extraction order

1. Hotel
2. Restaurant
3. Property
4. School
5. Butchery + POS + Accounting suite
6. Central platform launch/subscription integration

## Guardrails

- The current `sifobooks-3e453758` repository remains intact until extracted applications are built, tested and approved for cutover.
- Each standalone application gets its own Supabase project, migrations, RLS policies, environment configuration, backups, CI and deployment.
- The Butchery + POS + Accounting suite shares one database and coordinated transactional logic; do not split these into separate products at this stage.
- Platform subscription/entitlement checks must be enforced server-side; hiding navigation alone is not security.
- Never commit production secrets, service-role keys or customer database dumps.
- Preserve tenant isolation, audit logs, IDs/data mappings, migration rollback and reconciliation tests.
- Independent modules must remain usable without buying other modules. Cross-product integrations are optional and use authenticated, versioned APIs/webhooks.
- Do not claim repositories or Supabase projects are created until they are actually provisioned and verified.

## Current state

This document records the intended separation architecture. It does not itself create the target repositories or Supabase projects, and no existing application source is removed by this plan.
