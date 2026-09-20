import { getDb } from "@/lib/db/database";

type ReconArgs={userId:string;fromDate?:string|null;toDate?:string|null};

export function runAccountingIntegrityReconciliation(args:ReconArgs){
  const db=getDb();
  const params=[args.userId,args.fromDate??"1900-01-01",args.toDate??"2999-12-31"];
  const issues:any[]=[];
  const add=(code:string,message:string,details?:unknown)=>issues.push({code,message,details:details??null});

  const journals=db.prepare(`
    SELECT id,entry_number,entry_date,total_debit,total_credit,status
    FROM journal_entries
    WHERE user_id=? AND entry_date BETWEEN ? AND ?
  `).all(...params) as any[];
  for(const j of journals){
    if(j.status!=="posted") continue;
    const lines=db.prepare("SELECT COALESCE(SUM(debit),0) debit,COALESCE(SUM(credit),0) credit,COUNT(*) count FROM journal_lines WHERE user_id=? AND entry_id=?").get(args.userId,j.id) as any;
    const headerD=Number(j.total_debit||0),headerC=Number(j.total_credit||0),lineD=Number(lines?.debit||0),lineC=Number(lines?.credit||0);
    if(Math.abs(headerD-headerC)>0.005 || Math.abs(lineD-lineC)>0.005 || Math.abs(headerD-lineD)>0.005)
      add("UNBALANCED_JOURNAL",`Journal ${j.entry_number} is not balanced.`,{journalId:j.id,headerDebit:headerD,headerCredit:headerC,lineDebit:lineD,lineCredit:lineC});
    if(Number(lines?.count||0)===0) add("EMPTY_JOURNAL",`Journal ${j.entry_number} has no lines.`,{journalId:j.id});
  }

  const sales=db.prepare(`
    SELECT id,sale_no,total,tax,cost_total,status,journal_entry_id
    FROM pos_sales WHERE user_id=? AND sold_at BETWEEN ? AND ?
  `).all(...params) as any[];
  for(const s of sales.filter((x:any)=>["completed","refunded","voided"].includes(x.status))){
    if(!s.journal_entry_id) add("POS_MISSING_JOURNAL",`POS sale ${s.sale_no||s.id} has no journal entry.`,{saleId:s.id});
    const tax=db.prepare("SELECT COALESCE(SUM(tax_amount),0) tax FROM tax_transaction_lines WHERE user_id=? AND source_type='pos_sale' AND source_id=?").get(args.userId,s.id) as any;
    if(Math.abs(Number(tax?.tax||0)-Number(s.tax||0))>0.02)
      add("POS_TAX_SNAPSHOT_MISMATCH",`POS sale ${s.sale_no||s.id} tax does not match its tax snapshot.`,{saleId:s.id,saleTax:s.tax,snapshotTax:tax?.tax});
    const fiscal=db.prepare("SELECT state,zra_receipt_number FROM fiscal_transaction_controls WHERE user_id=? AND sale_id=? LIMIT 1").get(args.userId,s.id) as any;
    if(fiscal?.state==="FISCALIZED" && !fiscal.zra_receipt_number) add("FISCALIZED_WITHOUT_RECEIPT",`Fiscalized sale ${s.sale_no||s.id} has no ZRA receipt number.`,{saleId:s.id});
  }

  const grns=db.prepare("SELECT id,receipt_number,total,journal_entry_id,bill_id FROM purchase_receipts WHERE user_id=? AND receipt_date BETWEEN ? AND ?").all(...params) as any[];
  for(const g of grns){
    if(g.status==="POSTED"&&!g.journal_entry_id) add("GRN_MISSING_JOURNAL",`GRN ${g.receipt_number} has no journal entry.`,{receiptId:g.id});
    if(g.bill_id){
      const bill=db.prepare("SELECT total FROM bills WHERE id=? AND user_id=? LIMIT 1").get(g.bill_id,args.userId) as any;
      if(bill && Math.abs(Number(bill.total||0)-Number(g.total||0))>0.02) add("GRN_BILL_TOTAL_MISMATCH",`GRN ${g.receipt_number} and supplier bill totals differ.`,{receiptId:g.id,billId:g.bill_id,grnTotal:g.total,billTotal:bill.total});
    }
  }

  const balances=db.prepare(`
    SELECT item_id,location_id,quantity FROM stock_balances WHERE user_id=?
  `).all(args.userId) as any[];
  for(const b of balances){
    if(!Number.isFinite(Number(b.quantity))) add("INVALID_STOCK_BALANCE","Stock balance is not numeric.",b);
    const movements=db.prepare(`
      SELECT COALESCE(SUM(quantity_in),0) inQty,COALESCE(SUM(quantity_out),0) outQty
      FROM stock_ledger WHERE user_id=? AND item_id=? AND location_id=?
    `).get(args.userId,b.item_id,b.location_id) as any;
    if(movements && Number(b.quantity)<-0.000001)
      add("NEGATIVE_STOCK_BALANCE","Negative stock balance exists.",b);
  }

  const fiscalized=db.prepare("SELECT COUNT(*) n FROM fiscal_transaction_controls WHERE user_id=? AND state='FISCALIZED'").get(args.userId) as any;
  const rejected=db.prepare("SELECT COUNT(*) n FROM fiscal_transaction_controls WHERE user_id=? AND state='REJECTED'").get(args.userId) as any;
  const pending=db.prepare("SELECT COUNT(*) n FROM zra_outbox WHERE user_id=? AND status IN ('PENDING','RETRY_REQUIRED','FAILED')").get(args.userId) as any;
  const result={ok:issues.length===0,issues,summary:{journals:journals.length,sales:sales.length,grns:grns.length,fiscalized:Number(fiscalized?.n||0),rejected:Number(rejected?.n||0),zraPending:Number(pending?.n||0)}};
  return result;
}
