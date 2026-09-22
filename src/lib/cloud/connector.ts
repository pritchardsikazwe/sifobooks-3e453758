import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { verifyToken } from "@/lib/db/auth";
import { getCloudDb } from "./postgres";

async function userTenant(companyId:string){
  const token=(getRequestHeader("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token) throw new Error("NOT_AUTHENTICATED");
  const user=await verifyToken(token); if(!user) throw new Error("NOT_AUTHENTICATED");
  const db=getCloudDb();
  const rows=await db\`SELECT t.id FROM cloud_tenants t JOIN cloud_members m ON m.tenant_id=t.id
    WHERE t.company_id=\${companyId} AND m.user_id=\${user.userId} AND m.status='active' LIMIT 1\`;
  if(!rows[0]) throw new Error("TENANT_ACCESS_DENIED");
  return {userId:user.userId,tenantId:String(rows[0].id)};
}

function newToken(){ return crypto.randomUUID()+"."+crypto.randomUUID(); }
async function hashToken(token:string){
  const bytes=new TextEncoder().encode(token);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
}

export const registerCloudConnectorFn=createServerFn({method:"POST"})
 .validator((d:{companyId:string;connectorId:string;name:string;environment?:string})=>d)
 .handler(async({data})=>{
   const {tenantId}=await userTenant(data.companyId); const db=getCloudDb(); const token=newToken();
   await db.begin(async(tx:any)=>{
     await tx\`SELECT set_config('app.tenant_id',\${tenantId},true)\`;
     await tx\`INSERT INTO cloud_connectors(tenant_id,connector_id,name,status,environment)
       VALUES(\${tenantId},\${data.connectorId},\${data.name},'offline',\${data.environment||"test"})
       ON CONFLICT(tenant_id,connector_id) DO UPDATE SET name=EXCLUDED.name,environment=EXCLUDED.environment,status='offline',updated_at=now()\`;
     await tx\`INSERT INTO cloud_connector_credentials(tenant_id,connector_id,credential_hash)
       VALUES(\${tenantId},\${data.connectorId},\${await hashToken(token)})
       ON CONFLICT(tenant_id,connector_id) DO UPDATE SET credential_hash=EXCLUDED.credential_hash,status='active',revoked_at=NULL,created_at=now()\`;
   });
   return {connectorId:data.connectorId,credential:token,warning:"Store this credential securely. It is returned only during registration."};
 });

export const connectorHeartbeatFn=createServerFn({method:"POST"})
 .validator((d:{connectorId:string;credential:string;capabilities?:unknown;metadata?:unknown})=>d)
 .handler(async({data})=>{
   const hash=await hashToken(data.credential); const db=getCloudDb();
   const rows=await db\`SELECT tenant_id FROM cloud_connector_credentials WHERE connector_id=\${data.connectorId}
     AND credential_hash=\${hash} AND status='active' AND (expires_at IS NULL OR expires_at>now()) LIMIT 1\`;
   if(!rows[0]) throw new Error("CONNECTOR_AUTH_FAILED");
   const tenantId=String(rows[0].tenant_id);
   await db.begin(async(tx:any)=>{
     await tx\`SELECT set_config('app.tenant_id',\${tenantId},true)\`;
     await tx\`UPDATE cloud_connector_credentials SET last_used_at=now() WHERE tenant_id=\${tenantId} AND connector_id=\${data.connectorId}\`;
     await tx\`UPDATE cloud_connectors SET status='online',last_seen_at=now(),capabilities=\${JSON.stringify(data.capabilities||{})},updated_at=now()
       WHERE tenant_id=\${tenantId} AND connector_id=\${data.connectorId}\`;
     await tx\`INSERT INTO cloud_connector_events(tenant_id,connector_id,event_type,status,payload)
       VALUES(\${tenantId},\${data.connectorId},'heartbeat','received',\${JSON.stringify(data.metadata||{})})\`;
   });
   return {ok:true,tenantId,serverTime:new Date().toISOString()};
 });

export const connectorPollCommandsFn=createServerFn({method:"POST"})
 .validator((d:{connectorId:string;credential:string;limit?:number})=>d)
 .handler(async({data})=>{
   const hash=await hashToken(data.credential); const db=getCloudDb();
   const rows=await db\`SELECT tenant_id FROM cloud_connector_credentials WHERE connector_id=\${data.connectorId}
     AND credential_hash=\${hash} AND status='active' LIMIT 1\`;
   if(!rows[0]) throw new Error("CONNECTOR_AUTH_FAILED");
   const tenantId=String(rows[0].tenant_id); const limit=Math.min(Math.max(Number(data.limit||20),1),100);
   const commands=await db.begin(async(tx:any)=>{
     await tx\`SELECT set_config('app.tenant_id',\${tenantId},true)\`;
     const items=await tx\`SELECT * FROM cloud_connector_commands WHERE tenant_id=\${tenantId} AND connector_id=\${data.connectorId}
       AND status='queued' ORDER BY created_at ASC LIMIT \${limit} FOR UPDATE SKIP LOCKED\`;
     for(const c of items) await tx\`UPDATE cloud_connector_commands SET status='delivered',delivered_at=now() WHERE id=\${c.id}\`;
     return items;
   });
   return {commands};
 });
