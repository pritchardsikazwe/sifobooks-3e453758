import { createFileRoute } from "@tanstack/react-router";
import { authenticateConnector } from "@/lib/cloud/connector";
import { getCloudDb } from "@/lib/cloud/postgres";

export const Route = createFileRoute("/api/connector/heartbeat")({
  server:{handlers:{POST:async({request})=>{
    try{
      const body=await request.json();
      const tenantId=await authenticateConnector(String(body.connectorId||""),String(body.credential||""));
      const db=getCloudDb();
      await db\`UPDATE cloud_connector_credentials SET last_used_at=now() WHERE tenant_id=\${tenantId} AND connector_id=\${body.connectorId}\`;
      await db\`UPDATE cloud_connectors SET status='online',last_seen_at=now(),capabilities=\${JSON.stringify(body.capabilities||{})},updated_at=now() WHERE tenant_id=\${tenantId} AND connector_id=\${body.connectorId}\`;
      return Response.json({ok:true,serverTime:new Date().toISOString()});
    }catch(e:any){return Response.json({error:String(e?.message||e)},{status:401});}
  }}}
});