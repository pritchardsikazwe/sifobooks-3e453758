# Independent SifoBooks Product Separation

## Objective
Move the following products out of the SifoBooks application into independent repositories and deployments. SifoBooks may remain the domain family and marketing umbrella, but the products must not require the SifoBooks runtime or database to operate.

## Product boundaries
1. Hotel Management — `hotel.sifobooks.com` — repository target: `sifobooks-hotel` — dedicated Supabase project.
2. Restaurant Management — `restaurant.sifobooks.com` — repository target: `sifobooks-restaurant` — dedicated Supabase project.
3. Property Management — `property.sifobooks.com` — repository target: `sifobooks-property` — dedicated Supabase project.
4. School Management — `school.sifobooks.com` — repository target: `sifobooks-school` — dedicated Supabase project.
5. Business Suite (Accounting + POS + Butchery) — `business.sifobooks.com` — repository target: `sifobooks-business-suite` — dedicated Supabase project.
6. Existing SifoBooks remains separate and operational at the main domain; do not delete or repurpose its production data.

## Required for every product
- Independent source repository, package/build configuration, environment variables, CI workflow, deployment target and rollback plan.
- Dedicated Supabase project, schema/migrations, Row Level Security policies, auth settings, storage buckets, backups and recovery test.
- Product-specific roles and tenant isolation. Never share service-role keys with the browser.
- No direct database access between products. Cross-product features must use authenticated, versioned APIs or signed webhooks.
- Document external dependencies and replace any imports from the monolith before calling extraction complete.
- Never copy production credentials, customer exports, or secrets into Git.
- Keep the current SifoBooks application untouched until the extracted product has passed build, migration, security, smoke and user acceptance tests.

## Domain and deployment
Create DNS records only after the deployment target is provisioned. Configure each subdomain as a separate site/app deployment, enable TLS, set allowed redirect URLs and CORS origins, and verify authentication callbacks. DNS records depend on the selected hosting provider; do not guess A/CNAME targets.

## Safe extraction sequence
1. Inventory Hotel routes, components, services, database tables, RLS policies, migrations, assets, tests and shared dependencies.
2. Create the independent repository and Supabase project.
3. Copy only the Hotel product code plus necessary shared utilities; replace monolith-specific imports and database assumptions.
4. Build and test in staging, then configure `hotel.sifobooks.com`.
5. Repeat for Restaurant, Property, School, and finally Business Suite.
6. Add a central product landing/subscription portal only as a separate integration layer; it must not become a runtime dependency for product operations unless explicitly designed as an API service.

## Status and constraints
- A working branch `product-separation-foundation` has been created in the existing repository for migration preparation.
- This file is a migration specification, not evidence that independent repositories, new Supabase projects, or DNS records already exist.
- The connected GitHub tools do not expose repository creation, and Supabase project creation requires the user to confirm the organization. Those actions must be completed before genuine independent deployment can be claimed.
