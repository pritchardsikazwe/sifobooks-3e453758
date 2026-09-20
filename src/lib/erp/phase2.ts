import { getDb, generateUUID } from "@/lib/db/database";
import { assertPeriodOpen, nextDocumentNumber, recordAuditEvent } from "@/lib/compliance/governance";

function postingAccount(db:any,userId:string,companyId:string|null,ruleKey:string,candidates:string[]) {
  const configured=db.prepare("SELECT debit_account_id,credit_account_id FROM accounting_posting_rules WHERE user_id=? AND (? IS NULL OR company_id=?) AND rule_key=? AND active=1 LIMIT 1")
    .get(userId,companyId,companyId,ruleKey) as any;
  const configuredId=configured?.debit_account_id || configured?.credit_account_id;
  if(configuredId) return configuredId;
  const placeholders=candidates.map(()=>"?").join(",");
  const row=db.prepare(`SELECT id FROM chart_of_accounts WHERE user_id=? AND account_code IN (${placeholders}) AND is_active=1 ORDER BY account_code LIMIT 1`).get(userId,...candidates) as any;
  if(row?.id) return row.id;
  const purpose=db.prepare("SELECT id FROM chart_of_accounts WHERE user_id=? AND lower(COALESCE(purpose,''))=lower(?) AND is_active=1 LIMIT 1").get(userId,ruleKey) as any;
  if(purpose?.id) return purpose.id;
  throw new Error(`ACCOUNTING_POSTING_RULE_MISSING:${ruleKey}`);
}

function taxFor(db:any,userId:string,companyId:string|null,code:string|undefined,rateFallback:number,date:string) {
  const row=code ? db.prepare("SELECT * FROM tax_codes WHERE user_id=? AND (? IS NULL OR company_id=?) AND code=? AND active=1 AND effective_from<=? AND (effective_to IS NULL OR effective_to>=?) ORDER BY effective_from DESC LIMIT 1")
    .get(userId,companyId,companyId,code,date,date) as any : null;
  return row ?? {id:null,code:code||"standard",name:"Configured VAT",tax_type:"VAT",rate:rateFallback,category:"standard",inclusive_default:1,effective_from:date,zra_tax_code:null};
}

