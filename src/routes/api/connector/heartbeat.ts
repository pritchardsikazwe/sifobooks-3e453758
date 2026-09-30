import { createFileRoute } from "@tanstack/react-router";
import { authenticateZraConnector, getCloudDb } from "@/lib/zra/connector.server";

export const Route = createFileRoute("/api/connector/heartbeat")({
  server:{handlers:{POST:async({request})=>{
    try{
      const body=await request.json();
      const auth=await authenticateZraConnector(String(body.connectorId||""),String(body.credential||""));
      const db=getCloudDb();
      await db`UPDATE zra_connector_credentials SET last_seen_at=now(),updated_at=now() WHERE id=${auth.id}`;
      await db`INSERT INTO zra_connector_events (id,user_id,device_id,connector_id,event_type,status,payload)
        VALUES(${crypto.randomUUID()},${auth.user_id},${auth.device_id},${auth.connector_id},'HEARTBEAT','received',${JSON.stringify(body.metadata||{})})`;
      return Response.json({ok:true,serverTime:new Date().toISOString()});
    }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
  }}}
});