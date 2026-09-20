import { getDb, generateUUID } from "@/lib/db/database";
import { assertPeriodOpen, nextDocumentNumber, recordAuditEvent } from "@/lib/compliance/governance";

function account(db:any,userId:string,companyId:string|null,ruleKey:string,candidates:string[]) {
  const configured=db.prepare(
    "SELECT debit_account_id,credit_account_id FROM accounting_posting_rules WHERE user_id=? AND (? IS NULL OR company_id=?) AND rule_key=? AND active=1 LIMIT 1",
  ).get(userId,companyId,companyId,ruleKey) as any;
  const id=configured?.debit_account_id || configured?.credit_account_id;
  if(id) return id;
  const placeholders=candidates.map(()=>"?").join(",");
  const row=db.prepare(
    "SELECT id FROM chart_of_accounts WHERE user_id=? AND account_code IN ("+placeholders+") AND is_active=1 ORDER BY account_code LIMIT 1",
  ).get(userId,...candidates) as any;
  if(row?.id) return row.id;
  throw new Error("ACCOUNTING_POSTING_RULE_MISSING:"+ruleKey);
}

export function createPurchaseOrder(args:{
  userId:string; supplierId?:string|null; orderDate:string; expectedDate?:string|null;
  notes?:string|null; items:Array<{itemId?:string|null;description:string;quantity:number;unitPrice:number;taxRate?:number}>
}) {
  const db=getDb(); assertPeriodOpen(args.userId,args.orderDate);
  if(!args.items.length) throw new Error("PO_EMPTY");
  const supplier=args.supplierId ? db.prepare("SELECT id FROM suppliers WHERE id=? AND user_id=?").get(args.supplierId,args.userId) : null;
  if(args.supplierId && !supplier) throw new Error("SUPPLIER_NOT_FOUND");
  const company=db.prepare("SELECT company_id FROM company_members WHERE user_id=? LIMIT 1").get(args.userId) as any;
  const companyId=company?.company_id??null;
  const poNumber=nextDocumentNumber({userId:args.userId,companyId,documentType:"PURCHASE_ORDER",prefix:"PO",padding:6});
  const tx=db.transaction(()=>{
    const id=generateUUID(); let subtotal=0,tax=0;
    db.prepare("INSERT INTO purchase_orders (id,user_id,supplier_id,po_number,order_date,expected_date,status,notes) VALUES (?,?,?,?,?,?,?,?)")
      .run(id,args.userId,args.supplierId??null,poNumber,args.orderDate,args.expectedDate??null,"DRAFT",args.notes??null);
    for(const row of args.items){
      const qty=Number(row.quantity), price=Number(row.unitPrice), rate=Number(row.taxRate??0);
      if(!(qty>0)||!(price>=0)||!(rate>=0)) throw new Error("PO_BAD_LINE");
      const line=qty*price; subtotal+=line; tax+=line*rate/100;
      db.prepare("INSERT INTO purchase_order_items (id,user_id,po_id,item_id,description,quantity,unit_price,tax_rate,line_total) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),args.userId,id,row.itemId??null,row.description,qty,price,rate,line);
    }
    db.prepare("UPDATE purchase_orders SET subtotal=?,tax_amount=?,total=?,updated_at=datetime('now') WHERE id=?")
      .run(subtotal,tax,subtotal+tax,id);
    return {id,poNumber,subtotal,tax,total:subtotal+tax};
  });
  void recordAuditEvent({userId:args.userId,action:"PURCHASE_ORDER_CREATED",entityType:"purchase_order",entityId:tx.id,newValue:tx});
  return tx;
}

export function approvePurchaseOrder(args:{userId:string;poId:string;approvedBy:string}) {
  const db=getDb();
  const po=db.prepare("SELECT * FROM purchase_orders WHERE id=? AND user_id=? LIMIT 1").get(args.poId,args.userId) as any;
  if(!po) throw new Error("PO_NOT_FOUND");
  if(po.status!=="DRAFT") throw new Error("PO_NOT_DRAFT");
  if(!args.approvedBy) throw new Error("PO_APPROVER_REQUIRED");
  const staff=db.prepare("SELECT id FROM staff_members WHERE user_id=? AND is_active=1 LIMIT 1").get(args.approvedBy);
  if(!staff) throw new Error("PO_APPROVER_NOT_AUTHORIZED");
  db.prepare("UPDATE purchase_orders SET status='APPROVED',approved_by=?,approved_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND user_id=?")
    .run(args.approvedBy,args.poId,args.userId);
  void recordAuditEvent({userId:args.userId,action:"PURCHASE_ORDER_APPROVED",entityType:"purchase_order",entityId:args.poId,newValue:{approvedBy:args.approvedBy}});
  return {ok:true,poId:args.poId};
}

export function createSupplierBillFromReceipt(args:{
  userId:string; receiptId:string; supplierInvoiceNumber:string; billDate:string; dueDate?:string|null;
}) {
  const db=getDb();
  assertPeriodOpen(args.userId,args.billDate);
  const receipt=db.prepare("SELECT * FROM purchase_receipts WHERE id=? AND user_id=? LIMIT 1").get(args.receiptId,args.userId) as any;
  if(!receipt) throw new Error("GRN_NOT_FOUND");
  if(receipt.status!=="POSTED") throw new Error("GRN_NOT_POSTED");
  if(receipt.bill_id) throw new Error("GRN_ALREADY_BILLED");
  if(!args.supplierInvoiceNumber?.trim()) throw new Error("SUPPLIER_INVOICE_REQUIRED");
  const companyId=receipt.company_id??null;
  const billNumber=nextDocumentNumber({userId:args.userId,companyId,branchId:receipt.branch_id??null,documentType:"SUPPLIER_BILL",prefix:"BILL",padding:6});
  const tx=db.transaction(()=>{
    const billId=generateUUID();
    db.prepare("INSERT INTO bills (id,user_id,supplier_id,po_id,bill_number,supplier_invoice_number,bill_date,due_date,status,subtotal,tax_amount,total,amount_paid,balance_due,currency,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(billId,args.userId,receipt.supplier_id??null,receipt.po_id??null,billNumber,args.supplierInvoiceNumber,args.billDate,args.dueDate??null,"unpaid",receipt.subtotal,receipt.tax_amount,receipt.total,0,receipt.total,receipt.currency??"ZMW","From GRN "+receipt.receipt_number);
    const lines=db.prepare("SELECT * FROM purchase_receipt_items WHERE receipt_id=? AND user_id=?").all(receipt.id,args.userId) as any[];
    for(const line of lines){
      const item=db.prepare("SELECT name FROM stock_items WHERE id=? AND user_id=?").get(line.item_id,args.userId) as any;
      db.prepare("INSERT INTO bill_items (id,user_id,bill_id,item_id,description,quantity,unit_price,tax_rate,line_total) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(),args.userId,billId,line.item_id,item?.name??"Inventory item",line.quantity,line.unit_cost,line.tax_rate,line.taxable_amount);
    }
    const grni=account(db,args.userId,companyId,"GOODS_RECEIVED_NOT_INVOICED",["2050","2150","2200"]);
    const ap=account(db,args.userId,companyId,"ACCOUNTS_PAYABLE",["2000","2100"]);
    const jeId=generateUUID(),jeNo=nextDocumentNumber({userId:args.userId,companyId,branchId:receipt.branch_id??null,documentType:"JOURNAL",prefix:"JE",padding:6});
    db.prepare("INSERT INTO journal_entries (id,user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(jeId,args.userId,jeNo,args.billDate,billNumber,"Supplier bill "+billNumber,"posted",receipt.total,receipt.total,receipt.currency??"ZMW",1);
    db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
      .run(generateUUID(),args.userId,jeId,grni,"Clear GRNI "+receipt.receipt_number,receipt.total,0);
    db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
      .run(generateUUID(),args.userId,jeId,ap,"Supplier payable",0,receipt.total);
    db.prepare("UPDATE purchase_receipts SET bill_id=?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(billId,receipt.id,args.userId);
    if(receipt.supplier_id){
      db.prepare("UPDATE suppliers SET current_balance=COALESCE(current_balance,0)+?,updated_at=datetime('now') WHERE id=? AND user_id=?").run(receipt.total,receipt.supplier_id,args.userId);
    }
    return {billId,billNumber,journalEntryId:jeId,total:receipt.total};
  });
  void recordAuditEvent({userId:args.userId,action:"SUPPLIER_BILL_POSTED",entityType:"bill",entityId:tx.billId,newValue:tx});
  return tx;
}
