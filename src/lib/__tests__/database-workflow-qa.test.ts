import { describe, expect, it, afterEach } from "vitest";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
let db: Database;

function setup() {
  db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(schema);
  return db;
}

function id(prefix: string) {
  return prefix + "-" + crypto.randomUUID();
}

afterEach(() => db?.close());

describe("SifoBooks SQLite database workflow QA", () => {
  it("CREATE → POST → AUDIT: persists a sales invoice and balanced journal", () => {
    setup();
    const user = id("user"), company = id("co"), invoice = id("inv"), entry = id("je");
    db.query("INSERT INTO companies (id,user_id,name,base_currency) VALUES (?,?,?,?)").run(company,user,"QA Trading Zambia","ZMW");
    db.query("INSERT INTO invoices (id,user_id,number,status,subtotal,vat_amount,total,balance_due) VALUES (?,?,?,?,?,?,?,?)")
      .run(invoice,user,"QA-INV-001","posted",1000,160,1160,1160);
    db.query("INSERT INTO journal_entries (id,user_id,entry_number,status,total_debit,total_credit,description) VALUES (?,?,?,?,?,?,?)")
      .run(entry,user,"QA-JE-001","posted",1160,1160,"QA sales invoice");
    db.query("INSERT INTO journal_lines (id,user_id,entry_id,account_id,debit,credit) VALUES (?,?,?,?,?,?)").run(id("jl"),user,entry,"1100",1160,0);
    db.query("INSERT INTO journal_lines (id,user_id,entry_id,account_id,debit,credit) VALUES (?,?,?,?,?,?)").run(id("jl"),user,entry,"4000",0,1000);
    db.query("INSERT INTO journal_lines (id,user_id,entry_id,account_id,debit,credit) VALUES (?,?,?,?,?,?)").run(id("jl"),user,entry,"2200",0,160);
    db.query("INSERT INTO audit_logs (id,user_id,actor_email,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?,?)")
      .run(id("audit"),user,"qa@sifobooks.test","POST","invoice",invoice,"Invoice posted and journal created");

    const inv = db.query("SELECT status,total,balance_due FROM invoices WHERE id=?").get(invoice) as any;
    const sums = db.query("SELECT COALESCE(SUM(debit),0) debit, COALESCE(SUM(credit),0) credit FROM journal_lines WHERE entry_id=?").get(entry) as any;
    const audit = db.query("SELECT COUNT(*) count FROM audit_logs WHERE entity_id=?").get(invoice) as any;
    expect(inv).toMatchObject({status:"posted",total:1160,balance_due:1160});
    expect(sums.debit).toBe(1160);
    expect(sums.credit).toBe(1160);
    expect(audit.count).toBe(1);
  });

  it("CREATE → SELL → STOCK: persists POS sale, payment and stock movement", () => {
    setup();
    const user=id("user"), item=id("item"), sale=id("sale"), shift=id("shift"), register=id("reg");
    db.query("INSERT INTO stock_items (id,user_id,name,sku,cost_price,sell_price,quantity_on_hand) VALUES (?,?,?,?,?,?,?)")
      .run(item,user,"QA Product","QA-001",60,100,10);
    db.query("INSERT INTO pos_registers (id,user_id,name) VALUES (?,?,?)").run(register,user,"QA Till 1");
    db.query("INSERT INTO pos_shifts (id,user_id,register_id,status,opening_float) VALUES (?,?,?,?,?)").run(shift,user,register,"open",100);
    db.query("INSERT INTO pos_sales (id,user_id,sale_no,shift_id,register_id,status,subtotal,tax,total,paid,cost_total) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(sale,user,"POS-QA-001",shift,register,"posted",200,32,232,232,120);
    db.query("INSERT INTO pos_sale_items (id,user_id,sale_id,item_id,name,qty,price,unit_cost,tax_rate,line_total) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id("psi"),user,sale,item,"QA Product",2,100,60,16,232);
    db.query("INSERT INTO pos_payments (id,user_id,sale_id,method,amount) VALUES (?,?,?,?,?)").run(id("pay"),user,sale,"cash",232);
    db.query("INSERT INTO stock_movements (id,user_id,item_id,movement_type,quantity,unit_cost,reference) VALUES (?,?,?,?,?,?,?)")
      .run(id("sm"),user,item,"sale",-2,60,"POS-QA-001");
    db.query("UPDATE stock_items SET quantity_on_hand=quantity_on_hand-2 WHERE id=?").run(item);

    const stock=db.query("SELECT quantity_on_hand FROM stock_items WHERE id=?").get(item) as any;
    const pos=db.query("SELECT status,total,paid,cost_total FROM pos_sales WHERE id=?").get(sale) as any;
    const payment=db.query("SELECT SUM(amount) amount FROM pos_payments WHERE sale_id=?").get(sale) as any;
    const movement=db.query("SELECT SUM(quantity) quantity FROM stock_movements WHERE item_id=? AND reference=?").get(item,"POS-QA-001") as any;
    expect(stock.quantity_on_hand).toBe(8);
    expect(pos).toMatchObject({status:"posted",total:232,paid:232,cost_total:120});
    expect(payment.amount).toBe(232);
    expect(movement.quantity).toBe(-2);
  });

  it("REVERSE: preserves the original transaction and records a reversal", () => {
    setup();
    const user=id("user"), original=id("orig"), reversal=id("rev");
    db.query("INSERT INTO journal_entries (id,user_id,entry_number,status,total_debit,total_credit,description) VALUES (?,?,?,?,?,?,?)")
      .run(original,user,"QA-JE-ORIG","posted",232,232,"Original sale");
    db.query("INSERT INTO journal_entries (id,user_id,entry_number,status,total_debit,total_credit,reversal_of,reversal_reason,description) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(reversal,user,"QA-JE-REV","posted",232,232,original,"Customer refund","Reversal");
    const rows=db.query("SELECT status,reversal_of,reversal_reason FROM journal_entries WHERE id IN (?,?) ORDER BY entry_number").all(original,reversal) as any[];
    expect(rows[0].status).toBe("posted");
    expect(rows[1]).toMatchObject({status:"posted",reversal_of:original,reversal_reason:"Customer refund"});
    expect(rows[0].reversal_of).toBeNull();
  });

  it("TRANSACTION SAFETY: failed posting rolls back all related database writes", () => {
    setup();
    const user=id("user"), entry=id("je");
    expect(() => db.transaction(() => {
      db.query("INSERT INTO journal_entries (id,user_id,entry_number,status,total_debit,total_credit) VALUES (?,?,?,?,?,?)")
        .run(entry,user,"QA-JE-ROLLBACK","posted",100,90);
      if (100 !== 90) throw new Error("Unbalanced journal");
    })()).toThrow("Unbalanced journal");
    const count=db.query("SELECT COUNT(*) count FROM journal_entries WHERE id=?").get(entry) as any;
    expect(count.count).toBe(0);
  });
});
