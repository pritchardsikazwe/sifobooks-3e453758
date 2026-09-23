import { getDb, generateUUID } from "@/lib/db/database";

export type DemoSeedResult = {
  alreadyLoaded: boolean;
  companyId: string;
  counts: Record<string, number>;
};

function insert(db: any, table: string, row: Record<string, any>) {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => "?").join(",");
  db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`).run(...columns.map((c) => row[c]));
}

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isoDateTime(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

export function loadDemoData(userId: string): DemoSeedResult {
  const db = getDb();
  const uid = String(userId || "");
  if (!uid) throw new Error("NOT_SIGNED_IN");

  const company = db.prepare(
    "SELECT c.id,c.name FROM companies c WHERE c.user_id=? ORDER BY c.is_primary DESC,c.updated_at DESC LIMIT 1"
  ).get(uid) as any;
  if (!company) throw new Error("COMPANY_REQUIRED: Complete company setup before loading SifoDemo.");

  const marker = db.prepare(
    "SELECT id FROM company_modules WHERE user_id=? AND company_id=? AND module_key='sifodemo_seed_v1' LIMIT 1"
  ).get(uid, company.id) as any;
  if (marker) return { alreadyLoaded: true, companyId: company.id, counts: { demo: 1 } };

  const ids: Record<string, string> = {};
  const counts: Record<string, number> = {};
  const add = (table: string, row: Record<string, any>, key?: string) => {
    insert(db, table, row);
    counts[table] = (counts[table] || 0) + 1;
    if (key) ids[key] = row.id;
    return row.id;
  };

  const now = new Date().toISOString();
  const today = isoDate();
  const y = new Date().getFullYear();

  const result = db.transaction(() => {
    // Company/demo profile context
    db.prepare("UPDATE companies SET trading_name=?,industry=?,workspace_mode=?,vat_registered=1,base_currency='ZMW',country='Zambia',updated_at=datetime('now') WHERE id=? AND user_id=?")
      .run("SifoDemo", company.name, "accounting", company.id, uid);

    db.prepare("UPDATE profiles SET business_name=?,country='Zambia',currency='ZMW',vat_registered=1,onboarded=1,active_company_id=?,updated_at=datetime('now') WHERE id=?")
      .run("SifoDemo", company.id, uid);

    add("company_modules", {
      id: generateUUID(), user_id: uid, company_id: company.id,
      module_key: "sifodemo_seed_v1",
      config: JSON.stringify({ loadedAt: now, purpose: "client-demo-and-integration-testing" }),
    });

    // Branches, warehouses and locations
    add("branches", {
      id: generateUUID(), user_id: uid, company_id: company.id, name: "Kabulonga Demo Branch",
      code: "KAB", address: "Kabulonga", city: "Lusaka", phone: "+260 211 000000", manager_name: "Demo Manager", active: 1,
    }, "branch");
    add("warehouses", {
      id: generateUUID(), user_id: uid, company_id: company.id, code: "WH01", name: "Main Warehouse",
      branch_id: ids.branch, location: "Kabulonga", manager: "Demo Storekeeper", is_active: 1,
    }, "warehouse");
    add("inventory_locations", {
      id: generateUUID(), user_id: uid, company_id: company.id, name: "Main Warehouse", code: "WH01",
      location_type: "warehouse", warehouse_id: ids.warehouse, is_active: 1, address: "Kabulonga",
    }, "warehouseLocation");
    add("inventory_locations", {
      id: generateUUID(), user_id: uid, company_id: company.id, name: "Retail Store", code: "STORE01",
      location_type: "store", warehouse_id: ids.warehouse, is_active: 1, address: "Kabulonga",
    }, "storeLocation");
    add("inventory_locations", {
      id: generateUUID(), user_id: uid, company_id: company.id, name: "Restaurant Kitchen", code: "KITCHEN01",
      location_type: "kitchen", warehouse_id: ids.warehouse, is_active: 1, address: "Kabulonga",
    }, "kitchenLocation");

    // Chart of accounts
    const accounts = [
      ["1000","Cash on Hand","asset"],["1010","Zanaco Demo Bank","asset"],["1020","MTN MoMo","asset"],
      ["1100","Trade Receivables","asset"],["1200","Inventory","asset"],["1500","Furniture & Equipment","asset"],
      ["1590","Accumulated Depreciation","asset"],["2000","Trade Payables","liability"],["2100","Output VAT","liability"],
      ["2200","PAYE/NAPSA/NHIMA Payables","liability"],["3000","Owner Capital","equity"],
      ["4000","Retail Sales","income"],["4100","Restaurant Sales","income"],["5000","Cost of Sales","cogs"],
      ["5100","Restaurant Food Cost","cogs"],["6000","Rent & Premises","expense"],["6100","Utilities","expense"],
      ["6200","Salaries & Wages","expense"],["6300","Bank Charges","expense"],["6400","Marketing","expense"],
    ];
    const acct: Record<string,string> = {};
    for (const [code,name,type] of accounts) {
      const existing = db.prepare("SELECT id FROM chart_of_accounts WHERE user_id=? AND account_code=? LIMIT 1").get(uid, code) as any;
      if (existing?.id) {
        acct[code] = existing.id;
        continue;
      }
      const id = add("chart_of_accounts", {
        id: generateUUID(), user_id: uid, account_code: code, account_name: name, account_type: type,
        is_active: 1, purpose: code === "1000" ? "SALE_CASH" : code === "1010" ? "PAYMENT_CASH" :
          code === "1100" ? "SALE_RECEIVABLE" : code === "1200" ? "INVENTORY_ASSET" :
          code === "2000" ? "ACCOUNTS_PAYABLE" : code === "2100" ? "OUTPUT_VAT" :
          code === "4000" ? "SALES_REVENUE" : code === "5000" ? "COST_OF_SALES" : undefined,
      });
      acct[code] = id;
    }

    // Tax / periods / branding
    add("tax_settings", { id: generateUUID(), user_id: uid, company_id: company.id, tax_name: "VAT Standard", rate: 16, is_default: 1, applies_to: "sales" });
    add("financial_periods", { id: generateUUID(), user_id: uid, fiscal_year: y, period_month: new Date().getMonth()+1, period_type: "month", status: "open" });
    add("document_branding", {
      id: generateUUID(), user_id: uid, company_id: company.id, legal_name: "SifoDemo Zambia Limited",
      trading_name: "SifoDemo", address: "Kabulonga", city: "Lusaka", country: "Zambia", phone: "+260 970 000000",
      email: "demo@sifobooks.local", tpin: "DEMO000000000", currency: "ZMW", locale: "en-ZM",
      terms_library: "Demo terms", bank_details: "Zanaco Demo Account", payment_methods: "Cash, Card, MTN MoMo, Airtel Money",
      social_links: "{}", document_prefixes: "{}", templates: "{}", show_provider_credit: 1,
    });

    // Customers and suppliers
    add("customers", {
      id: generateUUID(), user_id: uid, company_id: company.id, name: "Kabulonga Mini Mart",
      contact_person: "Mary Banda", email: "mary@example.demo", phone: "+260 970 100001", tpin: "DEMO-CUST-001",
      address: "Kabulonga", city: "Lusaka", country: "Zambia", credit_limit: 15000, payment_terms_days: 30, active: 1,
    }, "customer");
    add("customers", {
      id: generateUUID(), user_id: uid, company_id: company.id, name: "Walk-in Customer",
      contact_person: "Counter Sale", phone: "+260 970 100002", city: "Lusaka", country: "Zambia", credit_limit: 0, payment_terms_days: 0, active: 1,
    }, "walkin");
    add("suppliers", {
      id: generateUUID(), user_id: uid, supplier_code: "SUP001", name: "Zambezi Wholesale",
      contact_person: "Peter Supplier", tpin: "DEMO-SUP-001", payment_terms: 30, currency: "ZMW",
      opening_balance: 0, current_balance: 0, status: "active", notes: "Demo supplier",
    }, "supplier");
    add("suppliers", {
      id: generateUUID(), user_id: uid, supplier_code: "SUP002", name: "Lusaka Fresh Foods",
      contact_person: "Grace Supplier", payment_terms: 14, currency: "ZMW", status: "active",
    });

    // Retail + restaurant stock catalogue
    const items = [
      ["Bread Loaf","RET-001","Bakery",18,28,120,"standard","each"],
      ["Cooking Oil 2L","RET-002","Grocery",72,95,80,"standard","bottle"],
      ["Sugar 1kg","RET-003","Grocery",14,20,150,"standard","pack"],
      ["Mealie Meal 25kg","RET-004","Grocery",210,285,50,"standard","bag"],
      ["Mosi Lager 750ml","RET-005","Beverage",42,60,96,"standard","bottle"],
      ["Fanta 400ml","RET-006","Beverage",8,15,120,"standard","bottle"],
      ["Grilled Chicken","RST-001","Mains",65,140,40,"standard","plate"],
      ["Nshima","RST-002","Sides",8,25,80,"standard","plate"],
      ["Beef Stew","RST-003","Mains",55,120,35,"standard","plate"],
      ["Grilled Tilapia","RST-004","Mains",70,165,25,"standard","plate"],
      ["Chips","RST-005","Sides",18,45,60,"standard","portion"],
      ["Chicken Curry","RST-006","Mains",48,110,30,"standard","plate"],
    ];
    for (const [name,sku,category,cost,sell,qty,tax,unit] of items) {
      const id = add("stock_items", {
        id: generateUUID(), user_id: uid, name, sku, description: `SifoDemo ${category} item`,
        tax_category: tax, vat_rate: 16, unit, cost_price: cost, sell_price: sell, quantity_on_hand: qty,
        reorder_level: Math.max(10, Math.floor(Number(qty)/4)), warehouse_id: ids.warehouse, branch_id: ids.branch,
        brand: "SifoDemo", zra_sync_status: "unmapped",
      }, String(sku));
      add("stock_balances", { id: generateUUID(), user_id: uid, item_id: id, location_id: ids.storeLocation, quantity: Number(qty) });
      add("stock_movements", { id: generateUUID(), user_id: uid, item_id: id, movement_type: "OPENING", quantity: Number(qty), unit_cost: Number(cost), reference: "DEMO-OPENING", note: "SifoDemo opening stock", location_id: ids.storeLocation });
    }

    // Inventory transfer / count / adjustment samples
    add("inventory_transfers", {
      id: generateUUID(), user_id: uid, company_id: company.id, reference: "DEMO-TRANSFER-001",
      from_location_id: ids.warehouseLocation, to_location_id: ids.storeLocation, transfer_date: today,
      status: "completed", notes: "Demo warehouse to retail transfer", transfer_number: "TRF-DEMO-001",
    }, "transfer");
    add("inventory_transfer_items", {
      id: generateUUID(), transfer_id: ids.transfer, item_id: ids["RET-001"], description: "Bread Loaf",
      quantity: 40, unit_cost: 18, qty_received: 40,
    });
    add("stock_counts", {
      id: generateUUID(), user_id: uid, count_number: "COUNT-DEMO-001", count_date: today,
      warehouse_id: ids.warehouse, status: "posted", notes: "Demo stock count", location_id: ids.storeLocation,
    }, "stockCount");
    add("stock_count_lines", {
      id: generateUUID(), user_id: uid, count_id: ids.stockCount, item_id: ids["RET-001"],
      expected_qty: 120, counted_qty: 118, variance: -2, note: "Demo variance", location_id: ids.storeLocation,
    });
    add("stock_adjustments", {
      id: generateUUID(), user_id: uid, adjustment_number: "ADJ-DEMO-001", adjustment_date: today,
      item_id: ids["RET-002"], warehouse_id: ids.warehouse, adjustment_type: "count",
      quantity_before: 80, quantity_after: 78, reason: "Demo stock count", notes: "Sample adjustment", location_id: ids.storeLocation,
    });

    // Bank and cash
    add("bank_accounts", {
      id: generateUUID(), user_id: uid, company_id: company.id, name: "Zanaco Demo Current Account",
      bank_name: "Zanaco", account_number: "****4182", currency: "ZMW", opening_balance: 25000,
      opening_date: today, gl_account_id: acct["1010"], is_active: 1, cashbook_type: "main",
    }, "bank");
    add("cashbooks", {
      id: generateUUID(), user_id: uid, code: "BANK01", name: "Zanaco Demo Cashbook", cashbook_type: "bank",
      bank_account_id: ids.bank, gl_account_id: acct["1010"], currency: "ZMW", opening_balance: 25000, is_active: 1,
    });
    add("bank_transactions", {
      id: generateUUID(), user_id: uid, txn_date: isoDate(-2), description: "Customer payment — Kabulonga Mini Mart",
      amount: 5800, balance: 30800, reference: "DEMO-BANK-001", category: "Sales receipt", reconciled: 1,
      currency: "ZMW", exchange_rate: 1, allocated_amount: 5800, bank_account_id: ids.bank,
      payee: "Kabulonga Mini Mart", is_allocated: 1,
    });
    add("bank_transactions", {
      id: generateUUID(), user_id: uid, txn_date: isoDate(-1), description: "Zambezi Wholesale supplier payment",
      amount: -3200, balance: 27600, reference: "DEMO-BANK-002", category: "Supplier payment", reconciled: 0,
      currency: "ZMW", exchange_rate: 1, allocated_amount: 0, bank_account_id: ids.bank,
      payee: "Zambezi Wholesale", is_allocated: 0,
    });
    add("reconciliation_sessions", {
      id: generateUUID(), user_id: uid, bank_account_id: ids.bank, statement_date: today,
      statement_start_date: isoDate(-30), statement_balance: 27600, opening_balance: 25000,
      book_balance: 27600, cleared_deposits: 5800, cleared_payments: 3200, difference: 0,
      status: "draft", notes: "SifoDemo reconciliation",
    }, "reconciliation");

    // Accounting transactions — balanced journals
    const journal = (number: string, date: string, ref: string, desc: string, lines: Array<[string,number,number]>) => {
      const totalDebit = lines.reduce((s,l)=>s+l[1],0);
      const totalCredit = lines.reduce((s,l)=>s+l[2],0);
      const id = add("journal_entries", {
        id: generateUUID(), user_id: uid, entry_number: number, entry_date: date, reference: ref,
        description: desc, status: "posted", total_debit: totalDebit, total_credit: totalCredit, currency: "ZMW", exchange_rate: 1,
      }, number);
      for (const [code,debit,credit] of lines) {
        add("journal_lines", {
          id: generateUUID(), user_id: uid, entry_id: id, account_id: acct[code],
          description: desc, debit, credit,
        });
      }
      return id;
    };

    journal("JE-DEMO-001", isoDate(-10), "DEMO-CAPITAL", "Opening owner capital", [["1010",25000,0],["3000",0,25000]]);
    journal("JE-DEMO-002", isoDate(-7), "DEMO-SALE-001", "Retail cash sale", [["1000",1160,0],["4000",0,1000],["2100",0,160]]);
    journal("JE-DEMO-003", isoDate(-6), "DEMO-PURCHASE-001", "Supplier inventory purchase", [["1200",3200,0],["2000",0,3200]]);
    journal("JE-DEMO-004", isoDate(-5), "DEMO-EXPENSE-001", "Demo shop rent", [["6000",2500,0],["1010",0,2500]]);
    journal("JE-DEMO-005", isoDate(-4), "DEMO-RESTAURANT-001", "Restaurant sale", [["1000",928,0],["4100",0,800],["2100",0,128]]);
    journal("JE-DEMO-006", isoDate(-3), "DEMO-COGS-001", "Cost of sales", [["5000",420,0],["1200",0,420]]);

    // Sales invoice + receipt
    const invoiceId = add("invoices", {
      id: generateUUID(), user_id: uid, customer_id: ids.customer, number: "INV-DEMO-001",
      issue_date: isoDate(-3), due_date: isoDate(27), status: "sent", currency: "ZMW",
      subtotal: 5000, vat_amount: 800, total: 5800, amount_paid: 5800, balance_due: 0,
      seller_tpin: "DEMO000000000", buyer_tpin: "DEMO-CUST-001", notes: "SifoDemo posted invoice", exchange_rate: 1,
    }, "invoice");
    add("invoice_items", {
      id: generateUUID(), user_id: uid, invoice_id: invoiceId, stock_item_id: ids["RET-002"],
      description: "Cooking Oil 2L", hs_code: "DEMO-HS", quantity: 70, unit_price: 71.428571,
      vat_rate: 16, line_total: 5000,
    });
    add("receipts", {
      id: generateUUID(), user_id: uid, customer_id: ids.customer, invoice_id: invoiceId,
      number: "REC-DEMO-001", receipt_date: isoDate(-2), amount: 5800, currency: "ZMW",
      method: "bank", reference: "DEMO-BANK-001", status: "posted",
    }, "receipt");
    add("receipt_allocations", {
      id: generateUUID(), user_id: uid, receipt_id: ids.receipt, invoice_id: invoiceId,
      account_id: acct["1100"], amount: 5800, memo: "Demo invoice settlement",
    });

    // Purchase order, supplier bill and payment
    const poId = add("purchase_orders", {
      id: generateUUID(), user_id: uid, supplier_id: ids.supplier, po_number: "PO-DEMO-001",
      order_date: isoDate(-8), expected_date: isoDate(-5), status: "received",
      subtotal: 3200, tax_amount: 512, total: 3712, currency: "ZMW", notes: "Demo purchase order", exchange_rate: 1,
    }, "po");
    add("purchase_order_items", {
      id: generateUUID(), user_id: uid, po_id: poId, item_id: ids["RET-003"],
      description: "Sugar 1kg", quantity: 160, unit_price: 20, tax_rate: 16, line_total: 3200,
    });
    const billId = add("bills", {
      id: generateUUID(), user_id: uid, supplier_id: ids.supplier, po_id: poId,
      bill_number: "BILL-DEMO-001", supplier_invoice_number: "SUP-7781", bill_date: isoDate(-5),
      due_date: isoDate(9), status: "part_paid", subtotal: 3200, tax_amount: 512, total: 3712,
      amount_paid: 1200, balance_due: 2512, currency: "ZMW", notes: "Demo supplier bill", exchange_rate: 1,
    }, "bill");
    add("bill_items", {
      id: generateUUID(), user_id: uid, bill_id: billId, item_id: ids["RET-003"], description: "Sugar 1kg",
      quantity: 160, unit_price: 20, tax_rate: 16, line_total: 3200,
    });
    add("bill_payments", {
      id: generateUUID(), user_id: uid, bill_id: billId, supplier_id: ids.supplier,
      payment_number: "PAY-DEMO-001", payment_date: isoDate(-1), amount: 1200, payment_method: "bank",
      reference: "DEMO-BANK-002", currency: "ZMW", exchange_rate: 1, bank_account_id: ids.bank,
    });

    // Expense
    add("expenses", {
      id: generateUUID(), user_id: uid, expense_number: "EXP-DEMO-001", expense_date: isoDate(-5),
      category: "Rent", payment_method: "bank", bank_account_id: ids.bank, expense_account_id: acct["6000"],
      amount: 2500, vat_amount: 0, total: 2500, reference: "DEMO-RENT", notes: "Demo rent expense",
      status: "posted", journal_entry_id: null, currency: "ZMW", exchange_rate: 1, transaction_type: "business_expense",
    });

    // POS terminal + open shift + completed retail sale
    add("pos_settings", {
      user_id: uid, show_images: 1, show_stock: 1, show_sku: 1, products_per_row: 4,
      allow_price_change: 1, allow_negative_stock: 0, default_customer: "Walk-in Customer",
      default_price_level: "normal", default_payment: "cash", tax_rate: 16, tax_inclusive: 1,
      auto_new_sale: 1, auto_print_receipt: 0, silent_print: 0, receipt_footer: "SifoDemo — Sample receipt",
    });
    add("pos_registers", { id: generateUUID(), user_id: uid, name: "Till 1 — Demo Retail", branch: ids.branch, is_active: 1 }, "register");
    add("pos_shifts", {
      id: generateUUID(), user_id: uid, register_id: ids.register, cashier_name: "Demo Cashier",
      opened_at: isoDateTime(-180), opening_float: 500, cash_in: 0, cash_out: 0,
      expected_cash: 1780, actual_cash: 1780, variance: 0, status: "open", created_by: uid, cashier_user_id: uid,
    }, "shift");
    const saleId = add("pos_sales", {
      id: generateUUID(), user_id: uid, sale_no: "POS-DEMO-001", client_ref: "SIFODEMO-POS-001",
      shift_id: ids.shift, register_id: ids.register, customer_id: ids.walkin, customer_name: "Walk-in Customer",
      price_level: "normal", status: "completed", subtotal: 250, discount: 0, tax: 40, total: 290,
      paid: 290, change_due: 0, cost_total: 160, note: "Demo retail POS sale",
      sold_at: isoDateTime(-120), created_by: uid, location_id: ids.storeLocation,
    }, "posSale");
    add("pos_sale_items", {
      id: generateUUID(), user_id: uid, sale_id: saleId, item_id: ids["RET-001"], name: "Bread Loaf",
      sku: "RET-001", qty: 5, price: 50, unit_cost: 18, discount: 0, tax_rate: 16, line_total: 290,
      unit: "each", base_qty: 5, base_unit: "each",
    });
    add("pos_payments", { id: generateUUID(), user_id: uid, sale_id: saleId, method: "cash", amount: 290, reference: "DEMO-CASH-001" });
    add("pos_favorites", { id: generateUUID(), user_id: uid, item_id: ids["RET-001"], group_name: "Fast sellers", sort_order: 1 });
    add("employee_pos_permissions", {
      id: generateUUID(), user_id: uid, worker_user_id: uid, company_id: company.id, full_name: "Demo Cashier",
      pos_role: "cashier", pin: "1234", allow: JSON.stringify(["sell","hold","refund"]), deny: JSON.stringify([]), is_active: 1,
      pin_locked: 0,
    });

    // Restaurant floor, menu, kitchen, reservation and order
    add("restaurant_settings", {
      id: generateUUID(), user_id: uid, business_name: "SifoRestaurant Demo",
      vat_rate: 0.16, service_charge_pct: 10, gratuity_options: "[5,10,15]",
      packaging_fee: 5, auto_post_sales: 1, deplete_ingredients: 1, receipt_footer: "Thank you for dining with SifoRestaurant Demo",
    });
    const station = add("restaurant_kitchen_stations", {
      id: generateUUID(), user_id: uid, name: "Hot Kitchen", categories: JSON.stringify(["Mains","Sides"]),
      printer: "Kitchen Printer", colour: "#0f766e", active: 1, sort_order: 1,
    }, "station");
    const menu1 = add("restaurant_menu_items", { id: generateUUID(), user_id: uid, name: "Grilled Chicken", category: "Mains", price: 140, cost: 65, station: "Hot Kitchen", active: 1, description: "Quarter chicken with nshima" }, "menuChicken");
    const menu2 = add("restaurant_menu_items", { id: generateUUID(), user_id: uid, name: "Grilled Tilapia", category: "Mains", price: 165, cost: 70, station: "Hot Kitchen", active: 1, description: "Whole grilled tilapia" }, "menuFish");
    add("restaurant_menu_items", { id: generateUUID(), user_id: uid, name: "Chips", category: "Sides", price: 45, cost: 18, station: "Hot Kitchen", active: 1, description: "Crispy chips" });
    const table1 = add("restaurant_tables", { id: generateUUID(), user_id: uid, name: "T1", seats: 4, area: "Main", status: "seated", pos_x: 1, branch_id: ids.branch }, "restaurantTable");
    add("restaurant_tables", { id: generateUUID(), user_id: uid, name: "T2", seats: 2, area: "Main", status: "free", pos_x: 2, branch_id: ids.branch });
    add("restaurant_tables", { id: generateUUID(), user_id: uid, name: "T3", seats: 6, area: "Terrace", status: "free", pos_x: 3, branch_id: ids.branch });
    add("restaurant_order_types", { id: generateUUID(), user_id: uid, key: "DINE IN", label: "Dine In", active: 1, requires_table: 1, requires_customer: 0, requires_address: 0, service_charge_pct: 10, packaging_fee: 0, default_gratuity_pct: 0, sort_order: 1, settings: "{}" });
    add("restaurant_order_types", { id: generateUUID(), user_id: uid, key: "TAKEAWAY", label: "Takeaway", active: 1, requires_table: 0, requires_customer: 0, requires_address: 0, service_charge_pct: 0, packaging_fee: 5, default_gratuity_pct: 0, sort_order: 2, settings: "{}" });
    const modifierGroup = add("restaurant_modifier_groups", { id: generateUUID(), user_id: uid, name: "Cooking Preference", required: 0, min_select: 0, max_select: 1, sort_order: 1, applies_to_categories: JSON.stringify(["Mains"]) }, "modifierGroup");
    add("restaurant_modifiers", { id: generateUUID(), user_id: uid, group_id: modifierGroup, name: "Extra Nshima", price: 10, active: 1, sort_order: 1 });
    add("restaurant_recipes", { id: generateUUID(), user_id: uid, menu_item_id: menu1, stock_item_id: ids["RST-001"], quantity: 1, unit: "plate" });
    add("restaurant_recipes", { id: generateUUID(), user_id: uid, menu_item_id: menu1, stock_item_id: ids["RST-002"], quantity: 1, unit: "plate" });
    const orderId = add("restaurant_orders", {
      id: generateUUID(), user_id: uid, order_no: "R-118", table_id: table1, order_type: "DINE IN", status: "closed",
      server_name: "Demo Waiter", guests: 2, subtotal: 265, tax: 42.4, discount: 0, total: 307.4,
      payment_method: "cash", opened_at: isoDateTime(-90), closed_at: isoDateTime(-60), business_date: today,
      customer_id: ids.walkin, created_by: uid,
    }, "restaurantOrder");
    add("restaurant_order_items", { id: generateUUID(), user_id: uid, order_id: orderId, item_name: "Grilled Chicken", station: "Hot Kitchen", qty: 1, price: 140, notes: "No chilli", kds_status: "served", menu_item_id: menu1 });
    add("restaurant_order_items", { id: generateUUID(), user_id: uid, order_id: orderId, item_name: "Grilled Tilapia", station: "Hot Kitchen", qty: 1, price: 165, notes: "", kds_status: "served", menu_item_id: menu2 });
    add("restaurant_payments", { id: generateUUID(), user_id: uid, order_id: orderId, method: "cash", amount: 307.4, tendered: 310, change_given: 2.6, reference: "DEMO-RST-PAY", drawer_id: null });
    add("restaurant_reservations", { id: generateUUID(), user_id: uid, guest_name: "Martha Zulu", phone: "+260 970 200003", email: "martha@example.demo", guests: 4, reserved_date: isoDate(1), reserved_time: "19:00", table_id: ids.restaurantTable, special_requests: "Birthday table", status: "confirmed", source: "phone" });
    add("restaurant_waitlist", { id: generateUUID(), user_id: uid, guest_name: "John Phiri", phone: "+260 970 200004", guests: 3, quoted_minutes: 20, status: "waiting", notes: "Demo waitlist" });
    const drawer = add("restaurant_cash_drawers", { id: generateUUID(), user_id: uid, name: "Restaurant Drawer", station: "Main", business_date: today, opening_float: 500, cash_sales: 307.4, expected_cash: 807.4, counted_cash: 807.4, variance: 0, status: "open", opened_by: uid, created_by: uid }, "restaurantDrawer");
    add("restaurant_cash_transactions", { id: generateUUID(), user_id: uid, drawer_id: drawer, txn_type: "payout", amount: 50, reason: "Demo petty cash", reference: "DEMO-RST-CASH-001", approved_by: uid });
    add("restaurant_loyalty_accounts", { id: generateUUID(), user_id: uid, customer_id: ids.customer, member_name: "Mary Banda", phone: "+260 970 100001", points: 120, lifetime_spend: 4200, tier: "silver" });

    // Payroll / HR
    const dept = add("departments", { id: generateUUID(), user_id: uid, company_id: company.id, name: "Operations", code: "OPS", description: "Demo operations", manager_name: "Demo Manager" }, "department");
    const position = add("positions", { id: generateUUID(), user_id: uid, company_id: company.id, department_id: dept, title: "Store & Restaurant Assistant", description: "Demo position", level: "L2" }, "position");
    const employee = add("employees", {
      id: generateUUID(), user_id: uid, employee_code: "EMP-DEMO-001", first_name: "Naomi Zulu",
      email: "naomi@example.demo", napsa_number: "DEMO-NAPSA-001", hire_date: isoDate(-120), employment_type: "permanent",
      department_id: dept, position_id: position, branch_id: ids.branch, basic_salary: 16800, bank_name: "Zanaco",
      status: "active", address: "Lusaka", marital_status: "single",
    }, "employee");
    add("pay_grades", { id: generateUUID(), user_id: uid, company_id: company.id, code: "G5", name: "Demo Grade 5", notch: "1", min_salary: 12000, mid_salary: 16800, max_salary: 22000, housing_allowance: 2400, transport_allowance: 800, status: "Active" });
    const income = add("payroll_income_types", { id: generateUUID(), user_id: uid, company_id: company.id, code: "HOUSE", name: "Housing Allowance", type: "ALLOWANCE", short_name: "Housing", basis: "Monthly", taxable: 1, taxable_pct: 100, has_napsa: 1, has_nhima: 1, default_amount: 2400, status: "Active" }, "housingIncome");
    const ded = add("payroll_deduction_types", { id: generateUUID(), user_id: uid, company_id: company.id, code: "LOAN", name: "Staff Loan", type: "DEDUCTION", rate: 0, employer_rate: 0, basis: "Monthly", statutory: 0, before_tax: 0, show_on: "Payslip Only", sort_order: 1, status: "Active" }, "loanDed");
    add("employee_incomes", { id: generateUUID(), user_id: uid, company_id: company.id, employee_id: employee, income_type_id: income, amount: 2400, currency: "ZMW", hours_days_worked: 22, effective_from: isoDate(-60), status: "Active" });
    add("employee_deductions", { id: generateUUID(), user_id: uid, company_id: company.id, employee_id: employee, deduction_type_id: ded, total_amount: 800, monthly_amount: 800, outstanding_amount: 2400, currency: "ZMW", status: "Active" });
    const payroll = add("payroll_runs", { id: generateUUID(), user_id: uid, run_number: "PR-DEMO-2026-09", period_month: new Date().getMonth()+1, period_year: y, pay_date: today, status: "approved", total_gross: 20350, total_paye: 4562, total_napsa: 1017.5, total_nhima: 203.5, total_net: 14567, currency: "ZMW", prepared_by: uid }, "payroll");
    add("payslips", { id: generateUUID(), user_id: uid, payroll_run_id: payroll, employee_id: employee, basic_salary: 16800, allowances: 2400, overtime: 1150, gross_pay: 20350, paye: 4562, napsa: 1017.5, nhima: 203.5, other_deductions: 800, net_pay: 13967, earnings: JSON.stringify({ housing: 2400, overtime: 1150 }), housing_allowance: 2400, currency: "ZMW" });
    add("payroll_statutory_filings", { id: generateUUID(), user_id: uid, company_id: company.id, payroll_run_id: payroll, filing_type: "PAYE", period_year: y, period_month: new Date().getMonth()+1, employees_count: 1, employee_amount: 4562, employer_amount: 0, total_amount: 4562, payroll_amount: 20350, difference: 0, status: "ready", file_name: "DEMO-PAYE.csv", notes: "Illustrative demo filing" });
    add("napsa_icare_entries", { id: generateUUID(), user_id: uid, company_id: company.id, employee_id: employee, employer_acc_no: "DEMO-EMPLOYER", social_security_no: "DEMO-NAPSA-001", surname: "Zulu", forename: "Naomi", year: y, month: new Date().getMonth()+1, gross_pay: 20350, employer_contribution: 1017.5, employee_contribution: 1017.5, process: "TRIAL", status: "Active" });

    // Fixed asset, project, approvals and compliance
    add("asset_categories", { id: generateUUID(), user_id: uid, code: "EQUIP", name: "Equipment", useful_life_years: 5, depreciation_method: "straight_line", capitalisation_threshold: 5000, depreciation_expense_code: "5700", accumulated_depreciation_code: "1590", is_active: 1 });
    add("fixed_assets", { id: generateUUID(), user_id: uid, asset_number: "FA-DEMO-001", description: "Demo POS Computer", category: "Equipment", purchase_date: isoDate(-90), supplier: "Zambezi Wholesale", cost: 12000, salvage_value: 1000, useful_life_years: 5, method: "straight_line", location: "Kabulonga Store", condition: "good", status: "active", accumulated_depreciation: 200, book_value: 11800, asset_account_code: "1500", depreciation_expense_code: "6000", accumulated_depreciation_code: "1590" });
    const project = add("projects", { id: generateUUID(), user_id: uid, code: "PRJ-DEMO-001", name: "Kabulonga Store Fitout", customer_id: ids.customer, manager: "Demo Manager", status: "active", start_date: isoDate(-30), end_date: isoDate(30), budget: 45000, actual_cost: 18000, notes: "Demo project" }, "project");
    add("project_tasks", { id: generateUUID(), user_id: uid, project_id: project, title: "Install POS and printers", assignee: "Demo Technician", status: "in_progress", priority: "high", due_date: isoDate(5), estimated_hours: 16, actual_hours: 8, notes: "Demo task" });
    add("approval_requests", { id: generateUUID(), user_id: uid, company_id: company.id, module: "purchases", reference_type: "purchase_order", reference_id: ids.po, reference_number: "PO-DEMO-001", description: "Approve demo purchase order", amount: 3712, currency: "ZMW", status: "approved", current_level: 1, max_level: 1, requested_by: uid, decided_by: uid, decided_at: now });
    add("compliance_obligations", { id: generateUUID(), user_id: uid, body: "ZRA", obligation_type: "VAT Return", period: `${y}-09`, due_date: isoDate(20), status: "upcoming", amount: 1280, reference: "DEMO-VAT-SEP", notes: "Illustrative demo obligation" });
    add("compliance_documents", { id: generateUUID(), user_id: uid, branch_id: ids.branch, category: "tax", title: "Demo TPIN Certificate", reference: "DEMO-TPIN", issuing_body: "ZRA", responsible_person: "Demo Manager", issue_date: isoDate(-365), expiry_date: isoDate(365), status: "active", notes: "Sample only" });
    add("zra_smart_invoice_config", { id: generateUUID(), user_id: uid, branch_id: ids.branch, mode: "sandbox", taxpayer_name: "SifoDemo Zambia Limited", tpin: "DEMO000000000", branch_code: "KAB", device_serial: "DEMO-DEVICE-001", vsdc_endpoint: "http://127.0.0.1:8080", notes: "Demo configuration — not production credentials" });
    add("zra_invoice_queue", { id: generateUUID(), user_id: uid, source_type: "invoice", source_id: ids.invoice, invoice_number: "INV-DEMO-001", total: 5800, vat_amount: 800, levy_amount: 0, status: "pending", payload: JSON.stringify({ demo: true, invoiceNumber: "INV-DEMO-001" }), attempt_count: 0 });

    // Audit / notifications / service examples
    add("audit_logs", { id: generateUUID(), user_id: uid, actor_email: "demo@sifobooks.local", action: "SIFODEMO_SEEDED", entity_type: "demo_dataset", entity_id: company.id, details: JSON.stringify({ version: 1, sections: ["accounting","retail","pos","restaurant","payroll","inventory","banking","compliance","reports"] }) });
    add("notifications", { id: generateUUID(), user_id: uid, title: "SifoDemo data loaded", message: "Sample accounting, retail, restaurant, POS, payroll and reporting data is ready.", type: "info", link: "/dashboard", read: 0 });
    add("service_tickets", { id: generateUUID(), user_id: uid, ticket_number: "TKT-DEMO-001", customer_id: ids.customer, subject: "Demo support ticket", description: "Sample service ticket for workflow testing", priority: "medium", status: "open" });
    add("complaints", { id: generateUUID(), user_id: uid, customer_id: ids.customer, subject: "Demo customer complaint", description: "Sample complaint for customer-service workflow testing", priority: "medium", status: "open" });

    return { alreadyLoaded: false, companyId: company.id, counts };
  })();

  return result;
}
