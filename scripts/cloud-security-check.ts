import { SQL } from "bun";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
if (!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");

const db = new SQL({
  url,
  adapter: "postgres",
  tls: process.env.POSTGRES_TLS === "false" ? "disable" : "require",
});

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error("SECURITY_CHECK_FAILED: " + message);
}

const role = await db`
  SELECT current_user AS database_role, r.rolsuper AS is_superuser, r.rolbypassrls AS bypasses_rls
  FROM pg_roles r WHERE r.rolname=current_user
`;
assert(role[0], "database role not found");
assert(!role[0].is_superuser, "request-path role is a superuser");
assert(!role[0].bypasses_rls, "request-path role has BYPASSRLS");

const inventory = await db`
  SELECT table_name, rls_enabled, rls_forced, has_tenant_id, has_tenant_policy
  FROM cloud_security_rls_inventory
  WHERE table_name NOT LIKE 'cloud_%'
    AND table_name <> 'auth_users'
    AND table_name NOT IN ('schema_migrations')
`;
const failures = inventory.filter((r: any) =>
  r.has_tenant_id && (!r.rls_enabled || !r.rls_forced || !r.has_tenant_policy)
);
assert(failures.length === 0, failures.map((r: any) => r.table_name).join(", "));

await db`
  CREATE TEMP TABLE sifobooks_rls_probe (
    id text primary key,
    tenant_id uuid not null,
    value text not null
  )
`;
await db`ALTER TABLE sifobooks_rls_probe ENABLE ROW LEVEL SECURITY`;
await db`ALTER TABLE sifobooks_rls_probe FORCE ROW LEVEL SECURITY`;
await db`CREATE POLICY sifobooks_rls_probe_policy ON sifobooks_rls_probe
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)`;

const [tenantA, tenantB] = await db`
  SELECT gen_random_uuid() AS a, gen_random_uuid() AS b
`.then((rows: any[]) => [rows[0].a, rows[0].b]);

await db.begin(async (tx: any) => {
  await tx.unsafe("SELECT set_config('app.tenant_id',$1,true)", [tenantA]);
  await tx.unsafe("INSERT INTO sifobooks_rls_probe(id,tenant_id,value) VALUES($1,$2,$3)", ["a", tenantA, "alpha"]);
  const own = await tx.unsafe("SELECT value FROM sifobooks_rls_probe");
  assert(own.length === 1 && own[0].value === "alpha", "same-tenant row was not visible");
});

await db.begin(async (tx: any) => {
  await tx.unsafe("SELECT set_config('app.tenant_id',$1,true)", [tenantB]);
  const cross = await tx.unsafe("SELECT value FROM sifobooks_rls_probe");
  assert(cross.length === 0, "cross-tenant row was visible");
  await tx.unsafe("INSERT INTO sifobooks_rls_probe(id,tenant_id,value) VALUES($1,$2,$3)", ["b", tenantB, "beta"]);
  const own = await tx.unsafe("SELECT value FROM sifobooks_rls_probe");
  assert(own.length === 1 && own[0].value === "beta", "tenant B could not see its own row");
});

console.log(`SifoBooks cloud security checks passed: ${inventory.length} tenant-scoped tables verified; cross-tenant RLS probe denied.`);
await db.end({ timeout: 1 });
