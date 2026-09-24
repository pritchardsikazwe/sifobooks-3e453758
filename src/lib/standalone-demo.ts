import { supabase } from "@/integrations/supabase/client";
import { completeSale } from "@/lib/pos";

type Edition = "enterprise" | "accounting" | "retail" | "restaurant" | "hotel" | "school" | "property" | "lending" | "payroll";

const markerFor = (edition: Edition, version = 2) => `standalone_demo_${edition}_v${version}`;
const id = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const days = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };

async function insert(table: string, rows: any[]) {
  if (!rows.length) return;
  const { error } = await (supabase as any).from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
}

export async function ensureStandaloneDemo(edition: Edition) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { seeded: false, reason: "NOT_SIGNED_IN" };

  const { data: profile } = await (supabase as any).from("profiles")
    .select("active_company_id").eq("id", uid).maybeSingle();
  const companyId = profile?.active_company_id ?? null;

  const { data: marker } = await (supabase as any).from("company_modules")
    .select("id").eq("user_id", uid).eq("module_key", markerFor(edition)).limit(1).maybeSingle();
  if (marker) return { seeded: false, already: true };

  // v2 is a non-destructive catalogue upgrade. Existing v1 demo records are
  // preserved; only missing sample products are added so an existing standalone
  // workspace receives the same POS catalogue as a fresh installation.
  const v1Marker = await (supabase as any).from("company_modules")
    .select("id").eq("user_id", uid).eq("module_key", markerFor(edition, 1)).limit(1).maybeSingle();
  const catalogueOnly = Boolean(v1Marker?.data);
  if (catalogueOnly) {
    const names = edition === "retail" || edition === "enterprise" || edition === "accounting"
      ? ["Coca-Cola 500ml","Mineral Water 500ml","Bread 500g","Sugar 2kg","Cooking Oil 2L","Rice 5kg","Bath Soap","Milk 1L","Eggs 30 Pack"]
      : edition === "restaurant"
        ? ["Chicken & Nshima","Beef & Nshima","Fish & Chips","Burger & Chips","Chips","Soft Drink 500ml","Mineral Water","Tea","Coffee"]
        : edition === "hotel"
          ? ["Room Service Breakfast","Soft Drink 500ml","Mineral Water","Laundry Service","Airport Transfer"]
          : edition === "school"
            ? ["School Uniform","Exercise Book","School T-Shirt","Pen","Textbook"]
            : [];
    if (names.length) {
      const { data: existing } = await (supabase as any).from("stock_items")
        .select("name").eq("user_id", uid).in("name", names);
      const existingNames = new Set((existing ?? []).map((x:any) => x.name));
      const specs: Record<string, [string,string,string,number,number,number]> = {
        "Coca-Cola 500ml":["BEV-001","Beverages","bottle",9,15,80],"Mineral Water 500ml":["BEV-002","Beverages","bottle",5,8,100],
        "Bread 500g":["GRO-001","Groceries","each",12,18,60],"Sugar 2kg":["GRO-002","Groceries","pack",24,32,50],
        "Cooking Oil 2L":["GRO-003","Groceries","bottle",42,55,40],"Rice 5kg":["GRO-004","Groceries","bag",65,82,35],
        "Bath Soap":["HOU-001","Household","bar",7,12,100],"Milk 1L":["DAI-001","Dairy","carton",15,22,60],
        "Eggs 30 Pack":["DAI-002","Dairy","tray",70,90,30],"Chicken & Nshima":["FOOD-001","Mains","plate",65,120,40],
        "Beef & Nshima":["FOOD-002","Mains","plate",75,135,35],"Fish & Chips":["FOOD-003","Mains","plate",80,145,30],
        "Burger & Chips":["FOOD-004","Fast Food","plate",55,100,35],"Chips":["FOOD-005","Sides","portion",20,40,60],
        "Soft Drink 500ml":["BEV-003","Beverages","bottle",8,15,80],"Mineral Water":["BEV-004","Beverages","bottle",5,10,80],
        "Tea":["BEV-005","Hot Drinks","cup",6,15,50],"Coffee":["BEV-006","Hot Drinks","cup",10,25,50],
        "Room Service Breakfast":["HOT-001","Food & Beverage","meal",55,100,40],"Soft Drink 500ml":["HOT-002","Food & Beverage","bottle",8,15,60],
        "Laundry Service":["HOT-004","Guest Services","service",25,50,30],"Airport Transfer":["HOT-005","Guest Services","trip",120,200,20],
        "School Uniform":["SCH-001","Uniform","each",180,250,30],"Exercise Book":["SCH-002","Stationery","each",8,12,200],
        "School T-Shirt":["SCH-003","Uniform","each",90,130,50],"Pen":["SCH-004","Stationery","each",3,5,300],"Textbook":["SCH-005","Books","each",80,120,50],
      };
      const rows = names.filter(n => !existingNames.has(n)).map((name) => {
        const [sku,category,unit,cost,sell,qty] = specs[name];
        return { id:id(), user_id:uid, company_id:companyId, name, sku, category, unit, cost_price:cost, sell_price:sell, quantity_on_hand:qty, reorder_level:Math.max(5,Math.floor(qty*.2)), is_active:1 };
      });
      await insert("stock_items", rows);
    }
    await insert("company_modules", [{ id:id(), user_id:uid, company_id:companyId, module_key:markerFor(edition), config: JSON.stringify({demo:true,edition,createdAt:new Date().toISOString(),deletable:true,upgrade:"v2 catalogue"}), enabled:1 }]);
    return { seeded:true, upgraded:true, edition };
  }

  const prefix = `DEMO-${edition.toUpperCase()}`;
  const customerId = id();
  const supplierId = id();
  const stockId = id();
  const bankId = id();

  // Every standalone edition starts with a small, clearly synthetic working set.
  // It is normal application data, not a fake UI: pages can open it, post it,
  // report on it, and the user can delete it.
  await insert("customers", [{
    id: customerId, user_id: uid, company_id: companyId, name: `${prefix} Customer`,
    contact_person: "Demo Customer", phone: "+260 970 000101", email: "demo.customer@sifobooks.local",
    city: "Lusaka", country: "Zambia", active: 1,
  }]);
  await insert("suppliers", [{
    id: supplierId, user_id: uid, supplier_code: `${prefix}-SUP`, name: `${prefix} Supplier`,
    contact_person: "Demo Supplier", phone: "+260 970 000102", currency: "ZMW", status: "active",
  }]);
  const catalog = edition === "retail" || edition === "enterprise" || edition === "accounting"
    ? [["Coca-Cola 500ml","BEV-001","Beverages","bottle",9,15,80],["Mineral Water 500ml","BEV-002","Beverages","bottle",5,8,100],["Bread 500g","GRO-001","Groceries","each",12,18,60],["Sugar 2kg","GRO-002","Groceries","pack",24,32,50],["Cooking Oil 2L","GRO-003","Groceries","bottle",42,55,40],["Rice 5kg","GRO-004","Groceries","bag",65,82,35],["Bath Soap","HOU-001","Household","bar",7,12,100],["Milk 1L","DAI-001","Dairy","carton",15,22,60],["Eggs 30 Pack","DAI-002","Dairy","tray",70,90,30]]
    : edition === "restaurant"
      ? [["Chicken & Nshima","FOOD-001","Mains","plate",65,120,40],["Beef & Nshima","FOOD-002","Mains","plate",75,135,35],["Fish & Chips","FOOD-003","Mains","plate",80,145,30],["Burger & Chips","FOOD-004","Fast Food","plate",55,100,35],["Chips","FOOD-005","Sides","portion",20,40,60],["Soft Drink 500ml","BEV-003","Beverages","bottle",8,15,80],["Mineral Water","BEV-004","Beverages","bottle",5,10,80],["Tea","BEV-005","Hot Drinks","cup",6,15,50],["Coffee","BEV-006","Hot Drinks","cup",10,25,50]]
      : edition === "hotel"
        ? [["Room Service Breakfast","HOT-001","Food & Beverage","meal",55,100,40],["Soft Drink 500ml","HOT-002","Food & Beverage","bottle",8,15,60],["Mineral Water","HOT-003","Food & Beverage","bottle",5,10,80],["Laundry Service","HOT-004","Guest Services","service",25,50,30],["Airport Transfer","HOT-005","Guest Services","trip",120,200,20]]
        : edition === "school"
          ? [["School Uniform","SCH-001","Uniform","each",180,250,30],["Exercise Book","SCH-002","Stationery","each",8,12,200],["School T-Shirt","SCH-003","Uniform","each",90,130,50],["Pen","SCH-004","Stationery","each",3,5,300],["Textbook","SCH-005","Books","each",80,120,50]]
          : [[prefix + " Test Item",prefix + "-001","General","each",50,80,100]];

  await insert("stock_items", catalog.map(([name, sku, category, unit, cost_price, sell_price, quantity_on_hand], index) => ({
    id: index === 0 ? stockId : id(), user_id: uid, name: String(name), sku: String(sku),
    category: String(category), unit: String(unit), cost_price: Number(cost_price), sell_price: Number(sell_price),
    quantity_on_hand: Number(quantity_on_hand), reorder_level: Math.max(5, Math.floor(Number(quantity_on_hand) * .2)),
    company_id: companyId, is_active: 1,
  })));
  await insert("bank_accounts", [{
    id: bankId, user_id: uid, company_id: companyId, name: `${prefix} Bank Account`,
    bank_name: "Demo Bank", account_number: "****0101", currency: "ZMW",
    opening_balance: 10000, opening_date: today(), is_active: 1,
  }]);
  await insert("expenses", [{
    id: id(), user_id: uid, expense_number: `${prefix}-EXP-001`, expense_date: days(-2),
    category: "Demo Operating Expense", payment_method: "bank", bank_account_id: bankId,
    amount: 500, vat_amount: 0, total: 500, reference: `${prefix}-EXP`,
    notes: "Synthetic standalone workflow data", status: "posted", currency: "ZMW", exchange_rate: 1,
    transaction_type: "business_expense",
  }]);

  if (edition === "retail" || edition === "accounting" || edition === "enterprise") {
    const registerId = id();
    const shiftId = id();
    const saleId = id();
    await insert("pos_registers", [{ id: registerId, user_id: uid, name: `${prefix} Till 1`, branch: "Demo Branch", is_active: 1 }]);
    await insert("pos_shifts", [{ id: shiftId, user_id: uid, register_id: registerId, cashier_name: "Demo Cashier",
      opened_at: new Date().toISOString(), opening_float: 500, cash_in: 0, cash_out: 0,
      expected_cash: 500, actual_cash: 500, variance: 0, status: "open", created_by: uid, cashier_user_id: uid }]);

    // Use the real POS posting engine for the default transaction. The demo
    // record is therefore subject to the same validation, server repricing,
    // stock checks, payment checks and accounting/COGS posting as a real sale.
    const { data: location } = await (supabase as any).from("inventory_locations")
      .select("id").eq("is_active", true).order("is_default", { ascending: false }).limit(1).maybeSingle();
    if (location?.id) {
      const price = 15;
      const qty = 2;
      const total = price * qty;
      const subtotal = total / 1.16;
      const tax = total - subtotal;
      const result = await completeSale({
        lines: [{ key: stockId, item_id: stockId, name: `${prefix} Product`, sku: `${prefix}-001`, qty, unit: "bottle", price, unit_cost: 9, discount_pct: 0 }],
        totals: { gross: total, lineDiscount: 0, saleDiscount: 0, subtotal, tax, total, cost: 18, items: qty },
        customer: { id: customerId, name: `${prefix} Customer`, phone: null, code: null },
        customerName: `${prefix} Customer`,
        priceLevel: "normal", saleDiscountPct: 0, shiftId, registerId, locationId: location.id,
        taxRate: 16, taxInclusive: true, allowNegativeStock: false,
      }, [{ method: "cash", amount: total, reference: `${prefix}-CASH-001` }], 0);
      if (!result.ok) throw new Error("Standalone POS posting did not complete");
    } else {
      console.warn("[standalone-demo] POS seed skipped: no active inventory location is configured");
    }
  }

  if (edition === "restaurant") {
    const menuId = id(), tableId = id(), orderId = id();
    await insert("restaurant_settings", [{ id: id(), user_id: uid, business_name: "SifoBooks Demo Restaurant",
      vat_rate: 0.16, service_charge_pct: 10, gratuity_options: "[5,10,15]", packaging_fee: 5,
      auto_post_sales: 1, deplete_ingredients: 1 }]);
    await insert("restaurant_menu_items", [{ id: menuId, user_id: uid, name: "Demo Chicken & Nshima", category: "Mains",
      price: 140, cost: 65, station: "Hot Kitchen", active: 1, description: "Synthetic demo menu item" }]);
    await insert("restaurant_tables", [{ id: tableId, user_id: uid, name: "D1", seats: 4, area: "Main", status: "seated", branch_id: null }]);
    await insert("restaurant_order_types", [{ id: id(), user_id: uid, key: "DINE IN", label: "Dine In", active: 1,
      requires_table: 1, requires_customer: 0, requires_address: 0, service_charge_pct: 10, packaging_fee: 0,
      default_gratuity_pct: 0, sort_order: 1, settings: "{}" }]);
    await insert("restaurant_orders", [{ id: orderId, user_id: uid, order_no: `${prefix}-R-001`, table_id: tableId,
      order_type: "DINE IN", status: "closed", guests: 2, subtotal: 140, tax: 22.4, discount: 0, total: 162.4,
      payment_method: "cash", opened_at: new Date().toISOString(), closed_at: new Date().toISOString(), business_date: today(),
      customer_id: customerId, created_by: uid }]);
    await insert("restaurant_order_items", [{ id: id(), user_id: uid, order_id: orderId, item_name: "Demo Chicken & Nshima",
      station: "Hot Kitchen", qty: 1, price: 140, kds_status: "served", menu_item_id: menuId }]);
    await insert("restaurant_payments", [{ id: id(), user_id: uid, order_id: orderId, method: "cash", amount: 162.4,
      tendered: 200, change_given: 37.6, reference: `${prefix}-PAY-001` }]);
  }

  if (edition === "hotel") {
    const roomTypeId = id(), roomId = id(), reservationId = id(), folioId = id();
    await insert("hotel_room_types", [{ id: roomTypeId, user_id: uid, code: "DLX", name: "Demo Deluxe Room", base_rate: 950, capacity: 2 }]);
    await insert("hotel_rooms", [{ id: roomId, user_id: uid, number: "D101", floor: "1", room_type_id: roomTypeId,
      rate_override: null, status: "occupied", housekeeping_status: "clean", out_of_order: false }]);
    await insert("hotel_reservations", [{ id: reservationId, user_id: uid, reference: `${prefix}-RES-001`,
      customer_id: customerId, room_id: roomId, guest_name: "Demo Hotel Guest", check_in: days(-1), check_out: days(2),
      status: "checked_in", source: "direct", nightly_rate: 950, deposit: 300 }]);
    await insert("hotel_folios", [{ id: folioId, user_id: uid, reservation_id: reservationId, customer_id: customerId,
      status: "open", total: 0, paid: 0, balance: 0 }]);
    await insert("hotel_folio_charges", [{ id: id(), user_id: uid, folio_id: folioId, category: "room",
      description: "Demo accommodation", amount: 950, vat_amount: 152, levy_amount: 0, service_charge: 0 }]);
    await insert("hotel_housekeeping_tasks", [{ id: id(), user_id: uid, room_id: roomId, task_type: "departure clean",
      priority: "high", status: "pending" }]);
    await insert("hotel_rate_plans", [{ id: id(), user_id: uid, code: "BAR-DEMO", name: "Demo Best Available Rate",
      room_type_id: roomTypeId, nightly_rate: 950, active: true }]);
  }

  if (edition === "school") {
    const classId = id(), studentId = id();
    await insert("school_classes", [{ id: classId, user_id: uid, name: "Grade 7 Demo", grade_level: "Grade 7",
      stream: "A", class_teacher: "Demo Teacher", capacity: 40, academic_year: new Date().getFullYear(), status: "active" }]);
    await insert("students", [{ id: studentId, user_id: uid, student_no: `${prefix}-STU-001`, first_name: "Chanda",
      last_name: "Zulu", class_id: classId, status: "active", guardian_name: "Demo Guardian", guardian_phone: "+260 970 000103",
      guardian_email: "guardian@sifobooks.local", boarding: 0 }]);
    await insert("fee_structures", [{ id: id(), user_id: uid, fee_name: "Demo Term Fees", term: "Term 3",
      academic_year: new Date().getFullYear(), amount: 3500, class_id: classId, is_mandatory: 1 }]);
    await insert("student_fees", [{ id: id(), user_id: uid, student_id: studentId, term: "Term 3",
      academic_year: new Date().getFullYear(), amount_due: 3500, amount_paid: 1500, balance: 2000,
      status: "part_paid", due_date: days(14), description: "Demo term fees" }]);
    await insert("fee_payments", [{ id: id(), user_id: uid, student_id: studentId, amount: 1500,
      payment_date: days(-1), method: "cash", receipt_no: `${prefix}-FEE-001`, reference: "DEMO-SCHOOL-PAY" }]);
  }

  if (edition === "property") {
    const propertyId=id(), unitId=id(), tenantId=id(), leaseId=id();
    await insert("property_assets", [{ id: propertyId, user_id: uid, company_id: companyId, code: "DEMO-PROP-01",
      name: "SifoBooks Demo Apartments", property_type: "apartment_block", address: "Kabulonga", city: "Lusaka" }]);
    await insert("property_units", [{ id: unitId, user_id: uid, company_id: companyId, property_id: propertyId,
      unit_code: "A101", unit_type: "apartment", monthly_rent: 4500, daily_rate: 300, status: "occupied" }]);
    await insert("property_tenants", [{ id: tenantId, user_id: uid, company_id: companyId, tenant_no: "TEN-DEMO-001",
      full_name: "Demo Tenant", phone: "+260 970 000104", email: "tenant@sifobooks.local" }]);
    await insert("property_leases", [{ id: leaseId, user_id: uid, company_id: companyId, lease_no: "LEASE-DEMO-001",
      unit_id: unitId, tenant_id: tenantId, lease_type: "monthly", rent_amount: 4500, status: "active", start_date: days(-30) }]);
    await insert("property_charges", [{ id: id(), user_id: uid, company_id: companyId, lease_id: leaseId,
      charge_date: today(), due_date: today(), charge_type: "rent", description: "Rent - Demo current period",
      amount: 4500, paid_amount: 2000, status: "open", billing_period: today().slice(0,7), charge_source: "recurring" }]);
    await insert("property_payments", [{ id: id(), user_id: uid, company_id: companyId, payment_no: "PAY-DEMO-001",
      tenant_id: tenantId, amount: 2000, method: "cash", payment_date: days(-1) }]);
    await insert("property_maintenance", [{ id: id(), user_id: uid, company_id: companyId, title: "Demo leaking tap",
      unit_id: unitId, priority: "medium", status: "open", estimated_cost: 250 }]);
  }

  if (edition === "lending") {
    const borrowerId=id();
    await insert("lending_borrowers", [{ id: borrowerId, user_id: uid, borrower_no: "BR-DEMO-001",
      full_name: "Demo Borrower", phone: "+260 970 000105", national_id: "DEMO-NRC-001",
      address: "Lusaka", monthly_income: 8000, status: "active", kyc_status: "pending" }]);
    await insert("lending_applications", [{ id: id(), user_id: uid, application_no: "APP-DEMO-001",
      borrower_id: borrowerId, amount_requested: 12000, term: 6, purpose: "Working capital",
      monthly_income: 8000, monthly_expenses: 4500, status: "pending", affordability_status: "pending", kyc_status: "pending" }]);
  }

  if (edition === "payroll") {
    const employeeId=id(), runId=id();
    await insert("employees", [{ id: employeeId, user_id: uid, employee_code: "EMP-DEMO-001",
      first_name: "Naomi", last_name: "Zulu", email: "naomi@sifobooks.local", phone: "+260 970 000106",
      status: "active", basic_salary: 16000 }]);
    await insert("attendance", [{ id: id(), user_id: uid, employee_id: employeeId, attendance_date: today(),
      clock_in: "08:00", hours_worked: 8, status: "present" }]);
    await insert("payroll_runs", [{ id: runId, user_id: uid, run_number: "PR-DEMO-001",
      period_month: new Date().getMonth()+1, period_year: new Date().getFullYear(), pay_date: today(),
      status: "approved", total_gross: 16000, total_paye: 3000, total_napsa: 800, total_nhima: 160, total_net: 12040, currency: "ZMW" }]);
    await insert("payslips", [{ id: id(), user_id: uid, payroll_run_id: runId, employee_id: employeeId,
      basic_salary: 16000, allowances: 0, overtime: 0, gross_pay: 16000, paye: 3000, napsa: 800, nhima: 160,
      other_deductions: 0, net_pay: 12040, earnings: JSON.stringify({}), currency: "ZMW" }]);
  }

  await insert("company_modules", [{
    id: id(), user_id: uid, company_id: companyId, module_key: markerFor(edition),
    config: JSON.stringify({ demo: true, edition, createdAt: new Date().toISOString(), deletable: true }),
  }]);

  return { seeded: true, edition, demo: true };
}
