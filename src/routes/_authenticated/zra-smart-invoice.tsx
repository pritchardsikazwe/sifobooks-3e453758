import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Database, KeyRound, RefreshCw, Server, Wifi, WifiOff, Boxes, Save, Laptop, Cloud, Network, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  zraGetConfigFn, zraGetStandardCodesFn, zraInitializeDeviceFn, zraSaveConfigFn,
  zraSyncCatalogFn, zraListInventoryFn, zraSearchItemClassesFn, zraListStandardCodesFn,
  zraMapInventoryItemFn, zraRegisterInventoryItemFn, zraListDevicesFn, zraSaveDeviceFn,
} from "@/lib/zra/server";

export const Route = createFileRoute("/_authenticated/zra-smart-invoice")({
  head: () => ({ meta: [
    { title: "ZRA Smart Invoice — SifoBooks" },
    { name: "description", content: "Configure ZRA VSDC and map SifoBooks inventory to the ZRA dictionary." },
  ]}),
  component: ZraSmartInvoicePage,
});

type Config = { id?:string; mode?:string; taxpayer_name?:string; tpin?:string; branch_code?:string; device_serial?:string; vsdc_endpoint?:string; last_verified_at?:string; notes?:string; device_id?:string; deployment_mode?:string; connector_endpoint?:string; device_name?:string; terminal_id?:string };
type InventoryItem = any;
type ZraClass = any;
type ZraCode = any;

