import { createFileRoute } from "@tanstack/react-router";
import { authenticateZraConnector, getConnectorDb } from "@/lib/zra/connector.server";

export const Route = createFileRoute("/api/connector/complete")({
  server:{handlers:{POST:async({request})=>{
    try{
      const body=await request.json();
      const auth=await authenticateZraConnector(String(body.connectorId||""),String(body.credential||""));
      const db=getConnectorDb();
      const status=body.success?"completed":"failed";
      const {error:updateError}=await db.from("zra_connector_commands").update({
        status,response:JSON.stringify(body.response||{}),error_message:body.errorMessage||null,completed_at:new Date().toISOString()
      }).eq("id",body.commandId).eq("user_id",auth.user_id).eq("connector_id",auth.connector_id);
      if(updateError) throw new Error(updateError.message);
      const {error:eventError}=await db.from("zra_connector_events").insert({
        id:crypto.randomUUID(),user_id:auth.user_id,device_id:auth.device_id,connector_id:auth.connector_id,
        event_type:"COMMAND_COMPLETE",status,request_id:body.commandId,payload:JSON.stringify(body.response||{})
      });
      if(eventError) throw new Error(eventError.message);
      return Response.json({ok:true});
    }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
  }}}
});
