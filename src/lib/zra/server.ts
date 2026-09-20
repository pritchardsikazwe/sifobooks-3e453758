import { createServerFn } from "@tanstack/react-start";
import { getDb, generateUUID } from "../db/database";
import { enqueueZraOperation, updateZraOutbox, recordAuditEvent, assertFiscalTransition, nextDocumentNumber } from "@/lib/compliance/governance";
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

function zraStandardCode(db:any,userId:string,classNeedle:string,nameNeedles:string[]) {
  const rows=db.prepare(
    "SELECT code,code_class_name,name FROM zra_standard_codes WHERE user_id=? AND lower(COALESCE(code_class_name,'')) LIKE lower(?)",
  ).all(userId,`%${classNeedle}%`) as any[];
  const match=rows.find((row:any)=>{
    const name=String(row.name||"").toLowerCase().replace(/&/g," ");
    return nameNeedles.some((needle)=>name.includes(String(needle).toLowerCase().replace(/&/g," ")));
  });
  if(!match) throw new Error(`ZRA_STANDARD_CODE_UNMAPPED: ${classNeedle} / ${nameNeedles.join(" or ")}. Synchronize the VSDC standard-code dictionary and map this transaction value.`);
  return String(match.code);
}

function zraPaymentTypeCode(db:any,userId:string,saleId:string) {
  const payments=db.prepare("SELECT method,amount FROM pos_payments WHERE sale_id=? AND user_id=? ORDER BY id").all(saleId,userId) as any[];
  const methods=payments.filter((p:any)=>Number(p.amount||0)>0).map((p:any)=>String(p.method||"cash").toLowerCase());
  if(methods.length===0) throw new Error("ZRA_PAYMENT_METHOD_REQUIRED");
  if(methods.length===1){
    const m=methods[0];
    if(m==="cash") return zraStandardCode(db,userId,"Payment Method",["cash"]);
    if(m==="credit") return zraStandardCode(db,userId,"Payment Method",["credit"]);
    if(m.includes("mobile") || m.includes("momo")) return zraStandardCode(db,userId,"Payment Method",["mobile money"]);
    if(m.includes("card") || m.includes("visa") || m.includes("master")) return zraStandardCode(db,userId,"Payment Method",["debit credit card","card"]);
    if(m.includes("bank")) return zraStandardCode(db,userId,"Payment Method",["bank check","bank"]);
    throw new Error(`ZRA_PAYMENT_METHOD_UNMAPPED: ${m}`);
  }
  if(methods.every((m)=>m==="cash" || m==="credit")) return zraStandardCode(db,userId,"Payment Method",["cash/credit"]);
  throw new Error("ZRA_PAYMENT_METHOD_UNMAPPED: Split payment requires an applicable VSDC Payment Method standard code.");
}

