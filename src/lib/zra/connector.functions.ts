import { createServerFn } from "@tanstack/react-start";\nimport { supabase } from "@/integrations/supabase/client";
import { registerZraConnector, listZraConnectors } from "./connector.server";

export const zraRegisterConnectorFn=createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;deviceId?:string|null;name?:string|null;environment?:string})
  .handler(({data})=>registerZraConnector(data));

export const zraListConnectorsFn=createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;deviceId?:string|null})
  .handler(({data})=>listZraConnectors(data));
