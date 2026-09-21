# SifoBooks Cloud SaaS foundation

## Target deployment
- www.sifobooks.com — marketing
- app.sifobooks.com — authenticated SifoBooks Cloud
- api.sifobooks.com — future public API and connector surface
- download.sifobooks.com — future signed Windows releases

GitHub remains source control, not the customer application backend.

## PostgreSQL control plane
The cloud foundation uses PostgreSQL. The migration creates tenants, tenant members, branches, customer VSDC connectors and durable sync events.

The existing SQLite accounting data layer is intentionally not switched to PostgreSQL by environment variable alone. Existing accounting server functions use synchronous SQLite APIs, so a safe PostgreSQL accounting-data migration is a separate refactor rather than silently breaking the Windows/local build.

## Tenant isolation
Every cloud request resolves the authenticated user first and then resolves the company through cloud_members. A client-supplied company ID is never trusted by itself.

## Offline and hybrid synchronization
Local transactions keep durable IDs and versions. The cloud endpoint accepts an idempotency key and stores a payload once; retries therefore do not create duplicate cloud events. Conflicts are retained instead of silently overwriting accounting records.

## ZRA connector boundary
Cloud SifoBooks must not expose a customer's VSDC directly to the public Internet. A customer-controlled connector makes outbound HTTPS communication to SifoBooks Cloud and talks to the customer's local VSDC. The cloud control plane stores connector status/capabilities, not VSDC secret material.

ZRA's current VSDC specification describes VSDC as the bridge between independent invoicing systems and Smart Invoice and separates Test from Production. Formal UAT/certification remains a ZRA process.

## Production sequence
1. Provision PostgreSQL.
2. Apply cloud/migrations/001_sifobooks_cloud_control_plane.sql.
3. Deploy with SIFOBOOKS_MODE=cloud and POSTGRES_URL.
4. Connect app.sifobooks.com.
5. Add the customer connector.
6. Refactor the accounting data plane to PostgreSQL.
7. Add subscription/licensing enforcement.
8. Enable sync after reconciliation tests.
9. Keep ZRA in TEST/UAT until formal approval.


## Verification
Cloud control-plane functions are server-only TanStack Start RPCs; browser code never receives the PostgreSQL connection string.