function buildSalesPayload(db:any,userId:string,saleId:string,saleNo:string) {
  const cfg=getSavedConfig(userId,null);
  if(!cfg?.tpin || !cfg?.branch_code) throw new Error("ZRA_NOT_CONFIGURED: Configure TPIN and Branch ID before submitting sales.");
  const sale=db.prepare("SELECT * FROM pos_sales WHERE id=? AND user_id=? LIMIT 1").get(saleId,userId) as any;
  if(!sale) throw new Error("POS sale not found.");
  const paymentTypeCode=zraPaymentTypeCode(db,userId,saleId);
  const salesTypeCode=zraStandardCode(db,userId,"Transaction Type",["normal"]);
  const receiptTypeCode=zraStandardCode(db,userId,"Sales Receipt Type",["sale"]);
  const statusCode=zraStandardCode(db,userId,"Transaction Progress",["approved"]);
  const salesCategoryName=String(sale.price_level||"normal").toLowerCase()==="wholesale"?"wholesale":"retail";
  const salesCategoryCode=zraStandardCode(db,userId,"Sales Category",[salesCategoryName]);
  const actor=db.prepare("SELECT au.email,p.full_name FROM auth_users au LEFT JOIN profiles p ON p.id=au.id WHERE au.id=? LIMIT 1").get(userId) as any;
  const actorId=String(userId).replace(/-/g,"").slice(0,20);
  const actorName=String(actor?.full_name||actor?.email||userId).slice(0,60);
  const customer=sale.customer_id ? db.prepare("SELECT tpin,name FROM customers WHERE id=? AND user_id=? LIMIT 1").get(sale.customer_id,userId) as any : null;
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
    tpin:cfg.tpin,bhfId:cfg.branch_code,orgInvcNo:0,cisInvcNo:saleNo,custTpin:customer?.tpin ?? null,custNm:sale.customer_name,
    salesTyCd:salesTypeCode,rcptTyCd:receiptTypeCode,pmtTyCd:paymentTypeCode,salesSttsCd:statusCode,cfmDt:nowZraDate(),salesDt:toDateOnly(),
    stockRlsDt:nowZraDate(),cnclReqDt:null,cnclDt:null,rfdDt:null,rfdRsnCd:null,totItemCnt:itemList.length,
    currencyTyCd:zraStandardCode(db,userId,"Currency",["zambian kwacha","zambia kwacha","zmw"]),exchangeRt:"1",prchrAcptcYn:"N",remark:"",regrId:actorId,regrNm:actorName,modrId:actorId,modrNm:actorName,saleCtyCd:salesCategoryCode,
    totTaxblAmt:itemList.reduce((a:number,i:any)=>a+i.vatTaxblAmt,0),totTaxAmt:itemList.reduce((a:number,i:any)=>a+i.vatAmt,0),
    totAmt:Number(sale.total||0),taxblAmtTot:0,taxAmtTot:0,
    itemList:itemList.map(({_taxRate,_vatCat,...i}:any)=>i),
  };
  for(const b of bands){payload["taxblAmt"+b]=clean("taxbl",b);payload["taxAmt"+b]=clean("taxAmt",b);payload["taxRt"+b]=clean("taxRt",b);}
  payload.taxblAmtTot=0; payload.taxAmtTot=0; payload.taxRtTot=0;
  return {cfg,payload};
}

