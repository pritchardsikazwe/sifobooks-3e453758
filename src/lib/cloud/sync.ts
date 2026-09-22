import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { verifyToken } from "@/lib/db/auth";
import { getCloudDb } from "./postgres";

type SyncItem = {
  entityType: string; entityId: string;
  operation: "insert" | "update" | "delete";
  version?: number; idempotencyKey: string; payload: unknown;
  branchId?: string | null; sourceUpdatedAt?: string | null; deviceSequence?: number;
};

async function userAndTenant(companyId: string) {
  const auth = (getRequestHeader("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!auth) throw new Error("NOT_AUTHENTICATED");
  const user = await verifyToken(auth);
  if (!user) throw new Error("NOT_AUTHENTICATED");
  const db = getCloudDb();
  const rows = await db\`SELECT t.id FROM cloud_tenants t
    JOIN cloud_members m ON m.tenant_id=t.id
    WHERE t.company_id=\${companyId} AND m.user_id=\${user.userId}
      AND m.status='active' LIMIT 1\`;
  if (!rows[0]) throw new Error("TENANT_ACCESS_DENIED");
  return { userId: user.userId, tenantId: String(rows[0].id) };
}

export const cloudRegisterSyncDeviceFn = createServerFn({ method: "POST" })
  .validator((d: { companyId:string; deviceId:string; deviceName:string; deviceType?:string; branchId?:string; metadata?:unknown }) => d)
  .handler(async ({ data }) => {
    const { userId, tenantId } = await userAndTenant(data.companyId);
    const db = getCloudDb();
    const rows = await db\`INSERT INTO cloud_sync_devices
      (tenant_id,device_id,device_name,device_type,branch_id,metadata)
      VALUES (\${tenantId},\${data.deviceId},\${data.deviceName},\${data.deviceType || "desktop"},\${data.branchId || null},\${JSON.stringify(data.metadata || {})})
      ON CONFLICT(tenant_id,device_id) DO UPDATE SET
        device_name=EXCLUDED.device_name, device_type=EXCLUDED.device_type,
        branch_id=EXCLUDED.branch_id, metadata=EXCLUDED.metadata,
        status='active', updated_at=now()
      RETURNING *\`;
    return { ...rows[0], registered_by: userId };
  });

export const cloudPushSyncBatchFn = createServerFn({ method: "POST" })
  .validator((d: { companyId:string; deviceId:string; items:SyncItem[] }) => d)
  .handler(async ({ data }) => {
    const { userId, tenantId } = await userAndTenant(data.companyId);
    const db = getCloudDb();
    if (data.items.length > 500) throw new Error("SYNC_BATCH_TOO_LARGE");

    return db.begin(async (tx: any) => {
      await tx\`SELECT set_config('app.user_id',\${userId},true)\`;
      await tx\`SELECT set_config('app.tenant_id',\${tenantId},true)\`;
      const accepted:any[] = [], duplicates:any[] = [], conflicts:any[] = [];

      for (const item of data.items) {
        const existing = await tx\`SELECT id,version FROM cloud_sync_events
          WHERE tenant_id=\${tenantId} AND idempotency_key=\${item.idempotencyKey} LIMIT 1\`;
        if (existing[0]) {
          duplicates.push({ idempotencyKey:item.idempotencyKey, eventId:existing[0].id });
          continue;
        }

        const latest = await tx\`SELECT id,version,payload FROM cloud_sync_events
          WHERE tenant_id=\${tenantId} AND entity_type=\${item.entityType} AND entity_id=\${item.entityId}
          ORDER BY version DESC,created_at DESC LIMIT 1\`;
        if (latest[0] && Number(item.version || 1) <= Number(latest[0].version)) {
          const c = await tx\`INSERT INTO cloud_sync_conflicts
            (tenant_id,entity_type,entity_id,device_id,conflict_code,local_payload,cloud_payload)
            VALUES (\${tenantId},\${item.entityType},\${item.entityId},\${data.deviceId},
              'STALE_VERSION',\${JSON.stringify(item.payload)},\${latest[0].payload}) RETURNING id\`;
          conflicts.push({ id:c[0].id, entityType:item.entityType, entityId:item.entityId, code:"STALE_VERSION" });
          continue;
        }

        const rows = await tx\`INSERT INTO cloud_sync_events
          (tenant_id,device_id,entity_type,entity_id,operation,version,idempotency_key,payload,
           source_updated_at,branch_id,device_sequence,status)
          VALUES (\${tenantId},\${data.deviceId},\${item.entityType},\${item.entityId},\${item.operation},
            \${item.version || 1},\${item.idempotencyKey},\${JSON.stringify(item.payload)},
            \${item.sourceUpdatedAt || null},\${item.branchId || null},\${item.deviceSequence || null},'pending')
          RETURNING id,version,created_at\`;
        accepted.push({ ...rows[0], idempotencyKey:item.idempotencyKey });
      }

      await tx\`INSERT INTO cloud_sync_devices(tenant_id,device_id,device_name)
        VALUES (\${tenantId},\${data.deviceId},\${data.deviceId})
        ON CONFLICT(tenant_id,device_id) DO UPDATE SET last_push_at=now(),updated_at=now()\`;
      return { accepted, duplicates, conflicts };
    });
  });

export const cloudPullSyncBatchFn = createServerFn({ method: "POST" })
  .validator((d: { companyId:string; deviceId:string; after?:string; limit?:number }) => d)
  .handler(async ({ data }) => {
    const { userId, tenantId } = await userAndTenant(data.companyId);
    const db = getCloudDb();
    const limit = Math.min(Math.max(Number(data.limit || 200),1),500);
    const after = data.after || "1970-01-01T00:00:00.000Z";
    const events = await db\`SELECT id,device_id,entity_type,entity_id,operation,version,idempotency_key,
      payload,source_updated_at,branch_id,device_sequence,status,created_at
      FROM cloud_sync_events WHERE tenant_id=\${tenantId} AND created_at>\${after}::timestamptz
      AND (device_id IS NULL OR device_id<>\${data.deviceId})
      ORDER BY created_at ASC,id ASC LIMIT \${limit}\`;
    await db\`UPDATE cloud_sync_devices SET last_pull_at=now(),updated_at=now()
      WHERE tenant_id=\${tenantId} AND device_id=\${data.deviceId}\`;
    return { events, nextCursor: events.length ? String(events[events.length-1].created_at) : after, userId };
  });

export const cloudAcknowledgeSyncFn = createServerFn({ method: "POST" })
  .validator((d: { companyId:string; deviceId:string; eventIds:string[] }) => d)
  .handler(async ({ data }) => {
    const { tenantId } = await userAndTenant(data.companyId);
    const db = getCloudDb();
    if (data.eventIds.length > 500) throw new Error("SYNC_ACK_TOO_LARGE");
    const rows = await db\`UPDATE cloud_sync_events SET acknowledged_at=now(),status='acknowledged'
      WHERE tenant_id=\${tenantId} AND id = ANY(\${data.eventIds}::uuid[]) RETURNING id\`;
    return { acknowledged: rows.map((r:any) => r.id) };
  });
