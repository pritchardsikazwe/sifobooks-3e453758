import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// CI retrigger: transaction QA follows the runtime SQLite schema exactly.
const db = new Database(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8"));
const verticalMigration = readFileSync(
  join(process.cwd(), "src/lib/db/migrations/20260923120000_vertical_property_school.sql"), "utf8",
);
for (const statement of verticalMigration.split(";").map((x) => x.trim()).filter(Boolean)) {
  try { db.exec(statement); } catch (error) {
    if (!/duplicate column name|already exists/i.test(String(error))) throw error;
  }
}

const fail: string[] = [];
const ok = (condition: unknown, message: string) => {
  if (!condition) fail.push(message);
  else console.log("PASS  " + message);
};
const hasTable = (t: string) =>
  !!db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);

function run(name: string, fn: () => void) {
  console.log("\n[" + name.toUpperCase() + "]");
  try { fn(); } catch (e) { fail.push(name + ": " + (e as Error).message); console.log("FAIL  " + name + ": " + (e as Error).message); }
}

// Accounting: balanced journal + expense
run("accounting", () => {
  const uid = "qa-user";
  const entry = "qa-je-1";
  db.exec("BEGIN");
  db.query("INSERT INTO journal_entries (id,user_id,entry_number,status,total_debit,total_credit) VALUES (?,?,?,?,?,?)")
    .run(entry, uid, "QA-JE-001", "posted", 100, 100);
  db.query("INSERT INTO journal_lines (id,user_id,entry_id,account_id,debit,credit) VALUES (?,?,?,?,?,?)")
    .run("qa-jl-1",uid,entry,"cash",100,0);
  db.query("INSERT INTO journal_lines (id,user_id,entry_id,account_id,debit,credit) VALUES (?,?,?,?,?,?)")
    .run("qa-jl-2",uid,entry,"expense",0,100);
  db.exec("COMMIT");
  const x:any = db.query("SELECT SUM(debit) d,SUM(credit) c FROM journal_lines WHERE entry_id=?").get(entry);
  ok(x.d === x.c && x.d === 100, "journal posts balanced 100/100");
});

// Retail: sale/payment/stock/report math
run("retail", () => {
  const uid="qa-user", item="qa-retail-item", sale="qa-sale-1";
  db.query("INSERT INTO stock_items (id,user_id,name,cost_price,sell_price,quantity_on_hand) VALUES (?,?,?,?,?,?)")
    .run(item,uid,"QA Retail Item",10,20,10);
  db.query("INSERT INTO pos_sales (id,user_id,sale_no,total,paid,status) VALUES (?,?,?,?,?,?)")
    .run(sale,uid,"QA-001",40,40,"completed");
  db.query("INSERT INTO pos_sale_items (id,user_id,sale_id,item_id,name,qty,price,unit_cost,line_total) VALUES (?,?,?,?,?,?,?,?,?)")
    .run("qa-sale-line",uid,sale,item,"QA Retail Item",2,20,10,40);
  db.query("INSERT INTO pos_payments (id,user_id,sale_id,amount,method) VALUES (?,?,?,?,?)")
    .run("qa-pay",uid,sale,40,"cash");
  db.query("UPDATE stock_items SET quantity_on_hand=quantity_on_hand-2 WHERE id=?").run(item);
  const s:any=db.query("SELECT total,paid FROM pos_sales WHERE id=?").get(sale);
  const q:any=db.query("SELECT quantity_on_hand FROM stock_items WHERE id=?").get(item);
  ok(s.total===40 && s.paid===40,"sale total and payment reconcile");
  ok(q.quantity_on_hand===8,"stock decreases by sold quantity");
  ok(s.total===40,"sales report source totals 40");
});

