import { createFileRoute } from "@tanstack/react-router";
import { authenticateZraConnector, getCloudDb } from "@/lib/zra/connector.server";

export const Route = createFileRoute("/api/connector/complete")({
  server:{handlers:{POST:async({request})=>{
    try{
      const body=await request.json();
      const auth=await authenticateZraConnector(String(body.connectorId||""),String(body.credential||""));
      const db=getCloudDb();
      const status=body.success?"completed":"failed";
      await db`UPDATE zra_connector_commands SET status=${status},response=${JSON.stringify(body.response||{})},
        error_message=${body.errorMessage||null},completed_at=now()
        WHERE id=${body.commandId} AND user_id=${auth.user_id} AND connector_id=${auth.connector_id}`;
      await db`INSERT INTO zra_connector_events (id,user_id,device_id,connector_id,event_type,status,request_id,payload)
        VALUES(${crypto.randomUUID()},${auth.user_id},${auth.device_id},${auth.connector_id},'COMMAND_COMPLETE',${status},${body.commandId},${JSON.stringify(body.response||{})})`;
      return Response.json({ok:true});
    }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
  }}}
});