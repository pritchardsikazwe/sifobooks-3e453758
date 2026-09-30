import { createFileRoute } from "@tanstack/react-router";
import { authenticateZraConnector, getCloudDb } from "@/lib/zra/connector.server";

export const Route = createFileRoute("/api/connector/poll")({
  server:{handlers:{POST:async({request})=>{
    try{
      const body=await request.json();
      const auth=await authenticateZraConnector(String(body.connectorId||""),String(body.credential||""));
      const db=getCloudDb();
      const limit=Math.min(Math.max(Number(body.limit||20),1),100);
      const rows=await db`SELECT id,command_type,payload,created_at FROM zra_connector_commands
        WHERE user_id=${auth.user_id} AND connector_id=${auth.connector_id} AND status='queued'
        ORDER BY created_at ASC LIMIT ${limit}`;
      for(const row of rows){
        await db`UPDATE zra_connector_commands SET status='delivered',delivered_at=now()
          WHERE id=${row.id} AND user_id=${auth.user_id} AND connector_id=${auth.connector_id}`;
      }
      return Response.json({commands:rows.map((row:any)=>({...row,payload:typeof row.payload==="string"?JSON.parse(row.payload||"{}"):row.payload}))});
    }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
  }}}
});