function ZraSmartInvoicePage() {
  const [userId,setUserId]=useState("");
  const [config,setConfig]=useState<Config>({});
  const [form,setForm]=useState<Config>({mode:"test",deployment_mode:"local",vsdc_endpoint:""});
  const [stats,setStats]=useState({pending:0,submitted:0,failed:0,total:0});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [inventory,setInventory]=useState<InventoryItem[]>([]);
  const [inventorySearch,setInventorySearch]=useState("");
  const [selectedItem,setSelectedItem]=useState<InventoryItem|null>(null);
  const [classSearch,setClassSearch]=useState("");
  const [classes,setClasses]=useState<ZraClass[]>([]);
  const [codes,setCodes]=useState<ZraCode[]>([]);
  const [mapForm,setMapForm]=useState<any>({});
  const [devices,setDevices]=useState<any[]>([]);
  const [selectedDeviceId,setSelectedDeviceId]=useState("");
  const [deviceDraft,setDeviceDraft]=useState<any>({deviceName:"POS 1",deviceType:"desktop",terminalId:"",deploymentMode:"local",environment:"test",tpin:"",branchCode:"000",deviceSerial:"",vsdcEndpoint:"",connectorEndpoint:""});


  const load=async(uid:string,preferredDeviceId?:string)=>{
    const deviceResult:any=await zraListDevicesFn({data:{userId:uid}});
    const deviceRows=deviceResult?.data ?? [];
    setDevices(deviceRows);
    const nextDeviceId=preferredDeviceId || selectedDeviceId || deviceRows[0]?.id || "";
    if(nextDeviceId){
      setSelectedDeviceId(nextDeviceId);
      const result=await zraGetConfigFn({data:{userId:uid,deviceId:nextDeviceId}});
      const saved=(result as any)?.data ?? {};
      setConfig(saved); setForm(old=>({...old,...saved,device_id:nextDeviceId}));
    }
    const {data:queue}=await supabase.from("zra_invoice_queue").select("status").eq("user_id",uid);
    const rows=queue??[];
    setStats({
      total:rows.length,
      pending:rows.filter((x:any)=>["pending","submitting"].includes(x.status)).length,
      submitted:rows.filter((x:any)=>x.status==="submitted").length,
      failed:rows.filter((x:any)=>x.status==="failed").length,
    });
    const inv=await zraListInventoryFn({data:{userId:uid,search:inventorySearch,limit:100}});
    setInventory((inv as any)?.data??[]);
  };

  useEffect(()=>{void (async()=>{
    const {data}=await supabase.auth.getUser();
    if(!data.user)return;
    setUserId(data.user.id);
    const inv=await zraListInventoryFn({data:{userId:data.user.id,limit:100}});
    setInventory((inv as any)?.data??[]);
    await load(data.user.id);
  })();},[]);

  const update=(key:keyof Config,value:string)=>setForm(old=>({...old,[key]:value}));

  const save=async()=>{
    if(!userId)return;
    setBusy(true);
    try{
      await zraSaveConfigFn({data:{
        userId,deviceId:selectedDeviceId || null,mode:form.mode,taxpayerName:form.taxpayer_name,tpin:form.tpin,
        branchCode:form.branch_code,deviceSerial:form.device_serial,vsdcEndpoint:form.vsdc_endpoint,notes:form.notes,
        deviceName:form.device_name || deviceDraft.deviceName || "SifoBooks Device",deviceType:"desktop",
        terminalId:form.terminal_id || null,deploymentMode:form.deployment_mode || "local",connectorEndpoint:form.connector_endpoint || null
      }});
      await load(userId, selectedDeviceId || undefined); toast.success("ZRA Smart Invoice configuration saved");
    }catch(e:any){toast.error(e?.message||"Could not save ZRA configuration");}
    finally{setBusy(false);}
  };

  const initialize=async()=>{
    if(!userId||!form.tpin||!form.branch_code||!form.device_serial){toast.error("Enter TPIN, Branch ID and Device Serial first.");return;}
    setBusy(true);setMessage("Initializing the VSDC device...");
    try{
      const result:any=await zraInitializeDeviceFn({data:{userId,deviceId:selectedDeviceId || null,tpin:form.tpin,bhfId:form.branch_code,dvcSrlNo:form.device_serial}});
      if(result?.resultCd==="000"){setMessage("VSDC initialized successfully.");toast.success("ZRA VSDC initialized");await load(userId);}
      else{setMessage(result?.resultMsg||"VSDC returned an unsuccessful result.");toast.error(result?.resultMsg||"VSDC initialization failed");}
    }catch(e:any){setMessage(e?.message||"Could not reach the VSDC.");toast.error(e?.message||"Could not reach the VSDC");}
    finally{setBusy(false);}
  };

  const syncCatalog=async()=>{
    if(!userId||!form.tpin||!form.branch_code){toast.error("Enter TPIN and Branch ID first.");return;}
    setBusy(true);setMessage("Downloading the current ZRA standard-code and UNSPSC dictionaries from VSDC...");
    try{
      const result:any=await zraSyncCatalogFn({data:{userId,tpin:form.tpin,bhfId:form.branch_code,lastReqDt:"20100101000000"}});
      setMessage(`Dictionary sync complete: ${result.codeCount} standard codes and ${result.classCount} item classifications stored locally.`);
      toast.success("ZRA dictionaries synchronized");
      await loadDictionaries();
    }catch(e:any){toast.error(e?.message||"Dictionary synchronization failed");}
    finally{setBusy(false);}
  };

  const loadDictionaries=async()=>{
    if(!userId)return;
    const [cl,co]=await Promise.all([
      zraSearchItemClassesFn({data:{userId,search:"",limit:100}}),
      zraListStandardCodesFn({data:{userId,search:"",limit:1000}}),
    ]);
    setClasses((cl as any)?.data??[]);
    setCodes((co as any)?.data??[]);
  };

  useEffect(()=>{if(userId)void loadDictionaries();},[userId]);

  const searchInventory=async()=>{
    if(!userId)return;
    const r=await zraListInventoryFn({data:{userId,search:inventorySearch,limit:100}});
    setInventory((r as any)?.data??[]);
  };

  const chooseItem=(item:InventoryItem)=>{
    setSelectedItem(item);
    setMapForm({
      itemClassCode:item.zra_item_class_code??"",
      itemTypeCode:item.zra_item_type_code??"",
      originCountryCode:item.zra_origin_country_code??"",
      pkgUnitCode:item.zra_pkg_unit_code??"",
      qtyUnitCode:item.zra_qty_unit_code??"",
      vatCategoryCode:item.zra_vat_category_code??"",
      taxRate:item.zra_tax_rate ?? item.vat_rate ?? 0,
    });
    setClassSearch("");
  };

  const searchClasses=async()=>{
    if(!userId)return;
    const r=await zraSearchItemClassesFn({data:{userId,search:classSearch,limit:50}});
    setClasses((r as any)?.data??[]);
  };

  const saveMapping=async()=>{
    if(!userId||!selectedItem)return;
    const required=["itemClassCode","itemTypeCode","originCountryCode","pkgUnitCode","qtyUnitCode","vatCategoryCode"];
    if(required.some(k=>!mapForm[k])){toast.error("Classification, packaging unit, quantity unit and VAT category are required.");return;}
    setBusy(true);
    try{
      const r:any=await zraMapInventoryItemFn({data:{userId,itemId:selectedItem.id,...mapForm,taxRate:Number(mapForm.taxRate)}});
      setSelectedItem(r.data); setInventory(old=>old.map(x=>x.id===selectedItem.id?r.data:x));
      toast.success(`${selectedItem.name} mapped to ZRA`);
    }catch(e:any){toast.error(e?.message||"Could not save ZRA mapping");}
    finally{setBusy(false);}
  };

  const codeOptions=(needle:string)=>{
    const n=needle.toLowerCase();
    return codes.filter(c=>String(c.code_class_name??"").toLowerCase().includes(n)||String(c.name??"").toLowerCase().includes(n)).slice(0,300);
  };
  const taxCodes=useMemo(()=>codeOptions("taxation type"),[codes]);
  const unitCodes=useMemo(()=>codes.filter(c=>/unit|measure/i.test(String(c.code_class_name??""))).slice(0,300),[codes]);
  const itemTypeCodes=useMemo(()=>codeOptions("product type"),[codes]);
  const countryCodes=useMemo(()=>codeOptions("country"),[codes]);

  const status=config.mode==="initialized"?"connected":config.mode==="test"?"test":"not_configured";

  return <div className="space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold tracking-tight">ZRA Smart Invoice</h1><p className="text-sm text-muted-foreground">VSDC connection, ZRA dictionary mapping and automatic POS submission.</p></div>
      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>userId&&load(userId)} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button><Button size="sm" onClick={save} disabled={busy}>Save configuration</Button></div>
    </div>

    <Card className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 ${status==="connected"?"border-emerald-200 bg-emerald-50/60":"border-amber-200 bg-amber-50/60"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status==="connected"?"bg-emerald-600":"bg-amber-500"} text-white`}>{status==="connected"?<Wifi className="h-5 w-5"/>:<WifiOff className="h-5 w-5"/>}</div>
      <div className="min-w-0 flex-1"><div className="font-medium">{status==="connected"?"ZRA VSDC initialized":status==="test"?"VSDC configured — not initialized":"ZRA VSDC not configured"}</div><div className="truncate text-xs text-muted-foreground">{form.vsdc_endpoint||"No VSDC endpoint"}{config.last_verified_at?` · verified ${config.last_verified_at}`:""}</div></div>
      <Badge className={status==="connected"?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800"}>{status}</Badge>
    </Card>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[["Total",stats.total,Database],["Submitted",stats.submitted,CheckCircle2],["Pending",stats.pending,Server],["Failed",stats.failed,CircleAlert]].map(([label,value,Icon]:any)=><Card key={label} className="rounded-xl p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4"/>{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></Card>)}
    </div>

    <Card className="rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2"><Laptop className="h-5 w-5"/><div><h2 className="font-semibold">ZRA Devices</h2><p className="text-xs text-muted-foreground">Each ZRA device keeps its own TPIN + Branch ID + Device Serial identity. Register every computer/device assigned by ZRA separately.</p></div></div>
        <Button variant="outline" size="sm" onClick={()=>{setSelectedDeviceId("");const next={deviceName:`POS ${devices.length+1}`,deviceType:"desktop",terminalId:`POS-${String(devices.length+1).padStart(3,"0")}`,deploymentMode:"local",environment:"test",tpin:form.tpin||"",branchCode:form.branch_code||"000",deviceSerial:"",vsdcEndpoint:form.vsdc_endpoint||"",connectorEndpoint:""};setDeviceDraft(next);setForm(old=>({...old,device_id:"",device_name:next.deviceName,terminal_id:next.terminalId,deployment_mode:next.deploymentMode,mode:next.environment,tpin:next.tpin,branch_code:next.branchCode,device_serial:"",vsdc_endpoint:next.vsdcEndpoint,connector_endpoint:""}));}}><Plus className="mr-2 h-4 w-4"/>New device</Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((d:any)=><button type="button" key={d.id} onClick={async()=>{setSelectedDeviceId(d.id);if(userId){const r:any=await zraGetConfigFn({data:{userId,deviceId:d.id}});setConfig(r?.data??{});setForm(old=>({...old,...(r?.data??{}),device_id:d.id}));}}} className={`rounded-xl border p-4 text-left transition hover:border-primary/50 ${selectedDeviceId===d.id?"border-primary bg-primary/5":"bg-background"}`}>
          <div className="flex items-center justify-between gap-2"><span className="font-medium">{d.device_name}</span><Badge variant={d.initialization_status==="initialized"?"default":"secondary"}>{d.initialization_status==="initialized"?"Active":"Not initialized"}</Badge></div>
          <div className="mt-2 text-xs text-muted-foreground">Branch {d.branch_code} · Serial {d.device_serial}</div>
          <div className="mt-1 flex items-center gap-2 text-xs"><span className="capitalize">{d.deployment_mode}</span>{d.deployment_mode==="cloud"?<Cloud className="h-3.5 w-3.5"/>:d.deployment_mode==="hybrid"?<Network className="h-3.5 w-3.5"/>:<Laptop className="h-3.5 w-3.5"/>}</div>
        </button>)}
        {!devices.length&&<div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">No ZRA devices registered yet. Create one for each computer/device registered by ZRA.</div>}
      </div>
    </Card>

    <Card className="rounded-xl p-5">
      <div className="mb-5 flex items-center gap-2"><Server className="h-5 w-5"/><div><h2 className="font-semibold">VSDC Connection</h2><p className="text-xs text-muted-foreground">SifoBooks communicates with the local Java/Tomcat VSDC over REST/JSON.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>ZRA Environment</Label><Select value={form.mode||"test"} onValueChange={v=>update("mode",v)}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="test">TEST / UAT</SelectItem><SelectItem value="production">PRODUCTION</SelectItem></SelectContent></Select></div>
        <div><Label>Deployment</Label><Select value={form.deployment_mode||"local"} onValueChange={v=>update("deployment_mode",v)}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="local">Local VSDC</SelectItem><SelectItem value="network">Network VSDC</SelectItem><SelectItem value="cloud">Cloud + customer connector</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select></div>
        <div><Label>Device Name</Label><Input className="mt-1" value={form.device_name||""} onChange={e=>update("device_name",e.target.value)} placeholder="POS 1 / Office PC"/></div>
        <div><Label>Terminal ID</Label><Input className="mt-1" value={form.terminal_id||""} onChange={e=>update("terminal_id",e.target.value)} placeholder="POS-001"/></div>
        <div><Label>VSDC Endpoint</Label><Input className="mt-1" value={form.vsdc_endpoint||""} onChange={e=>update("vsdc_endpoint",e.target.value)} placeholder="Local VSDC URL supplied by ZRA deployment"/></div>
        <div><Label>Cloud Connector Endpoint</Label><Input className="mt-1" value={form.connector_endpoint||""} onChange={e=>update("connector_endpoint",e.target.value)} placeholder="Only for cloud/hybrid deployments"/></div>
        <div><Label>TPIN</Label><Input className="mt-1" value={form.tpin||""} onChange={e=>update("tpin",e.target.value)} placeholder="ZRA TPIN"/></div>
        <div><Label>Branch ID</Label><Input className="mt-1" value={form.branch_code||""} onChange={e=>update("branch_code",e.target.value)} placeholder="000"/></div>
        <div><Label>Device Serial</Label><Input className="mt-1" value={form.device_serial||""} onChange={e=>update("device_serial",e.target.value)} placeholder="VSDC device serial"/></div>
        <div><Label>Taxpayer Name</Label><Input className="mt-1" value={form.taxpayer_name||""} onChange={e=>update("taxpayer_name",e.target.value)} placeholder="Registered taxpayer name"/></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><Button onClick={save} disabled={busy}>Save configuration</Button><Button variant="outline" onClick={initialize} disabled={busy}><KeyRound className="mr-2 h-4 w-4"/>Initialize Device</Button><Button variant="outline" onClick={syncCatalog} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Sync ZRA Dictionaries</Button></div>
      {message&&<div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">{message}</div>}
    </Card>

    <Card className="rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Boxes className="h-5 w-5"/><div><h2 className="font-semibold">Inventory → ZRA Mapping</h2><p className="text-xs text-muted-foreground">Every item must use codes from the synchronized VSDC dictionaries. SifoBooks does not guess UNSPSC classifications.</p></div></div><Badge variant="secondary">{inventory.filter(x=>x.zra_sync_status==="mapped").length}/{inventory.length} mapped</Badge></div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.35fr]">
        <div>
          <div className="flex gap-2"><Input value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void searchInventory()}} placeholder="Search item, SKU or barcode"/><Button variant="outline" onClick={searchInventory}><RefreshCw className="h-4 w-4"/></Button></div>
          <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border">
            {inventory.map(item=><button type="button" key={item.id} onClick={()=>chooseItem(item)} className={`flex w-full items-center justify-between border-b p-3 text-left hover:bg-muted/50 ${selectedItem?.id===item.id?"bg-muted":""}`}><span><span className="block font-medium">{item.name}</span><span className="text-xs text-muted-foreground">{item.sku||item.barcode||item.id}</span></span><Badge variant={item.zra_sync_status==="mapped"?"default":"secondary"}>{item.zra_sync_status==="mapped"?"Mapped":"Unmapped"}</Badge></button>)}
            {!inventory.length&&<div className="p-8 text-center text-sm text-muted-foreground">No inventory items found.</div>}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          {!selectedItem?<div className="py-16 text-center text-sm text-muted-foreground">Select an inventory item to map it to the ZRA dictionary.</div>:
          <div className="space-y-4">
            <div><h3 className="font-semibold">{selectedItem.name}</h3><p className="text-xs text-muted-foreground">Local item code: {selectedItem.sku||selectedItem.barcode||selectedItem.id}</p></div>
            <div><Label>UNSPSC / ZRA Item Classification</Label><div className="mt-1 flex gap-2"><Input value={classSearch} onChange={e=>setClassSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void searchClasses()}} placeholder="Search product classification"/><Button variant="outline" onClick={searchClasses}>Find</Button></div><div className="mt-2 max-h-36 overflow-auto rounded border">{classes.slice(0,50).map(c=><button type="button" key={c.item_cls_cd} onClick={()=>setMapForm((x:any)=>({...x,itemClassCode:c.item_cls_cd}))} className={`block w-full border-b p-2 text-left text-xs hover:bg-muted ${mapForm.itemClassCode===c.item_cls_cd?"bg-muted":""}`}><b>{c.item_cls_cd}</b> — {c.item_cls_nm}</button>)}</div><div className="mt-1 text-xs">Selected: <b>{mapForm.itemClassCode||"None"}</b></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Packaging Unit</Label><Input list="zra-unit-codes" value={mapForm.pkgUnitCode||""} onChange={e=>setMapForm((x:any)=>({...x,pkgUnitCode:e.target.value}))} placeholder="ZRA code"/><datalist id="zra-unit-codes">{unitCodes.map((c:any)=><option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}</datalist></div>
              <div><Label>Quantity Unit</Label><Input list="zra-qty-codes" value={mapForm.qtyUnitCode||""} onChange={e=>setMapForm((x:any)=>({...x,qtyUnitCode:e.target.value}))} placeholder="ZRA code"/><datalist id="zra-qty-codes">{unitCodes.map((c:any)=><option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}</datalist></div>
              <div><Label>VAT Category</Label><Input list="zra-tax-codes" value={mapForm.vatCategoryCode||""} onChange={e=>setMapForm((x:any)=>({...x,vatCategoryCode:e.target.value}))} placeholder="A / B / C1 / ..."/><datalist id="zra-tax-codes">{taxCodes.map((c:any)=><option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}</datalist></div>
              <div><Label>Tax Rate</Label><Input type="number" value={mapForm.taxRate??0} onChange={e=>setMapForm((x:any)=>({...x,taxRate:e.target.value}))}/></div>
              <div><Label>Product Type Code</Label><Input list="zra-type-codes" value={mapForm.itemTypeCode||""} onChange={e=>setMapForm((x:any)=>({...x,itemTypeCode:e.target.value}))} placeholder="ZRA code"/><datalist id="zra-type-codes">{itemTypeCodes.map((c:any)=><option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}</datalist></div>
              <div><Label>Origin Country Code</Label><Input list="zra-country-codes" value={mapForm.originCountryCode||""} onChange={e=>setMapForm((x:any)=>({...x,originCountryCode:e.target.value}))} placeholder="ZM"/><datalist id="zra-country-codes">{countryCodes.map((c:any)=><option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}</datalist></div>
            </div>
            <div className="flex flex-wrap gap-2"><Button onClick={saveMapping} disabled={busy}><Save className="mr-2 h-4 w-4"/>Save ZRA Mapping</Button><Button variant="outline" onClick={async()=>{if(!selectedItem||!userId)return;setBusy(true);try{const r:any=await zraRegisterInventoryItemFn({data:{userId,itemId:selectedItem.id}});if(r?.response?.resultCd==="000"){setSelectedItem(r.data);setInventory(old=>old.map(x=>x.id===selectedItem.id?r.data:x));toast.success("Item registered with ZRA VSDC");}else toast.error(r?.response?.resultMsg||"ZRA item registration failed");}catch(e:any){toast.error(e?.message||"Could not register item with ZRA");}finally{setBusy(false);}}} disabled={busy||selectedItem.zra_sync_status!=="mapped"}>Register with ZRA</Button></div>
          </div>}
        </div>
      </div>
    </Card>

    <Card className="rounded-xl border-blue-200 bg-blue-50/50 p-4 text-sm"><strong>Device and certification safety:</strong> ZRA's VSDC initialization requires the TPIN, Branch ID and Device Serial Number assigned through Device Management. Each device is initialized separately. Keep TEST/UAT separate from PRODUCTION and do not copy device credentials between computers. SifoBooks does not claim ZRA certification until the formal certification/UAT process is completed.  Keep SifoBooks in TEST/UAT until the ZRA integration is approved. ZRA describes certified invoicing systems as ERP/accounting systems integrated through VSDC after certification. <a className="underline" href="https://www.zra.org.zm/smart-invoice-learn-more/" target="_blank" rel="noreferrer">ZRA Smart Invoice guidance</a></Card>
  </div>;
}
