import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { executeQuery, type QuerySpec } from "./query-executor";
import { executeCloudQuery } from "./cloud-query-executor";
import { isCloudDatabaseConfigured } from "@/lib/cloud/postgres";
import { signUp, signInWithPassword, getUser, getSession, updateUser, verifyToken } from "./auth";
import { convertToBaseUnit } from "@/lib/inventory/unit-conversions";
import { getDb, generateUUID } from "./database";
import { runAccountingIntegrityReconciliation } from "@/lib/compliance/reconciliation";
import { assertPeriodOpen, nextDocumentNumber, recordAuditEvent } from "@/lib/compliance/governance";
import { receivePurchase, transferStock, createStockReconciliation, postStockReconciliation } from "@/lib/erp/phase2";
import { saveUnitConversion, listUnitConversions } from "@/lib/inventory/unit-conversions";
import { createPurchaseOrder, approvePurchaseOrder, createSupplierBillFromReceipt } from "@/lib/erp/purchasing";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

// Resolve authentication from the explicit server-function payload first, then
// from the Authorization header attached by the global client middleware.
// This keeps local SQLite auth reliable even when a caller does not explicitly
// include authToken in its payload.
function resolveAuthToken(explicitToken?: string | null): string | null {
  if (explicitToken) return explicitToken;
  try {
    const request = getRequest();
    const authorization = request?.headers.get("authorization");
    if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim() || null;
    const localHeader = request?.headers.get("x-sifobooks-auth");
    if (localHeader) return localHeader.trim() || null;
  } catch {
    // Server functions can also execute directly during SSR, where there may
    // be no request context. In that case the explicit token is the only source.
  }
  return null;
}

// ── Query execution ──
export const executeQueryFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth])
  .inputValidator((raw: unknown) => raw as QuerySpec)
  .handler(async ({ data }) => {
    const token = resolveAuthToken(data.authToken);
    const auth = token ? await verifyToken(token) : null;
    if (!auth) return { data: null, error: { message: "NOT_AUTHENTICATED" } };
    return isCloudDatabaseConfigured() ? await executeCloudQuery(data, auth.userId) : executeQuery(data, auth.userId);
  });

// ── Auth ──
export const signUpFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { email: string; password: string; metadata?: Record<string, any> })
  .handler(async ({ data }) => {
    return signUp(data.email, data.password, data.metadata);
  });

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { email: string; password: string })
  .handler(async ({ data }) => {
    return signInWithPassword(data.email, data.password);
  });

export const getUserFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { token: string })
  .handler(async ({ data }) => {
    return getUser(data.token);
  });

export const getSessionFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { token: string })
  .handler(async ({ data }) => {
    return getSession(data.token);
  });

export const updateUserFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { token: string; attrs: Record<string, any> })
  .handler(async ({ data }) => {
    return updateUser(data.token, data.attrs);
  });

// ── Storage ──
const STORAGE_DIR = join(process.cwd(), "data", "storage");

export const uploadFileFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { bucket: string; path: string; data: string; upsert?: boolean })
  .handler(async ({ data }) => {
    try {
      const dir = join(STORAGE_DIR, data.bucket);
      mkdirSync(dir, { recursive: true });
      const filePath = join(dir, data.path);
      if (!data.upsert && existsSync(filePath)) {
        return { data: null, error: { message: "File already exists" } };
      }
      const buffer = Buffer.from(data.data, "base64");
      writeFileSync(filePath, buffer);
      return { data: { path: data.path }, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  });

export const getSignedUrlFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { bucket: string; path: string })
  .handler(async ({ data }) => {
    // Return a local URL — no signing needed for local storage
    return { data: { signedUrl: `/api/storage/${data.bucket}/${data.path}` }, error: null };
  });

export const removeFileFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as { bucket: string; paths: string[] })
  .handler(async ({ data }) => {
    try {
      for (const p of data.paths) {
        const filePath = join(STORAGE_DIR, data.bucket, p);
        if (existsSync(filePath)) unlinkSync(filePath);
      }
      return { data: null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  });

// ── RPC ──
export const rpcFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth])
  .inputValidator((raw: unknown) => raw as { name: string; args: Record<string, any>; authToken?: string | null })
  .handler(async ({ data }) => {
    const token = resolveAuthToken(data.authToken);
    const auth = token ? await verifyToken(token) : null;
    if (!auth) return { data: null, error: { message: "NOT_AUTHENTICATED" } };
    return executeRpc(data.name, { ...(data.args || {}), _uid: auth.userId });
  });