async function syncZraStockAfterSale(db:any,userId:string,saleId:string,saleNo:string,cfg:any,payload:any,terminalId?:string|null) {
  let record=db.prepare("SELECT * FROM zra_stock_records WHERE user_id=? AND sale_id=? LIMIT 1").get(userId,saleId) as any;
  if(!record){
    let sarNo=Date.now();
    while(db.prepare("SELECT id FROM zra_stock_records WHERE sar_no=? LIMIT 1").get(sarNo)) sarNo+=1;
    const id=generateUUID();
    db.prepare("INSERT INTO zra_stock_records (id,user_id,sale_id,sar_no,org_sar_no) VALUES (?,?,?,?,0)").run(id,userId,saleId,sarNo);
    record={id,sar_no:sarNo,org_sar_no:0};
  }

  const actor=db.prepare("SELECT au.email,p.full_name FROM auth_users au LEFT JOIN profiles p ON p.id=au.id WHERE au.id=? LIMIT 1").get(userId) as any;
  const actorId=String(userId).replace(/-/g,"").slice(0,20);
  const actorName=String(actor?.full_name||actor?.email||userId).slice(0,60);
  const regTyCd=zraStandardCode(db,userId,"Registration Type",["manual"]);
  const sarTyCd=zraStandardCode(db,userId,"Stock In/Out Type",["sale"]);
  const customer=db.prepare("SELECT tpin FROM customers WHERE id=(SELECT customer_id FROM pos_sales WHERE id=? LIMIT 1) AND user_id=? LIMIT 1").get(saleId,userId) as any;

  const stockItemsRequest:any={
    tpin:cfg.tpin,bhfId:cfg.branch_code,sarNo:Number(record.sar_no),orgSarNo:Number(record.org_sar_no||0),regTyCd,
    custTpin:customer?.tpin ?? null,custNm:db.prepare("SELECT customer_name FROM pos_sales WHERE id=? AND user_id=?").get(saleId,userId)?.customer_name ?? null,
    custBhfId:null,sarTyCd,ocrnDt:toDateOnly(),totItemCnt:payload.itemList.length,
    totDcAmt:Number(payload.cashDcAmt||0),iplCatCd:null,tlCatCd:null,exciseTxCatCd:null,
    totTaxblAmt:Number(payload.totTaxblAmt||0),totTaxAmt:Number(payload.totTaxAmt||0),totAmt:Number(payload.totAmt||0),
    remark:null,regrId:actorId,regrNm:actorName,modrId:actorId,modrNm:actorName,
    itemList:payload.itemList.map((item:any,index:number)=>({
      itemSeq:index+1,itemCd:item.itemCd,itemClsCd:item.itemClsCd,itemNm:item.itemNm,pkgUnitCd:item.pkgUnitCd,
      qtyUnitCd:item.qtyUnitCd,qty:item.qty,prc:item.prc,splyAmt:item.splyAmt,taxblAmt:item.vatTaxblAmt ?? item.taxblAmt ?? 0,
      vatCatCd:item.vatCatCd,taxAmt:item.vatAmt ?? item.taxAmt ?? 0,totAmt:item.totAmt,
    })),
  };

  const itemsOutbox:any=enqueueZraOperation({userId,branchId:cfg.branch_code,terminalId:terminalId ?? null,sourceType:"pos_sale",sourceId:saleId,operation:"saveStockItems",idempotencyKey:`zra:stock-items:${saleId}`,payload:stockItemsRequest});
  try{
    const itemsResponse:any=await saveStockItems(stockItemsRequest,{baseUrl:requireVsdcUrl(cfg)});
    const itemsSuccess=isSuccessfulVsdcResponse(itemsResponse);
    db.prepare("UPDATE zra_stock_records SET stock_items_status=?,stock_items_request=?,stock_items_response=?,error_code=?,error_message=?,updated_at=datetime('now') WHERE id=?")
      .run(itemsSuccess?"SUCCESS":"FAILED",JSON.stringify(stockItemsRequest),JSON.stringify(itemsResponse),itemsSuccess?null:itemsResponse.resultCd ?? null,itemsSuccess?null:itemsResponse.resultMsg ?? null,record.id);
    updateZraOutbox(itemsOutbox.id,{status:itemsSuccess?"SUCCESS":"FAILED",response:itemsResponse,resultCode:itemsResponse.resultCd,resultMessage:itemsResponse.resultMsg,errorCode:itemsSuccess?null:itemsResponse.resultCd,errorMessage:itemsSuccess?null:itemsResponse.resultMsg});
    if(!itemsSuccess) return {status:"FAILED",itemsResponse,masterResponse:null};
  }catch(error:any){
    db.prepare("UPDATE zra_stock_records SET stock_items_status='RETRY_REQUIRED',error_code='VSDC_REQUEST_FAILED',error_message=?,updated_at=datetime('now') WHERE id=?").run(error?.message||"VSDC stock request failed",record.id);
    updateZraOutbox(itemsOutbox.id,{status:"RETRY_REQUIRED",errorCode:"VSDC_REQUEST_FAILED",errorMessage:error?.message||"VSDC stock request failed"});
    return {status:"RETRY_REQUIRED",itemsResponse:null,masterResponse:null};
  }

  const rows=db.prepare("SELECT si.zra_item_code,si.quantity_on_hand FROM pos_sale_items psi JOIN stock_items si ON si.id=psi.item_id WHERE psi.sale_id=? AND psi.user_id=?").all(saleId,userId) as any[];
  const stockMasterRequest:any={
    tpin:cfg.tpin,bhfId:cfg.branch_code,regrId:actorId,regrNm:actorName,modrNm:actorName,modrId:actorId,
    stockItemList:rows.filter((r:any)=>r.zra_item_code).map((r:any)=>({itemCd:r.zra_item_code,rsdQty:Number(r.quantity_on_hand||0)})),
  };
  const masterOutbox:any=enqueueZraOperation({userId,branchId:cfg.branch_code,terminalId:terminalId ?? null,sourceType:"pos_sale",sourceId:saleId,operation:"saveStockMaster",idempotencyKey:`zra:stock-master:${saleId}`,payload:stockMasterRequest});
  try{
    const masterResponse:any=await saveStockMaster(stockMasterRequest,{baseUrl:requireVsdcUrl(cfg)});
    const masterSuccess=isSuccessfulVsdcResponse(masterResponse);
    db.prepare("UPDATE zra_stock_records SET stock_master_status=?,stock_master_request=?,stock_master_response=?,error_code=?,error_message=?,updated_at=datetime('now') WHERE id=?")
      .run(masterSuccess?"SUCCESS":"FAILED",JSON.stringify(stockMasterRequest),JSON.stringify(masterResponse),masterSuccess?null:masterResponse.resultCd ?? null,masterSuccess?null:masterResponse.resultMsg ?? null,record.id);
    updateZraOutbox(masterOutbox.id,{status:masterSuccess?"SUCCESS":"FAILED",response:masterResponse,resultCode:masterResponse.resultCd,resultMessage:masterResponse.resultMsg,errorCode:masterSuccess?null:masterResponse.resultCd,errorMessage:masterSuccess?null:masterResponse.resultMsg});
    return {status:masterSuccess?"SUCCESS":"FAILED",itemsResponse:null,masterResponse};
  }catch(error:any){
    db.prepare("UPDATE zra_stock_records SET stock_master_status='RETRY_REQUIRED',error_code='VSDC_REQUEST_FAILED',error_message=?,updated_at=datetime('now') WHERE id=?").run(error?.message||"VSDC stock master request failed",record.id);
    updateZraOutbox(masterOutbox.id,{status:"RETRY_REQUIRED",errorCode:"VSDC_REQUEST_FAILED",errorMessage:error?.message||"VSDC stock master request failed"});
    return {status:"RETRY_REQUIRED",itemsResponse:null,masterResponse:null};
  }
}

