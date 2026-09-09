/**
 * SifoGuide — deterministic workflow intelligence.
 *
 * This layer never posts anything and never calculates balances of its own.
 * It reads live rows through the existing RLS-scoped client, applies plain
 * accounting rules, and produces "what needs attention" / "what to do next"
 * items that point at existing routes and services.
 *
 * Everything here must be explainable: each task states the database fact that
 * produced it. No demo tasks, no guesses.
 */
import { supabase } from "@/integrations/supabase/client";

export type TaskGroup = "attention" | "suggested";
export type TaskPriority = "high" | "medium" | "low";

export type WorkTask = {
  id: string;
  group: TaskGroup;
  priority: TaskPriority;
  title: string;
  /** Plain-language reason, straight from live data. */
  explanation: string;
  count?: number;
  amount?: number;
  actionLabel: string;
  actionUrl: string;
  iconName?: string;
};

export type WorkSnapshot = {
  currency: string;
  overdueInvoices: { count: number; amount: number };
  unpaidInvoices: { count: number; amount: number };
  unallocatedBank: { count: number };
  transfersInTransit: { count: number };
  transfersDraft: { count: number };
  countsAwaitingApproval: { count: number };
  overdueBills: { count: number; amount: number };
  lowStock: { count: number; sample?: string };
  payrollThisMonth: { exists: boolean; posted: boolean; month: string };
  complianceDue: { count: number; nextDue?: string; nextType?: string };
};

export const EMPTY_SNAPSHOT: WorkSnapshot = {
  currency: "ZMW",
  overdueInvoices: { count: 0, amount: 0 },
  unpaidInvoices: { count: 0, amount: 0 },
  unallocatedBank: { count: 0 },
  transfersInTransit: { count: 0 },
  transfersDraft: { count: 0 },
  countsAwaitingApproval: { count: 0 },
  overdueBills: { count: 0, amount: 0 },
  lowStock: { count: 0 },
  payrollThisMonth: { exists: false, posted: false, month: "" },
  complianceDue: { count: 0 },
};