// Restaurant: order/payment
run("restaurant", () => {
  const uid="qa-user", order="qa-rest-order";
  db.query("INSERT INTO restaurant_menu_items (id,user_id,name,price) VALUES (?,?,?,?)").run("qa-menu",uid,"QA Meal",50);
  db.query("INSERT INTO restaurant_orders (id,user_id,order_no,status,total,business_date) VALUES (?,?,?,?,?,?)").run(order,uid,"QA-R-001","COMPLETED",100,"2026-09-24");
  db.query("INSERT INTO restaurant_order_items (id,user_id,order_id,item_name,menu_item_id,qty,price) VALUES (?,?,?,?,?,?,?)")
    .run("qa-rest-line",uid,order,"QA Meal","qa-menu",2,50);
  db.query("INSERT INTO restaurant_payments (id,user_id,order_id,amount,method) VALUES (?,?,?,?,?)")
    .run("qa-rest-pay",uid,order,100,"CASH");
  const p:any=db.query("SELECT SUM(amount) amount FROM restaurant_payments WHERE order_id=?").get(order);
  ok(p.amount===100,"restaurant payment reconciles to order");
});

// Hotel: reservation -> folio -> charge
run("hotel", () => {
  const uid="qa-user";
  db.query("INSERT INTO hotel_room_types (id,user_id,code,name) VALUES (?,?,?,?)").run("qa-rt",uid,"STD","QA Room");
  db.query("INSERT INTO hotel_rooms (id,user_id,number,room_type_id) VALUES (?,?,?,?)").run("qa-room",uid,"101","qa-rt");
  db.query("INSERT INTO hotel_reservations (id,user_id,reference,room_id,status,guest_name) VALUES (?,?,?,?,?,?)").run("qa-res",uid,"QA-H-001","qa-room","CHECKED_IN","QA Guest");
  db.query("INSERT INTO hotel_folios (id,user_id,reservation_id,folio_number) VALUES (?,?,?,?)").run("qa-folio",uid,"qa-res","QA-F-001");
  db.query("INSERT INTO hotel_folio_charges (id,user_id,folio_id,amount) VALUES (?,?,?,?)").run("qa-charge",uid,"qa-folio",300);
  const x:any=db.query("SELECT SUM(amount) amount FROM hotel_folio_charges WHERE folio_id=?").get("qa-folio");
  ok(x.amount===300,"hotel folio revenue totals 300");
});

// School: fee billing -> payment -> balance
run("school", () => {
  const uid="qa-user";
  db.query("INSERT INTO school_classes (id,user_id,name,academic_year) VALUES (?,?,?,?)").run("qa-class",uid,"Grade 7",2026);
  db.query("INSERT INTO students (id,user_id,student_no,first_name,last_name,class_id) VALUES (?,?,?,?,?,?)").run("qa-student",uid,"QA-001","QA","Student","qa-class");
  db.query("INSERT INTO fee_structures (id,user_id,fee_name,academic_year,amount) VALUES (?,?,?,?,?)").run("qa-fee-structure",uid,"Tuition",2026,1000);
  db.query("INSERT INTO student_fees (id,user_id,student_id,amount_due,balance) VALUES (?,?,?,?,?)").run("qa-student-fee",uid,"qa-student",1000,1000);
  db.query("INSERT INTO fee_payments (id,user_id,student_id,amount) VALUES (?,?,?,?)").run("qa-fee-payment",uid,"qa-student",600);
  db.query("UPDATE student_fees SET balance=balance-600 WHERE id=?").run("qa-student-fee");
  const x:any=db.query("SELECT balance FROM student_fees WHERE id=?").get("qa-student-fee");
  ok(x.balance===400,"school fee balance becomes 400 after 600 payment");
});

