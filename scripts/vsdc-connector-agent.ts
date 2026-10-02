import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import {
  initializeDevice, getStandardCodes, getItemClasses, saveItem, saveSales,
  selectInvoice, saveStockItems, saveStockMaster, vsdcPost,
  DEFAULT_PATHS,
} from "../src/lib/zra/vsdc";

type Config={cloudUrl:string;connectorId:string;credential:string;vsdcUrl:string;pollSeconds?:number;environment?:"test"|"production"};
const base=dirname(process.execPath);
const configPath=join(base,"connector.json");

function load():Config{
 if(!existsSync(configPath)) throw new Error("Create connector.json from connector.example.json before starting the connector.");
 return JSON.parse(readFileSync(configPath,"utf8"));
}
function sleep(ms:number){return new Promise(r=>setTimeout(r,ms));}
async function api(cfg:Config,path:string,body:any){
 const res=await fetch(cfg.cloudUrl.replace(/\/$/,"")+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 const raw=await res.text(); let data:any; try{data=JSON.parse(raw)}catch{throw new Error("Cloud returned non-JSON HTTP "+res.status);}
 if(!res.ok) throw new Error(data.error||"Cloud HTTP "+res.status); return data;
}
// Safe diagnostic: reports only reachability, HTTP status, version and circuit breaker.
async function vsdcHealth(cfg:Config){
 const root=cfg.vsdcUrl.replace(/\/$/,""); const out:any={reachable:false};
 try{const r=await fetch(root,{signal:AbortSignal.timeout(8000)});out.reachable=true;out.httpStatus=r.status;
  const m=(await r.text()).match(/version[^0-9]{0,30}(\d+(?:\.\d+){1,3})/i); if(m) out.version=m[1];
 }catch(e:any){out.error=String(e?.message||e).slice(0,200);return out;}
 try{const r=await fetch(root+"/monitor/metrics",{signal:AbortSignal.timeout(8000)});const j:any=await r.json();
  out.healthy=typeof j.healthy==="boolean"?j.healthy:null;
  const cb=j.circuitBreaker; out.circuitBreaker=typeof cb==="string"?cb:(cb?.state??cb?.status??null);
  if(!out.version&&j.version) out.version=String(j.version);
  if(typeof j.tenants==="number") out.tenants=j.tenants; else if(Array.isArray(j.tenants)) out.tenants=j.tenants.length;
 }catch{/* metrics optional */}
 return out;
}
async function execute(cfg:Config,command:any){
 const p=command.payload||{}; const local={baseUrl:cfg.vsdcUrl};
 switch(String(command.command_type)){
  case "test_connection": return vsdcPost(DEFAULT_PATHS.testEcho,p,local);
  case "vsdc_health": return vsdcHealth(cfg);
  case "initialize": return initializeDevice(p,local);
  case "server_time": return vsdcPost(DEFAULT_PATHS.serverTime,p,local);
  case "taxpayer_info": return vsdcPost(DEFAULT_PATHS.taxpayerInfo,p,local);
  case "standard_codes": return getStandardCodes(p,local);
  case "item_classes": return getItemClasses(p,local);
  case "register_item": return saveItem(p,local);
  case "submit_sale": return saveSales(p,local);
  case "retrieve_invoice": return selectInvoice(p,local);
  case "stock_items": return saveStockItems(p,local);
  case "stock_master": return saveStockMaster(p,local);
  default: throw new Error("UNSUPPORTED_VSDC_COMMAND:"+command.command_type);
 }
}
async function main(){
 const cfg=load(); console.log("SifoBooks VSDC Connector starting:",cfg.connectorId,cfg.environment||"test");
 while(true){
  try{
   const capabilities=["test_connection","vsdc_health","initialize","server_time","taxpayer_info","standard_codes","item_classes","register_item","submit_sale","retrieve_invoice","stock_items","stock_master"];
   await api(cfg,"/api/connector/heartbeat",{connectorId:cfg.connectorId,credential:cfg.credential,capabilities,metadata:{agent:"sifobooks-vsdc-connector",version:"1.1.0",environment:cfg.environment||"test"}});
   const result=await api(cfg,"/api/connector/poll",{connectorId:cfg.connectorId,credential:cfg.credential,limit:10});
   for(const command of result.commands||[]){
    try{
     const response=await execute(cfg,command);
     await api(cfg,"/api/connector/complete",{connectorId:cfg.connectorId,credential:cfg.credential,commandId:command.id,success:true,response});
     console.log("Completed",command.id,command.command_type);
    }catch(error:any){
     await api(cfg,"/api/connector/complete",{connectorId:cfg.connectorId,credential:cfg.credential,commandId:command.id,success:false,errorMessage:String(error?.message||error)});
     console.error("Command failed",command.id,error);
    }
   }
  }catch(error:any){console.error("Connector cycle failed:",String(error?.message||error));}
  await sleep(Math.max(Number(cfg.pollSeconds||10),3)*1000);
 }
}
main().catch(e=>{console.error(e);process.exit(1);});