/** Pure: turn live facts into an ordered work queue. Only real conditions produce tasks. */
export function buildWorkQueue(s: WorkSnapshot): WorkTask[] {
  const t: WorkTask[] = [];

  if (s.overdueInvoices.count > 0) {
    t.push({
      id: "invoices.overdue",
      group: "attention",
      priority: "high",
      title: `${s.overdueInvoices.count} overdue invoice${s.overdueInvoices.count === 1 ? "" : "s"}`,
      explanation: "These invoices passed their due date and are still unpaid. Chase the customer or record the payment if it already arrived.",
      count: s.overdueInvoices.count,
      amount: s.overdueInvoices.amount,
      actionLabel: "Review invoices",
      actionUrl: "/invoices",
      iconName: "ReceiptText",
    });
  }

  if (s.unallocatedBank.count > 0) {
    t.push({
      id: "bank.unallocated",
      group: "attention",
      priority: "high",
      title: `${s.unallocatedBank.count} bank transaction${s.unallocatedBank.count === 1 ? "" : "s"} not allocated`,
      explanation: "Money moved through the bank but has not been matched to an invoice, bill or account, so your ledger is incomplete.",
      count: s.unallocatedBank.count,
      actionLabel: "Allocate now",
      actionUrl: "/banking",
      iconName: "Landmark",
    });
  }

  if (s.countsAwaitingApproval.count > 0) {
    t.push({
      id: "stock.count.approval",
      group: "attention",
      priority: "high",
      title: `${s.countsAwaitingApproval.count} stock count awaiting approval`,
      explanation: "A count has been captured and the variance is waiting for a manager to approve before the adjustment can post.",
      count: s.countsAwaitingApproval.count,
      actionLabel: "Review variance",
      actionUrl: "/stock-counts",
      iconName: "ClipboardList",
    });
  }

  if (s.transfersInTransit.count > 0) {
    t.push({
      id: "inventory.transit",
      group: "attention",
      priority: "medium",
      title: `${s.transfersInTransit.count} transfer${s.transfersInTransit.count === 1 ? "" : "s"} still in transit`,
      explanation: "Stock has left the sending location but has not been received. Until it is received it sits in Stock in Transit, not at the outlet.",
      count: s.transfersInTransit.count,
      actionLabel: "Receive stock",
      actionUrl: "/inventory/transfers",
      iconName: "ArrowLeftRight",
    });
  }

  if (s.overdueBills.count > 0) {
    t.push({
      id: "bills.overdue",
      group: "attention",
      priority: "medium",
      title: `${s.overdueBills.count} supplier bill${s.overdueBills.count === 1 ? "" : "s"} overdue`,
      explanation: "These supplier bills are past their due date and still show a balance.",
      count: s.overdueBills.count,
      amount: s.overdueBills.amount,
      actionLabel: "Pay suppliers",
      actionUrl: "/bill-payments",
      iconName: "Wallet",
    });
  }

  if (s.lowStock.count > 0) {
    t.push({
      id: "inventory.low",
      group: "attention",
      priority: "medium",
      title: `${s.lowStock.count} item${s.lowStock.count === 1 ? "" : "s"} at or below reorder level`,
      explanation: s.lowStock.sample
        ? `Stock is running low — for example ${s.lowStock.sample}. Order or transfer more before you run out.`
        : "Stock is running low. Order or transfer more before you run out.",
      count: s.lowStock.count,
      actionLabel: "Plan replenishment",
      actionUrl: "/stock",
      iconName: "Boxes",
    });
  }

  if (s.complianceDue.count > 0) {
    t.push({
      id: "compliance.due",
      group: "attention",
      priority: "high",
      title: `${s.complianceDue.count} statutory deadline${s.complianceDue.count === 1 ? "" : "s"} within 30 days`,
      explanation: s.complianceDue.nextDue
        ? `Next up: ${s.complianceDue.nextType ?? "obligation"} due ${s.complianceDue.nextDue}. Prepare the return, review the evidence, then file and record the reference.`
        : "Statutory obligations are due soon. Prepare, file and record the reference.",
      count: s.complianceDue.count,
      actionLabel: "Open compliance",
      actionUrl: "/compliance",
      iconName: "ShieldCheck",
    });
  }

  if (s.transfersDraft.count > 0) {
    t.push({
      id: "inventory.draft-transfers",
      group: "suggested",
      priority: "low",
      title: `${s.transfersDraft.count} draft transfer${s.transfersDraft.count === 1 ? "" : "s"} not yet dispatched`,
      explanation: "A transfer was drafted but stock has not moved yet. Approve and dispatch it when the goods leave.",
      count: s.transfersDraft.count,
      actionLabel: "Open transfers",
      actionUrl: "/inventory/transfers",
      iconName: "ArrowLeftRight",
    });
  }

  if (!s.payrollThisMonth.exists) {
    t.push({
      id: "payroll.not-run",
      group: "suggested",
      priority: "medium",
      title: `Payroll for ${s.payrollThisMonth.month || "this month"} has not been created`,
      explanation: "No payroll run exists for the current month. Confirm attendance and timesheets, then calculate, review, approve and post.",
      actionLabel: "Start payroll",
      actionUrl: "/payroll",
      iconName: "Banknote",
    });
  } else if (!s.payrollThisMonth.posted) {
    t.push({
      id: "payroll.not-posted",
      group: "suggested",
      priority: "medium",
      title: `Payroll for ${s.payrollThisMonth.month} is not posted yet`,
      explanation: "The pay run exists but has not been approved and posted to the ledger, so wages and statutory liabilities are missing from your accounts.",
      actionLabel: "Review payroll",
      actionUrl: "/payroll",
      iconName: "Banknote",
    });
  }

  if (s.unpaidInvoices.count > 0 && s.overdueInvoices.count === 0) {
    t.push({
      id: "invoices.unpaid",
      group: "suggested",
      priority: "low",
      title: `${s.unpaidInvoices.count} invoice${s.unpaidInvoices.count === 1 ? "" : "s"} awaiting payment`,
      explanation: "Not overdue yet. Send a reminder or a statement so customers pay on time.",
      count: s.unpaidInvoices.count,
      amount: s.unpaidInvoices.amount,
      actionLabel: "Send statements",
      actionUrl: "/reports/customer-statement",
      iconName: "FileBarChart",
    });
  }

  const rank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  return t.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** Read the live facts behind the work queue. All reads are RLS scoped. */
export async function loadWorkSnapshot(): Promise<WorkSnapshot> {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const in30 = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const snap: WorkSnapshot = {
    ...EMPTY_SNAPSHOT,
    payrollThisMonth: { exists: false, posted: false, month: `${MONTH_NAMES[today.getMonth()]} ${year}` },
  };

  const [invRes, billRes, bankRes, trfRes, cntRes, stockRes, payRes, compRes] = await Promise.all([
    supabase.from("invoices").select("due_date,balance_due,status").gt("balance_due", 0).neq("status", "void"),
    supabase.from("bills").select("due_date,balance_due,status").gt("balance_due", 0),
    supabase.from("bank_transactions").select("id").eq("is_allocated", false).limit(1000),
    supabase.from("inventory_transfers").select("status"),
    supabase.from("stock_counts").select("status"),
    supabase.from("stock_items").select("name,quantity_on_hand,reorder_level,is_active").gt("reorder_level", 0).limit(1000),
    supabase.from("payroll_runs").select("status").eq("period_month", month).eq("period_year", year),
    supabase.from("compliance_obligations").select("obligation_type,due_date,status").gte("due_date", iso).lte("due_date", in30),
  ]);

  for (const r of invRes.data ?? []) {
    const amt = Number((r as any).balance_due) || 0;
    if ((r as any).due_date && (r as any).due_date < iso) {
      snap.overdueInvoices.count += 1;
      snap.overdueInvoices.amount += amt;
    } else {
      snap.unpaidInvoices.count += 1;
      snap.unpaidInvoices.amount += amt;
    }
  }

  for (const r of billRes.data ?? []) {
    if ((r as any).due_date && (r as any).due_date < iso) {
      snap.overdueBills.count += 1;
      snap.overdueBills.amount += Number((r as any).balance_due) || 0;
    }
  }

  snap.unallocatedBank.count = (bankRes.data ?? []).length;

  for (const r of trfRes.data ?? []) {
    const st = String((r as any).status ?? "").toLowerCase();
    if (st === "in_transit" || st === "dispatched") snap.transfersInTransit.count += 1;
    if (st === "draft") snap.transfersDraft.count += 1;
  }

  for (const r of cntRes.data ?? []) {
    const st = String((r as any).status ?? "").toLowerCase();
    if (st === "counted" || st === "pending_approval") snap.countsAwaitingApproval.count += 1;
  }

  for (const r of stockRes.data ?? []) {
    const row = r as any;
    if (row.is_active === false) continue;
    const qty = Number(row.quantity_on_hand) || 0;
    const level = Number(row.reorder_level) || 0;
    if (level > 0 && qty <= level) {
      snap.lowStock.count += 1;
      if (!snap.lowStock.sample) snap.lowStock.sample = row.name as string;
    }
  }

  const runs = payRes.data ?? [];
  snap.payrollThisMonth.exists = runs.length > 0;
  snap.payrollThisMonth.posted = runs.some((r: any) => ["posted", "paid", "completed"].includes(String(r.status ?? "").toLowerCase()));

  const comp = (compRes.data ?? []).filter((r: any) => !["filed", "closed", "completed"].includes(String(r.status ?? "").toLowerCase()));
  comp.sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date)));
  snap.complianceDue.count = comp.length;
  if (comp[0]) {
    snap.complianceDue.nextDue = (comp[0] as any).due_date;
    snap.complianceDue.nextType = (comp[0] as any).obligation_type;
  }

  return snap;
}
