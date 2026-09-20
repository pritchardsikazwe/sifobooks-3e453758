import { createServerFn } from "@tanstack/react-start";
import { getDb, generateUUID } from "../db/database";
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

type ZraConfigInput = { userId: string; branchId?: string | null };

function getSavedConfig(userId: string, branchId?: string | null) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM zra_smart_invoice_config WHERE user_id = ? AND (? IS NULL OR branch_id = ?) ORDER BY updated_at DESC LIMIT 1",
  ).get(userId, branchId ?? null, branchId ?? null) as any;
}

function requireVsdcUrl(config?: any) {
  const url = config?.vsdc_endpoint || process.env.ZRA_VSDC_URL;
  if (!url) throw new Error("ZRA VSDC endpoint is not configured.");
  return url;
}

function listFromResponse(response: any, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }
  return [];
}

function nowZraDate() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function toDateOnly() { return nowZraDate().slice(0, 8); }

export const zraGetConfigFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as ZraConfigInput)
  .handler(async ({ data }) => ({ data: getSavedConfig(data.userId, data.branchId), error: null }));

export const zraSaveConfigFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string; branchId?: string | null; mode?: string; taxpayerName?: string | null;
    tpin?: string | null; branchCode?: string | null; deviceSerial?: string | null;
    vsdcEndpoint?: string | null; notes?: string | null;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const id = generateUUID();
    db.prepare(
      `INSERT INTO zra_smart_invoice_config
       (id,user_id,branch_id,mode,taxpayer_name,tpin,branch_code,device_serial,vsdc_endpoint,notes,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
    ).run(id,data.userId,data.branchId ?? null,data.mode ?? "test",data.taxpayerName ?? null,
      data.tpin ?? null,data.branchCode ?? null,data.deviceSerial ?? null,data.vsdcEndpoint ?? null,data.notes ?? null);
    return { data: getSavedConfig(data.userId, data.branchId), error: null };
  });

export const zraInitializeDeviceFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { userId:string; branchId?:string|null; tpin:string; bhfId:string; dvcSrlNo:string })
  .handler(async ({ data }) => {
    const cfg=getSavedConfig(data.userId,data.branchId);
    const response=await initializeDevice({tpin:data.tpin,bhfId:data.bhfId,dvcSrlNo:data.dvcSrlNo},{baseUrl:requireVsdcUrl(cfg)});
    const db=getDb();
    db.prepare("UPDATE zra_smart_invoice_config SET mode=?,tpin=?,branch_code=?,device_serial=?,taxpayer_name=COALESCE(?,taxpayer_name),last_verified_at=datetime('now'),updated_at=datetime('now') WHERE id=?")
      .run(isSuccessfulVsdcResponse(response) ? "initialized":"test",data.tpin,data.bhfId,data.dvcSrlNo,
        (response as any).data?.info?.taxprNm ?? (response as any).data?.taxprNm ?? null,cfg?.id ?? "");
    return response;
  });

export const zraGetStandardCodesFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;tpin:string;bhfId:string;lastReqDt:string})
  .handler(async ({data}) => {
    const cfg=getSavedConfig(data.userId,data.branchId);
    return getStandardCodes({tpin:data.tpin,bhfId:data.bhfId,lastReqDt:data.lastReqDt},{baseUrl:requireVsdcUrl(cfg)});
  });

export const zraGetItemClassesFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;tpin:string;bhfId:string;lastReqDt:string})
  .handler(async ({data}) => {
    const cfg=getSavedConfig(data.userId,data.branchId);
    return getItemClasses({tpin:data.tpin,bhfId:data.bhfId,lastReqDt:data.lastReqDt},{baseUrl:requireVsdcUrl(cfg)});
  });

export const zraSyncCatalogFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;tpin:string;bhfId:string;lastReqDt:string})
  .handler(async ({data}) => {
    const cfg=getSavedConfig(data.userId,data.branchId);
    const db=getDb();
    const codes=await getStandardCodes({tpin:data.tpin,bhfId:data.bhfId,lastReqDt:data.lastReqDt},{baseUrl:requireVsdcUrl(cfg)});
    let classes:any=await getItemClasses({tpin:data.tpin,bhfId:data.bhfId,lastReqDt:data.lastReqDt},{baseUrl:requireVsdcUrl(cfg)});
    // ZRA documents classification retrieval as paged in batches of up to 1000.
    // Continue with the VSDC result timestamp until the batch is exhausted.
    const classResponses=[classes];
    let previousDt=data.lastReqDt;
    for(let page=1;page<20 && isSuccessfulVsdcResponse(classes);page++){
      const batch=listFromResponse(classes,["itemClsList","itemClassList","clsList","list"]);
      const nextDt=String(classes.resultDt ?? "");
      if(batch.length<1000 || !nextDt || nextDt===previousDt) break;
      previousDt=nextDt;
      const next=await getItemClasses({tpin:data.tpin,bhfId:data.bhfId,lastReqDt:nextDt},{baseUrl:requireVsdcUrl(cfg)});
      classResponses.push(next); classes=next;
      if(!isSuccessfulVsdcResponse(next)) break;
    }
    if(isSuccessfulVsdcResponse(codes)){
      const clsList=Array.isArray(codes.data?.clsList)?codes.data.clsList:[];
      const ins=db.prepare("INSERT OR REPLACE INTO zra_standard_codes (id,user_id,branch_id,code_class,code_class_name,code,name,description,raw_data,updated_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))");
      for(const cls of clsList) for(const item of (cls.dtlList ?? [])){
        ins.run(generateUUID(),data.userId,data.branchId ?? null,String(cls.cdCls ?? ""),cls.cdClsNm ?? null,String(item.cd ?? ""),item.cdNm ?? null,item.userDfnNm1 ?? null,JSON.stringify(item));
      }
    }
    if(classResponses.some(isSuccessfulVsdcResponse)){
      const rows=classResponses.flatMap((response:any)=>listFromResponse(response,["itemClsList","itemClassList","clsList","list"]));
      const ins=db.prepare("INSERT OR REPLACE INTO zra_item_classes (id,user_id,branch_id,item_cls_cd,item_cls_nm,item_cls_lvl,tax_ty_cd,use_yn,raw_data,updated_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))");
      for(const item of rows){
        ins.run(generateUUID(),data.userId,data.branchId ?? null,String(item.itemClsCd ?? ""),item.itemClsNm ?? null,
          item.itemClsLvl == null ? null:Number(item.itemClsLvl),item.taxTyCd ?? null,item.useYn ?? null,JSON.stringify(item));
      }
    }
    return {codes,classes,classResponses,classCountFromResponses:classResponses.length,codeCount:db.prepare("SELECT COUNT(*) AS n FROM zra_standard_codes WHERE user_id=? AND (? IS NULL OR branch_id=?)").get(data.userId,data.branchId ?? null,data.branchId ?? null)?.n ?? 0,
      classCount:db.prepare("SELECT COUNT(*) AS n FROM zra_item_classes WHERE user_id=? AND (? IS NULL OR branch_id=?)").get(data.userId,data.branchId ?? null,data.branchId ?? null)?.n ?? 0};
  });

export const zraListInventoryFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {userId:string;search?:string;limit?:number})
  .handler(async ({data})=>{
    const db=getDb(); const limit=Math.min(Math.max(Number(data.limit ?? 100),1),500);
    const search=(data.search ?? "").trim();
    const rows=search
      ? db.prepare("SELECT * FROM stock_items WHERE user_id=? AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?) ORDER BY name LIMIT ?").all(data.userId,`%${search}%`,`%${search}%`,`%${search}%`,limit)
      : db.prepare("SELECT * FROM stock_items WHERE user_id=? ORDER BY name LIMIT ?").all(data.userId,limit);
    return {data:rows};
  });

export const zraSearchItemClassesFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;search?:string;limit?:number})
  .handler(async ({data})=>{
    const db=getDb(); const limit=Math.min(Math.max(Number(data.limit ?? 50),1),200);
    const q=(data.search ?? "").trim();
    const rows=q
      ? db.prepare("SELECT * FROM zra_item_classes WHERE user_id=? AND (? IS NULL OR branch_id=?) AND (item_cls_cd LIKE ? OR item_cls_nm LIKE ?) ORDER BY item_cls_lvl DESC,item_cls_nm LIMIT ?")
        .all(data.userId,data.branchId ?? null,data.branchId ?? null,`%${q}%`,`%${q}%`,limit)
      : db.prepare("SELECT * FROM zra_item_classes WHERE user_id=? AND (? IS NULL OR branch_id=?) ORDER BY item_cls_lvl DESC,item_cls_nm LIMIT ?")
        .all(data.userId,data.branchId ?? null,data.branchId ?? null,limit);
    return {data:rows};
  });

export const zraListStandardCodesFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;className?:string;search?:string;limit?:number})
  .handler(async ({data})=>{
    const db=getDb(); const limit=Math.min(Math.max(Number(data.limit ?? 200),1),1000);
    const q=(data.search ?? "").trim(); const cls=(data.className ?? "").trim();
    const rows=db.prepare(
      "SELECT * FROM zra_standard_codes WHERE user_id=? AND (?='' OR code_class=? OR name LIKE ?) AND (?='' OR code LIKE ? OR name LIKE ?) ORDER BY code_class,name LIMIT ?"
    ).all(data.userId,cls,cls,`%${cls}%`,q,`%${q}%`,`%${q}%`,limit);
    return {data:rows};
  });

export const zraMapInventoryItemFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {
    userId:string; itemId:string; itemClassCode:string; itemTypeCode?:string|null; originCountryCode?:string|null;
    pkgUnitCode:string; qtyUnitCode:string; vatCategoryCode:string; taxRate?:number|null;
  })
  .handler(async ({data})=>{
    const db=getDb();
    const cls=db.prepare("SELECT * FROM zra_item_classes WHERE user_id=? AND item_cls_cd=? LIMIT 1").get(data.userId,data.itemClassCode) as any;
    if(!cls) throw new Error("ZRA classification code was not found in the synchronized VSDC dictionary.");
    const row=db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(data.itemId,data.userId) as any;
    if(!row) throw new Error("Inventory item not found.");
    const itemCode=row.sku || row.barcode || row.id;
    db.prepare(
      "UPDATE stock_items SET zra_item_code=?,zra_item_class_code=?,zra_item_type_code=?,zra_origin_country_code=?,zra_pkg_unit_code=?,zra_qty_unit_code=?,zra_vat_category_code=?,zra_tax_rate=?,zra_sync_status='mapped',zra_last_sync_at=datetime('now'),zra_raw_data=? WHERE id=? AND user_id=?"
    ).run(itemCode,data.itemClassCode,data.itemTypeCode ?? null,data.originCountryCode ?? null,data.pkgUnitCode,data.qtyUnitCode,data.vatCategoryCode,
      data.taxRate == null ? row.vat_rate : Number(data.taxRate),JSON.stringify({classification:cls}),data.itemId,data.userId);
    return {data:db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(data.itemId,data.userId)};
  });

export const zraRegisterInventoryItemFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;itemId:string;regrId?:string;regrNm?:string})
  .handler(async ({data})=>{
    const db=getDb();
    const cfg=getSavedConfig(data.userId,null);
    if(!cfg?.tpin||!cfg?.branch_code) throw new Error("ZRA_NOT_CONFIGURED: Configure TPIN and Branch ID first.");
    const item=db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(data.itemId,data.userId) as any;
    if(!item) throw new Error("Inventory item not found.");
    if(!item.zra_item_class_code||!item.zra_item_type_code||!item.zra_origin_country_code||!item.zra_pkg_unit_code||!item.zra_qty_unit_code||!item.zra_vat_category_code)
      throw new Error("ZRA_ITEM_NOT_MAPPED: Complete classification, product type, origin, packaging, quantity and VAT mapping before registering this item.");
    const payload={
      tpin:cfg.tpin,bhfId:cfg.branch_code,itemCd:item.zra_item_code||item.sku||item.barcode||item.id,
      itemClsCd:item.zra_item_class_code,itemTyCd:item.zra_item_type_code,itemNm:item.name,
      itemStdNm:item.name,orgnNatCd:item.zra_origin_country_code,pkgUnitCd:item.zra_pkg_unit_code,
      qtyUnitCd:item.zra_qty_unit_code,rrp:Number(item.sell_price||0),useYn:"Y",
      vatCatCd:item.zra_vat_category_code,regrId:data.regrId||data.userId,regrNm:data.regrNm||data.userId,
    };
    const response:any=await saveItem(payload,{baseUrl:requireVsdcUrl(cfg)});
    if(isSuccessfulVsdcResponse(response)){
      db.prepare("UPDATE stock_items SET zra_sync_status='registered',zra_last_sync_at=datetime('now'),zra_raw_data=? WHERE id=? AND user_id=?")
        .run(JSON.stringify({registration:response,payload}),data.itemId,data.userId);
    }
    return {response,payload,data:db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(data.itemId,data.userId)};
  });

export const zraSaveItemFn = createServerFn({ method:"POST" })
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;payload:Record<string,unknown>})
  .handler(async ({data})=>{const cfg=getSavedConfig(data.userId,data.branchId);return saveItem(data.payload,{baseUrl:requireVsdcUrl(cfg)});});

function buildSalesPayload(db:any,userId:string,saleId:string,saleNo:string) {
  const cfg=getSavedConfig(userId,null);
  if(!cfg?.tpin || !cfg?.branch_code) throw new Error("ZRA_NOT_CONFIGURED: Configure TPIN and Branch ID before submitting sales.");
  const sale=db.prepare("SELECT * FROM pos_sales WHERE id=? AND user_id=? LIMIT 1").get(saleId,userId) as any;
  if(!sale) throw new Error("POS sale not found.");
  const rows=db.prepare(
    `SELECT psi.*, si.name AS stock_name, si.sku, si.barcode, si.hs_code, si.unit, si.vat_rate,
            si.zra_item_code,si.zra_item_class_code,si.zra_item_type_code,si.zra_origin_country_code,
            si.zra_pkg_unit_code,si.zra_qty_unit_code,si.zra_vat_category_code,si.zra_tax_rate
       FROM pos_sale_items psi JOIN stock_items si ON si.id=psi.item_id
      WHERE psi.sale_id=? ORDER BY psi.id`
  ).all(saleId) as any[];
  if(!rows.length) throw new Error("ZRA_EMPTY_SALE: POS sale has no item lines.");
  const unmapped=rows.filter(r=>!r.zra_item_class_code || !r.zra_pkg_unit_code || !r.zra_qty_unit_code || !r.zra_vat_category_code);
  if(unmapped.length) throw new Error("ZRA_ITEM_NOT_MAPPED: " + unmapped.map(r=>r.stock_name).join(", "));
  const itemList=rows.map((r:any,index:number)=>{
    const qty=Number(r.qty||0), price=Number(r.price||0), discountPct=Number(r.discount||0);
    const gross=qty*price, discount=gross*discountPct/100, total=Math.max(gross-discount,0);
    const rate=Number(r.zra_tax_rate ?? r.vat_rate ?? 0);
    const vatCat=String(r.zra_vat_category_code);
    const tax=rate>0 ? total-total/(1+rate/100) : 0;
    const taxable=total-tax;
    return {itemSeq:index+1,itemCd:r.zra_item_code || r.sku || r.id,itemClsCd:r.zra_item_class_code,itemNm:r.stock_name,
      bcd:r.barcode || "",pkgUnitCd:r.zra_pkg_unit_code,pkg:0,qtyUnitCd:r.zra_qty_unit_code,qty,prc:price,splyAmt:total,
      dcRt:discountPct,dcAmt:discount,vatCatCd:vatCat,vatTaxblAmt:taxable,vatAmt:tax,totAmt:total,
      _taxRate:rate,_vatCat:vatCat};
  });
  const bands=["A","B","C","C1","C2","C3","D","RVAT","E","F","Ipl1","Ipl2","Tl","Ecm","Exeeg","Tot"];
  const taxbl:any={}, taxAmt:any={}, taxRt:any={};
  for(const b of bands){taxbl[b]=0;taxAmt[b]=0;taxRt[b]=0;}
  for(const item of itemList){
    const b=item._vatCat; if(bands.includes(b)){taxbl[b]+=item.vatTaxblAmt;taxAmt[b]+=item.vatAmt;taxRt[b]=Math.max(taxRt[b],item._taxRate);}
  }
  const clean=(prefix:string,b:string)=>Number((prefix==="taxbl"?taxbl[b]:prefix==="taxAmt"?taxAmt[b]:taxRt[b])||0);
  const payload:any={
    tpin:cfg.tpin,bhfId:cfg.branch_code,orgInvcNo:0,cisInvcNo:saleNo,custNm:sale.customer_name,
    salesTyCd:"N",rcptTyCd:"S",pmtTyCd:"01",salesSttsCd:"02",cfmDt:nowZraDate(),salesDt:toDateOnly(),
    stockRlsDt:nowZraDate(),cnclReqDt:null,cnclDt:null,rfdDt:null,rfdRsnCd:null,totItemCnt:itemList.length,
    currencyTyCd:"ZMW",exchangeRt:"1",prchrAcptcYn:"N",remark:"",regrId:userId,regrNm:userId,
    totTaxblAmt:itemList.reduce((a:number,i:any)=>a+i.vatTaxblAmt,0),totTaxAmt:itemList.reduce((a:number,i:any)=>a+i.vatAmt,0),
    totAmt:Number(sale.total||0),taxblAmtTot:0,taxAmtTot:0,
    itemList:itemList.map(({_taxRate,_vatCat,...i}:any)=>i),
  };
  for(const b of bands){payload["taxblAmt"+b]=clean("taxbl",b);payload["taxAmt"+b]=clean("taxAmt",b);payload["taxRt"+b]=clean("taxRt",b);}
  payload.taxblAmtTot=0; payload.taxAmtTot=0; payload.taxRtTot=0;
  return {cfg,payload};
}

export const zraSubmitPosSaleFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;saleId:string;saleNo?:string})
  .handler(async ({data})=>{
    const db=getDb();
    const sale=db.prepare("SELECT sale_no,total,tax FROM pos_sales WHERE id=? AND user_id=?").get(data.saleId,data.userId) as any;
    if(!sale) throw new Error("POS sale not found.");
    const saleNo=data.saleNo || sale.sale_no;
    const existing=db.prepare("SELECT * FROM zra_invoice_queue WHERE user_id=? AND source_id=? AND status='submitted' LIMIT 1").get(data.userId,data.saleId) as any;
    if(existing) return {queueId:existing.id,response:{resultCd:"000",data:{rcptNo:existing.zra_receipt_number,intrlData:existing.zra_internal_data,rcptSign:existing.zra_receipt_signature,qrCodeUrl:existing.zra_qr_url}}};
    const {cfg,payload}=buildSalesPayload(db,data.userId,data.saleId,saleNo);
    const queueId=generateUUID();
    db.prepare("INSERT INTO zra_invoice_queue (id,user_id,source_type,source_id,invoice_number,total,vat_amount,status,payload,attempt_count,last_attempt_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))")
      .run(queueId,data.userId,"pos_sale",data.saleId,saleNo,Number(sale.total||0),Number(sale.tax||0),"submitting",JSON.stringify(payload),1);
    try{
      const response:any=await saveSales(payload,{baseUrl:requireVsdcUrl(cfg)});
      const success=isSuccessfulVsdcResponse(response); const zraData=response.data ?? response.data?.receipt ?? {};
      const receipt=zraData.receipt ?? zraData;
      db.prepare(`UPDATE zra_invoice_queue SET status=?,submitted_at=CASE WHEN ? THEN datetime('now') ELSE submitted_at END,
        response_code=?,response_message=?,zra_receipt_number=?,zra_internal_data=?,zra_receipt_signature=?,zra_qr_url=?,updated_at=datetime('now')
        WHERE id=?`).run(success?"submitted":"failed",success?1:0,response.resultCd ?? null,response.resultMsg ?? null,
        receipt.rcptNo ?? zraData.rcptNo ?? null,receipt.intrlData ?? zraData.intrlData ?? null,receipt.rcptSign ?? zraData.rcptSign ?? null,
        receipt.qrCodeUrl ?? zraData.qrCodeUrl ?? null,queueId);
      return {queueId,response,payload};
    }catch(error:any){
      db.prepare("UPDATE zra_invoice_queue SET status='failed',response_message=?,last_attempt_at=datetime('now'),updated_at=datetime('now') WHERE id=?")
        .run(error?.message || "VSDC request failed",queueId);
      throw error;
    }
  });

export const zraSelectInvoiceFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;payload:Record<string,unknown>})
  .handler(async ({data})=>{const cfg=getSavedConfig(data.userId,data.branchId);return selectInvoice(data.payload,{baseUrl:requireVsdcUrl(cfg)});});

export const zraSaveStockItemsFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;payload:Record<string,unknown>})
  .handler(async ({data})=>{const cfg=getSavedConfig(data.userId,data.branchId);return saveStockItems(data.payload,{baseUrl:requireVsdcUrl(cfg)});});

export const zraSaveStockMasterFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;payload:Record<string,unknown>})
  .handler(async ({data})=>{const cfg=getSavedConfig(data.userId,data.branchId);return saveStockMaster(data.payload,{baseUrl:requireVsdcUrl(cfg)});});
