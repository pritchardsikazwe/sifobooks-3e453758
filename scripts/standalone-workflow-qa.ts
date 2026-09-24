import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const db = new Database(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8"));

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error("FAIL: " + message);
};
const tableExists = (name: string) => {
  const row = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
  return !!row;
};
const columns = (name: string) =>
  new Set((db.query(`PRAGMA table_info("${name}")`).all() as any[]).map(x => x.name));

type Check = { table: string; columns: string[]; flow: string };

const editions: Record<string, Check[]> = {
  accounting: [
    { table:"customers", columns:["id","user_id","name"], flow:"customer master" },
    { table:"suppliers", columns:["id","user_id","name"], flow:"supplier master" },
    { table:"stock_items", columns:["id","user_id","name","cost_price","sell_price","quantity_on_hand"], flow:"stock master" },
    { table:"bank_accounts", columns:["id","user_id","name"], flow:"banking" },
    { table:"expenses", columns:["id","user_id","amount"], flow:"expense posting" },
    { table:"journal_entries", columns:["id","user_id","status"], flow:"double-entry posting" },
    { table:"journal_lines", columns:["id","user_id","entry_id","debit","credit"], flow:"journal lines" },
  ],
  retail: [
    { table:"pos_registers", columns:["id","user_id","name"], flow:"register" },
    { table:"pos_shifts", columns:["id","user_id","register_id","status"], flow:"cash shift" },
    { table:"pos_sales", columns:["id","user_id","sale_no","shift_id","total","paid"], flow:"sale posting" },
    { table:"pos_sale_items", columns:["id","user_id","sale_id","item_id","qty"], flow:"sale lines" },
    { table:"pos_payments", columns:["id","user_id","sale_id","amount"], flow:"payment" },
    { table:"stock_movements", columns:["id","user_id","item_id","quantity"], flow:"stock movement" },
  ],
  restaurant: [
    { table:"restaurant_settings", columns:["id","user_id"], flow:"restaurant setup" },
    { table:"restaurant_menu_items", columns:["id","user_id","name","price"], flow:"menu" },
    { table:"restaurant_tables", columns:["id","user_id","name"], flow:"table service" },
    { table:"restaurant_orders", columns:["id","user_id","order_no","status","total"], flow:"order" },
    { table:"restaurant_order_items", columns:["id","user_id","order_id"], flow:"order lines" },
    { table:"restaurant_payments", columns:["id","user_id","order_id","amount"], flow:"payment" },
  ],
  hotel: [
    { table:"hotel_room_types", columns:["id","user_id","name"], flow:"room type" },
    { table:"hotel_rooms", columns:["id","user_id","number","room_type_id"], flow:"room" },
    { table:"hotel_reservations", columns:["id","user_id","reference","room_id","status"], flow:"reservation" },
    { table:"hotel_folios", columns:["id","user_id","reservation_id"], flow:"folio" },
    { table:"hotel_folio_charges", columns:["id","user_id","folio_id","amount"], flow:"folio charge" },
    { table:"hotel_housekeeping_tasks", columns:["id","user_id","room_id","status"], flow:"housekeeping" },
  ],
  school: [
    { table:"school_classes", columns:["id","user_id","name"], flow:"class" },
    { table:"students", columns:["id","user_id","student_no","class_id"], flow:"student" },
    { table:"fee_structures", columns:["id","user_id","amount"], flow:"fee structure" },
    { table:"student_fees", columns:["id","user_id","student_id","amount_due","balance"], flow:"student billing" },
    { table:"fee_payments", columns:["id","user_id","student_id","amount"], flow:"fee payment" },
  ],
  property: [
    { table:"property_assets", columns:["id","user_id","name"], flow:"property" },
    { table:"property_units", columns:["id","user_id","property_id","unit_code","monthly_rent"], flow:"unit" },
    { table:"property_tenants", columns:["id","user_id","tenant_no","full_name"], flow:"tenant" },
    { table:"property_leases", columns:["id","user_id","lease_no","unit_id","tenant_id","rent_amount"], flow:"lease" },
    { table:"property_charges", columns:["id","user_id","lease_id","amount"], flow:"rent charge" },
    { table:"property_payments", columns:["id","user_id","tenant_id","amount"], flow:"rent payment" },
    { table:"property_maintenance", columns:["id","user_id","unit_id","status"], flow:"maintenance" },
  ],
  lending: [
    { table:"lending_borrowers", columns:["id","user_id","borrower_no","full_name"], flow:"borrower" },
    { table:"lending_applications", columns:["id","user_id","application_no","borrower_id","amount_requested"], flow:"loan application" },
  ],
  payroll: [
    { table:"employees", columns:["id","user_id","employee_code","basic_salary"], flow:"employee" },
    { table:"attendance", columns:["id","user_id","employee_id","attendance_date"], flow:"attendance" },
    { table:"payroll_runs", columns:["id","user_id","run_number","total_gross","total_net"], flow:"payroll run" },
    { table:"payslips", columns:["id","user_id","payroll_run_id","employee_id","net_pay"], flow:"payslip" },
  ],
  enterprise: [],
};

let failures = 0;
for (const [edition, checks] of Object.entries(editions)) {
  console.log("\n[" + edition.toUpperCase() + "]");
  for (const c of checks) {
    if (!tableExists(c.table)) {
      console.log("FAIL  " + c.flow + " — missing table " + c.table);
      failures++;
      continue;
    }
    const cols = columns(c.table);
    const missing = c.columns.filter(x => !cols.has(x));
    if (missing.length) {
      console.log("FAIL  " + c.flow + " — " + c.table + " missing: " + missing.join(", "));
      failures++;
    } else {
      console.log("PASS  " + c.flow);
    }
  }
}

assert(failures === 0, `${failures} standalone workflow schema checks failed`);
console.log("\nSTANDALONE WORKFLOW QA: PASSED");
db.close();
