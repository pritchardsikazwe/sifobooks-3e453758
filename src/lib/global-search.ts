/**
 * Tenant-wide record search.
 *
 * Every query goes through the browser Supabase client, so Row Level Security
 * scopes results to the signed-in user's own company — there is no cross-tenant
 * read here and nothing is written.
 */
import { supabase } from "@/integrations/supabase/client";

export type SearchAction = { label: string; url: string };

export type SearchHit = {
  kind:
    | "customer" | "supplier" | "invoice" | "bill" | "quote" | "purchase-order"
    | "receipt" | "expense" | "item" | "warehouse" | "bank" | "journal"
    | "employee" | "asset" | "student";
  group: string;
  id: string;
  title: string;
  subtitle?: string;
  amount?: number | null;
  status?: string | null;
  url: string;
  actions: SearchAction[];
};

const money = (v: unknown) =>
  v === null || v === undefined ? undefined : `K${Number(v).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const like = (term: string) => `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;

/** Each table is searched over the columns a user would actually type. */
export async function searchRecords(term: string, limitPer = 5): Promise<SearchHit[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const p = like(q);
  const L = limitPer;

  const safe = async <T,>(fn: () => PromiseLike<{ data: unknown }>): Promise<T[]> => {
    try { return (((await fn()).data ?? []) as T[]); } catch { return []; }
  };

  const [
    customers, suppliers, invoices, bills, quotes, pos, receipts, expenses,
    items, warehouses, bankTxns, journals, employees, assets, students,
  ] = await Promise.all([
    safe<any>(() => supabase.from("customers").select("id,name,email,phone,tpin,city").or(`name.ilike.${p},email.ilike.${p},phone.ilike.${p},tpin.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("suppliers").select("id,name,supplier_code,email,phone,tpin,current_balance").or(`name.ilike.${p},supplier_code.ilike.${p},email.ilike.${p},tpin.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("invoices").select("id,number,issue_date,status,total,balance_due,customer:customer_id(name)").or(`number.ilike.${p},notes.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("bills").select("id,bill_number,supplier_invoice_number,bill_date,status,total,balance_due,supplier:supplier_id(name)").or(`bill_number.ilike.${p},supplier_invoice_number.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("quotes").select("id,number,issue_date,status,total,customer:customer_id(name)").or(`number.ilike.${p},notes.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("purchase_orders").select("id,po_number,order_date,status,total,supplier:supplier_id(name)").or(`po_number.ilike.${p},notes.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("receipts").select("id,number,receipt_date,amount,method,reference,payer_name,customer:customer_id(name)").or(`number.ilike.${p},reference.ilike.${p},payer_name.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("expenses").select("id,expense_number,expense_date,category,total,status,reference,notes").or(`expense_number.ilike.${p},reference.ilike.${p},category.ilike.${p},notes.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("stock_items").select("id,name,sku,barcode,category,quantity_on_hand,sell_price").or(`name.ilike.${p},sku.ilike.${p},barcode.ilike.${p},category.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("warehouses").select("id,name,code,location,is_active").or(`name.ilike.${p},code.ilike.${p},location.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("bank_transactions").select("id,txn_date,description,reference,payee,amount,status,bank_account_id").or(`description.ilike.${p},reference.ilike.${p},payee.ilike.${p},voucher_no.ilike.${p}`).order("txn_date", { ascending: false }).limit(L)),
    safe<any>(() => supabase.from("journal_entries").select("id,entry_number,entry_date,description,reference,status,total_debit").or(`entry_number.ilike.${p},reference.ilike.${p},description.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("employees").select("id,employee_code,first_name,last_name,status,email,phone").or(`first_name.ilike.${p},last_name.ilike.${p},employee_code.ilike.${p},email.ilike.${p},national_id.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("fixed_assets").select("id,asset_number,description,category,status,book_value").or(`asset_number.ilike.${p},description.ilike.${p},category.ilike.${p},registration_number.ilike.${p}`).limit(L)),
    safe<any>(() => supabase.from("students").select("id,student_no,first_name,last_name,status,guardian_name").or(`first_name.ilike.${p},last_name.ilike.${p},student_no.ilike.${p},guardian_name.ilike.${p}`).limit(L)),
  ]);

  const hits: SearchHit[] = [];

  for (const c of customers) hits.push({
    kind: "customer", group: "Customers", id: c.id, title: c.name,
    subtitle: [c.city, c.email, c.phone].filter(Boolean).join(" · ") || undefined,
    url: `/customers/${c.id}`,
    actions: [
      { label: "View customer", url: `/customers/${c.id}` },
      { label: "Receive payment", url: "/receipts" },
      { label: "New invoice", url: "/invoices/new" },
      { label: "Statement", url: `/reports/customer-statement?customer=${c.id}` },
    ],
  });

  for (const s of suppliers) hits.push({
    kind: "supplier", group: "Suppliers", id: s.id, title: s.name,
    subtitle: [s.supplier_code, s.email, money(s.current_balance) && `Balance ${money(s.current_balance)}`].filter(Boolean).join(" · ") || undefined,
    url: "/suppliers",
    actions: [
      { label: "View suppliers", url: "/suppliers" },
      { label: "Pay bill", url: "/bill-payments" },
      { label: "New bill", url: "/bills" },
      { label: "Statement", url: `/reports/supplier-statement?supplier=${s.id}` },
    ],
  });

  for (const i of invoices) hits.push({
    kind: "invoice", group: "Invoices", id: i.id, title: `Invoice ${i.number ?? i.id.slice(0, 8)}`,
    subtitle: [i.customer?.name, i.issue_date, Number(i.balance_due) > 0 ? `Outstanding ${money(i.balance_due)}` : "Settled"].filter(Boolean).join(" · "),
    amount: i.total, status: i.status,
    url: "/invoices",
    actions: [
      { label: "Open invoices", url: "/invoices" },
      { label: "Receive payment", url: "/receipts" },
      { label: "Aged receivables", url: "/reports/aged-receivables" },
    ],
  });

  for (const b of bills) hits.push({
    kind: "bill", group: "Bills", id: b.id, title: `Bill ${b.bill_number ?? b.id.slice(0, 8)}`,
    subtitle: [b.supplier?.name, b.bill_date, Number(b.balance_due) > 0 ? `Outstanding ${money(b.balance_due)}` : "Settled"].filter(Boolean).join(" · "),
    amount: b.total, status: b.status,
    url: "/bills",
    actions: [
      { label: "Open bills", url: "/bills" },
      { label: "Pay bill", url: "/bill-payments" },
      { label: "Aged payables", url: "/reports/aged-payables" },
    ],
  });

  for (const q2 of quotes) hits.push({
    kind: "quote", group: "Quotes", id: q2.id, title: `Quote ${q2.number ?? q2.id.slice(0, 8)}`,
    subtitle: [q2.customer?.name, q2.issue_date].filter(Boolean).join(" · "),
    amount: q2.total, status: q2.status,
    url: `/quotes/${q2.id}`,
    actions: [{ label: "View quote", url: `/quotes/${q2.id}` }, { label: "All quotes", url: "/quotes" }],
  });

  for (const o of pos) hits.push({
    kind: "purchase-order", group: "Purchase orders", id: o.id, title: `PO ${o.po_number ?? o.id.slice(0, 8)}`,
    subtitle: [o.supplier?.name, o.order_date].filter(Boolean).join(" · "),
    amount: o.total, status: o.status,
    url: `/purchase-order-detail/${o.id}`,
    actions: [{ label: "View order", url: `/purchase-order-detail/${o.id}` }, { label: "All purchase orders", url: "/purchase-orders" }],
  });

  for (const r of receipts) hits.push({
    kind: "receipt", group: "Receipts", id: r.id, title: `Receipt ${r.number ?? r.id.slice(0, 8)}`,
    subtitle: [r.customer?.name ?? r.payer_name, r.receipt_date, r.method].filter(Boolean).join(" · "),
    amount: r.amount,
    url: "/receipts",
    actions: [{ label: "Open receipts", url: "/receipts" }, { label: "Cashbook", url: "/reports/cashbook" }],
  });

  for (const e of expenses) hits.push({
    kind: "expense", group: "Expenses", id: e.id, title: e.expense_number ? `Expense ${e.expense_number}` : (e.category || "Expense"),
    subtitle: [e.category, e.expense_date, e.reference].filter(Boolean).join(" · "),
    amount: e.total, status: e.status,
    url: "/expenses",
    actions: [{ label: "Open expenses", url: "/expenses" }, { label: "Expenses report", url: "/reports/expenses" }],
  });

  for (const it of items) hits.push({
    kind: "item", group: "Items", id: it.id, title: it.name,
    subtitle: [it.sku, it.category, `On hand ${Number(it.quantity_on_hand ?? 0).toLocaleString()}`].filter(Boolean).join(" · "),
    amount: it.sell_price,
    url: "/stock",
    actions: [
      { label: "Open stock", url: "/stock" },
      { label: "Stock movement", url: "/reports/stock-movement" },
      { label: "Stock valuation", url: "/reports/inventory-valuation" },
    ],
  });

  for (const w of warehouses) hits.push({
    kind: "warehouse", group: "Warehouses", id: w.id, title: w.name,
    subtitle: [w.code, w.location, w.is_active ? "Active" : "Inactive"].filter(Boolean).join(" · "),
    url: `/warehouses?warehouse=${w.id}`,
    actions: [
      { label: "View stock here", url: `/warehouses?warehouse=${w.id}` },
      { label: "Stock by location", url: "/inventory/locations" },
    ],
  });

  for (const t of bankTxns) hits.push({
    kind: "bank", group: "Bank transactions", id: t.id, title: t.description || t.payee || "Bank transaction",
    subtitle: [t.txn_date, t.reference, t.status].filter(Boolean).join(" · "),
    amount: t.amount, status: t.status,
    url: "/banking",
    actions: [
      { label: "Open banking", url: "/banking" },
      { label: "Match & reconcile", url: "/reconciliation" },
    ],
  });

  for (const j of journals) hits.push({
    kind: "journal", group: "Journal entries", id: j.id, title: `Journal ${j.entry_number ?? j.id.slice(0, 8)}`,
    subtitle: [j.entry_date, j.description, j.status].filter(Boolean).join(" · "),
    amount: j.total_debit, status: j.status,
    url: `/journal-entry/${j.id}`,
    actions: [
      { label: "View journal", url: `/journal-entry/${j.id}` },
      { label: "General ledger", url: "/reports/general-ledger" },
    ],
  });

  for (const em of employees) hits.push({
    kind: "employee", group: "Employees", id: em.id, title: `${em.first_name ?? ""} ${em.last_name ?? ""}`.trim() || "Employee",
    subtitle: [em.employee_code, em.status, em.email].filter(Boolean).join(" · "),
    url: "/employees",
    actions: [
      { label: "Open employees", url: "/employees" },
      { label: "Payroll", url: "/payroll-dashboard" },
    ],
  });

  for (const a of assets) hits.push({
    kind: "asset", group: "Fixed assets", id: a.id, title: a.description || a.asset_number || "Asset",
    subtitle: [a.asset_number, a.category, a.status].filter(Boolean).join(" · "),
    amount: a.book_value,
    url: "/fixed-assets",
    actions: [{ label: "Open assets", url: "/fixed-assets" }],
  });

  for (const st of students) hits.push({
    kind: "student", group: "Students", id: st.id, title: `${st.first_name ?? ""} ${st.last_name ?? ""}`.trim() || "Student",
    subtitle: [st.student_no, st.status, st.guardian_name].filter(Boolean).join(" · "),
    url: "/school/students",
    actions: [
      { label: "Open students", url: "/school/students" },
      { label: "Fees & payments", url: "/school/fees" },
    ],
  });

  return hits;
}

/** Groups hits in a stable display order. */
export function groupHits(hits: SearchHit[]): { group: string; hits: SearchHit[] }[] {
  const order = [
    "Customers", "Suppliers", "Invoices", "Bills", "Quotes", "Purchase orders", "Receipts",
    "Expenses", "Items", "Warehouses", "Bank transactions", "Journal entries", "Employees",
    "Fixed assets", "Students",
  ];
  const map = new Map<string, SearchHit[]>();
  for (const h of hits) map.set(h.group, [...(map.get(h.group) ?? []), h]);
  return order.filter((g) => map.has(g)).map((g) => ({ group: g, hits: map.get(g)! }));
}
