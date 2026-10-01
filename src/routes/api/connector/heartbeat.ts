import { createFileRoute } from "@tanstack/react-router";
import { authenticateZraConnector, getConnectorDb } from "@/lib/zra/connector.server";

export const Route = createFileRoute("/api/connector/heartbeat")({
  server:{handlers:{POST:async({request})=>{
    try{
      const body=await request.json();
      const auth=await authenticateZraConnector(String(body.connectorId||""),String(body.credential||""));
      const db=getConnectorDb();
      await db.from("zra_connector_credentials").update({last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",auth.id);
      const {error}=await db.from("zra_connector_events").insert({
        id:crypto.randomUUID(),user_id:auth.user_id,device_id:auth.device_id,connector_id:auth.connector_id,
        event_type:"HEARTBEAT",status:"received",payload:JSON.stringify(body.metadata||{})
      });
      if(error) throw new Error(error.message);
      return Response.json({ok:true,serverTime:new Date().toISOString()});
    }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
  }}}
});
