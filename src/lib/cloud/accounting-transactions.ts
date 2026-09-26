// @ts-nocheck -- loosely typed after local-database port; see AGENTS.md
import { getCloudDb } from "@/lib/cloud/postgres";
import { prepareJournalPosting } from "@/core/accounting/journal-plan";
import { prepareInventoryMovement } from "@/core/inventory/movement";

type Tx = any;
const money = (v: unknown) => Math.round((Number(v ?? 0) + Number.EPSILON) * 100) / 100;
const id = () => crypto.randomUUID();
const dateOnly = (v?: unknown) => String(v || new Date().toISOString()).slice(0, 10);

async function one(tx: Tx, sql: string, params: any[] = []) {
  const rows = await tx.unsafe(sql, params);
  return rows[0] ?? null;
}
async function many(tx: Tx, sql: string, params: any[] = []) {
  return tx.unsafe(sql, params);
}
async function account(tx: Tx, uid: string, code: string, name: string, type: string) {
  const row = await one(tx, "SELECT id FROM chart_of_accounts WHERE user_id=$1 AND account_code=$2 LIMIT 1", [uid, code]);
  if (row?.id) return String(row.id);
  const accountId = id();
  await tx.unsafe(
    "INSERT INTO chart_of_accounts(id,user_id,tenant_id,account_code,account_name,account_type,is_active) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,true)",
    [accountId, uid, code, name, type],
  );
  return accountId;
}
async function accounts(tx: Tx, uid: string) {
  return {
    cash: await account(tx, uid, "1000", "Cash & Bank", "asset"),
    receivable: await account(tx, uid, "1100", "Accounts Receivable", "asset"),
    inventory: await account(tx, uid, "1300", "Inventory", "asset"),
    inputVat: await account(tx, uid, "1400", "VAT Input", "asset"),
    payable: await account(tx, uid, "2100", "Accounts Payable", "liability"),
    vat: await account(tx, uid, "2200", "VAT Payable", "liability"),
    revenue: await account(tx, uid, "4000", "Sales Revenue", "revenue"),
    cogs: await account(tx, uid, "5000", "Cost of Sales", "expense"),
  };
}
async function journal(tx: Tx, uid: string, reference: string, description: string, entryDate: string, lines: any[]) {
  const plan = prepareJournalPosting(lines);
  const prior = await one(tx, "SELECT id FROM journal_entries WHERE user_id=$1 AND reference=$2 LIMIT 1", [uid, reference]);
  if (prior?.id) return String(prior.id);
  const entryId = id();
  await tx.unsafe(
    "INSERT INTO journal_entries(id,user_id,tenant_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,'posted',$7,$8,'ZMW',1)",
    [entryId, uid, "JE-" + reference, entryDate, reference, description, plan.totalDebit, plan.totalCredit],
  );
  for (const line of plan.lines) {
    await tx.unsafe(
      "INSERT INTO journal_lines(id,user_id,tenant_id,entry_id,account_id,description,debit,credit) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7)",
      [id(), uid, entryId, line.accountId, line.description || description, line.debit, line.credit],
    );
  }
  return entryId;
}
async function batch(tx: Tx, uid: string, type: string, sourceType: string, sourceId: string | null, clientRef: string | null) {
  if (clientRef) {
    const prior = await one(tx,
      "SELECT id,status,source_id FROM cloud_transaction_batches WHERE tenant_id=current_setting('app.tenant_id',true)::uuid AND transaction_type=$1 AND client_ref=$2 LIMIT 1",
      [type, clientRef],
    );
    if (prior) return { id: String(prior.id), duplicate: true, sourceId: prior.source_id ? String(prior.source_id) : null };
  }
  const batchId = id();
  await tx.unsafe(
    "INSERT INTO cloud_transaction_batches(id,tenant_id,user_id,transaction_type,source_type,source_id,client_ref) VALUES($1,current_setting('app.tenant_id',true)::uuid,$2,$3,$4,$5,$6)",
    [batchId, uid, type, sourceType, sourceId, clientRef],
  );
  return { id: batchId, duplicate: false, sourceId };
}
async function event(tx: Tx, uid: string, transactionId: string, eventType: string, message: string, payload: any = {}) {
  await tx.unsafe(
    "INSERT INTO cloud_transaction_events(tenant_id,transaction_id,actor_user_id,event_type,message,payload) VALUES(current_setting('app.tenant_id',true)::uuid,$1,$2,$3,$4,$5::jsonb)",
    [transactionId, uid, eventType, message, JSON.stringify(payload)],
  );
}
async function setUser(tx: Tx, uid: string) {
  await tx.unsafe("SELECT set_config('app.user_id',$1,true)", [uid]);
  const tenant = await one(tx, "SELECT ct.id FROM cloud_tenants ct INNER JOIN cloud_members cm ON cm.tenant_id=ct.id WHERE cm.user_id=$1 AND cm.status='active' ORDER BY ct.created_at LIMIT 1", [uid]);
  if (!tenant?.id) throw new Error("CLOUD_TENANT_NOT_FOUND");
  await tx.unsafe("SELECT set_config('app.tenant_id',$1,true)", [String(tenant.id)]);
}

