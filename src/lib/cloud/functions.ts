import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { verifyToken } from "@/lib/db/auth";
import { cloudDbHealth, getCloudDb, isCloudDatabaseConfigured } from "./postgres";

async function requireCloudUser() {
  const auth = getRequestHeader("authorization") || "";
  const token = auth.replace(/^Bearer\\s+/i, "").trim();
  if (!token) throw new Error("NOT_AUTHENTICATED");
  const session = await verifyToken(token);
  if (!session) throw new Error("NOT_AUTHENTICATED");
  return session;
}

export const cloudHealthFn = createServerFn({ method: "GET" }).handler(async () => {
  if (!isCloudDatabaseConfigured()) return { ok: false, configured: false, mode: process.env.SIFOBOOKS_MODE || "offline" };
  return { ...(await cloudDbHealth()), configured: true, mode: process.env.SIFOBOOKS_MODE || "cloud" };
});

export const cloudRegisterTenantFn = createServerFn({ method: "POST" })
  .validator((data: { companyId: string; name: string; country?: string; currency?: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireCloudUser();
    const db = getCloudDb();
    const existing = await db`SELECT * FROM cloud_tenants WHERE company_id = ${data.companyId} LIMIT 1`;
    if (existing[0] && existing[0].owner_user_id !== user.userId) throw new Error("TENANT_ACCESS_DENIED");
    if (existing[0]) return existing[0];
    const rows = await db`INSERT INTO cloud_tenants(owner_user_id,company_id,name,country,base_currency,trial_ends_at)
      VALUES(${user.userId},${data.companyId},${data.name},${data.country || "Zambia"},${data.currency || "ZMW"},now()+interval '14 days') RETURNING *`;
    await db`INSERT INTO cloud_members(tenant_id,user_id,role) VALUES(${rows[0].id},${user.userId},'owner')
      ON CONFLICT(tenant_id,user_id) DO UPDATE SET role='owner'`;
    return rows[0];
  });

export const cloudEnqueueSyncFn = createServerFn({ method: "POST" })
  .validator((data: { companyId: string; deviceId?: string; entityType: string; entityId: string; operation: string; version?: number; idempotencyKey: string; payload: unknown }) => data)
  .handler(async ({ data }) => {
    const user = await requireCloudUser();
    const db = getCloudDb();
    const tenant = await db`SELECT t.id FROM cloud_tenants t JOIN cloud_members m ON m.tenant_id=t.id
      WHERE t.company_id=${data.companyId} AND m.user_id=${user.userId} AND m.status='active' LIMIT 1`;
    if (!tenant[0]) throw new Error("TENANT_ACCESS_DENIED");
    const rows = await db`INSERT INTO cloud_sync_events(tenant_id,device_id,entity_type,entity_id,operation,version,idempotency_key,payload)
      VALUES(${tenant[0].id},${data.deviceId || null},${data.entityType},${data.entityId},${data.operation},${data.version || 1},${data.idempotencyKey},${JSON.stringify(data.payload)})
      ON CONFLICT(idempotency_key) DO NOTHING RETURNING *`;
    return { accepted: true, duplicate: rows.length === 0, event: rows[0] || null };
  });

export const cloudPullSyncFn = createServerFn({ method: "POST" })
  .validator((data: { companyId: string; after?: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const user = await requireCloudUser();
    const db = getCloudDb();
    const tenant = await db`SELECT t.id FROM cloud_tenants t JOIN cloud_members m ON m.tenant_id=t.id
      WHERE t.company_id=${data.companyId} AND m.user_id=${user.userId} AND m.status='active' LIMIT 1`;
    if (!tenant[0]) throw new Error("TENANT_ACCESS_DENIED");
    const limit = Math.min(Math.max(data.limit || 100, 1), 500);
    const after = data.after || "1970-01-01T00:00:00.000Z";
    const events = await db`SELECT * FROM cloud_sync_events WHERE tenant_id=${tenant[0].id}
      AND created_at > ${after}::timestamptz ORDER BY created_at ASC LIMIT ${limit}`;
    return { events };
  });