export const zraSubmitPosSaleFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;saleId:string;saleNo?:string;terminalId?:string|null})
  .handler(async ({data})=>{
    const db=getDb();
    const sale=db.prepare("SELECT * FROM pos_sales WHERE id=? AND user_id=?").get(data.saleId,data.userId) as any;
    if(!sale) throw new Error("POS sale not found.");
    const saleNo=data.saleNo || sale.sale_no;
    const idempotencyKey=`zra:${data.userId}:${data.terminalId || sale.register_id || "terminal"}:${data.saleId}`;
    const control=db.prepare("SELECT * FROM fiscal_transaction_controls WHERE user_id=? AND sale_id=? LIMIT 1").get(data.userId,data.saleId) as any;
    if(control?.state==="FISCALIZED"){
      return {queueId:null,response:{resultCd:"000",data:{rcptNo:control.zra_receipt_number,intrlData:control.zra_internal_data,rcptSign:control.zra_receipt_signature,qrCodeUrl:control.zra_qr_data}},fiscalState:control.state};
    }
    const {cfg,payload}=buildSalesPayload(db,data.userId,data.saleId,saleNo);
    if(control && control.state==="REJECTED") assertFiscalTransition("REJECTED","SUBMITTED");
    if(control){
      db.prepare("UPDATE fiscal_transaction_controls SET state='SUBMITTED',terminal_id=?,invoice_number=?,updated_at=datetime('now'),version=version+1 WHERE id=?")
        .run(data.terminalId ?? sale.register_id ?? null,saleNo,control.id);
    } else {
      db.prepare("INSERT INTO fiscal_transaction_controls (id,user_id,company_id,branch_id,terminal_id,sale_id,invoice_number,state,idempotency_key,submission_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))")
        .run(generateUUID(),data.userId,null,sale.location_id ?? null,data.terminalId ?? sale.register_id ?? null,data.saleId,saleNo,"SUBMITTED",idempotencyKey);
    }
    const outbox:any=enqueueZraOperation({
      userId:data.userId,branchId:cfg.branch_code ?? null,terminalId:data.terminalId ?? sale.register_id ?? null,
      sourceType:"pos_sale",sourceId:data.saleId,operation:"submitSales",idempotencyKey,payload,
    });
    let queue=db.prepare("SELECT * FROM zra_invoice_queue WHERE user_id=? AND source_id=? ORDER BY updated_at DESC LIMIT 1").get(data.userId,data.saleId) as any;
    if(!queue){
      const queueId=generateUUID();
      db.prepare("INSERT INTO zra_invoice_queue (id,user_id,source_type,source_id,invoice_number,total,vat_amount,status,payload,attempt_count,last_attempt_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))")
        .run(queueId,data.userId,"pos_sale",data.saleId,saleNo,Number(sale.total||0),Number(sale.tax||0),"submitting",JSON.stringify(payload),1);
      queue={id:queueId};
    } else {
      db.prepare("UPDATE zra_invoice_queue SET status='submitting',last_attempt_at=datetime('now'),attempt_count=attempt_count+1,payload=?,updated_at=datetime('now') WHERE id=?")
        .run(JSON.stringify(payload),queue.id);
    }
    try{
      const response:any=await saveSales(payload,{baseUrl:requireVsdcUrl(cfg)});
      const success=isSuccessfulVsdcResponse(response);
      const zraData=response.data ?? {};
      const receipt=zraData.receipt ?? zraData;
      const receiptNo=receipt.rcptNo ?? zraData.rcptNo ?? null;
      const internalData=receipt.intrlData ?? zraData.intrlData ?? null;
      const signature=receipt.rcptSign ?? zraData.rcptSign ?? null;
      const qrUrl=receipt.qrCodeUrl ?? zraData.qrCodeUrl ?? null;
      db.prepare(`UPDATE zra_invoice_queue SET status=?,submitted_at=CASE WHEN ? THEN datetime('now') ELSE submitted_at END,response_code=?,response_message=?,zra_receipt_number=?,zra_internal_data=?,zra_receipt_signature=?,zra_qr_url=?,error_code=?,updated_at=datetime('now') WHERE id=?`)
        .run(success?"submitted":"failed",success?1:0,response.resultCd ?? null,response.resultMsg ?? null,receiptNo,internalData,signature,qrUrl,success?null:response.resultCd ?? null,queue.id);
      let stockSync:any=null;
      if(success){
        db.prepare("UPDATE fiscal_transaction_controls SET state='FISCALIZED',zra_receipt_number=?,zra_internal_data=?,zra_receipt_signature=?,zra_qr_data=?,zra_response_json=?,fiscalized_at=datetime('now'),submission_at=COALESCE(submission_at,datetime('now')),error_code=NULL,error_message=NULL,updated_at=datetime('now'),version=version+1 WHERE user_id=? AND sale_id=?")
          .run(receiptNo,internalData,signature,qrUrl,JSON.stringify(response),data.userId,data.saleId);
        updateZraOutbox(outbox.id,{status:"SUCCESS",response,resultCode:response.resultCd,resultMessage:response.resultMsg});
        try {
          stockSync=await syncZraStockAfterSale(db,data.userId,data.saleId,saleNo,cfg,payload,data.terminalId ?? sale.register_id ?? null);
        } catch (stockError:any) {
          stockSync={status:"RETRY_REQUIRED",error:stockError?.message || "ZRA stock synchronization failed"};
        }
        await recordAuditEvent({userId:data.userId,terminalId:data.terminalId ?? sale.register_id ?? null,action:"SALE_FISCALIZED",entityType:"pos_sale",entityId:data.saleId,newValue:{receiptNumber:receiptNo,resultCode:response.resultCd}});
      } else {
        db.prepare("UPDATE fiscal_transaction_controls SET state='REJECTED',zra_response_json=?,error_code=?,error_message=?,updated_at=datetime('now'),version=version+1 WHERE user_id=? AND sale_id=?")
          .run(JSON.stringify(response),response.resultCd ?? null,response.resultMsg ?? "ZRA rejected transaction",data.userId,data.saleId);
        updateZraOutbox(outbox.id,{status:"FAILED",response,resultCode:response.resultCd,resultMessage:response.resultMsg,errorCode:response.resultCd,errorMessage:response.resultMsg});
        await recordAuditEvent({userId:data.userId,action:"ZRA_REJECTION",entityType:"pos_sale",entityId:data.saleId,newValue:{resultCode:response.resultCd,message:response.resultMsg}});
      }
      return {queueId:queue.id,response,payload,fiscalState:success?"FISCALIZED":"REJECTED",stockSync:success ? stockSync : null};
    }catch(error:any){
      db.prepare("UPDATE zra_invoice_queue SET status='failed',response_message=?,error_code='VSDC_REQUEST_FAILED',last_attempt_at=datetime('now'),updated_at=datetime('now') WHERE id=?")
        .run(error?.message || "VSDC request failed",queue.id);
      db.prepare("UPDATE fiscal_transaction_controls SET state='REJECTED',error_code='VSDC_REQUEST_FAILED',error_message=?,updated_at=datetime('now'),version=version+1 WHERE user_id=? AND sale_id=?")
        .run(error?.message || "VSDC request failed",data.userId,data.saleId);
      updateZraOutbox(outbox.id,{status:"RETRY_REQUIRED",errorCode:"VSDC_REQUEST_FAILED",errorMessage:error?.message || "VSDC request failed"});
      await recordAuditEvent({userId:data.userId,action:"ZRA_SUBMISSION_FAILED",entityType:"pos_sale",entityId:data.saleId,newValue:{error:error?.message || "VSDC request failed"}});
      throw error;
    }
  });


