# SifoBooks Cloud Security & Trust Layer

## Security boundary

SifoBooks Cloud uses a defense-in-depth tenant boundary:

Browser -> authenticated SifoBooks server -> verified cloud membership -> transaction-local PostgreSQL tenant context -> PostgreSQL Row-Level Security.

The browser never supplies authorization proof. A client-supplied company/tenant selector is verified against `cloud_members`.

## PostgreSQL protections

Migration `003_cloud_security_trust_layer.sql`:

- creates missing cloud tenants for existing companies;
- adds `tenant_id UUID` to accounting tables that have `user_id`;
- backfills tenant ownership from `company_id` where available;
- enables and forces PostgreSQL RLS;
- creates a fail-closed tenant policy;
- adds a security-event table;
- exposes RLS inventory and runtime-role verification views.

The application sets `app.tenant_id` and `app.user_id` with `set_config(..., true)` inside each PostgreSQL transaction. PostgreSQL documents the third argument of `set_config` as transaction-local when true. This is intentional so pooled connections cannot retain a previous request's tenant context.

Ordinary production request traffic must use a PostgreSQL role that is neither superuser nor `BYPASSRLS`. PostgreSQL documents that superusers and BYPASSRLS roles can bypass row security.

## Security test

Run:

```bash
POSTGRES_URL=postgres://... bun run check:cloud-security
```

The check verifies:

1. the request database role is not superuser;
2. the request database role does not bypass RLS;
3. tenant-scoped tables have tenant_id, RLS, FORCE RLS and the SifoBooks policy;
4. a tenant can read its own row;
5. another tenant cannot read that row;
6. the second tenant can still read its own row.

## Important production rule

Do not expose the PostgreSQL port to the public internet. The application server should be the normal database client. Administrative/migration credentials must be separate from the least-privileged request-path role.

## Backups and recovery

Cloud production must use provider/database backups independently of application data. SifoBooks should additionally maintain a backup catalog and periodically perform an actual restore test. A backup is not considered verified merely because the backup job reports success.

## Customer trust controls

The production Security Centre should eventually expose:

- tenant isolation status;
- database/TLS status;
- backup status and last successful restore test;
- MFA status;
- recent security events;
- audit-log health;
- connector/VSDC health;
- data export status;
- production environment status.

Security controls are implementation features, not a claim of certification. Formal security assessment, penetration testing and ZRA certification/UAT remain separate activities.