// ── Token verification (for auth middleware) ──
export const verifyTokenFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth])
  .inputValidator((raw: unknown) => raw as { token: string })
  .handler(async ({ data }) => {
    const token = resolveAuthToken(data.token);
    const result = token ? await verifyToken(token) : null;
    return result;
  });

// ── RPC implementations ──
function postingAccount(db: any, userId: string, companyId: string | null, ruleKey: string, candidates: string[]) {
  const configured = db.prepare(
    "SELECT debit_account_id,credit_account_id FROM accounting_posting_rules WHERE user_id=? AND (? IS NULL OR company_id=?) AND rule_key=? AND active=1 LIMIT 1",
  ).get(userId,companyId,companyId,ruleKey) as any;
  const configuredId = configured?.debit_account_id || configured?.credit_account_id;
  if (configuredId) return configuredId;
  const placeholders = candidates.map(() => "?").join(",");
  const row = db.prepare(`SELECT id FROM chart_of_accounts WHERE user_id=? AND account_code IN (${placeholders}) AND is_active=1 ORDER BY account_code LIMIT 1`)
    .get(userId,...candidates) as any;
  if (row?.id) return row.id;
  const byPurpose = db.prepare("SELECT id FROM chart_of_accounts WHERE user_id=? AND lower(COALESCE(purpose,''))=lower(?) AND is_active=1 LIMIT 1")
    .get(userId,ruleKey) as any;
  if (byPurpose?.id) return byPurpose.id;
  throw new Error(`ACCOUNTING_POSTING_RULE_MISSING: Configure the ${ruleKey} account before posting sales.`);
}

function activeTaxRate(db:any,userId:string,item:any) {
  const now = new Date().toISOString().slice(0,10);
  const code = item.tax_category || "standard";
  const row = db.prepare(
    "SELECT rate FROM tax_codes WHERE user_id=? AND active=1 AND (code=? OR category=?) AND effective_from<=? AND (effective_to IS NULL OR effective_to>=?) ORDER BY effective_from DESC LIMIT 1",
  ).get(userId,code,code,now,now) as any;
  return row ? Number(row.rate) : Number(item.zra_tax_rate ?? item.vat_rate ?? 0);
}

