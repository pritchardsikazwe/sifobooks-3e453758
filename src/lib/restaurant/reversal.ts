// @ts-nocheck -- loosely typed after local-database port; see AGENTS.md
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { verifyToken } from "@/lib/db/auth";
import { getDb, generateUUID } from "@/lib/db/database";
import { nextDocumentNumber, recordAuditEvent } from "@/lib/compliance/governance";

function tokenFromRequest(explicit?: string | null) {
  try {
    const h = getRequest()?.headers.get("authorization");
    if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
    const local = getRequest()?.headers.get("x-sifobooks-auth");
    if (local) return local.trim();
  } catch {}
  return explicit || null;
}

export const reverseRestaurantSaleFn = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth])
  .inputValidator((raw: unknown) => raw as {
    orderId: string;
    action: "refund" | "void";
    reason: string;
    refundMethod?: string | null;
    authToken?: string | null;
  })
  .handler(async ({ data }) => {
    const token = tokenFromRequest(data.authToken);
    const auth = token ? await verifyToken(token) : null;
    if (!auth) return { data: null, error: { message: "NOT_AUTHENTICATED" } };

    const uid = auth.userId;
    const reason = String(data.reason || "").trim();
    if (reason.length < 3) return { data: null, error: { message: "REVERSAL_REASON_REQUIRED" } };

    const db = getDb();
    const approver = db.prepare(
      "SELECT role FROM user_roles WHERE user_id=? AND role IN ('owner','admin','manager','supervisor') LIMIT 1",
    ).get(uid) as any;
    const owner = db.prepare("SELECT id FROM companies WHERE user_id=? LIMIT 1").get(uid) as any;
    if (!approver && !owner) return { data: null, error: { message: "MANAGER_APPROVAL_REQUIRED" } };

    const order = db.prepare("SELECT * FROM restaurant_orders WHERE id=? AND user_id=? LIMIT 1").get(data.orderId, uid) as any;
    if (!order) return { data: null, error: { message: "RESTAURANT_ORDER_NOT_FOUND" } };
    if (order.status === "refunded" || order.status === "void") {
      return { data: null, error: { message: "RESTAURANT_ORDER_ALREADY_REVERSED" } };
    }
    if (order.status !== "paid" || !order.journal_entry_id) {
      return { data: null, error: { message: "ONLY_POSTED_PAID_CHECKS_CAN_BE_REFUNDED" } };
    }

    const result = db.transaction(() => {
      const reversalId = generateUUID();
      const prefix = data.action === "refund" ? "RRF" : "RVD";
      const reversalNo = nextDocumentNumber({ userId: uid, documentType: data.action === "refund" ? "RESTAURANT_REFUND" : "RESTAURANT_VOID", prefix, padding: 6 });
      const originalPayments = db.prepare(
        "SELECT * FROM restaurant_payments WHERE order_id=? AND user_id=? ORDER BY rowid",
      ).all(order.id, uid) as any[];
      const saleMovements = db.prepare(
        "SELECT * FROM stock_movements WHERE user_id=? AND reference=? AND movement_type IN ('sale','SALE')",
      ).all(uid, order.order_no) as any[];
      const originalJournal = db.prepare(
        "SELECT * FROM journal_entries WHERE id=? AND user_id=? LIMIT 1",
      ).get(order.journal_entry_id, uid) as any;
      if (!originalJournal) throw new Error("ORIGINAL_JOURNAL_NOT_FOUND");

      for (const movement of saleMovements) {
        const qty = Math.abs(Number(movement.quantity || 0));
        if (!(qty > 0)) continue;
        const stock = db.prepare("SELECT quantity_on_hand,warehouse_id,cost_price FROM stock_items WHERE id=? AND user_id=?").get(movement.item_id, uid) as any;
        if (!stock) continue;
        const nextQty = Number(stock.quantity_on_hand || 0) + qty;
        db.prepare("UPDATE stock_items SET quantity_on_hand=?,updated_at=datetime('now') WHERE id=? AND user_id=?")
          .run(nextQty, movement.item_id, uid);
        if (movement.location_id) {
          const balance = db.prepare("SELECT id,quantity FROM stock_balances WHERE user_id=? AND item_id=? AND location_id=? LIMIT 1")
            .get(uid, movement.item_id, movement.location_id) as any;
          const nextBalance = Number(balance?.quantity || 0) + qty;
          if (balance) db.prepare("UPDATE stock_balances SET quantity=?,updated_at=datetime('now') WHERE id=?").run(nextBalance, balance.id);
          else db.prepare("INSERT INTO stock_balances (id,user_id,item_id,location_id,quantity) VALUES (?,?,?,?,?)")
            .run(generateUUID(), uid, movement.item_id, movement.location_id, nextBalance);
        }
        db.prepare("INSERT INTO stock_movements (id,user_id,item_id,movement_type,quantity,unit_cost,reference,note,location_id) VALUES (?,?,?,?,?,?,?,?,?)")
          .run(generateUUID(), uid, movement.item_id, "return", qty, Number(movement.unit_cost || stock.cost_price || 0), reversalNo, reason, movement.location_id ?? stock.warehouse_id ?? null);
      }

      for (const payment of originalPayments) {
        const amount = Number(payment.amount || 0);
        if (!(amount > 0)) continue;
        db.prepare("INSERT INTO restaurant_payments (id,user_id,order_id,method,amount,tendered,change_given,reference) VALUES (?,?,?,?,?,?,?,?)")
          .run(generateUUID(), uid, order.id, payment.method, -amount, 0, 0, `REVERSAL:${reversalNo}`);
        if (String(payment.method || "").toLowerCase() === "cash" && payment.drawer_id) {
          db.prepare("UPDATE restaurant_cash_drawers SET cash_sales=MAX(0,cash_sales-?),expected_cash=expected_cash-?,updated_at=datetime('now') WHERE id=? AND user_id=?")
            .run(amount, amount, payment.drawer_id, uid);
        }
      }

      const reversalEntryId = generateUUID();
      const entryNo = nextDocumentNumber({ userId: uid, documentType: "JOURNAL", prefix: "JE", padding: 6 });
      db.prepare("INSERT INTO journal_entries (id,user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit,currency,exchange_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(reversalEntryId, uid, entryNo, new Date().toISOString().slice(0,10), `RPOS-REV:${order.id}`, `Restaurant ${data.action} ${order.order_no}`, "posted", Number(originalJournal.total_debit || 0), Number(originalJournal.total_credit || 0), originalJournal.currency || "ZMW", Number(originalJournal.exchange_rate || 1));

      const originalLines = db.prepare("SELECT * FROM journal_lines WHERE entry_id=? AND user_id=?").all(order.journal_entry_id, uid) as any[];
      for (const line of originalLines) {
        db.prepare("INSERT INTO journal_lines (id,user_id,entry_id,account_id,description,debit,credit) VALUES (?,?,?,?,?,?,?)")
          .run(generateUUID(), uid, reversalEntryId, line.account_id, `Reversal of ${line.description || order.order_no}`, Number(line.credit || 0), Number(line.debit || 0));
      }

      db.prepare("UPDATE restaurant_orders SET status=?,void_reason=?,closed_at=datetime('now') WHERE id=? AND user_id=? AND status='paid'")
        .run(data.action === "refund" ? "refunded" : "void", reason, order.id, uid);

      if (order.table_id) {
        db.prepare("UPDATE restaurant_tables SET status='dirty',occupied_since=NULL,current_order_id=NULL WHERE id=? AND user_id=?")
          .run(order.table_id, uid);
      }

      return { reversalId, reversalNo, reversalEntryId, orderId: order.id, orderNo: order.order_no, total: Number(order.total || 0) };
    });

    void recordAuditEvent({
      userId: uid,
      action: data.action === "refund" ? "RESTAURANT_REFUND_POSTED" : "RESTAURANT_VOID_POSTED",
      entityType: "restaurant_order",
      entityId: order.id,
      newValue: { reversalId: result.reversalId, reversalNo: result.reversalNo, reversalEntryId: result.reversalEntryId, reason, approvedBy: uid, total: result.total },
    });

    return { data: result, error: null };
  });
