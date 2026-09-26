// @ts-nocheck -- loosely typed after local-database port; see AGENTS.md
import { createFileRoute } from "@tanstack/react-router";
import { authenticateConnector } from "@/lib/cloud/connector";
import { getCloudDb } from "@/lib/cloud/postgres";

export const Route = createFileRoute("/api/connector/complete")({
 server:{handlers:{POST:async({request})=>{
  try{
   const body=await request.json();
   const tenantId=await authenticateConnector(String(body.connectorId||""),String(body.credential||""));
   const db=getCloudDb();
   const status=body.success?"completed":"failed";
   await db.begin(async(tx:any)=>{
    await tx`SELECT set_config('app.tenant_id',${tenantId},true)`;
    await tx`UPDATE cloud_connector_commands SET status=${status},response=${JSON.stringify(body.response||{})},
      error_message=${body.errorMessage||null},completed_at=now()
      WHERE id=${body.commandId} AND tenant_id=${tenantId} AND connector_id=${body.connectorId}`;
    await tx`INSERT INTO cloud_connector_events(tenant_id,connector_id,event_type,status,request_id,payload)
      VALUES(${tenantId},${body.connectorId},'command_complete',${status},${body.commandId},${JSON.stringify(body.response||{})})`;
   });
   return Response.json({ok:true});
  }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
 }}}});
