import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";

function supabaseUrl(){
  return import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function publishableKey(){
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
}

function authClient(){
  const token=(getRequestHeader("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  const url=supabaseUrl();
  const key=publishableKey();
  if(!token||!url||!key) throw new Error("NOT_AUTHENTICATED");
  return createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
}

/**
 * Hosted connector-control-plane database client (server-only).
 * Connector tables have RLS on with no browser policies, so only the
 * service role can reach them. Fails closed if it is missing.
 * Never expose the service role key to the browser.
 */
export function getConnectorDb(){
  const url=process.env.SUPABASE_URL || supabaseUrl();
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("CONNECTOR_SERVER_NOT_CONFIGURED");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function requireUser(){
  const db=authClient();
  const {data,error}=await db.auth.getUser();
  if(error||!data.user) throw new Error("NOT_AUTHENTICATED");
  return {userId:data.user.id};
}

async function hashCredential(value:string){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
}

function newCredential(){return crypto.randomUUID()+"."+crypto.randomUUID();}

export async function registerZraConnector(data:{userId:string;deviceId?:string|null;name?:string|null;environment?:string}){
  const {userId}=await requireUser();
  if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const db=getConnectorDb();
  const query=data.deviceId
    ? db.from("zra_devices").select("id,company_id,branch_id,device_name,environment,device_serial").eq("id",data.deviceId).eq("user_id",userId).limit(1)
    : db.from("zra_devices").select("id,company_id,branch_id,device_name,environment,device_serial").eq("user_id",userId).order("updated_at",{ascending:false}).limit(1);
  const {data:rows,error}=await query;
  if(error) throw new Error(error.message);
  const device=rows?.[0];
  if(!device) throw new Error("ZRA_DEVICE_NOT_FOUND");

  const connectorId="SIF-"+crypto.randomUUID().replaceAll("-","").slice(0,16).toUpperCase();
  const credential=newCredential();
  const hash=await hashCredential(credential);
  const {error:revokeError}=await db.from("zra_connector_credentials")
    .update({status:"revoked",revoked_at:new Date().toISOString(),updated_at:new Date().toISOString()})
    .eq("user_id",userId).eq("device_id",device.id).eq("status","active");
  if(revokeError) throw new Error(revokeError.message);

  const {error:insertError}=await db.from("zra_connector_credentials").insert({
    id:crypto.randomUUID(),user_id:userId,company_id:device.company_id||null,device_id:device.id,
    connector_id:connectorId,credential_hash:hash,status:"active",
    environment:data.environment||device.environment||"test",
    name:data.name||device.device_name||"SifoBooks Connector"
  });
  if(insertError) throw new Error(insertError.message);

  const {error:eventError}=await db.from("zra_connector_events").insert({
    id:crypto.randomUUID(),user_id:userId,device_id:device.id,connector_id:connectorId,
    event_type:"REGISTERED",status:"success",
    payload:JSON.stringify({environment:data.environment||device.environment||"test"})
  });
  if(eventError) throw new Error(eventError.message);

  return {connectorId,credential,deviceId:device.id,deviceSerial:device.device_serial,environment:data.environment||device.environment||"test",warning:"Store this credential securely. It is shown only once."};
}

export async function listZraConnectors(data:{userId:string;deviceId?:string|null}){
  const {userId}=await requireUser();
  if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const db=getConnectorDb();
  let query=db.from("zra_connector_credentials")
    .select("id,device_id,connector_id,status,environment,name,last_used_at,last_seen_at,created_at,updated_at")
    .eq("user_id",userId).order("created_at",{ascending:false});
  if(data.deviceId) query=query.eq("device_id",data.deviceId);
  const {data:rows,error}=await query;
  if(error) throw new Error(error.message);
  return {data:rows??[]};
}

export async function authenticateZraConnector(connectorId:string,credential:string){
  const hash=await hashCredential(credential);
  const db=getConnectorDb();
  const {data:row,error}=await db.from("zra_connector_credentials")
    .select("id,user_id,company_id,device_id,connector_id,environment,status")
    .eq("connector_id",connectorId).eq("credential_hash",hash).eq("status","active").maybeSingle();
  if(error) throw new Error(error.message);
  if(!row) throw new Error("CONNECTOR_AUTH_FAILED");
  await db.from("zra_connector_credentials").update({last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",row.id);
  return row;
}