export async function submitZraSaleCorrection(args:{
  userId:string;
  saleId:string;
  correctionType:"CREDIT_NOTE"|"DEBIT_NOTE";
  reason:string;
  terminalId?:string|null;
}) {
  const db=getDb();
  const sale=db.prepare("SELECT * FROM pos_sales WHERE id=? AND user_id=? LIMIT 1").get(args.saleId,args.userId) as any;
  if(!sale) throw new Error("SALE_NOT_FOUND");
  const fiscal=db.prepare("SELECT * FROM fiscal_transaction_controls WHERE user_id=? AND sale_id=? LIMIT 1").get(args.userId,args.saleId) as any;
  if(fiscal?.state!=="FISCALIZED" || !fiscal?.zra_receipt_number) throw new Error("ZRA_CORRECTION_REQUIRES_FISCALIZED_SALE");
  if(!args.reason.trim()) throw new Error("CORRECTION_REASON_REQUIRED");
  const existing=db.prepare("SELECT * FROM document_correction_controls WHERE user_id=? AND source_type='pos_sale' AND source_id=? AND correction_type=? LIMIT 1")
    .get(args.userId,args.saleId,args.correctionType) as any;
  if(existing?.status==="FISCALIZED") return existing;

  const cfg=getSavedConfig(args.userId,sale.location_id ?? null);
  if(!cfg?.tpin || !cfg?.branch_code || !cfg?.device_serial) throw new Error("ZRA_CORRECTION_CONFIG_REQUIRED: TPIN, Branch ID and device/SDC identifier are required.");
  const {payload:original}=buildSalesPayload(db,args.userId,args.saleId,sale.sale_no);
  const receiptTypeCode=zraStandardCode(db,args.userId,"Sales Receipt Type",
    [args.correctionType==="CREDIT_NOTE"?"reversal after sale":"adjustment upwards after sale"]);
  const salesTypeCode=zraStandardCode(db,args.userId,"Transaction Type",["normal"]);
  const statusCode=zraStandardCode(db,args.userId,"Transaction Progress",["approved"]);
  const correctionNo=nextCorrectionNumber(db,args.userId,args.correctionType);
  const payload={
    ...original,
    cisInvcNo:correctionNo,
    orgSdcId:String(cfg.device_serial),
    orgIncNo:Number(fiscal.zra_receipt_number),
    rcptTyCd:receiptTypeCode,
    salesTyCd:salesTypeCode,
    salesSttsCd:statusCode,
    remark:args.reason.slice(0,400),
    cfmDt:nowZraDate(),
    salesDt:toDateOnly(),
  } as any;
  const id=existing?.id ?? generateUUID();
  if(!existing) {
    db.prepare("INSERT INTO document_correction_controls (id,user_id,source_type,source_id,correction_type,original_reference,status,reason,created_by,updated_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))")
      .run(id,args.userId,"pos_sale",args.saleId,args.correctionType,String(fiscal.zra_receipt_number),"SUBMITTED",args.reason,args.userId);
  } else {
    db.prepare("UPDATE document_correction_controls SET status='SUBMITTED',reason=?,updated_at=datetime('now') WHERE id=?").run(args.reason,id);
  }
  const outbox=enqueueZraOperation({
    userId:args.userId,branchId:cfg.branch_code,terminalId:args.terminalId ?? sale.register_id ?? null,
    sourceType:"pos_sale",sourceId:args.saleId,
    operation:args.correctionType==="CREDIT_NOTE"?"submitCreditNote":"submitDebitNote",
    idempotencyKey:`zra:correction:${args.correctionType}:${args.saleId}`,
    payload
  });
  try {
    const response:any=await saveSales(payload,{baseUrl:requireVsdcUrl(cfg)});
    const success=isSuccessfulVsdcResponse(response);
    const data:any=response.data ?? {};
    const receipt:any=data.receipt ?? data;
    const receiptNo=receipt.rcptNo ?? data.rcptNo ?? null;
    db.prepare("UPDATE document_correction_controls SET status=?,zra_status=?,zra_reference=?,zra_response=?,updated_at=datetime('now') WHERE id=?")
      .run(success?"FISCALIZED":"REJECTED",success?"SUCCESS":"FAILED",receiptNo,JSON.stringify(response),id);
    updateZraOutbox(outbox.id,{status:success?"SUCCESS":"FAILED",response,resultCode:response.resultCd,resultMessage:response.resultMsg,errorCode:success?null:response.resultCd,errorMessage:success?null:response.resultMsg});
    if(success){
      try{
        const local=db.transaction(()=>{
          const items=db.prepare("SELECT * FROM pos_sale_items WHERE sale_id=? AND user_id=?").all(args.saleId,args.userId) as any[];
          for(const item of items){
            const stock=db.prepare("SELECT quantity_on_hand,cost_price,warehouse_id FROM stock_items WHERE id=? AND user_id=?").get(item.item_id,args.userId) as any;
            if(!stock) continue;
            const qty=Number(item.base_qty ?? item.qty ?? 0);
            const unitCost=Number(item.unit_cost ?? stock.cost_price ?? 0);
            const newQty=Number(stock.quantity_on_hand||0)+qty;
            db.prepare("UPDATE stock_items SET quantity_on_hand=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(newQty,item.item_id,args.userId);
            const loc=sale.location_id ?? stock.warehouse_id ?? null;
            if(loc){
              const bal=db.prepare("SELECT id,quantity FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(args.userId,item.item_id,loc) as any;
              const after=Number(bal?.quantity||0)+qty;
              if(bal) db.prepare("UPDATE stock_balances SET quantity=?,updated_at=datetime('now') WHERE id=?").run(after,bal.id);
              else db.prepare("INSERT INTO stock_balances (id,user_id,item_id,location_id,quantity) VALUES (?,?,?,?,?)").run(generateUUID(),args.userId,item.item_id,loc,after);
            }
            db.prepare("INSERT INTO stock_movements (id,user_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id) VALUES (?,?,?,?,?,?,?,?,?)")
              .run(generateUUID(),args.userId,item.item_id,"RETURN",qty,unitCost,correctionNo,args.reason,sale.location_id ?? stock.warehouse_id ?? null);
          }
          if(sale.journal_entry_id){
            const original=db.prepare("SELECT * FROM journal_entries WHERE id=? AND user_id=? LIMIT 1").get(sale.journal_entry_id,args.userId) as any;
            if(original){
              const reversalId=generateUUID();
              const reversalNo=nextDocumentNumber({userId:args.userId,documentType:"JOURNAL",prefix:"JE",padding:6});
              const lines=db.prepare("SELECT * FROM journal_lines WHERE entry_id=? AND user_id=?").all(original.id,args.userId) as any[];
              const total=lines.reduce((n:number,l:any)=>n+Number(l.debit||0),0);
              db.prepare("INSERT INTO journal_entries (id,user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate,reversal_of,reversal_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
                .run(reversalId,args.userId,reversalNo,toDateOnly().slice(0,4)+"-"+toDateOnly().slice(4,6)+"-"+toDateOnly().slice(6,8),correctionNo,"Reversal of "+original.entry_number,"posted",Number(original.total_credit||0),Number(original.total_debit||0),original.currency||"ZMW",original.exchange_rate||1,original.id,args.reason);
              for(const l of lines){
                db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
                  .run(generateUUID(),args.userId,reversalId,l.account_id,"Correction reversal: "+(l.description||""),Number(l.credit||0),Number(l.debit||0));
              }
              db.prepare("UPDATE document_correction_controls SET journal_entry_id=?,updated_at=datetime('now') WHERE id=?").run(reversalId,id);
            }
          }
          db.prepare("UPDATE pos_sales SET status='refunded',void_reason=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(args.reason,args.saleId,args.userId);
        });
        local();
      }catch(localError:any){
        db.prepare("UPDATE document_correction_controls SET status='LOCAL_POSTING_REQUIRED',updated_at=datetime('now') WHERE id=?").run(id);
        await recordAuditEvent({userId:args.userId,action:"ZRA_CORRECTION_LOCAL_POSTING_REQUIRED",entityType:"pos_sale",entityId:args.saleId,reason:localError?.message||"Local correction posting failed"});
        return {correctionId:id,correctionType:args.correctionType,status:"LOCAL_POSTING_REQUIRED",response,payload};
      }
    }
    await recordAuditEvent({userId:args.userId,terminalId:args.terminalId ?? sale.register_id ?? null,
      action:success?"ZRA_CORRECTION_FISCALIZED":"ZRA_CORRECTION_REJECTED",entityType:"pos_sale",entityId:args.saleId,
      reason:args.reason,newValue:{correctionType:args.correctionType,originalReceipt:fiscal.zra_receipt_number,correctionReceipt:receiptNo}});
    return {correctionId:id,correctionType:args.correctionType,status:success?"FISCALIZED":"REJECTED",response,payload};
  } catch(error:any) {
    db.prepare("UPDATE document_correction_controls SET status='RETRY_REQUIRED',zra_status='REQUEST_FAILED',updated_at=datetime('now') WHERE id=?").run(id);
    updateZraOutbox(outbox.id,{status:"RETRY_REQUIRED",errorCode:"VSDC_REQUEST_FAILED",errorMessage:error?.message || "VSDC request failed"});
    throw error;
  }
}

function nextCorrectionNumber(db:any,userId:string,type:string) {
  const prefix=type==="CREDIT_NOTE"?"CN":"DN";
  const row=db.prepare("SELECT COUNT(*) AS n FROM document_correction_controls WHERE user_id=? AND correction_type=?").get(userId,type) as any;
  return `${prefix}-${new Date().getFullYear()}-${String(Number(row?.n||0)+1).padStart(6,"0")}`;
}

export const zraSubmitCorrectionFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;saleId:string;correctionType:"CREDIT_NOTE"|"DEBIT_NOTE";reason:string;terminalId?:string|null})
  .handler(async ({data})=>submitZraSaleCorrection(data));

export const zraSelectInvoiceFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;payload:Record<string,unknown>})
  .handler(async ({data})=>{const cfg=getSavedConfig(data.userId,data.branchId);return selectInvoice(data.payload,{baseUrl:requireVsdcUrl(cfg)});});

export const zraSaveStockItemsFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;payload:Record<string,unknown>})
  .handler(async ({data})=>{const cfg=getSavedConfig(data.userId,data.branchId);return saveStockItems(data.payload,{baseUrl:requireVsdcUrl(cfg)});});

export const zraSaveStockMasterFn = createServerFn({method:"POST"})
  .inputValidator((raw:unknown)=>raw as {userId:string;branchId?:string|null;payload:Record<string,unknown>})
  .handler(async ({data})=>{const cfg=getSavedConfig(data.userId,data.branchId);return saveStockMaster(data.payload,{baseUrl:requireVsdcUrl(cfg)});});
