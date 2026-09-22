import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { verifyToken } from "@/lib/db/auth";
import { getCloudDb } from "./postgres";
import {
  cloudPosCheckout,
  cloudPostInvoice,
  cloudPostPurchaseBill,
  cloudRecordBillPayment,
  cloudPostCreditNote,
  cloudReversePosSale,
} from "./accounting-transactions";

const HANDLERS: Record<string, (uid:string,payload:any)=>Promise<any>> = {
  "pos_checkout": cloudPosCheckout,
  "sales_invoice": cloudPostInvoice,
  "purchase_bill": cloudPostPurchaseBill,
  "bill_payment": cloudRecordBillPayment,
  "credit_note": cloudPostCreditNote,
  "pos_reversal": cloudReversePosSale,
};

async function authenticate() {
  const token=(getRequestHeader("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token) throw new Error("NOT_AUTHENTICATED");
  const user=await verifyToken(token);
  if(!user) throw new Error("NOT_AUTHENTICATED");
  return user.userId;
}

async function tenantForUser(companyId:string,uid:string) {
  const db=getCloudDb();
  const rows=await db\`SELECT t.id FROM cloud_tenants t JOIN cloud_members m ON m.tenant_id=t.id
    WHERE t.company_id=\${companyId} AND m.user_id=\${uid} AND m.status='active' LIMIT 1\`;
  if(!rows[0]) throw new Error("TENANT_ACCESS_DENIED");
  return String(rows[0].id);
}

export const cloudApplyPendingSyncFn=createServerFn({method:"POST"})
  .validator((d:{companyId:string;limit?:number})=>d)
  .handler(async({data})=>{
    const uid=await authenticate();
    const tenantId=await tenantForUser(data.companyId,uid);
    const db=getCloudDb();
    const limit=Math.min(Math.max(Number(data.limit||25),1),100);
    const events=await db\`SELECT * FROM cloud_sync_events
      WHERE tenant_id=\${tenantId} AND status='pending'
      ORDER BY created_at ASC,id ASC LIMIT \${limit}\`;

    const applied:any[]=[], failed:any[]=[], skipped:any[]=[];
    for(const event of events){
      const handler=HANDLERS[String(event.entity_type)];
      if(!handler){
        await db\`UPDATE cloud_sync_events SET status='unsupported',processed_at=now()
          WHERE id=\${event.id} AND tenant_id=\${tenantId}\`;
        skipped.push({id:event.id,entityType:event.entity_type,code:"UNSUPPORTED_SYNC_ENTITY"});
        continue;
      }
      try{
        const result=await handler(uid,event.payload);
        await db\`UPDATE cloud_sync_events SET status='processed',processed_at=now()
          WHERE id=\${event.id} AND tenant_id=\${tenantId} AND status='pending'\`;
        applied.push({id:event.id,entityType:event.entity_type,result});
      }catch(error:any){
        const message=String(error?.message||error);
        await db\`UPDATE cloud_sync_events SET status='failed',processed_at=now(),conflict_code='APPLY_FAILED',
          conflict_payload=\${JSON.stringify({message})}
          WHERE id=\${event.id} AND tenant_id=\${tenantId} AND status='pending'\`;
        failed.push({id:event.id,entityType:event.entity_type,code:"APPLY_FAILED",message});
      }
    }
    return {processed:applied,failed,unsupported:skipped};
  });

export const cloudSyncStatusFn=createServerFn({method:"POST"})
  .validator((d:{companyId:string})=>d)
  .handler(async({data})=>{
    const uid=await authenticate();
    const tenantId=await tenantForUser(data.companyId,uid);
    const db=getCloudDb();
    const rows=await db\`SELECT status,count(*)::int AS count FROM cloud_sync_events
      WHERE tenant_id=\${tenantId} GROUP BY status ORDER BY status\`;
    const conflicts=await db\`SELECT count(*)::int AS count FROM cloud_sync_conflicts
      WHERE tenant_id=\${tenantId} AND resolution='pending'\`;
    return {statuses:rows,pendingConflicts:Number(conflicts[0]?.count||0)};
  });
