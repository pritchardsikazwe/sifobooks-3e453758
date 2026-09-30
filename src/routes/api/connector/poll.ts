import { createFileRoute } from "@tanstack/react-router";
import { authenticateZraConnector, getConnectorDb } from "@/lib/zra/connector.server";

export const Route = createFileRoute("/api/connector/poll")({
  server:{handlers:{POST:async({request})=>{
    try{
      const body=await request.json();
      const auth=await authenticateZraConnector(String(body.connectorId||""),String(body.credential||""));
      const db=getConnectorDb();
      const limit=Math.min(Math.max(Number(body.limit||20),1),100);
      const {data:rows,error}=await db.from("zra_connector_commands")
        .select("id,command_type,payload,created_at")
        .eq("user_id",auth.user_id).eq("connector_id",auth.connector_id).eq("status","queued")
        .order("created_at",{ascending:true}).limit(limit);
      if(error) throw new Error(error.message);
      for(const row of rows||[]){
        await db.from("zra_connector_commands").update({status:"delivered",delivered_at:new Date().toISOString()})
          .eq("id",row.id).eq("user_id",auth.user_id).eq("connector_id",auth.connector_id);
      }
      return Response.json({commands:(rows||[]).map((row:any)=>({...row,payload:typeof row.payload==="string"?JSON.parse(row.payload||"{}"):row.payload}))});
    }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
  }}}
});
