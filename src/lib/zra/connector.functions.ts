import { createServerFn } from "@tanstack/react-start";
import { supabase from "@/integrations/supabase/client";
import { registerZraConnector, listZraConnectors } from "./connector.server";

const withConnectorAuth=async(fn:any,args:any)=>{
  const {data:sessionData}=await supabase.auth.getSession();
  const token=sessionData.session?.access_token;
  if(!token) throw new Error("NOT_AUTHENTICATED");
  return fn({...args,data:{...(args?.data||{}),authToken:token}});
};

const registerConnectorServerFn=createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;deviceId?:string|null;name?:string|null;environment?:string;authToken?:string})
  .handler(({data})=>registerZraConnector(data));

const listConnectorsServerFn=createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;deviceId?:string|null;authToken?:string})
  .handler(({data})=>listZraConnectors(data));

export const zraRegisterConnectorFn=(args:any)=>withConnectorAuth(registerConnectorServerFn,args);
export const zraListConnectorsFn=(args:any)=>withConnectorAuth(listConnectorsServerFn,args);