function executePosCheckout(args: Record<string, any>) {
  const db = getDb();
  const uid = String(args._uid || "");
  if (!uid) throw new Error("NOT_SIGNED_IN");
  const saleDraft = args._sale || {};
  const itemRows = Array.isArray(args._items) ? args._items : [];
  const payRows = Array.isArray(args._payments) ? args._payments : [];
  if (!itemRows.length) throw new Error("EMPTY_SALE");
  const clientRef = String(saleDraft.client_ref || "");
  if (!clientRef) throw new Error("CLIENT_REF_REQUIRED");

  const duplicate = db.prepare("SELECT id,sale_no,status FROM pos_sales WHERE user_id=? AND client_ref=? LIMIT 1").get(uid,clientRef) as any;
  if (duplicate) return { sale_id:duplicate.id,sale_no:duplicate.sale_no,duplicate:true,status:duplicate.status };

  const registerId = saleDraft.register_id ?? null;
  const register = registerId ? db.prepare("SELECT id,branch FROM pos_registers WHERE id=? AND user_id=? AND is_active=1").get(registerId,uid) as any : null;
  if (!register) throw new Error("NO_REGISTER");

  const shift = saleDraft.shift_id
    ? db.prepare("SELECT * FROM pos_shifts WHERE id=? AND user_id=? AND status='open'").get(saleDraft.shift_id,uid) as any
    : db.prepare("SELECT * FROM pos_shifts WHERE user_id=? AND status='open' ORDER BY opened_at DESC LIMIT 1").get(uid) as any;
  if (!shift) throw new Error("NO_ACTIVE_SHIFT");

  const periodDate = String(saleDraft.sold_at || new Date().toISOString()).slice(0,10);
  assertPeriodOpen(uid,periodDate);

  const settings = db.prepare("SELECT * FROM pos_settings WHERE user_id=? LIMIT 1").get(uid) as any;
  const taxInclusive = settings?.tax_inclusive !== 0;
  const allowNegative = settings?.allow_negative_stock === 1;
  const saleDiscountPct = Math.max(0,Number(saleDraft.sale_discount_pct || 0));

  const lines:any[]=[];
  for (const draft of itemRows) {
    if (!draft.item_id) throw new Error("ITEM_REQUIRED");
    const item=db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(draft.item_id,uid) as any;
    if (!item) throw new Error("UNKNOWN_ITEM");
    const qty=Number(draft.qty);
    if (!(qty>0)) throw new Error("BAD_QUANTITY");
    const converted=convertToBaseUnit(db,uid,item,qty,draft.unit ?? item.sales_unit ?? item.base_unit);
    const baseQty=Number(converted.quantity);
    const saleUnit=converted.fromUnit;
    const baseUnit=converted.baseUnit;
    const price=Number(draft.price);
    if (!(price>=0)) throw new Error("NO_PRICE");
    const currentStock=Number(item.quantity_on_hand || 0);
    const locationId=saleDraft.location_id ?? item.warehouse_id ?? null;
    const balance=db.prepare("SELECT quantity FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(uid,item.id,locationId ?? "default") as any;
    const locationStock=Number(balance?.quantity ?? currentStock);
    if (!allowNegative && locationStock < baseQty) throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
    const unitCost=Number(item.cost_price || 0);
    if (!(unitCost>=0)) throw new Error(`NO_COST:${item.name}`);
    const discountPct=Math.min(100,Math.max(0,Number(draft.discount_pct || 0)));
    const gross=qty*price;
    const lineDiscount=gross*discountPct/100;
    const afterLine=Math.max(gross-lineDiscount,0);
    const rate=activeTaxRate(db,uid,item);
    const taxInclusiveLine=taxInclusive ? afterLine : afterLine + afterLine*rate/100;
    const lineTax=taxInclusive ? afterLine-afterLine/(1+rate/100) : afterLine*rate/100;
    const taxable=taxInclusive ? afterLine-lineTax : afterLine;
    lines.push({item,qty,baseQty,saleUnit,baseUnit,price,discountPct,gross,lineDiscount,afterLine,rate,taxable,lineTax,total:taxInclusiveLine,unitCost});
  }

  const gross=lines.reduce((s,l)=>s+l.gross,0);
  const lineDiscount=lines.reduce((s,l)=>s+l.lineDiscount,0);
  const afterLine=Math.max(gross-lineDiscount,0);
  const saleDiscount=Math.max(0,afterLine*saleDiscountPct/100);
  const discountFactor=afterLine>0 ? Math.max(0,(afterLine-saleDiscount)/afterLine) : 1;
  const taxable=lines.reduce((s,l)=>s+l.taxable*discountFactor,0);
  const tax=lines.reduce((s,l)=>s+l.lineTax*discountFactor,0);
  const subtotal=taxInclusive ? taxable : afterLine-saleDiscount;
  const total=taxInclusive ? taxable+tax : subtotal+tax;
  const costTotal=lines.reduce((s,l)=>s+l.baseQty*l.unitCost,0);
  const rounded=(v:number)=>Math.round(v*100)/100;
  const expectedTotal=rounded(total);

  const paymentTotal=payRows.reduce((s,p)=>s+Number(p.amount||0),0);
  if (paymentTotal + 0.005 < expectedTotal) throw new Error("PAYMENT_SHORT");
  const change=Math.max(0,paymentTotal-expectedTotal);
  const payments=payRows.map((p,i)=>({...p,amount:Number(p.amount||0)}));
  if(change>0){
    const cash=payments.findIndex(p=>String(p.method||"").toLowerCase()==="cash");
    if(cash>=0) payments[cash].amount=Math.max(0,payments[cash].amount-change);
  }

  const company=db.prepare("SELECT company_id FROM company_members WHERE user_id=? LIMIT 1").get(uid) as any;
  const companyId=company?.company_id ?? null;
  const saleNo=nextDocumentNumber({userId:uid,companyId,branchId:register.branch ?? null,documentType:"POS_SALE",prefix:"POS",padding:6});

  const cashAccount=postingAccount(db,uid,companyId,"SALE_CASH",["1000","1100"]);
  const cardAccount=postingAccount(db,uid,companyId,"SALE_CARD",["1110","1200"]);
  const mobileAccount=postingAccount(db,uid,companyId,"SALE_MOBILE_MONEY",["1120","1210"]);
  const receivableAccount=postingAccount(db,uid,companyId,"SALE_RECEIVABLE",["1200","1300"]);
  const revenueAccount=postingAccount(db,uid,companyId,"SALES_REVENUE",["4000","4100"]);
  const vatAccount=tax>0 ? postingAccount(db,uid,companyId,"OUTPUT_VAT",["2100","2200"]) : null;
  const inventoryAccount=costTotal>0 ? postingAccount(db,uid,companyId,"INVENTORY_ASSET",["1300","1400"]) : null;
  const cogsAccount=costTotal>0 ? postingAccount(db,uid,companyId,"COST_OF_SALES",["5000","5100"]) : null;

  const transaction=db.transaction(()=>{
    const saleId=generateUUID();
    db.prepare("INSERT INTO pos_sales (id,user_id,sale_no,client_ref,shift_id,register_id,customer_id,customer_name,price_level,status,subtotal,discount,tax,total,paid,change_due,cost_total,note,sold_at,created_by,location_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(saleId,uid,saleNo,clientRef,shift.id,registerId,saleDraft.customer_id ?? null,saleDraft.customer_name ?? "Walk-in Customer",saleDraft.price_level ?? "normal","completed",rounded(taxable),rounded(lineDiscount+saleDiscount),rounded(tax),expectedTotal,rounded(Math.min(paymentTotal,expectedTotal)),rounded(change),rounded(costTotal),saleDraft.note ?? null,saleDraft.sold_at ?? new Date().toISOString(),uid,saleDraft.location_id ?? null);

    for (const l of lines) {
      const saleLineId=generateUUID();
      db.prepare("INSERT INTO pos_sale_items (id,user_id,sale_id,item_id,name,sku,qty,price,unit_cost,discount,tax_rate,line_total,note,unit,base_qty,base_unit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(saleLineId,uid,saleId,l.item.id,l.item.name,l.item.sku ?? null,l.qty,l.price,l.unitCost,l.discountPct,l.rate,rounded(l.total*discountFactor),l.note ?? null,l.saleUnit,l.baseQty,l.baseUnit);
      const taxCode=db.prepare("SELECT * FROM tax_codes WHERE user_id=? AND active=1 AND (code=? OR category=?) AND effective_from<=? AND (effective_to IS NULL OR effective_to>=?) ORDER BY effective_from DESC LIMIT 1")
        .get(uid,l.item.tax_category||"standard",l.item.tax_category||"standard",periodDate,periodDate) as any;
      db.prepare("INSERT INTO tax_transaction_lines (id,user_id,source_type,source_id,line_id,tax_code_id,tax_code,tax_category,rate,taxable_amount,tax_amount,inclusive,effective_from,snapshot_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),uid,"pos_sale",saleId,saleLineId,taxCode?.id??null,taxCode?.code??l.item.tax_category??"standard",taxCode?.category??l.item.tax_category??"standard",l.rate,rounded(l.taxable*discountFactor),rounded(l.lineTax*discountFactor),taxInclusive?1:0,taxCode?.effective_from??periodDate,JSON.stringify({code:taxCode?.code??l.item.tax_category??"standard",rate:l.rate,category:taxCode?.category??l.item.tax_category??"standard",inclusive:taxInclusive}));
      const newQty=Number(l.item.quantity_on_hand||0)-l.baseQty;
      db.prepare("UPDATE stock_items SET quantity_on_hand=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(newQty,l.item.id,uid);
      const locationId=saleDraft.location_id ?? l.item.warehouse_id ?? null;
      const balance=db.prepare("SELECT quantity FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(uid,l.item.id,locationId ?? "default") as any;
      const before=Number(balance?.quantity ?? l.item.quantity_on_hand ?? 0);
      const after=before-l.baseQty;
      if(!allowNegative && after<0) throw new Error(`INSUFFICIENT_STOCK:${l.item.name}`);
      if(balance){
        db.prepare("UPDATE stock_balances SET quantity=?,updated_at=datetime('now') WHERE id=?").run(after,balance.id);
      } else {
        db.prepare("INSERT INTO stock_balances (id,user_id,item_id,location_id,quantity) VALUES (?,?,?,?,?)").run(generateUUID(),uid,l.item.id,locationId ?? "default",after);
      }
      db.prepare("INSERT INTO stock_movements (id,user_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),uid,l.item.id,"SALE",l.baseQty,l.unitCost,saleNo,"POS sale",locationId);
      db.prepare("INSERT INTO stock_ledger (id,user_id,item_id,warehouse_id,location_id,movement_type,quantity_in,quantity_out,balance_quantity,unit_cost,total_cost,source_type,source_id,source_number,movement_date,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),uid,l.item.id,l.item.warehouse_id ?? null,locationId,"SALE",0,l.baseQty,after,l.unitCost,l.baseQty*l.unitCost,"pos_sale",saleId,saleNo,saleDraft.sold_at ?? new Date().toISOString(),uid);
    }

    for (const p of payments) {
      if (p.amount<=0) continue;
      db.prepare("INSERT INTO pos_payments (id,user_id,sale_id,method,amount,reference) VALUES (?,?,?,?,?,?)")
        .run(generateUUID(),uid,saleId,String(p.method||"cash"),rounded(p.amount),p.reference ?? null);
    }

    const entryId=generateUUID();
    const entryNumber=`JE-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
    db.prepare("INSERT INTO journal_entries (id,user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(entryId,uid,entryNumber,periodDate,saleNo,`POS sale ${saleNo}`,"posted",expectedTotal+rounded(costTotal),expectedTotal+rounded(costTotal),"ZMW",1);
    let lineNo=0;
    for (const p of payments) {
      if (p.amount<=0) continue;
      const m=String(p.method||"cash").toLowerCase();
      const account=m==="card"?cardAccount:m.includes("mobile")?mobileAccount:m==="credit"?receivableAccount:cashAccount;
      db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
        .run(generateUUID(),uid,entryId,account,`Payment ${p.method}`,rounded(p.amount),0);
      lineNo++;
    }
    if (change>0) {
      db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
        .run(generateUUID(),uid,entryId,cashAccount,"Change given",0,rounded(change));
    }
    db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
      .run(generateUUID(),uid,entryId,revenueAccount,"Sales revenue",0,rounded(taxable));
    if(vatAccount) db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
      .run(generateUUID(),uid,entryId,vatAccount,"Output VAT",0,rounded(tax));
    if(cogsAccount && inventoryAccount){
      db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
        .run(generateUUID(),uid,entryId,cogsAccount,"Cost of sales",rounded(costTotal),0);
      db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
        .run(generateUUID(),uid,entryId,inventoryAccount,"Inventory asset",0,rounded(costTotal));
    }
    db.prepare("UPDATE pos_sales SET journal_entry_id=? WHERE id=?").run(entryId,saleId);
    return {saleId,saleNo,total:expectedTotal,tax:rounded(tax),costTotal:rounded(costTotal),change:rounded(change)};
  });
  void recordAuditEvent({userId:uid,terminalId:registerId,action:"SALE_POSTED",entityType:"pos_sale",entityId:transaction.saleId,newValue:{saleNo:transaction.saleNo,total:transaction.total}});
  return {...transaction,duplicate:false};
}

function executeRpc(name: string, args: Record<string, any>): { data: any; error: any } {
  const db = getDb();
  try {
    switch (name) {
      case "create_purchase_order": {
        return { data: createPurchaseOrder({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "approve_purchase_order": {
        return { data: approvePurchaseOrder({ ...args, userId: String(args._uid || ""), approvedBy: String(args._uid || "") }), error: null };
      }
      case "create_supplier_bill": {
        return { data: createSupplierBillFromReceipt({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "save_unit_conversion": {
        const uid=String(args._uid||"");
        return { data: saveUnitConversion({ ...args, userId: uid, actorId: uid }), error: null };
      }
      case "list_unit_conversions": {
        const uid=String(args._uid||"");
        return { data: listUnitConversions(uid, String(args.itemId||"")), error: null };
      }
      case "create_purchase_order": {
        return { data: createPurchaseOrder({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "approve_purchase_order": {
        return { data: approvePurchaseOrder({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "create_supplier_bill": {
        return { data: createSupplierBillFromReceipt({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "receive_purchase": {
        return { data: receivePurchase({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "transfer_stock": {
        return { data: transferStock({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "create_stock_reconciliation": {
        return { data: createStockReconciliation({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "post_stock_reconciliation": {
        return { data: postStockReconciliation({ ...args, userId: String(args._uid || "") }), error: null };
      }
      case "close_pos_shift": {
        const uid=String(args._uid||"");
        const shiftId=String(args._shift_id||"");
        if(!uid||!shiftId) throw new Error("SHIFT_REFERENCE_REQUIRED");
        const shift=db.prepare("SELECT * FROM pos_shifts WHERE id=? AND user_id=? LIMIT 1").get(shiftId,uid) as any;
        if(!shift) throw new Error("SHIFT_NOT_FOUND");
        if(shift.status!=="open") throw new Error("SHIFT_ALREADY_CLOSED");
        const sales=db.prepare("SELECT id,total,status FROM pos_sales WHERE shift_id=? AND user_id=?").all(shiftId,uid) as any[];
        const completed=sales.filter((s:any)=>s.status==="completed");
        const ids=completed.map((s:any)=>s.id);
        let cashSales=0;
        if(ids.length){
          const placeholders=ids.map(()=>"?").join(",");
          const rows=db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM pos_payments WHERE user_id=? AND method='cash' AND sale_id IN (${placeholders})`).get(uid,...ids) as any;
          cashSales=Number(rows?.total||0);
        }
        const cashIn=Number(shift.cash_in||0), cashOut=Number(shift.cash_out||0);
        const expected=Number(shift.opening_float||0)+cashSales+cashIn-cashOut;
        const actual=Number(args._actual_cash);
        if(!Number.isFinite(actual)||actual<0) throw new Error("INVALID_ACTUAL_CASH");
        const variance=actual-expected;
        db.prepare("UPDATE pos_shifts SET status='closed',closed_at=datetime('now'),actual_cash=?,expected_cash=?,variance=?,updated_at=datetime('now') WHERE id=? AND user_id=? AND status='open'")
          .run(actual,expected,variance,shiftId,uid);
        void recordAuditEvent({userId:uid,terminalId:shift.register_id,action:"POS_SHIFT_CLOSED",entityType:"pos_shift",entityId:shiftId,newValue:{expectedCash:expected,actualCash:actual,variance}});
        return {data:{shiftId,expectedCash:expected,actualCash:actual,variance},error:null};
      }
      case "pos_checkout": {
        const result=executePosCheckout(args);
        return { data: result, error: null };
      }
      case "reverse_pos_sale": {
        const uid=String(args._uid||"");
        const saleId=String(args._sale_id||"");
        const action=String(args._action||"void");
        const reason=String(args._reason||"");
        if(!uid||!saleId) throw new Error("SALE_REFERENCE_REQUIRED");
        const sale=db.prepare("SELECT * FROM pos_sales WHERE id=? AND user_id=?").get(saleId,uid) as any;
        if(!sale) throw new Error("SALE_NOT_FOUND");
        if(sale.status==="voided"||sale.status==="refunded") throw new Error("SALE_ALREADY_REVERSED");
        const fiscal=db.prepare("SELECT * FROM fiscal_transaction_controls WHERE user_id=? AND sale_id=? LIMIT 1").get(uid,saleId) as any;
        if(fiscal?.state==="FISCALIZED") throw new Error("FISCALIZED_SALE_REQUIRES_ZRA_CORRECTION_WORKFLOW");
        const reversalId=generateUUID();
        const reversalNo=nextDocumentNumber({userId:uid,documentType:action==="refund"?"POS_REFUND":"POS_VOID",prefix:action==="refund"?"RF":"VD",padding:6});
        const transaction=db.transaction(()=>{
          const items=db.prepare("SELECT * FROM pos_sale_items WHERE sale_id=? AND user_id=?").all(saleId,uid) as any[];
          for(const item of items){
            const stock=db.prepare("SELECT quantity_on_hand,cost_price,warehouse_id,name FROM stock_items WHERE id=? AND user_id=?").get(item.item_id,uid) as any;
            if(stock){
              const returnQty=Number(item.base_qty ?? item.qty ?? 0);
              const newQty=Number(stock.quantity_on_hand||0)+returnQty;
              const loc=sale.location_id ?? stock.warehouse_id ?? null;
              if(loc){
                const bal=db.prepare("SELECT id,quantity FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(uid,item.item_id,loc) as any;
                const balAfter=Number(bal?.quantity||0)+returnQty;
                if(bal) db.prepare("UPDATE stock_balances SET quantity=?,updated_at=datetime('now') WHERE id=?").run(balAfter,bal.id);
                else db.prepare("INSERT INTO stock_balances (id,user_id,item_id,location_id,quantity) VALUES (?,?,?,?,?)").run(generateUUID(),uid,item.item_id,loc,balAfter);
              }
              db.prepare("UPDATE stock_items SET quantity_on_hand=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(newQty,item.item_id,uid);
              db.prepare("INSERT INTO stock_movements (id,user_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id) VALUES (?,?,?,?,?,?,?,?,?)")
                .run(generateUUID(),uid,item.item_id,"RETURN",returnQty,Number(item.unit_cost||stock.cost_price||0),reversalNo,reason,sale.location_id ?? stock.warehouse_id ?? null);
              db.prepare("INSERT INTO stock_ledger (id,user_id,item_id,warehouse_id,location_id,movement_type,quantity_in,quantity_out,balance_quantity,unit_cost,total_cost,source_type,source_id,source_number,reason,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                .run(generateUUID(),uid,item.item_id,stock.warehouse_id ?? null,sale.location_id ?? null,"RETURN",returnQty,0,newQty,Number(item.unit_cost||stock.cost_price||0),returnQty*Number(item.unit_cost||stock.cost_price||0),"pos_reversal",reversalId,reversalNo,reason,uid);
            }
          }
          db.prepare("UPDATE pos_sales SET status=?,void_reason=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(action==="refund"?"refunded":"voided",reason,saleId,uid);
          db.prepare("INSERT INTO pos_reversal_actions (id,user_id,original_sale_id,reversal_sale_id,action,reason,refund_method) VALUES (?,?,?,?,?,?,?)")
            .run(generateUUID(),uid,saleId,reversalId,action,reason,args._refund_method ?? null);
          return reversalId;
        });
        void recordAuditEvent({userId:uid,action:action==="refund"?"REFUND_CREATED":"SALE_CANCELLED",entityType:"pos_sale",entityId:saleId,newValue:{reason,reversalId:transaction}});
        return {data:transaction,error:null};
      }
      case "run_accounting_integrity_reconciliation": {
        const uid=String(args._uid||"");
        if(!uid) throw new Error("NOT_SIGNED_IN");
        return {data:runAccountingIntegrityReconciliation({userId:uid,fromDate:args._from_date??null,toDate:args._to_date??null}),error:null};
      }
      case "next_doc_number": {
        const uid = args._uid;
        const prefix = args._prefix || "DOC";
        const year = new Date().getFullYear();
        const pattern = `${prefix}-${year}-%`;
        const row = db.prepare(
          `SELECT number FROM (SELECT invoice_number AS number FROM invoices WHERE user_id = ? AND invoice_number LIKE ?
           UNION ALL SELECT bill_number AS number FROM bills WHERE user_id = ? AND bill_number LIKE ?
           UNION ALL SELECT number FROM journal_entries WHERE user_id = ? AND number LIKE ?
           UNION ALL SELECT quote_number AS number FROM quotes WHERE user_id = ? AND quote_number LIKE ?)
           ORDER BY number DESC LIMIT 1`
        ).get(uid, pattern, uid, pattern, uid, pattern, uid, pattern) as any;
        let seq = 1;
        if (row?.number) {
          const match = String(row.number).match(/(\d+)$/);
          if (match) seq = parseInt(match[1]) + 1;
        }
        return { data: `${prefix}-${year}-${String(seq).padStart(4, "0")}`, error: null };
      }
      case "has_role": {
        const userId = args._user_id;
        const role = args._role;
        const row = db.prepare("SELECT role FROM user_roles WHERE user_id = ? AND role = ?").get(userId, role) as any;
        return { data: !!row, error: null };
      }
      case "can_manage_company": {
        const userId = args._user_id;
        const companyId = args._company_id;
        const row = db.prepare("SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND role IN ('admin', 'owner')").get(userId, companyId) as any;
        return { data: !!row, error: null };
      }
      case "is_company_admin": {
        const userId = args._user_id;
        const companyId = args._company_id;
        const row = db.prepare("SELECT role FROM company_members WHERE user_id = ? AND company_id = ? AND role IN ('admin', 'owner')").get(userId, companyId) as any;
        return { data: !!row, error: null };
      }
      case "ensure_account": {
        const uid = args._uid;
        const code = args._code;
        const name = args._name;
        const type = args._type;
        let row = db.prepare("SELECT id FROM chart_of_accounts WHERE user_id = ? AND account_code = ?").get(uid, code) as any;
        if (row) return { data: row.id, error: null };
        const id = generateUUID();
        db.prepare("INSERT INTO chart_of_accounts (id, user_id, account_code, account_name, account_type, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))")
          .run(id, uid, code, name, type);
        return { data: id, error: null };
      }
      case "current_tenant": {
        // Return the first company for the user
        const row = db.prepare("SELECT company_id FROM company_members WHERE user_id = ? LIMIT 1").get(args._uid || "") as any;
        return { data: row?.company_id || null, error: null };
      }
      case "has_perm": {
        return { data: true, error: null }; // Permissive for local dev
      }
      case "pos_can": {
        return { data: true, error: null };
      }
      case "pos_has_books": {
        return { data: true, error: null };
      }
      case "my_access": {
        const uid = String(args._uid || "");
        if (!uid) return { data: null, error: { message: "NOT_SIGNED_IN" } };

        // The user who owns a local company is the business owner. The older
        // local resolver returned an empty permission set, so the UI treated
        // the owner as a staff member with no features.
        const owned = db.prepare(
          "SELECT id, name FROM companies WHERE user_id=? LIMIT 1"
        ).get(uid) as any;

        if (owned) {
          return {
            data: {
              tenant_id: uid,
              is_owner: true,
              is_super_admin: false,
              full_name: null,
              role_key: "owner",
              role_name: "Owner",
              permissions: [],
              company_id: owned.id,
              company_name: owned.name ?? null,
            },
            error: null,
          };
        }

        const member = db.prepare(
          "SELECT company_id, role FROM company_members WHERE user_id=? ORDER BY rowid LIMIT 1"
        ).get(uid) as any;

        if (member) {
          const role = String(member.role || "staff");
          return {
            data: {
              tenant_id: member.company_id,
              is_owner: false,
              is_super_admin: false,
              role_key: role,
              role_name: role.replace(/_/g, " "),
              permissions: [],
            },
            error: null,
          };
        }

        return {
          data: {
            tenant_id: uid,
            is_owner: true,
            is_super_admin: false,
            role_key: "owner",
            role_name: "Owner",
            permissions: [],
          },
          error: null,
        };
      }
      case "can_act_on_request": {
        return { data: true, error: null };
      }
      case "approver_role_for_request": {
        return { data: "admin", error: null };
      }
      case "has_override": {
        return { data: false, error: null };
      }
      case "fx_rate": {
        return { data: 1, error: null };
      }
      case "branch_ok": {
        return { data: true, error: null };
      }
      case "is_staff_of": {
        return { data: true, error: null };
      }
      case "notify_once": {
        return { data: null, error: null };
      }
      default:
        console.warn(`[rpc] Unimplemented: ${name}`);
        return { data: null, error: { message: `RPC "${name}" not implemented in local mode` } };
    }
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}