export async function cloudPosCheckout(uid: string, args: any) {
  const sale = args?._sale || {};
  const items = Array.isArray(args?._items) ? args._items : [];
  const payments = Array.isArray(args?._payments) ? args._payments : [];
  if (!items.length) throw new Error("EMPTY_SALE");
  if (!payments.length) throw new Error("PAYMENT_REQUIRED");
  return getCloudDb().begin(async (tx: Tx) => {
    await setUser(tx, uid);
    const b = await batch(tx, uid, "POS_CHECKOUT", "pos_sale", null, String(sale.client_ref || ""));
    if (b.duplicate) return { sale_id: b.sourceId, sale_no: sale.sale_no, duplicate: true, transaction_id: b.id };

    const settings = await one(tx, "SELECT tax_rate,tax_inclusive,allow_negative_stock FROM pos_settings WHERE user_id=$1 LIMIT 1", [uid]);
    const defaultRate = Number(settings?.tax_rate ?? 16);
    const taxInclusive = Number(settings?.tax_inclusive ?? 1) === 1;
    const allowNegative = Boolean(sale.allow_negative_stock ?? settings?.allow_negative_stock ?? false);
    let subtotal = 0, vat = 0, cost = 0, gross = 0;
    const resolved: any[] = [];

    for (const raw of items) {
      const qty = Number(raw.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("BAD_QUANTITY");
      if (!raw.item_id) throw new Error("ITEM_REQUIRED");
      const item = await one(tx, "SELECT * FROM stock_items WHERE id=$1 AND user_id=$2 FOR UPDATE", [String(raw.item_id), uid]);
      if (!item) throw new Error("UNKNOWN_ITEM");
      const price = Number(raw.price ?? item.sell_price ?? 0);
      if (!Number.isFinite(price) || price < 0) throw new Error("NO_PRICE");
      const discount = Math.min(100, Math.max(0, Number(raw.discount_pct || 0)));
      const grossLine = money(qty * price);
      const net = money(grossLine * (1 - discount / 100));
      const rate = Number(item.vat_rate ?? defaultRate);
      const lineVat = taxInclusive && rate > 0 ? money(net - net / (1 + rate / 100)) : money(net * rate / 100);
      const lineSubtotal = taxInclusive ? money(net - lineVat) : net;
      const lineTotal = taxInclusive ? net : money(net + lineVat);
      const unitCost = Number(item.cost_price ?? 0);
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("BAD_COST");
      if (!allowNegative && Number(item.quantity_on_hand || 0) + 0.000001 < qty) throw new Error("INSUFFICIENT_STOCK:" + item.name);
      gross += grossLine; subtotal += lineSubtotal; vat += lineVat; cost += money(qty * unitCost);
      resolved.push({ raw, item, qty, price, discount, grossLine, lineSubtotal, lineVat, lineTotal, unitCost });
    }

    const saleDiscountPct = Math.min(100, Math.max(0, Number(sale.sale_discount_pct || 0)));
    const before = money(subtotal + vat);
    const saleDiscount = money(before * saleDiscountPct / 100);
    const ratio = before > 0 ? money((before - saleDiscount) / before) : 1;
    subtotal = money(subtotal * ratio);
    vat = money(vat * ratio);
    const total = taxInclusive ? money(subtotal + vat) : money(subtotal + vat);
    const paid = money(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
    const change = money(args?._change_due || 0);
    if (paid + 0.01 < total + change) throw new Error("PAYMENT_SHORT");
    if (Math.abs(paid - total - change) > 0.01) throw new Error("PAYMENT_RECONCILIATION_FAILED");

    const saleId = id();
    const saleNo = String(sale.sale_no || "POS-" + Date.now());
    await tx.unsafe(
      "INSERT INTO pos_sales(id,user_id,tenant_id,sale_no,client_ref,shift_id,register_id,customer_id,customer_name,price_level,status,subtotal,discount,tax,total,paid,change_due,cost_total,note,sold_at,created_by,location_id) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,$9,'completed',$10,$11,$12,$13,$14,$15,$16,$17,now(),$2,$18)",
      [saleId, uid, saleNo, sale.client_ref || null, sale.shift_id || null, sale.register_id || null, sale.customer_id || null, sale.customer_name || "Walk-in Customer", sale.price_level || "normal", subtotal + vat, saleDiscount, vat, total, paid, change, cost, sale.note || null, sale.location_id || null],
    );

    for (const x of resolved) {
      await tx.unsafe(
        "INSERT INTO pos_sale_items(id,user_id,tenant_id,sale_id,item_id,name,sku,qty,price,unit_cost,discount,tax_rate,line_total,note,unit,base_qty,base_unit) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
        [id(), uid, saleId, x.item.id, x.item.name, x.item.sku || null, x.qty, x.price, x.unitCost, x.discount, Number(x.item.vat_rate ?? 0), x.grossLine, x.raw.note || null, x.raw.unit || x.item.unit || null, x.qty, x.item.unit || null],
      );
      await tx.unsafe("UPDATE stock_items SET quantity_on_hand=quantity_on_hand-$1,updated_at=now() WHERE id=$2 AND user_id=$3", [x.qty, x.item.id, uid]);
      const movement = prepareInventoryMovement({
        itemId: String(x.item.id),
        movementType: "SALE",
        quantityDelta: -x.qty,
        unitCost: x.unitCost,
        reference: saleNo,
        note: "POS sale",
      });
      await tx.unsafe(
        "INSERT INTO stock_movements(id,user_id,tenant_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id,total_cost) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,'SALE',$4,$5,$6,$7,$8,$9)",
        [id(), uid, movement.itemId, movement.quantityDelta, movement.unitCost, movement.reference, movement.note, sale.location_id || x.item.warehouse_id || null, movement.totalCost],
      );
      if (sale.location_id) {
        const bal = await one(tx, "SELECT id,quantity FROM stock_balances WHERE user_id=$1 AND item_id=$2 AND location_id=$3 FOR UPDATE", [uid, x.item.id, sale.location_id]);
        const after = money(Number(bal?.quantity || 0) - x.qty);
        if (bal) await tx.unsafe("UPDATE stock_balances SET quantity=$1,updated_at=now() WHERE id=$2", [after, bal.id]);
        else await tx.unsafe("INSERT INTO stock_balances(id,user_id,tenant_id,item_id,location_id,quantity) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5)", [id(), uid, x.item.id, sale.location_id, after]);
      }
    }
    for (const p of payments) {
      const amount = money(p.amount);
      if (amount <= 0) throw new Error("INVALID_PAYMENT");
      await tx.unsafe("INSERT INTO pos_payments(id,user_id,tenant_id,sale_id,method,amount,reference) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6)", [id(), uid, saleId, p.method || "cash", amount, p.reference || null]);
    }

    const a = await accounts(tx, uid);
    const applied: Record<string, number> = {};
    let remaining = total;
    for (const p of payments) {
      const take = money(Math.min(remaining, Number(p.amount || 0)));
      if (take > 0) {
        const key = String(p.method || "cash").toLowerCase();
        applied[key] = money((applied[key] || 0) + take);
        remaining = money(remaining - take);
      }
    }
    const lines: any[] = Object.entries(applied).map(([method, amount]) => ({ accountId: a.cash, debit: amount, credit: 0, description: "POS " + method }));
    lines.push({ accountId: a.revenue, debit: 0, credit: subtotal, description: "Sales revenue" });
    if (vat > 0) lines.push({ accountId: a.vat, debit: 0, credit: vat, description: "VAT output" });
    if (cost > 0) {
      lines.push({ accountId: a.cogs, debit: cost, credit: 0, description: "Cost of sales" });
      lines.push({ accountId: a.inventory, debit: 0, credit: cost, description: "Inventory relief" });
    }
    const je = await journal(tx, uid, "POS:" + saleNo, "POS sale " + saleNo, dateOnly(), lines);
    await tx.unsafe("UPDATE pos_sales SET journal_entry_id=$1,updated_at=now() WHERE id=$2", [je, saleId]);
    await tx.unsafe(
      "INSERT INTO zra_invoice_queue(id,user_id,tenant_id,source_type,source_id,invoice_number,total,vat_amount,status,payload,attempt_count,updated_at) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,'pos_sale',$3,$4,$5,$6,'pending',$7,0,now())",
      [id(), uid, saleId, saleNo, total, vat, JSON.stringify({ source: "cloud_pos", saleId, saleNo, total, vat })],
    );
    await tx.unsafe("UPDATE cloud_transaction_batches SET source_id=$1,total_debit=$2,total_credit=$2,metadata_json=$3,updated_at=now() WHERE id=$4", [saleId, total + cost, total + cost, JSON.stringify({ saleNo, total, vat, cost }), b.id]);
    await event(tx, uid, b.id, "POSTED", "POS sale posted atomically", { saleId, saleNo, total, vat, cost });
    await tx.unsafe("INSERT INTO audit_logs(id,user_id,tenant_id,action,entity_type,entity_id,details) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6)", [id(), uid, "POS_CHECKOUT", "pos_sale", saleId, JSON.stringify({ saleNo, total, vat, cost })]);
    return { sale_id: saleId, sale_no: saleNo, transaction_id: b.id, duplicate: false, total, vat, cost };
  });
}


export async function cloudRestaurantCheckout(uid: string, args: any) {
  const sale = args?._sale || {};
  const rawItems = Array.isArray(args?._items) ? args._items : [];
  const rawPayments = Array.isArray(args?._payments) ? args._payments : [];
  if (!rawItems.length) throw new Error("EMPTY_RESTAURANT_CHECK");
  if (!rawPayments.length) throw new Error("RESTAURANT_PAYMENT_REQUIRED");

  return getCloudDb().begin(async (tx: Tx) => {
    await setUser(tx, uid);
    const businessDate = dateOnly(sale.business_date);
    const clientRef = String(sale.client_ref || "");
    const existing = sale.order_id
      ? await one(tx, "SELECT * FROM restaurant_orders WHERE id=$1 AND user_id=$2 FOR UPDATE", [String(sale.order_id), uid])
      : null;
    if (sale.order_id && !existing) throw new Error("RESTAURANT_ORDER_NOT_FOUND");
    if (existing && ["paid", "refunded", "void"].includes(String(existing.status))) {
      if (existing.status === "paid") return { orderId: existing.id, orderNo: existing.order_no, journalEntryId: existing.journal_entry_id, duplicate: true, status: existing.status };
      throw new Error("RESTAURANT_ORDER_NOT_SETTLEABLE");
    }

    const shift = sale.shift_id
      ? await one(tx, "SELECT id FROM restaurant_shifts WHERE id=$1 AND user_id=$2 AND business_date=$3 AND clock_out IS NULL LIMIT 1", [String(sale.shift_id), uid, businessDate])
      : await one(tx, "SELECT id FROM restaurant_shifts WHERE user_id=$1 AND business_date=$2 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1", [uid, businessDate]);
    if (!shift) throw new Error("NO_ACTIVE_RESTAURANT_SHIFT");

    const payments = rawPayments.map((p: any) => ({
      method: String(p.method || "cash"),
      amount: money(p.amount),
      tendered: money(p.tendered ?? p.amount ?? 0),
      change: Math.max(0, money(p.change ?? p.change_given ?? 0)),
      reference: p.reference || null,
    })).filter((p: any) => p.amount > 0);
    const total = money(sale.total);
    const paid = money(payments.reduce((s: number, p: any) => s + p.amount, 0));
    if (paid + 0.01 < total) throw new Error("PAYMENT_SHORT");

    const needsCash = payments.some((p: any) => p.method.toLowerCase() === "cash");
    const drawer = needsCash
      ? await one(tx, "SELECT * FROM restaurant_cash_drawers WHERE user_id=$1 AND business_date=$2 AND status='open' ORDER BY opened_at DESC LIMIT 1 FOR UPDATE", [uid, businessDate])
      : null;
    if (needsCash && !drawer) throw new Error("NO_OPEN_CASH_DRAWER");

    const menuByName = new Map<string, any>();
    for (const row of await many(tx, "SELECT * FROM restaurant_menu_items WHERE user_id=$1 AND active=1", [uid])) {
      menuByName.set(String(row.name), row);
    }

    const ingredientTotals = new Map<string, { qty: number; item: any; unit: string | null }>();
    const lines: any[] = [];
    for (const raw of rawItems) {
      const name = String(raw.name || raw.item_name || "").trim();
      const qty = Number(raw.qty || raw.quantity || 0);
      const price = Number(raw.price || 0);
      const menu = menuByName.get(name);
      if (!menu) throw new Error("MENU_ITEM_NOT_FOUND:" + name);
      if (!(qty > 0) || !(price >= 0)) throw new Error("INVALID_RESTAURANT_LINE");

      const modifiers = Array.isArray(raw.modifiers) ? raw.modifiers : [];
      const modifierTotal = modifiers.reduce((s: number, m: any) => s + Number(m.price || 0), 0);
      const lineTotal = money((price + modifierTotal) * qty);
      const recipes = await many(tx, "SELECT stock_item_id,quantity,unit FROM restaurant_recipes WHERE user_id=$1 AND menu_item_id=$2", [uid, menu.id]);
      for (const recipe of recipes) {
        const item = await one(tx, "SELECT * FROM stock_items WHERE id=$1 AND user_id=$2 FOR UPDATE", [recipe.stock_item_id, uid]);
        if (!item) throw new Error("RECIPE_STOCK_ITEM_NOT_FOUND:" + recipe.stock_item_id);
        const required = Number(recipe.quantity || 0) * qty;
        const cur = ingredientTotals.get(String(item.id)) || { qty: 0, item, unit: recipe.unit || item.unit || null };
        cur.qty += required;
        ingredientTotals.set(String(item.id), cur);
      }
      lines.push({ id: id(), name, station: raw.station || menu.station || "Kitchen", qty, price, unitCost: Number(menu.cost || 0), modifiers, notes: raw.notes || raw.note || null });
    }

    for (const d of ingredientTotals.values()) {
      const available = sale.location_id
        ? await one(tx, "SELECT id,quantity FROM stock_balances WHERE user_id=$1 AND item_id=$2 AND location_id=$3 FOR UPDATE", [uid, d.item.id, String(sale.location_id)])
        : null;
      const qtyAvailable = sale.location_id ? Number(available?.quantity || 0) : Number(d.item.quantity_on_hand || 0);
      if (qtyAvailable + 0.000001 < d.qty) throw new Error("INSUFFICIENT_STOCK:" + d.item.name);
      if (sale.location_id && !available) throw new Error("LOCATION_STOCK_NOT_INITIALIZED:" + d.item.name);
    }

    const orderId = existing?.id || id();
    const orderNo = String(existing?.order_no || sale.order_no || ("CHK-" + Date.now().toString().slice(-6)));
    const journalIdPlaceholder = null;

    if (existing) {
      await tx.unsafe(
        "UPDATE restaurant_orders SET business_date=$1,table_id=$2,order_type=$3,guests=$4,subtotal=$5,discount=$6,tax=$7,service_charge=$8,gratuity=$9,delivery_fee=$10,total=$11,server_name=$12,customer_name=$13,status='paid',payment_method=$14,amount_paid=$11,closed_at=now(),journal_entry_id=$15 WHERE id=$16 AND user_id=$17",
        [businessDate, sale.table_id || existing.table_id || null, sale.order_type || existing.order_type || "DINE-IN", Number(sale.guests || existing.guests || 1), money(sale.subtotal), money(sale.discount), money(sale.tax), money(sale.service_charge), money(sale.gratuity), money(sale.delivery_fee), total, sale.server_name || existing.server_name || null, sale.customer_name || existing.customer_name || null, payments.length === 1 ? payments[0].method : "split", journalIdPlaceholder, orderId, uid],
      );
      await tx.unsafe("DELETE FROM restaurant_order_items WHERE order_id=$1 AND user_id=$2", [orderId, uid]);
      await tx.unsafe("DELETE FROM restaurant_payments WHERE order_id=$1 AND user_id=$2", [orderId, uid]);
    } else {
      await tx.unsafe(
        "INSERT INTO restaurant_orders(id,user_id,order_no,business_date,table_id,order_type,guests,subtotal,discount,tax,service_charge,gratuity,delivery_fee,total,server_name,customer_name,status,payment_method,amount_paid,closed_at,journal_entry_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'paid',$17,$14,now(),$18)",
        [orderId, uid, orderNo, businessDate, sale.table_id || null, sale.order_type || "DINE-IN", Number(sale.guests || 1), money(sale.subtotal), money(sale.discount), money(sale.tax), money(sale.service_charge), money(sale.gratuity), money(sale.delivery_fee), total, sale.server_name || null, sale.customer_name || null, payments.length === 1 ? payments[0].method : "split", journalIdPlaceholder],
      );
    }

    for (const line of lines) {
      await tx.unsafe(
        "INSERT INTO restaurant_order_items(id,user_id,order_id,item_name,station,qty,price,unit_cost,discount,modifiers,notes,kds_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'served')",
        [line.id, uid, orderId, line.name, line.station, line.qty, line.price, line.unitCost, 0, JSON.stringify(line.modifiers || []), line.notes],
      );
    }

    let ingredientCost = 0;
    for (const d of ingredientTotals.values()) {
      const next = Number(d.item.quantity_on_hand || 0) - d.qty;
      ingredientCost += d.qty * Number(d.item.cost_price || 0);
      await tx.unsafe("UPDATE stock_items SET quantity_on_hand=$1,updated_at=now() WHERE id=$2 AND user_id=$3", [next, d.item.id, uid]);
      if (sale.location_id) {
        const bal = await one(tx, "SELECT id,quantity FROM stock_balances WHERE user_id=$1 AND item_id=$2 AND location_id=$3 FOR UPDATE", [uid, d.item.id, String(sale.location_id)]);
        await tx.unsafe("UPDATE stock_balances SET quantity=$1,updated_at=now() WHERE id=$2", [money(Number(bal.quantity) - d.qty), bal.id]);
      }
      const movement = prepareInventoryMovement({
        itemId: String(d.item.id),
        movementType: "SALE",
        quantityDelta: -d.qty,
        unitCost: Number(d.item.cost_price || 0),
        reference: orderNo,
        note: "Restaurant recipe consumption",
      });
      await tx.unsafe(
        "INSERT INTO stock_movements(id,user_id,tenant_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id,total_cost) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,'SALE',$4,$5,$6,$7,$8,$9)",
        [id(), uid, movement.itemId, movement.quantityDelta, movement.unitCost, movement.reference, movement.note, sale.location_id || d.item.warehouse_id || null, movement.totalCost],
      );
    }
    ingredientCost = money(ingredientCost);

    for (const p of payments) {
      await tx.unsafe("INSERT INTO restaurant_payments(id,user_id,order_id,method,amount,tendered,change_given,reference,drawer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [id(), uid, orderId, p.method, p.amount, p.tendered, p.change, p.reference, needsCash ? drawer?.id : null]);
    }

    if (needsCash) {
      const cash = money(payments.filter((p: any) => p.method.toLowerCase() === "cash").reduce((s: number, p: any) => s + p.amount, 0));
      const expected = money(Number(drawer.opening_float || 0) + Number(drawer.cash_sales || 0) + cash - Number(drawer.cash_payouts || 0) - Number(drawer.cash_drops || 0));
      await tx.unsafe("UPDATE restaurant_cash_drawers SET cash_sales=$1,expected_cash=$2,updated_at=now() WHERE id=$3 AND user_id=$4 AND status='open'", [money(Number(drawer.cash_sales || 0) + cash), expected, drawer.id, uid]);
    }

    const a = await accounts(tx, uid);
    const netSales = money(total - money(sale.tax));
    const journalLines: any[] = payments.map((p: any) => ({ accountId: a.cash, debit: p.amount, credit: 0, description: "Restaurant payment " + p.method }));
    journalLines.push({ accountId: a.revenue, debit: 0, credit: netSales, description: "Restaurant sales revenue" });
    if (Number(sale.tax || 0) > 0) journalLines.push({ accountId: a.vat, debit: 0, credit: money(sale.tax), description: "Restaurant output VAT" });
    if (ingredientCost > 0) {
      journalLines.push({ accountId: a.cogs, debit: ingredientCost, credit: 0, description: "Restaurant cost of sales" });
      journalLines.push({ accountId: a.inventory, debit: 0, credit: ingredientCost, description: "Restaurant inventory consumed" });
    }
    const je = await journal(tx, uid, "RPOS:" + orderNo, "Restaurant sale " + orderNo, businessDate, journalLines);
    await tx.unsafe("UPDATE restaurant_orders SET journal_entry_id=$1 WHERE id=$2 AND user_id=$3", [je, orderId, uid]);

    if (sale.table_id) {
      await tx.unsafe("UPDATE restaurant_tables SET status='dirty',occupied_since=NULL,current_order_id=NULL WHERE id=$1 AND user_id=$2", [sale.table_id, uid]);
    }

    await tx.unsafe(
      "INSERT INTO zra_invoice_queue(id,user_id,tenant_id,source_type,source_id,invoice_number,total,vat_amount,status,payload,attempt_count,updated_at) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,'restaurant_sale',$3,$4,$5,$6,'pending',$7,0,now())",
      [id(), uid, orderId, orderNo, total, money(sale.tax), JSON.stringify({ source: "cloud_restaurant", orderId, orderNo, total })],
    );
    const b = await batch(tx, uid, "RESTAURANT_CHECKOUT", "restaurant_order", orderId, clientRef || orderNo);
    await tx.unsafe("UPDATE cloud_transaction_batches SET source_id=$1,total_debit=$2,total_credit=$2,metadata_json=$3,updated_at=now() WHERE id=$4", [orderId, money(total + ingredientCost), money(total + ingredientCost), JSON.stringify({ orderNo, total, ingredientCost, journalEntryId: je }), b.id]);
    await event(tx, uid, b.id, "POSTED", "Restaurant sale posted atomically", { orderId, orderNo, total, ingredientCost, journalEntryId: je });
    return { orderId, orderNo, journalEntryId: je, total, ingredientCost, duplicate: false };
  });
}

export async function cloudPostInvoice(uid: string, args: any) {
  const h = args?._invoice || {};
  const items = Array.isArray(args?._items) ? args._items : [];
  if (!h.number) throw new Error("INVOICE_NUMBER_REQUIRED");
  if (!items.length) throw new Error("INVOICE_ITEMS_REQUIRED");
  return getCloudDb().begin(async (tx: Tx) => {
    await setUser(tx, uid);
    const b = await batch(tx, uid, "SALES_INVOICE", "invoice", null, String(h.client_ref || h.number));
    if (b.duplicate) return { invoice_id: b.sourceId, duplicate: true, transaction_id: b.id };
    let subtotal=0, vat=0;
    const taxInclusive=h.tax_inclusive!==false;
    for(const x of items){
      const qty=Number(x.quantity), price=Number(x.unit_price), rate=Number(x.vat_rate ?? 16);
      if(!(qty>0)||!(price>=0)||!(rate>=0)) throw new Error("INVALID_INVOICE_LINE");
      const gross=money(qty*price);
      const tax=taxInclusive?money(gross-gross/(1+rate/100)):money(gross*rate/100);
      subtotal+=taxInclusive?money(gross-tax):gross; vat+=tax;
    }
    subtotal=money(subtotal); vat=money(vat); const total=money(subtotal+vat); const invoiceId=id();
    await tx.unsafe("INSERT INTO invoices(id,user_id,tenant_id,customer_id,number,issue_date,due_date,status,currency,subtotal,vat_amount,total,amount_paid,balance_due,seller_tpin,buyer_tpin,notes,exchange_rate) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,'posted',$7,$8,$9,$10,0,$10,$11,$12,$13,1)",[invoiceId,uid,h.customer_id||null,h.number,dateOnly(h.issue_date),h.due_date||null,h.currency||"ZMW",subtotal,vat,total,h.seller_tpin||null,h.buyer_tpin||null,h.notes||null]);
    for(const x of items){
      const qty=Number(x.quantity), price=Number(x.unit_price), rate=Number(x.vat_rate ?? 16), line=money(qty*price), stockItemId=x.stock_item_id||null;
      await tx.unsafe("INSERT INTO invoice_items(id,user_id,tenant_id,invoice_id,stock_item_id,description,hs_code,quantity,unit_price,vat_rate,line_total) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,$9,$10)",[id(),uid,invoiceId,stockItemId,x.description||"Item",x.hs_code||null,qty,price,rate,line]);
      if(stockItemId){
        const item=await one(tx,"SELECT * FROM stock_items WHERE id=$1 AND user_id=$2 FOR UPDATE",[stockItemId,uid]);
        if(!item) throw new Error("UNKNOWN_ITEM");
        if(Number(item.quantity_on_hand||0)<qty) throw new Error("INSUFFICIENT_STOCK:"+item.name);
        const movement = prepareInventoryMovement({
          itemId: String(stockItemId),
          movementType: "SALE",
          quantityDelta: -qty,
          unitCost: Number(item.cost_price || 0),
          reference: h.number,
          note: "Sales invoice",
        });
        await tx.unsafe("UPDATE stock_items SET quantity_on_hand=quantity_on_hand-$1,updated_at=now() WHERE id=$2 AND user_id=$3",[qty,stockItemId,uid]);
        await tx.unsafe("INSERT INTO stock_movements(id,user_id,tenant_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id,total_cost) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,'SALE',$4,$5,$6,$7,$8,$9)",[id(),uid,movement.itemId,movement.quantityDelta,movement.unitCost,movement.reference,movement.note,x.location_id||item.warehouse_id||null,movement.totalCost]);
      }
    }
    const a=await accounts(tx,uid);
    const je=await journal(tx,uid,"INV:"+h.number,"Sales invoice "+h.number,dateOnly(h.issue_date),[
      {accountId:a.receivable,debit:total,credit:0,description:"Accounts receivable"},
      {accountId:a.revenue,debit:0,credit:subtotal,description:"Sales revenue"},
      ...(vat>0?[{accountId:a.vat,debit:0,credit:vat,description:"VAT output"}]:[]),
    ]);
    await tx.unsafe("INSERT INTO zra_invoice_queue(id,user_id,tenant_id,source_type,source_id,invoice_number,total,vat_amount,status,payload,attempt_count,updated_at) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,'invoice',$3,$4,$5,$6,'pending',$7,0,now())",[id(),uid,invoiceId,h.number,total,vat,JSON.stringify({source:"cloud_invoice",invoiceId,invoiceNumber:h.number,total,vat})]);
    await tx.unsafe("UPDATE cloud_transaction_batches SET source_id=$1,total_debit=$2,total_credit=$2,metadata_json=$3,updated_at=now() WHERE id=$4",[invoiceId,total,total,JSON.stringify({number:h.number,total,vat,journalEntryId:je}),b.id]);
    await event(tx,uid,b.id,"POSTED","Sales invoice posted atomically",{invoiceId,number:h.number,total,vat,journalEntryId:je});
    return {invoice_id:invoiceId,journal_entry_id:je,total,vat,transaction_id:b.id,duplicate:false};
  });
}

export async function cloudPostPurchaseBill(uid: string, args: any) {
  const h = args?._bill || {};
  const items = Array.isArray(args?._items) ? args._items : [];
  if (!h.bill_number) throw new Error("BILL_NUMBER_REQUIRED");
  if (!items.length) throw new Error("BILL_ITEMS_REQUIRED");
  return getCloudDb().begin(async (tx: Tx) => {
    await setUser(tx, uid);
    const b = await batch(tx, uid, "PURCHASE_BILL", "bill", null, String(h.client_ref || h.bill_number));
    if (b.duplicate) return { bill_id: b.sourceId, duplicate: true, transaction_id: b.id };
    let subtotal = 0, tax = 0;
    const resolved: any[] = [];
    for (const x of items) {
      const qty = Number(x.quantity), price = Number(x.unit_price);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) throw new Error("INVALID_BILL_LINE");
      const line = money(qty * price), t = money(line * Number(x.tax_rate ?? 0) / 100);
      subtotal += line; tax += t; resolved.push({ ...x, qty, price, line, tax: t });
    }
    subtotal = money(subtotal); tax = money(tax); const total = money(subtotal + tax); const billId = id();
    await tx.unsafe("INSERT INTO bills(id,user_id,tenant_id,supplier_id,po_id,bill_number,supplier_invoice_number,bill_date,due_date,status,subtotal,tax_amount,total,amount_paid,balance_due,currency,notes,exchange_rate) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,'unpaid',$9,$10,$11,0,$11,$12,$13,1)", [billId, uid, h.supplier_id || null, h.po_id || null, h.bill_number, h.supplier_invoice_number || null, dateOnly(h.bill_date), h.due_date || null, subtotal, tax, total, h.currency || "ZMW", h.notes || null]);
    for (const x of resolved) {
      await tx.unsafe("INSERT INTO bill_items(id,user_id,tenant_id,bill_id,item_id,description,quantity,unit_price,tax_rate,line_total) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,$9)", [id(), uid, billId, x.item_id || null, x.description || "Item", x.qty, x.price, Number(x.tax_rate || 0), x.line]);
      if (x.item_id) {
        const item = await one(tx, "SELECT * FROM stock_items WHERE id=$1 AND user_id=$2 FOR UPDATE", [x.item_id, uid]);
        if (!item) throw new Error("UNKNOWN_ITEM");
        const movement = prepareInventoryMovement({
          itemId: String(x.item_id),
          movementType: "PURCHASE",
          quantityDelta: x.qty,
          unitCost: x.price,
          reference: h.bill_number,
          note: "Purchase receipt",
        });
        await tx.unsafe("UPDATE stock_items SET quantity_on_hand=quantity_on_hand+$1,updated_at=now() WHERE id=$2 AND user_id=$3", [movement.quantityDelta, x.item_id, uid]);
        await tx.unsafe("INSERT INTO stock_movements(id,user_id,tenant_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id,total_cost) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,'PURCHASE',$4,$5,$6,$7,$8,$9)", [id(), uid, movement.itemId, movement.quantityDelta, movement.unitCost, movement.reference, movement.note, h.location_id || item.warehouse_id || null, movement.totalCost]);
      }
    }
    const a = await accounts(tx, uid);
    const je = await journal(tx, uid, "BILL:" + h.bill_number, "Supplier bill " + h.bill_number, dateOnly(h.bill_date), [
      { accountId: a.inventory, debit: subtotal, credit: 0, description: "Inventory purchase" },
      ...(tax > 0 ? [{ accountId: a.inputVat, debit: tax, credit: 0, description: "VAT input" }] : []),
      { accountId: a.payable, debit: 0, credit: total, description: "Accounts payable" },
    ]);
    await tx.unsafe("UPDATE cloud_transaction_batches SET source_id=$1,total_debit=$2,total_credit=$2,metadata_json=$3,updated_at=now() WHERE id=$4", [billId, total, total, JSON.stringify({ billNumber: h.bill_number, total, tax, journalEntryId: je }), b.id]);
    await event(tx, uid, b.id, "POSTED", "Purchase bill posted atomically", { billId, number: h.bill_number, total, tax, journalEntryId: je });
    return { bill_id: billId, journal_entry_id: je, total, tax, transaction_id: b.id, duplicate: false };
  });
}

export async function cloudRecordBillPayment(uid: string, args: any) {
  const h = args?._payment || {};
  const billId = String(h.bill_id || ""), amount = money(h.amount);
  if (!billId || amount <= 0) throw new Error("INVALID_BILL_PAYMENT");
  return getCloudDb().begin(async (tx: Tx) => {
    await setUser(tx, uid);
    const bill = await one(tx, "SELECT * FROM bills WHERE id=$1 AND user_id=$2 FOR UPDATE", [billId, uid]);
    if (!bill) throw new Error("BILL_NOT_FOUND");
    const balance = money(bill.balance_due);
    if (amount > balance + 0.01) throw new Error("PAYMENT_EXCEEDS_BILL_BALANCE");
    const b = await batch(tx, uid, "BILL_PAYMENT", "bill_payment", billId, String(h.client_ref || h.payment_number || id()));
    if (b.duplicate) return { payment_id: b.sourceId, duplicate: true, transaction_id: b.id };
    const paymentId = id();
    await tx.unsafe("INSERT INTO bill_payments(id,user_id,tenant_id,bill_id,supplier_id,payment_number,payment_date,amount,payment_method,reference,notes,currency,exchange_rate,bank_account_id) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12)", [paymentId, uid, billId, bill.supplier_id || null, h.payment_number || "BP-" + Date.now(), dateOnly(h.payment_date), amount, h.payment_method || "bank", h.reference || null, h.notes || null, h.currency || bill.currency || "ZMW", h.bank_account_id || null]);
    const newPaid = money(Number(bill.amount_paid || 0) + amount), newBalance = money(balance - amount);
    await tx.unsafe("UPDATE bills SET amount_paid=$1,balance_due=$2,status=$3,updated_at=now() WHERE id=$4", [newPaid, newBalance, newBalance <= 0.01 ? "paid" : "part_paid", billId]);
    const a = await accounts(tx, uid);
    const je = await journal(tx, uid, "BILLPAY:" + paymentId, "Payment for supplier bill " + bill.bill_number, dateOnly(h.payment_date), [
      { accountId: a.payable, debit: amount, credit: 0, description: "Accounts payable settlement" },
      { accountId: a.cash, debit: 0, credit: amount, description: "Cash / bank payment" },
    ]);
    await tx.unsafe("UPDATE cloud_transaction_batches SET source_id=$1,total_debit=$2,total_credit=$2,metadata_json=$3,updated_at=now() WHERE id=$4", [paymentId, amount, amount, JSON.stringify({ billId, amount, journalEntryId: je }), b.id]);
    await event(tx, uid, b.id, "POSTED", "Supplier payment posted atomically", { paymentId, billId, amount, journalEntryId: je });
    return { payment_id: paymentId, journal_entry_id: je, transaction_id: b.id, duplicate: false, new_balance: newBalance };
  });
}

export async function cloudPostCreditNote(uid: string, args: any) {
  const h = args?._credit_note || {}, items = Array.isArray(args?._items) ? args._items : [];
  if (!h.number || !items.length) throw new Error("CREDIT_NOTE_DATA_REQUIRED");
  return getCloudDb().begin(async (tx: Tx) => {
    await setUser(tx, uid);
    const b = await batch(tx, uid, "CREDIT_NOTE", "credit_note", null, String(h.client_ref || h.number));
    if (b.duplicate) return { credit_note_id: b.sourceId, duplicate: true, transaction_id: b.id };
    let subtotal = 0, vat = 0;
    for (const x of items) { const line = money(Number(x.quantity) * Number(x.unit_price)); subtotal += line; vat += money(line * Number(x.vat_rate ?? 16) / 100); }
    subtotal = money(subtotal); vat = money(vat); const total = money(subtotal + vat), noteId = id();
    await tx.unsafe("INSERT INTO credit_notes(id,user_id,tenant_id,customer_id,invoice_id,number,issue_date,currency,reason,subtotal,vat_amount,total,status,notes,exchange_rate) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,'posted',$12,1)", [noteId, uid, h.customer_id || null, h.invoice_id || null, h.number, dateOnly(h.issue_date), h.currency || "ZMW", h.reason || null, subtotal, vat, total, h.notes || null]);
    for (const x of items) {
      await tx.unsafe("INSERT INTO credit_note_items(id,user_id,tenant_id,credit_note_id,stock_item_id,description,quantity,unit_price,vat_rate,line_total) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,$4,$5,$6,$7,$8,$9)", [id(), uid, noteId, x.stock_item_id || null, x.description || "Item", Number(x.quantity), Number(x.unit_price), Number(x.vat_rate ?? 16), money(Number(x.quantity) * Number(x.unit_price))]);
      if (x.stock_item_id) {
        const item = await one(tx, "SELECT * FROM stock_items WHERE id=$1 AND user_id=$2 FOR UPDATE", [x.stock_item_id, uid]);
        if (item) {
          await tx.unsafe("UPDATE stock_items SET quantity_on_hand=quantity_on_hand+$1,updated_at=now() WHERE id=$2 AND user_id=$3", [Number(x.quantity), x.stock_item_id, uid]);
          await tx.unsafe("INSERT INTO stock_movements(id,user_id,tenant_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,'RETURN',$4,$5,$6,$7,$8)", [id(), uid, x.stock_item_id, Number(x.quantity), Number(item.cost_price || 0), h.number, "Credit note return", h.location_id || item.warehouse_id || null]);
        }
      }
    }
    const a = await accounts(tx, uid);
    const je = await journal(tx, uid, "CN:" + h.number, "Credit note " + h.number, dateOnly(h.issue_date), [
      { accountId: a.revenue, debit: subtotal, credit: 0, description: "Sales reversal" },
      ...(vat > 0 ? [{ accountId: a.vat, debit: vat, credit: 0, description: "VAT reversal" }] : []),
      { accountId: a.receivable, debit: 0, credit: total, description: "Customer credit" },
    ]);
    await tx.unsafe("INSERT INTO zra_invoice_queue(id,user_id,tenant_id,source_type,source_id,invoice_number,total,vat_amount,status,payload,attempt_count,updated_at) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,'credit_note',$3,$4,$5,$6,'pending',$7,0,now())", [id(), uid, noteId, h.number, total, vat, JSON.stringify({ source: "cloud_credit_note", creditNoteId: noteId, number: h.number, total, vat })]);
    await tx.unsafe("UPDATE cloud_transaction_batches SET source_id=$1,total_debit=$2,total_credit=$2,metadata_json=$3,updated_at=now() WHERE id=$4", [noteId, total, total, JSON.stringify({ number: h.number, total, vat, journalEntryId: je }), b.id]);
    await event(tx, uid, b.id, "POSTED", "Credit note posted atomically", { creditNoteId: noteId, number: h.number, total, vat, journalEntryId: je });
    return { credit_note_id: noteId, journal_entry_id: je, total, vat, transaction_id: b.id, duplicate: false };
  });
}

export async function cloudReversePosSale(uid: string, args: any) {
  const saleId = String(args?._sale_id || ""), action = String(args?._action || "void"), reason = String(args?._reason || "");
  if (!saleId || !reason) throw new Error("REVERSAL_REASON_REQUIRED");
  return getCloudDb().begin(async (tx: Tx) => {
    await setUser(tx, uid);
    const sale = await one(tx, "SELECT * FROM pos_sales WHERE id=$1 AND user_id=$2 FOR UPDATE", [saleId, uid]);
    if (!sale) throw new Error("SALE_NOT_FOUND");
    if (["voided", "refunded"].includes(String(sale.status))) return saleId;
    const fiscal = await one(tx, "SELECT status FROM zra_invoice_queue WHERE source_type='pos_sale' AND source_id=$1 ORDER BY updated_at DESC LIMIT 1", [saleId]);
    if (fiscal && ["submitted", "fiscalized"].includes(String(fiscal.status))) throw new Error("FISCALIZED_SALE_REQUIRES_ZRA_CORRECTION_WORKFLOW");
    const b = await batch(tx, uid, "POS_REVERSAL", "pos_sale", saleId, "reverse:" + saleId);
    if (b.duplicate) return saleId;
    const lines = await many(tx, "SELECT * FROM pos_sale_items WHERE sale_id=$1 AND user_id=$2", [saleId, uid]);
    for (const line of lines) {
      if (!line.item_id) continue;
      const item = await one(tx, "SELECT * FROM stock_items WHERE id=$1 AND user_id=$2 FOR UPDATE", [line.item_id, uid]);
      if (!item) continue;
      await tx.unsafe("UPDATE stock_items SET quantity_on_hand=quantity_on_hand+$1,updated_at=now() WHERE id=$2 AND user_id=$3", [Number(line.qty), line.item_id, uid]);
      await tx.unsafe("INSERT INTO stock_movements(id,user_id,tenant_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id) VALUES($1,$2,current_setting('app.tenant_id',true)::uuid,$3,'RETURN',$4,$5,$6,$7,$8)", [id(), uid, line.item_id, Number(line.qty), Number(line.unit_cost || item.cost_price || 0), sale.sale_no, reason, sale.location_id || item.warehouse_id || null]);
    }
    if (sale.journal_entry_id) {
      const old = await one(tx, "SELECT * FROM journal_entries WHERE id=$1 AND user_id=$2", [sale.journal_entry_id, uid]);
      if (old) {
        const oldLines = await many(tx, "SELECT * FROM journal_lines WHERE entry_id=$1 AND user_id=$2", [old.id, uid]);
        const reversal = oldLines.map((l: any) => ({ accountId: String(l.account_id), debit: Number(l.credit || 0), credit: Number(l.debit || 0), description: "Reversal: " + (l.description || "") }));
        await journal(tx, uid, "REV:" + sale.sale_no, "Reversal of POS sale " + sale.sale_no, dateOnly(), reversal);
      }
    }
    const status = action === "refund" ? "refunded" : "voided";
    await tx.unsafe("UPDATE pos_sales SET status=$1,void_reason=$2,updated_at=now() WHERE id=$3", [status, reason, saleId]);
    if (action === "refund") await tx.unsafe("INSERT INTO cloud_payment_refunds(tenant_id,user_id,sale_id,amount,method,reference,reason) VALUES(current_setting('app.tenant_id',true)::uuid,$1,$2,$3,$4,$5,$6)", [uid, saleId, Number(sale.total || 0), args._refund_method || "cash", "REF-" + sale.sale_no, reason]);
    await event(tx, uid, b.id, "POSTED", "POS " + status + " posted atomically", { saleId, action, reason });
    return saleId;
  });
}
