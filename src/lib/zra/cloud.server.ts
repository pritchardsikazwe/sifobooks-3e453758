// Hosted/Lovable Cloud ZRA adapter.
// SERVER-ONLY MODULE: loaded dynamically by createServerFn handlers.
// It may safely access the request Authorization header and hosted Supabase.
// Windows/local mode continues to use src/lib/zra/server.ts's SQLite implementation.
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  getItemClasses,
  getStandardCodes,
  initializeDevice,
  isSuccessfulVsdcResponse,
  saveItem,
  saveSales,
  saveStockItems,
  saveStockMaster,
  selectInvoice,
} from "./vsdc";

function cloudClient(authToken?: string) {
  const token = (authToken || getRequestHeader("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token) throw new Error("NOT_AUTHENTICATED");
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser() {
  const db = cloudClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error("NOT_AUTHENTICATED");
  return { db, userId: data.user.id };
}

function vsdcUrl(config: any) {
  const url = config?.vsdc_endpoint || process.env.ZRA_VSDC_URL;
  if (!url) throw new Error("ZRA VSDC endpoint is not configured.");
  return url;
}

async function configFor(db: any, userId: string, branchId?: string | null, deviceId?: string | null) {
  if (deviceId) {
    const { data } = await db.from("zra_devices").select("*").eq("id", deviceId).eq("user_id", userId).maybeSingle();
    if (data) return {
      ...data,
      mode: data.environment === "production" ? "production" : (data.initialization_status === "initialized" ? "initialized" : "test"),
      device_id: data.id,
      branch_code: data.branch_code,
    };
  }
  const { data, error } = await db.from("zra_smart_invoice_config").select("*")
    .eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function cloudListDevices(data: { userId: string; branchId?: string | null }) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  let q = db.from("zra_devices").select("*").eq("user_id", userId).order("is_active", { ascending: false }).order("device_name");
  if (data.branchId) q = q.eq("branch_id", data.branchId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudSaveDevice(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const { data: existing } = data.deviceId
    ? await db.from("zra_devices").select("id").eq("id", data.deviceId).eq("user_id", userId).maybeSingle()
    : await db.from("zra_devices").select("id").eq("user_id", userId).eq("device_serial", data.deviceSerial).maybeSingle();
  const row = {
    id: existing?.id ?? crypto.randomUUID(),
    user_id: userId,
    company_id: data.companyId ?? null,
    branch_id: data.branchId ?? null,
    device_name: data.deviceName,
    device_type: data.deviceType ?? "desktop",
    terminal_id: data.terminalId ?? null,
    deployment_mode: data.deploymentMode ?? "local",
    environment: data.environment ?? "test",
    tpin: data.tpin ?? null,
    branch_code: data.branchCode,
    device_serial: data.deviceSerial,
    vsdc_endpoint: data.vsdcEndpoint ?? null,
    connector_endpoint: data.connectorEndpoint ?? null,
    taxpayer_name: data.taxpayerName ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await db.from("zra_devices").upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw new Error(error.message);
  return { data: saved };
}

export async function cloudGetConfig(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  return { data: await configFor(db, userId, data.branchId, data.deviceId), error: null };
}

export async function cloudSaveConfig(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");

  // In hosted mode the device record is the authoritative ZRA configuration.
  // Save it first so UAT setup is not blocked by the legacy config table's RLS.
  if (!data.deviceSerial || !data.branchCode) {
    throw new Error("ZRA_CONFIG_REQUIRED: Branch ID and Device Serial are required.");
  }

  const device = await cloudSaveDevice({
    userId,
    branchId: data.branchId,
    deviceId: data.deviceId,
    companyId: data.companyId,
    deviceName: data.deviceName ?? ("SifoBooks " + data.deviceSerial),
    deviceType: data.deviceType ?? "desktop",
    terminalId: data.terminalId,
    deploymentMode: data.deploymentMode ?? "local",
    environment: data.mode === "production" ? "production" : "test",
    tpin: data.tpin,
    branchCode: data.branchCode,
    deviceSerial: data.deviceSerial,
    vsdcEndpoint: data.vsdcEndpoint,
    connectorEndpoint: data.connectorEndpoint,
    taxpayerName: data.taxpayerName,
  });

  // Keep the legacy configuration row synchronized when its RLS policy permits it.
  // Failure here must not make the primary device save appear to fail.
  try {
    const row = {
      id: data.id ?? crypto.randomUUID(),
      user_id: userId,
      branch_id: data.branchId ?? null,
      mode: data.mode ?? "test",
      taxpayer_name: data.taxpayerName ?? null,
      tpin: data.tpin ?? null,
      branch_code: data.branchCode ?? null,
      device_serial: data.deviceSerial ?? null,
      vsdc_endpoint: data.vsdcEndpoint ?? null,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    };
    await db.from("zra_smart_invoice_config").upsert(row, { onConflict: "id" });
  } catch {
    // zra_devices remains the authoritative hosted configuration.
  }

  return { data: device.data, error: null };
}

export async function cloudInitializeDevice(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId, data.deviceId);
  if (!cfg) throw new Error("ZRA_DEVICE_NOT_CONFIGURED");
  const response: any = await initializeDevice(
    { tpin: data.tpin, bhfId: data.bhfId, dvcSrlNo: data.dvcSrlNo },
    { baseUrl: vsdcUrl(cfg) },
  );
  const success = isSuccessfulVsdcResponse(response);
  if (cfg.device_id) {
    await db.from("zra_devices").update({
      tpin: data.tpin, branch_code: data.bhfId, device_serial: data.dvcSrlNo,
      initialization_status: success ? "initialized" : "not_initialized",
      status: success ? "initialized" : "error",
      taxpayer_name: response?.data?.taxprNm ?? response?.data?.info?.taxprNm ?? cfg.taxpayer_name ?? null,
      last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", cfg.device_id).eq("user_id", userId);
    await db.from("zra_device_events").insert({
      id: crypto.randomUUID(), zra_device_id: cfg.device_id, user_id: userId,
      event_type: "INITIALIZE", status: success ? "success" : "error",
      message: response?.resultMsg ?? null, response_code: response?.resultCd ?? null,
      response_json: JSON.stringify(response),
    });
  }
  return response;
}

export async function cloudGetStandardCodes(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId);
  return getStandardCodes({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
}

export async function cloudGetItemClasses(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId);
  return getItemClasses({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
}

export async function cloudSyncCatalog(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId);
  const codes: any = await getStandardCodes({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
  let classes: any = await getItemClasses({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
  const classResponses = [classes];
  let previousDt = data.lastReqDt;
  for (let page = 1; page < 20 && isSuccessfulVsdcResponse(classes); page++) {
    const batch = Array.isArray(classes?.data?.itemClsList) ? classes.data.itemClsList : [];
    const nextDt = String(classes.resultDt ?? "");
    if (batch.length < 1000 || !nextDt || nextDt === previousDt) break;
    previousDt = nextDt;
    classes = await getItemClasses({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: nextDt }, { baseUrl: vsdcUrl(cfg) });
    classResponses.push(classes);
  }
  if (isSuccessfulVsdcResponse(codes)) {
    for (const cls of (codes.data?.clsList ?? [])) {
      for (const item of (cls.dtlList ?? [])) {
        await db.from("zra_standard_codes").upsert({
          id: crypto.randomUUID(), user_id: userId, branch_id: data.branchId ?? null,
          code_class: String(cls.cdCls ?? ""), code_class_name: cls.cdClsNm ?? null,
          code: String(item.cd ?? ""), name: item.cdNm ?? null,
          description: item.userDfnNm1 ?? null, raw_data: JSON.stringify(item),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,branch_id,code_class,code" });
      }
    }
  }
  if (classResponses.some(isSuccessfulVsdcResponse)) {
    for (const response of classResponses) {
      const rows = Array.isArray(response?.data?.itemClsList) ? response.data.itemClsList : [];
      for (const item of rows) {
        await db.from("zra_item_classes").upsert({
          id: crypto.randomUUID(), user_id: userId, branch_id: data.branchId ?? null,
          item_cls_cd: String(item.itemClsCd ?? ""), item_cls_nm: item.itemClsNm ?? null,
          item_cls_lvl: item.itemClsLvl == null ? null : Number(item.itemClsLvl),
          tax_ty_cd: item.taxTyCd ?? null, use_yn: item.useYn ?? null,
          raw_data: JSON.stringify(item), updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,branch_id,item_cls_cd" });
      }
    }
  }
  const { count: codeCount } = await db.from("zra_standard_codes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("branch_id", data.branchId ?? null);
  const { count: classCount } = await db.from("zra_item_classes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("branch_id", data.branchId ?? null);
  return { codes, classes, classResponses, classCountFromResponses: classResponses.length, codeCount: codeCount ?? 0, classCount: classCount ?? 0 };
}

export async function cloudListInventory(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const limit = Math.min(Math.max(Number(data.limit ?? 100), 1), 500);
  let q = db.from("stock_items").select("*").eq("user_id", userId).order("name").limit(limit);
  if ((data.search ?? "").trim()) {
    const s = data.search.trim();
    q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`);
  }
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudSearchItemClasses(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const limit = Math.min(Math.max(Number(data.limit ?? 50), 1), 200);
  let q = db.from("zra_item_classes").select("*").eq("user_id", userId).order("item_cls_lvl", { ascending: false }).order("item_cls_nm").limit(limit);
  if (data.branchId) q = q.eq("branch_id", data.branchId);
  if ((data.search ?? "").trim()) {
    const s = data.search.trim();
    q = q.or(`item_cls_cd.ilike.%${s}%,item_cls_nm.ilike.%${s}%`);
  }
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudListStandardCodes(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  let q = db.from("zra_standard_codes").select("*").eq("user_id", userId).order("code_class").order("name").limit(Math.min(Math.max(Number(data.limit ?? 200), 1), 1000));
  if (data.className) q = q.or(`code_class.eq.${data.className},name.ilike.%${data.className}%`);
  if (data.search) q = q.or(`code.ilike.%${data.search}%,name.ilike.%${data.search}%`);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudMapInventoryItem(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const { data: cls } = await db.from("zra_item_classes").select("*").eq("user_id", userId).eq("item_cls_cd", data.itemClassCode).limit(1).maybeSingle();
  if (!cls) throw new Error("ZRA classification code was not found in the synchronized VSDC dictionary.");
  const { data: row, error } = await db.from("stock_items").select("*").eq("id", data.itemId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Inventory item not found.");
  const patch = {
    zra_item_code: row.sku || row.barcode || row.id,
    zra_item_class_code: data.itemClassCode,
    zra_item_type_code: data.itemTypeCode ?? null,
    zra_origin_country_code: data.originCountryCode ?? null,
    zra_pkg_unit_code: data.pkgUnitCode,
    zra_qty_unit_code: data.qtyUnitCode,
    zra_vat_category_code: data.vatCategoryCode,
    zra_tax_rate: data.taxRate == null ? row.vat_rate : Number(data.taxRate),
    zra_sync_status: "mapped",
    zra_last_sync_at: new Date().toISOString(),
    zra_raw_data: JSON.stringify({ classification: cls }),
  };
  const { data: saved, error: saveError } = await db.from("stock_items").update(patch).eq("id", data.itemId).eq("user_id", userId).select("*").single();
  if (saveError) throw new Error(saveError.message);
  return { data: saved };
}

export async function cloudRegisterInventoryItem(data: any) {
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, null);
  const { data: item, error } = await db.from("stock_items").select("*").eq("id", data.itemId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!item) throw new Error("Inventory item not found.");
  if (!cfg?.tpin || !cfg?.branch_code) throw new Error("ZRA_NOT_CONFIGURED: Configure TPIN and Branch ID first.");
  if (!item.zra_item_class_code || !item.zra_item_type_code || !item.zra_origin_country_code || !item.zra_pkg_unit_code || !item.zra_qty_unit_code || !item.zra_vat_category_code)
    throw new Error("ZRA_ITEM_NOT_MAPPED: Complete classification, product type, origin, packaging, quantity and VAT mapping before registering this item.");
  const payload = {
    tpin: cfg.tpin, bhfId: cfg.branch_code, itemCd: item.zra_item_code || item.sku || item.barcode || item.id,
    itemClsCd: item.zra_item_class_code, itemTyCd: item.zra_item_type_code, itemNm: item.name,
    itemStdNm: item.name, orgnNatCd: item.zra_origin_country_code, pkgUnitCd: item.zra_pkg_unit_code,
    qtyUnitCd: item.zra_qty_unit_code, rrp: Number(item.sell_price || 0), useYn: "Y",
    vatCatCd: item.zra_vat_category_code, regrId: data.regrId || userId, regrNm: data.regrNm || userId,
  };
  const response: any = await saveItem(payload, { baseUrl: vsdcUrl(cfg) });
  if (isSuccessfulVsdcResponse(response)) {
    await db.from("stock_items").update({
      zra_sync_status: "registered", zra_last_sync_at: new Date().toISOString(),
      zra_raw_data: JSON.stringify({ registration: response, payload }),
    }).eq("id", data.itemId).eq("user_id", userId);
  }
  const { data: saved } = await db.from("stock_items").select("*").eq("id", data.itemId).eq("user_id", userId).maybeSingle();
  return { response, payload, data: saved };
}


function cloudNowZraDate() {
  const d = new Date();
  const p = (n:number) => String(n).padStart(2,"0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function cloudDateOnly() { return cloudNowZraDate().slice(0,8); }

async function cloudStandardCode(db:any,userId:string,classNeedle:string,nameNeedles:string[]) {
  const { data, error } = await db.from("zra_standard_codes").select("code,code_class_name,name")
    .eq("user_id",userId).ilike("code_class_name",`%${classNeedle}%`);
  if(error) throw new Error(error.message);
  const match=(data??[]).find((row:any)=>{
    const name=String(row.name||"").toLowerCase().replace(/&/g," ");
    return nameNeedles.some(n=>name.includes(String(n).toLowerCase().replace(/&/g," ")));
  });
  if(!match) throw new Error(`ZRA_STANDARD_CODE_UNMAPPED: ${classNeedle} / ${nameNeedles.join(" or ")}`);
  return String(match.code);
}

async function cloudPaymentTypeCode(db:any,userId:string,saleId:string) {
  const { data, error } = await db.from("pos_payments").select("method,amount").eq("sale_id",saleId).eq("user_id",userId).order("id");
  if(error) throw new Error(error.message);
  const methods=(data??[]).filter((p:any)=>Number(p.amount||0)>0).map((p:any)=>String(p.method||"cash").toLowerCase());
  if(!methods.length) throw new Error("ZRA_PAYMENT_METHOD_REQUIRED");
  if(methods.length===1){
    const m=methods[0];
    if(m==="cash") return cloudStandardCode(db,userId,"Payment Method",["cash"]);
    if(m==="credit") return cloudStandardCode(db,userId,"Payment Method",["credit"]);
    if(m.includes("mobile")||m.includes("momo")) return cloudStandardCode(db,userId,"Payment Method",["mobile money"]);
    if(m.includes("card")||m.includes("visa")||m.includes("master")) return cloudStandardCode(db,userId,"Payment Method",["debit credit card","card"]);
    if(m.includes("bank")) return cloudStandardCode(db,userId,"Payment Method",["bank check","bank"]);
  }
  if(methods.every(m=>m==="cash"||m==="credit")) return cloudStandardCode(db,userId,"Payment Method",["cash/credit"]);
  throw new Error(`ZRA_PAYMENT_METHOD_UNMAPPED: ${methods.join(",")}`);
}

async function cloudBuildSalesPayload(db:any,userId:string,saleId:string,saleNo:string,terminalId?:string|null) {
  let device:any=null;
  if(terminalId){
    const q=await db.from("zra_devices").select("*").eq("user_id",userId).eq("terminal_id",terminalId).eq("is_active",true).limit(1).maybeSingle();
    device=q.data;
  }
  const cfg=await configFor(db,userId,null,device?.id??null);
  if(!cfg?.tpin||!cfg?.branch_code) throw new Error("ZRA_NOT_CONFIGURED: Configure TPIN and Branch ID before submitting sales.");
  const saleQ=await db.from("pos_sales").select("*").eq("id",saleId).eq("user_id",userId).maybeSingle();
  if(saleQ.error) throw new Error(saleQ.error.message);
  const sale=saleQ.data;
  if(!sale) throw new Error("POS sale not found.");
  const paymentTypeCode=await cloudPaymentTypeCode(db,userId,saleId);
  const salesTypeCode=await cloudStandardCode(db,userId,"Transaction Type",["normal"]);
  const receiptTypeCode=await cloudStandardCode(db,userId,"Sales Receipt Type",["sale"]);
  const statusCode=await cloudStandardCode(db,userId,"Transaction Progress",["approved"]);
  const salesCategoryCode=await cloudStandardCode(db,userId,"Sales Category",[String(sale.price_level||"normal").toLowerCase()==="wholesale"?"wholesale":"retail"]);
  const currencyCode=await cloudStandardCode(db,userId,"Currency",["zambian kwacha","zambia kwacha","zmw"]);
  const profileQ=await db.from("profiles").select("full_name").eq("id",userId).maybeSingle();
  const actorId=String(userId).replace(/-/g,"").slice(0,20);
  const actorName=String(profileQ.data?.full_name||userId).slice(0,60);
  let customer:any=null;
  if(sale.customer_id){
    const q=await db.from("customers").select("tpin,name").eq("id",sale.customer_id).eq("user_id",userId).maybeSingle();
    customer=q.data;
  }
  const linesQ=await db.from("pos_sale_items").select("*,stock_items!inner(name,sku,barcode,hs_code,unit,vat_rate,zra_item_code,zra_item_class_code,zra_item_type_code,zra_origin_country_code,zra_pkg_unit_code,zra_qty_unit_code,zra_vat_category_code,zra_tax_rate)")
    .eq("sale_id",saleId).order("id");
  if(linesQ.error) throw new Error(linesQ.error.message);
  const rows=linesQ.data??[];
  if(!rows.length) throw new Error("ZRA_EMPTY_SALE: POS sale has no item lines.");
  const unmapped=rows.filter((r:any)=>!r.stock_items?.zra_item_class_code||!r.stock_items?.zra_pkg_unit_code||!r.stock_items?.zra_qty_unit_code||!r.stock_items?.zra_vat_category_code);
  if(unmapped.length) throw new Error("ZRA_ITEM_NOT_MAPPED: "+unmapped.map((r:any)=>r.stock_items?.name||r.item_id).join(", "));
  const itemList=rows.map((r:any,index:number)=>{
    const s=r.stock_items||{}, qty=Number(r.qty||r.quantity||0), price=Number(r.price||0), discountPct=Number(r.discount||r.discount_pct||0);
    const gross=qty*price, discount=gross*discountPct/100, total=Math.max(gross-discount,0);
    const rate=Number(s.zra_tax_rate??s.vat_rate??0), vatCat=String(s.zra_vat_category_code);
    const tax=rate>0?total-total/(1+rate/100):0;
    return {itemSeq:index+1,itemCd:s.zra_item_code||s.sku||r.item_id,itemClsCd:s.zra_item_class_code,itemNm:s.name,bcd:s.barcode||"",pkgUnitCd:s.zra_pkg_unit_code,pkg:0,qtyUnitCd:s.zra_qty_unit_code,qty,prc:price,splyAmt:total,dcRt:discountPct,dcAmt:discount,vatCatCd:vatCat,vatTaxblAmt:total-tax,vatAmt:tax,totAmt:total,_taxRate:rate,_vatCat:vatCat};
  });
  const bands=["A","B","C","C1","C2","C3","D","RVAT","E","F","Ipl1","Ipl2","Tl","Ecm","Exeeg","Tot"];
  const taxbl:any={},taxAmt:any={},taxRt:any={}; for(const b of bands){taxbl[b]=0;taxAmt[b]=0;taxRt[b]=0;}
  for(const i of itemList){if(bands.includes(i._vatCat)){taxbl[i._vatCat]+=i.vatTaxblAmt;taxAmt[i._vatCat]+=i.vatAmt;taxRt[i._vatCat]=Math.max(taxRt[i._vatCat],i._taxRate);}}
  const payload:any={
    tpin:cfg.tpin,bhfId:cfg.branch_code,orgInvcNo:0,cisInvcNo:saleNo,custTpin:customer?.tpin??null,custNm:sale.customer_name,
    salesTyCd:salesTypeCode,rcptTyCd:receiptTypeCode,pmtTyCd:paymentTypeCode,salesSttsCd:statusCode,cfmDt:cloudNowZraDate(),salesDt:cloudDateOnly(),
    stockRlsDt:cloudNowZraDate(),cnclReqDt:null,cnclDt:null,rfdDt:null,rfdRsnCd:null,totItemCnt:itemList.length,currencyTyCd:currencyCode,
    exchangeRt:"1",prchrAcptcYn:"N",remark:"",regrId:actorId,regrNm:actorName,modrId:actorId,modrNm:actorName,saleCtyCd:salesCategoryCode,
    totTaxblAmt:itemList.reduce((a:number,i:any)=>a+i.vatTaxblAmt,0),totTaxAmt:itemList.reduce((a:number,i:any)=>a+i.vatAmt,0),totAmt:Number(sale.total||0),
    taxblAmtTot:0,taxAmtTot:0,itemList:itemList.map(({_taxRate,_vatCat,...i}:any)=>i)
  };
  for(const b of bands){payload["taxblAmt"+b]=Number(taxbl[b]||0);payload["taxAmt"+b]=Number(taxAmt[b]||0);payload["taxRt"+b]=Number(taxRt[b]||0);}
  payload.taxblAmtTot=0;payload.taxAmtTot=0;payload.taxRtTot=0;
  return {cfg,payload,sale};
}

export async function cloudSubmitPosSale(data:any){
  const {db,userId}=await requireUser();
  if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const saleQ=await db.from("pos_sales").select("*").eq("id",data.saleId).eq("user_id",userId).maybeSingle();
  if(saleQ.error) throw new Error(saleQ.error.message);
  const sale=saleQ.data; if(!sale) throw new Error("POS sale not found.");
  const terminalId=data.terminalId??sale.register_id??null;
  const idempotencyKey=`zra:${userId}:${terminalId||"terminal"}:${data.saleId}`;
  const existing=await db.from("zra_fiscal_controls").select("*").eq("user_id",userId).eq("sale_id",data.saleId).maybeSingle();
  if(existing.data?.state==="FISCALIZED") return {queueId:null,response:{resultCd:"000",data:{rcptNo:existing.data.zra_receipt_number,intrlData:existing.data.zra_internal_data,rcptSign:existing.data.zra_receipt_signature,qrCodeUrl:existing.data.zra_qr_data}},fiscalState:"FISCALIZED"};
  const saleNo=data.saleNo||sale.sale_no;
  const built=await cloudBuildSalesPayload(db,userId,data.saleId,saleNo,terminalId);
  const id=existing.data?.id??crypto.randomUUID();
  const upsert=await db.from("zra_fiscal_controls").upsert({
    id,user_id:userId,sale_id:data.saleId,terminal_id:terminalId,invoice_number:saleNo,state:"SUBMITTED",idempotency_key:idempotencyKey,submission_at:new Date().toISOString(),updated_at:new Date().toISOString()
  },{onConflict:"user_id,sale_id"}).select("*").single();
  if(upsert.error) throw new Error(upsert.error.message);
  const queueId=crypto.randomUUID();
  const qi=await db.from("zra_invoice_queue").insert({id:queueId,user_id:userId,source_type:"pos_sale",source_id:data.saleId,invoice_number:saleNo,total:Number(sale.total||0),vat_amount:Number(sale.tax||0),status:"submitting",payload:JSON.stringify(built.payload),attempt_count:1,last_attempt_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  if(qi.error) throw new Error(qi.error.message);
  try{
    const response:any=await saveSales(built.payload,{baseUrl:vsdcUrl(built.cfg)});
    const success=isSuccessfulVsdcResponse(response), d=response.data??{}, receipt=d.receipt??d;
    const receiptNo=receipt.rcptNo??d.rcptNo??null, internalData=receipt.intrlData??d.intrlData??null, signature=receipt.rcptSign??d.rcptSign??null, qrUrl=receipt.qrCodeUrl??d.qrCodeUrl??null;
    await db.from("zra_invoice_queue").update({status:success?"submitted":"failed",submitted_at:success?new Date().toISOString():null,response_code:response.resultCd??null,response_message:response.resultMsg??null,zra_receipt_number:receiptNo,zra_internal_data:internalData,zra_receipt_signature:signature,zra_qr_url:qrUrl,error_code:success?null:response.resultCd??null,updated_at:new Date().toISOString()}).eq("id",queueId).eq("user_id",userId);
    await db.from("zra_fiscal_controls").update({state:success?"FISCALIZED":"REJECTED",zra_receipt_number:receiptNo,zra_internal_data:internalData,zra_receipt_signature:signature,zra_qr_data:qrUrl,zra_response_json:JSON.stringify(response),error_code:success?null:response.resultCd??null,error_message:success?null:response.resultMsg??null,fiscalized_at:success?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);
    return {queueId,response,payload:built.payload,fiscalState:success?"FISCALIZED":"REJECTED"};
  }catch(error:any){
    await db.from("zra_invoice_queue").update({status:"failed",response_message:error?.message||"VSDC request failed",error_code:"VSDC_REQUEST_FAILED",last_attempt_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",queueId).eq("user_id",userId);
    await db.from("zra_fiscal_controls").update({state:"RETRY_REQUIRED",error_code:"VSDC_REQUEST_FAILED",error_message:error?.message||"VSDC request failed",updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);
    throw error;
  }
}

export async function cloudSubmitCorrection(data:any){
  const {db,userId}=await requireUser();
  if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  if(!data.reason?.trim()) throw new Error("CORRECTION_REASON_REQUIRED");
  const fiscalQ=await db.from("zra_fiscal_controls").select("*").eq("user_id",userId).eq("sale_id",data.saleId).maybeSingle();
  const fiscal=fiscalQ.data;
  if(fiscal?.state!=="FISCALIZED"||!fiscal.zra_receipt_number) throw new Error("ZRA_CORRECTION_REQUIRES_FISCALIZED_SALE");
  const saleQ=await db.from("pos_sales").select("*").eq("id",data.saleId).eq("user_id",userId).maybeSingle();
  const sale=saleQ.data; if(!sale) throw new Error("SALE_NOT_FOUND");
  const cfg=await configFor(db,userId,null,data.terminalId??sale.register_id??null);
  if(!cfg?.tpin||!cfg?.branch_code||!cfg?.device_serial) throw new Error("ZRA_CORRECTION_CONFIG_REQUIRED");
  const built=await cloudBuildSalesPayload(db,userId,data.saleId,sale.sale_no,data.terminalId??sale.register_id??null);
  const receiptTypeCode=await cloudStandardCode(db,userId,"Sales Receipt Type",[data.correctionType==="CREDIT_NOTE"?"reversal after sale":"adjustment upwards after sale"]);
  const salesTypeCode=await cloudStandardCode(db,userId,"Transaction Type",["normal"]);
  const statusCode=await cloudStandardCode(db,userId,"Transaction Progress",["approved"]);
  const existing=await db.from("zra_document_corrections").select("*").eq("user_id",userId).eq("sale_id",data.saleId).eq("correction_type",data.correctionType).maybeSingle();
  if(existing.data?.status==="FISCALIZED") return existing.data;
  const correctionNo=`${data.correctionType==="CREDIT_NOTE"?"CN":"DN"}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const payload={...built.payload,cisInvcNo:correctionNo,orgSdcId:String(cfg.device_serial),orgIncNo:Number(fiscal.zra_receipt_number),rcptTyCd:receiptTypeCode,salesTyCd:salesTypeCode,salesSttsCd:statusCode,remark:String(data.reason).slice(0,400),cfmDt:cloudNowZraDate(),salesDt:cloudDateOnly()};
  const id=existing.data?.id??crypto.randomUUID();
  const save=await db.from("zra_document_corrections").upsert({id,user_id:userId,sale_id:data.saleId,correction_type:data.correctionType,original_reference:String(fiscal.zra_receipt_number),status:"SUBMITTED",reason:data.reason,payload:JSON.stringify(payload),created_by:userId,updated_at:new Date().toISOString()},{onConflict:"user_id,sale_id,correction_type"}).select("*").single();
  if(save.error) throw new Error(save.error.message);
  try{
    const response:any=await saveSales(payload,{baseUrl:vsdcUrl(cfg)}), d=response.data??{}, receipt=d.receipt??d, receiptNo=receipt.rcptNo??d.rcptNo??null, success=isSuccessfulVsdcResponse(response);
    await db.from("zra_document_corrections").update({status:success?"FISCALIZED":"REJECTED",zra_status:success?"SUCCESS":"FAILED",zra_reference:receiptNo,zra_response:JSON.stringify(response),error_code:success?null:response.resultCd??null,error_message:success?null:response.resultMsg??null,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);
    return {correctionId:id,correctionType:data.correctionType,status:success?"FISCALIZED":"REJECTED",response,payload};
  }catch(error:any){
    await db.from("zra_document_corrections").update({status:"RETRY_REQUIRED",zra_status:"REQUEST_FAILED",error_code:"VSDC_REQUEST_FAILED",error_message:error?.message||"VSDC request failed",updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);
    throw error;
  }
}

export async function cloudSaveItem(data:any){
  const { db, userId } = await requireUser(data.authToken);
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId);
  return saveItem(data.payload, { baseUrl: vsdcUrl(cfg) });
}

export async function cloudSelectInvoice(data:any){
  const {db,userId}=await requireUser(); if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg=await configFor(db,userId,data.branchId); return selectInvoice(data.payload,{baseUrl:vsdcUrl(cfg)});
}
export async function cloudSaveStockItems(data:any){
  const {db,userId}=await requireUser(); if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg=await configFor(db,userId,data.branchId); return saveStockItems(data.payload,{baseUrl:vsdcUrl(cfg)});
}
export async function cloudSaveStockMaster(data:any){
  const {db,userId}=await requireUser(); if(userId!==data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg=await configFor(db,userId,data.branchId); return saveStockMaster(data.payload,{baseUrl:vsdcUrl(cfg)});
}
