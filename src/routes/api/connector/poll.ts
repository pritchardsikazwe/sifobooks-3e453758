import { createFileRoute } from "@tanstack/react-router";
import { authenticateConnector } from "@/lib/cloud/connector";
import { getCloudDb } from "@/lib/cloud/postgres";

export const Route = createFileRoute("/api/connector/poll")({
 server:{handlers:{POST:async({request})=>{
  try{
   const body=await request.json();
   const tenantId=await authenticateConnector(String(body.connectorId||""),String(body.credential||""));
   const db=getCloudDb(); const limit=Math.min(Math.max(Number(body.limit||20),1),100);
   const commands=await db.begin(async(tx:any)=>{
    await tx`SELECT set_config('app.tenant_id',${tenantId},true)`;
    const rows=await tx`SELECT id,command_type,payload,created_at FROM cloud_connector_commands
      WHERE tenant_id=${tenantId} AND connector_id=${body.connectorId} AND status='queued'
      ORDER BY created_at ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
    for(const row of rows) await tx`UPDATE cloud_connector_commands SET status='delivered',delivered_at=now() WHERE id=${row.id}`;
    return rows;
   });
   return Response.json({commands});
  }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
 }}}});
