import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import { getCloudDb } from "../cloud/postgres";

function authClient(authToken?: string){
  const token=(authToken || getRequestHeader("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  const url=import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!token||!url||!key) throw new Error("NOT_AUTHENTICATED");
  return createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
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
  const {userId}=await requireUser(data.authToken);
  if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const db=getCloudDb();
  const device= data.deviceId
    ? await db`SELECT id,company_id,branch_id,device_name,environment,device_serial FROM zra_devices WHERE id=${data.deviceId} AND user_id=${userId} LIMIT 1`
    : await db`SELECT id,company_id,branch_id,device_name,environment,device_serial FROM zra_devices WHERE user_id=${userId} ORDER BY updated_at DESC LIMIT 1`;
  if(!device[0]) throw new Error("ZRA_DEVICE_NOT_FOUND");
  const connectorId="SIF-"+crypto.randomUUID().replaceAll("-","").slice(0,16).toUpperCase();
  const credential=newCredential();
  const hash=await hashCredential(credential);
  await db`UPDATE zra_connector_credentials SET status='revoked',revoked_at=now() WHERE user_id=${userId} AND device_id=${device[0].id} AND status='active'`;
  await db`INSERT INTO zra_connector_credentials
    (id,user_id,company_id,device_id,connector_id,credential_hash,status,environment,name)
    VALUES(${crypto.randomUUID()},${userId},${device[0].company_id||null},${device[0].id},${connectorId},${hash},'active',${data.environment||device[0].environment||"test"},${data.name||device[0].device_name||"SifoBooks Connector"})`;
  await db`INSERT INTO zra_connector_events
    (id,user_id,device_id,connector_id,event_type,status,payload)
    VALUES(${crypto.randomUUID()},${userId},${device[0].id},${connectorId},'REGISTERED','success',${JSON.stringify({environment:data.environment||device[0].environment||"test"})})`;
  return {connectorId,credential,deviceId:device[0].id,deviceSerial:device[0].device_serial,environment:data.environment||device[0].environment||"test",warning:"Store this credential securely. It is shown only once."};
}

export async function listZraConnectors(data:{userId:string;deviceId?:string|null}){
  const {userId}=await requireUser(data.authToken);
  if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const db=getCloudDb();
  const rows=data.deviceId
    ? await db`SELECT id,device_id,connector_id,status,environment,name,last_used_at,last_seen_at,created_at,updated_at FROM zra_connector_credentials WHERE user_id=${userId} AND device_id=${data.deviceId} ORDER BY created_at DESC`
    : await db`SELECT id,device_id,connector_id,status,environment,name,last_used_at,last_seen_at,created_at,updated_at FROM zra_connector_credentials WHERE user_id=${userId} ORDER BY created_at DESC`;
  return {data:rows};
}

export async function authenticateZraConnector(connectorId:string,credential:string){
  const hash=await hashCredential(credential);
  const db=getCloudDb();
  const rows=await db`SELECT id,user_id,company_id,device_id,connector_id,environment,status FROM zra_connector_credentials
    WHERE connector_id=${connectorId} AND credential_hash=${hash} AND status='active'
    LIMIT 1`;
  if(!rows[0]) throw new Error("CONNECTOR_AUTH_FAILED");
  await db`UPDATE zra_connector_credentials SET last_used_at=now(),updated_at=now() WHERE id=${rows[0].id}`;
  return rows[0];
}

export { getCloudDb };