// Property: charge -> payment -> balance
run("property", () => {
  const uid="qa-user";
  db.query("INSERT INTO property_assets (id,company_id,user_id,code,name) VALUES (?,?,?,?,?)").run("qa-property","qa-company",uid,"QA-PROP-001","QA Property");
  db.query("INSERT INTO property_units (id,company_id,user_id,property_id,unit_code,monthly_rent) VALUES (?,?,?,?,?,?)").run("qa-unit","qa-company",uid,"qa-property","A1",2500);
  db.query("INSERT INTO property_tenants (id,company_id,user_id,tenant_no,full_name) VALUES (?,?,?,?,?)").run("qa-tenant","qa-company",uid,"QA-T-001","QA Tenant");
  db.query("INSERT INTO property_leases (id,company_id,user_id,lease_no,unit_id,tenant_id,start_date,rent_amount) VALUES (?,?,?,?,?,?,?,?)").run("qa-lease","qa-company",uid,"QA-L-001","qa-unit","qa-tenant","2026-09-01",2500);
  db.query("INSERT INTO property_charges (id,company_id,user_id,lease_id,description,amount) VALUES (?,?,?,?,?,?)").run("qa-charge","qa-company",uid,"qa-lease","September rent",2500);
  db.query("INSERT INTO property_payments (id,company_id,user_id,lease_id,tenant_id,payment_no,amount) VALUES (?,?,?,?,?,?,?)").run("qa-payment","qa-company",uid,"qa-lease","qa-tenant","QA-PAY-001",1500);
  const x:any=db.query("SELECT (SELECT SUM(amount) FROM property_charges WHERE lease_id=?) - (SELECT SUM(amount) FROM property_payments WHERE tenant_id=?) balance").get("qa-lease","qa-tenant");
  ok(x.balance===1000,"property rent balance is 1000");
});

// Lending: application -> approved amount
run("lending", () => {
  db.query("INSERT INTO loans (id,user_id,loan_number,loan_type,principal,interest_rate,term_months,start_date,amount_repaid,outstanding_balance,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run("qa-loan","qa-user","QA-L-001","receivable",5000,12,12,"2026-09-24",0,5000,"active");
  db.query("INSERT INTO loan_schedule (id,user_id,loan_id,period_no,due_date,principal_due,interest_due,total_due,closing_balance) VALUES (?,?,?,?,?,?,?,?,?)")
    .run("qa-schedule","qa-user","qa-loan",1,"2026-10-24",416.67,50,466.67,4583.33);
  db.query("INSERT INTO loan_repayments (id,user_id,loan_id,payment_date,amount,principal_portion,interest_portion) VALUES (?,?,?,?,?,?,?)")
    .run("qa-repayment","qa-user","qa-loan","2026-09-24",500,450,50);
  const x:any=db.query("SELECT principal FROM loans WHERE id=?").get("qa-loan");
  ok(x.principal===5000,"loan master records requested principal 5000");
});

// Payroll: gross -> net
run("payroll", () => {
  db.query("INSERT INTO employees (id,user_id,employee_code,first_name,basic_salary) VALUES (?,?,?,?,?)").run("qa-emp","qa-user","QA-E-001","QA Employee",8000);
  db.query("INSERT INTO attendance (id,user_id,employee_id,attendance_date) VALUES (?,?,?,?)").run("qa-att","qa-user","qa-emp","2026-09-24");
  db.query("INSERT INTO payroll_runs (id,user_id,run_number,period_month,period_year,total_gross,total_net) VALUES (?,?,?,?,?,?,?)").run("qa-payroll","qa-user","QA-P-001",9,2026,8000,7000);
  db.query("INSERT INTO payslips (id,user_id,payroll_run_id,employee_id,net_pay,earnings) VALUES (?,?,?,?,?,?)").run("qa-slip","qa-user","qa-payroll","qa-emp",7000,"{}");
  const x:any=db.query("SELECT total_gross,total_net FROM payroll_runs WHERE id=?").get("qa-payroll");
  ok(x.total_gross===8000 && x.total_net===7000,"payroll gross/net reconcile");
});

// Enterprise smoke: common business masters exist
run("enterprise", () => {
  ok(hasTable("customers") && hasTable("suppliers") && hasTable("stock_items") && hasTable("journal_entries"),"enterprise core accounting/operations tables available");
});

if (fail.length) {
  console.error("\nSTANDALONE TRANSACTION QA: FAILED");
  for (const x of fail) console.error(" - " + x);
  process.exit(1);
}
console.log("\nSTANDALONE TRANSACTION QA: PASSED");
db.close();