function ledger(db:any,args:any) {
  db.prepare("INSERT INTO stock_movements (id,user_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(generateUUID(),args.userId,args.itemId,args.movementType,args.quantity,args.unitCost,args.reference,args.note,args.locationId);
  const balance=db.prepare("SELECT * FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(args.userId,args.itemId,args.locationId) as any;
  const before=Number(balance?.quantity||0);
  const after=before + Number(args.quantityIn||0) - Number(args.quantityOut||0);
  if(balance) db.prepare("UPDATE stock_balances SET quantity=?,updated_at=datetime('now') WHERE id=?").run(after,balance.id);
  else db.prepare("INSERT INTO stock_balances (id,user_id,item_id,location_id,quantity) VALUES (?,?,?,?,?)").run(generateUUID(),args.userId,args.itemId,args.locationId,after);
  db.prepare("INSERT INTO stock_ledger (id,user_id,item_id,warehouse_id,location_id,movement_type,quantity_in,quantity_out,balance_quantity,unit_cost,total_cost,source_type,source_id,source_number,movement_date,reason,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(generateUUID(),args.userId,args.itemId,args.warehouseId||null,args.locationId,args.movementType,args.quantityIn||0,args.quantityOut||0,after,args.unitCost||0,Math.abs(Number(args.quantityIn||args.quantityOut||0))*Number(args.unitCost||0),args.sourceType,args.sourceId,args.reference,args.date,args.reason||null,args.userId);
  return after;
}

export function receivePurchase(args:{userId:string;supplierId?:string|null;poId?:string|null;branchId?:string|null;warehouseId?:string|null;locationId:string;receiptDate:string;supplierInvoiceNumber?:string|null;items:Array<{itemId:string;poItemId?:string|null;quantity:number;unitCost:number;taxRate?:number;taxCode?:string|null;batchNo?:string|null;expiryDate?:string|null}>}) {
  const db=getDb(); assertPeriodOpen(args.userId,args.receiptDate);
  if(!args.items.length) throw new Error("GRN_EMPTY");
  const company=db.prepare("SELECT company_id FROM company_members WHERE user_id=? LIMIT 1").get(args.userId) as any;
  const companyId=company?.company_id??null;
  const receiptNumber=nextDocumentNumber({userId:args.userId,companyId,branchId:args.branchId??null,documentType:"GRN",prefix:"GRN",padding:6});
  const tx=db.transaction(()=>{
    let subtotal=0,taxTotal=0;
    const receiptId=generateUUID();
    for(const row of args.items){
      if(!(row.quantity>0)||!(row.unitCost>=0)) throw new Error("GRN_BAD_LINE");
      const item=db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(row.itemId,args.userId) as any;
      if(!item) throw new Error("GRN_UNKNOWN_ITEM");
      const tax=taxFor(db,args.userId,companyId,row.taxCode||item.tax_category,Number(row.taxRate??item.vat_rate??0),args.receiptDate);
      const taxable=Number(row.quantity)*Number(row.unitCost);
      const taxAmount=taxable*Number(tax.rate||0)/100;
      subtotal+=taxable; taxTotal+=taxAmount;
      db.prepare("INSERT INTO purchase_receipt_items (id,user_id,receipt_id,item_id,po_item_id,quantity,unit_cost,tax_rate,taxable_amount,tax_amount,total_amount,batch_no,expiry_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),args.userId,receiptId,row.itemId,row.poItemId??null,row.quantity,row.unitCost,Number(tax.rate||0),taxable,taxAmount,taxable+taxAmount,row.batchNo??null,row.expiryDate??null);
      const newQty=Number(item.quantity_on_hand||0)+row.quantity;
      db.prepare("UPDATE stock_items SET quantity_on_hand=?,cost_price=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(newQty,row.unitCost,row.itemId,args.userId);
      ledger(db,{userId:args.userId,itemId:row.itemId,movementType:"PURCHASE",quantityIn:row.quantity,quantityOut:0,unitCost:row.unitCost,reference:receiptNumber,note:"Goods received",locationId:args.locationId,warehouseId:args.warehouseId,sourceType:"purchase_receipt",sourceId:receiptId,date:args.receiptDate});
      db.prepare("INSERT INTO tax_transaction_lines (id,user_id,source_type,source_id,line_id,tax_code_id,tax_code,tax_category,rate,taxable_amount,tax_amount,inclusive,effective_from,snapshot_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),args.userId,"purchase_receipt",receiptId,row.itemId,tax.id,tax.code,tax.category,Number(tax.rate||0),taxable,taxAmount,0,tax.effective_from,JSON.stringify(tax));
    }
    const total=subtotal+taxTotal;
    db.prepare("INSERT INTO purchase_receipts (id,user_id,company_id,branch_id,warehouse_id,location_id,supplier_id,po_id,receipt_number,supplier_invoice_number,receipt_date,status,subtotal,tax_amount,total,currency,created_by,posted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))")
      .run(receiptId,args.userId,companyId,args.branchId??null,args.warehouseId??null,args.locationId,args.supplierId??null,args.poId??null,receiptNumber,args.supplierInvoiceNumber??null,args.receiptDate,"POSTED",subtotal,taxTotal,total,"ZMW",args.userId);
    const inv=postingAccount(db,args.userId,companyId,"INVENTORY_ASSET",["1300","1400"]);
    const inputVat=taxTotal>0?postingAccount(db,args.userId,companyId,"INPUT_VAT",["2110","2210"]):null;
    const ap=postingAccount(db,args.userId,companyId,"ACCOUNTS_PAYABLE",["2000","2100"]);
    const jeId=generateUUID(),jeNo=nextDocumentNumber({userId:args.userId,companyId,branchId:args.branchId??null,documentType:"JOURNAL",prefix:"JE",padding:6});
    db.prepare("INSERT INTO journal_entries (id,user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(jeId,args.userId,jeNo,args.receiptDate,receiptNumber,`Goods received ${receiptNumber}`,"posted",total,total,"ZMW",1);
    db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)").run(generateUUID(),args.userId,jeId,inv,"Inventory received",subtotal,0);
    if(inputVat) db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)").run(generateUUID(),args.userId,jeId,inputVat,"Input VAT",taxTotal,0);
    db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)").run(generateUUID(),args.userId,jeId,ap,"Supplier payable",0,total);
    db.prepare("UPDATE purchase_receipts SET journal_entry_id=? WHERE id=?").run(jeId,receiptId);
    return {receiptId,receiptNumber,subtotal,taxAmount:taxTotal,total,journalEntryId:jeId};
  });
  void recordAuditEvent({userId:args.userId,branchId:args.branchId,action:"PURCHASE_RECEIVED",entityType:"purchase_receipt",entityId:tx.receiptId,newValue:{receiptNumber:tx.receiptNumber,total:tx.total}});
  return tx;
}

export function transferStock(args:{userId:string;companyId?:string|null;branchId?:string|null;fromLocationId:string;toLocationId:string;transferDate:string;items:Array<{itemId:string;quantity:number;unitCost?:number}>;reason?:string}) {
  const db=getDb(); assertPeriodOpen(args.userId,args.transferDate);
  if(args.fromLocationId===args.toLocationId) throw new Error("TRANSFER_SAME_LOCATION");
  if(!args.items.length) throw new Error("TRANSFER_EMPTY");
  const transferNumber=nextDocumentNumber({userId:args.userId,companyId:args.companyId??null,branchId:args.branchId??null,documentType:"ST",prefix:"ST",padding:6});
  const tx=db.transaction(()=>{
    const id=generateUUID();
    db.prepare("INSERT INTO inventory_transfers (id,user_id,company_id,reference,from_location_id,to_location_id,transfer_date,status,notes,transfer_number) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id,args.userId,args.companyId??null,args.reason??null,args.fromLocationId,args.toLocationId,args.transferDate,"POSTED",args.reason??null,transferNumber);
    let total=0;
    for(const row of args.items){
      if(!(row.quantity>0)) throw new Error("TRANSFER_BAD_QTY");
      const balance=db.prepare("SELECT quantity FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(args.userId,row.itemId,args.fromLocationId) as any;
      const available=Number(balance?.quantity||0);
      if(available<row.quantity) throw new Error(`TRANSFER_INSUFFICIENT_STOCK:${row.itemId}`);
      const item=db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(row.itemId,args.userId) as any;
      if(!item) throw new Error("TRANSFER_UNKNOWN_ITEM");
      const unitCost=Number(row.unitCost??item.cost_price??0);
      ledger(db,{userId:args.userId,itemId:row.itemId,movementType:"TRANSFER_OUT",quantityIn:0,quantityOut:row.quantity,unitCost,reference:transferNumber,note:"Warehouse/store transfer out",locationId:args.fromLocationId,sourceType:"inventory_transfer",sourceId:id,date:args.transferDate,reason:args.reason});
      ledger(db,{userId:args.userId,itemId:row.itemId,movementType:"TRANSFER_IN",quantityIn:row.quantity,quantityOut:0,unitCost,reference:transferNumber,note:"Warehouse/store transfer in",locationId:args.toLocationId,sourceType:"inventory_transfer",sourceId:id,date:args.transferDate,reason:args.reason});
      db.prepare("INSERT INTO inventory_transfer_items (id,transfer_id,item_id,description,quantity,unit_cost,qty_received) VALUES (?,?,?,?,?,?,?)").run(generateUUID(),id,row.itemId,item.name,row.quantity,unitCost,row.quantity);
      total+=row.quantity*unitCost;
    }
    return {id,transferNumber,total};
  });
  void recordAuditEvent({userId:args.userId,branchId:args.branchId,action:"STOCK_TRANSFER_POSTED",entityType:"inventory_transfer",entityId:tx.id,newValue:{transferNumber:tx.transferNumber,total:tx.total}});
  return tx;
}

export function createStockReconciliation(args:{userId:string;companyId?:string|null;branchId?:string|null;locationId:string;warehouseId?:string|null;countDate:string;reason?:string;items:Array<{itemId:string;countedQty:number}>}) {
  const db=getDb(); assertPeriodOpen(args.userId,args.countDate);
  const number=nextDocumentNumber({userId:args.userId,companyId:args.companyId??null,branchId:args.branchId??null,documentType:"STOCK_COUNT",prefix:"CNT",padding:6});
  const tx=db.transaction(()=>{
    const id=generateUUID(); let sys=0,counted=0;
    db.prepare("INSERT INTO stock_reconciliations (id,user_id,company_id,branch_id,location_id,warehouse_id,count_number,count_date,status,requested_by,reason) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(id,args.userId,args.companyId??null,args.branchId??null,args.locationId,args.warehouseId??null,number,args.countDate,"DRAFT",args.userId,args.reason??null);
    for(const row of args.items){
      const item=db.prepare("SELECT * FROM stock_items WHERE id=? AND user_id=?").get(row.itemId,args.userId) as any;
      if(!item) throw new Error("COUNT_UNKNOWN_ITEM");
      const bal=db.prepare("SELECT quantity FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(args.userId,row.itemId,args.locationId) as any;
      const systemQty=Number(bal?.quantity??item.quantity_on_hand??0), qty=Number(row.countedQty);
      const value=Number(item.cost_price||0);
      sys+=systemQty*value; counted+=qty*value;
      db.prepare("INSERT INTO stock_reconciliation_items (id,user_id,reconciliation_id,item_id,system_qty,counted_qty,variance_qty,unit_cost,variance_value) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),args.userId,id,row.itemId,systemQty,qty,qty-systemQty,value,(qty-systemQty)*value);
    }
    db.prepare("UPDATE stock_reconciliations SET total_system_value=?,total_counted_value=?,total_variance_value=? WHERE id=?").run(sys,counted,counted-sys,id);
    return {id,countNumber:number,totalSystemValue:sys,totalCountedValue:counted,totalVarianceValue:counted-sys};
  });
  void recordAuditEvent({userId:args.userId,branchId:args.branchId,action:"STOCK_RECONCILIATION_CREATED",entityType:"stock_reconciliation",entityId:tx.id,newValue:tx});
  return tx;
}

export function postStockReconciliation(args:{userId:string;reconciliationId:string;approvedBy?:string|null}) {
  const db=getDb();
  const rec=db.prepare("SELECT * FROM stock_reconciliations WHERE id=? AND user_id=? LIMIT 1").get(args.reconciliationId,args.userId) as any;
  if(!rec) throw new Error("RECONCILIATION_NOT_FOUND");
  if(rec.status!=="DRAFT") throw new Error("RECONCILIATION_NOT_DRAFT");
  if(!args.approvedBy) throw new Error("STOCK_RECONCILIATION_APPROVAL_REQUIRED");
  const tx=db.transaction(()=>{
    const lines=db.prepare("SELECT * FROM stock_reconciliation_items WHERE reconciliation_id=? AND user_id=?").all(rec.id,args.userId) as any[];
    for(const line of lines){
      const bal=db.prepare("SELECT * FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1").get(args.userId,line.item_id,rec.location_id) as any;
      const current=Number(bal?.quantity??line.system_qty), newQty=Number(line.counted_qty);
      if(bal) db.prepare("UPDATE stock_balances SET quantity=?,updated_at=datetime('now') WHERE id=?").run(newQty,bal.id);
      else db.prepare("INSERT INTO stock_balances (id,user_id,item_id,location_id,quantity) VALUES (?,?,?,?,?)").run(generateUUID(),args.userId,line.item_id,rec.location_id,newQty);
      const item=db.prepare("SELECT cost_price,quantity_on_hand FROM stock_items WHERE id=? AND user_id=?").get(line.item_id,args.userId) as any;
      db.prepare("UPDATE stock_items SET quantity_on_hand=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(Number(item?.quantity_on_hand||0)+Number(line.variance_qty||0),line.item_id,args.userId);
      ledger(db,{userId:args.userId,itemId:line.item_id,movementType:"ADJUSTMENT",quantityIn:Number(line.variance_qty)>0?Number(line.variance_qty):0,quantityOut:Number(line.variance_qty)<0?Math.abs(Number(line.variance_qty)):0,unitCost:Number(line.unit_cost||0),reference:rec.count_number,note:"Approved stock reconciliation",locationId:rec.location_id,sourceType:"stock_reconciliation",sourceId:rec.id,date:rec.count_date,reason:rec.reason});
    }
    db.prepare("UPDATE stock_reconciliations SET status='POSTED',approved_by=?,approved_at=datetime('now'),posted_at=datetime('now'),updated_at=datetime('now') WHERE id=?").run(args.approvedBy,rec.id);
  });
  void recordAuditEvent({userId:args.userId,action:"STOCK_RECONCILIATION_POSTED",entityType:"stock_reconciliation",entityId:rec.id,newValue:{approvedBy:args.approvedBy}});
  return {ok:true,reconciliationId:rec.id};
}
