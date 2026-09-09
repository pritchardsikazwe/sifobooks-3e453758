import { supabase } from "@/integrations/supabase/client";

async function ensureBankAccount(userId: string): Promise<string | null> {
  const { data } = await supabase.from("chart_of_accounts").select("id, account_code")
    .eq("user_id", userId).eq("account_code", "1000").maybeSingle();
  if (data) return data.id;
  const { data: created } = await supabase.from("chart_of_accounts").insert({
    user_id: userId, account_code: "1000", account_name: "Cash & Bank", account_type: "asset", is_active: true,
    is_cash_bank: true, reconciliation_required: true,
  } as any).select("id").single();
  return created?.id ?? null;
}

async function atomicPost(opts: {
  userId: string; entryNumber: string; entryDate: string; reference: string; description: string;
  lines: Array<{ accountId: string; debit: number; credit: number; description: string }>;
}) {
  const { data, error } = await (supabase as any).rpc("post_journal_entry", {
    _user_id: opts.userId, _entry_number: opts.entryNumber, _entry_date: opts.entryDate,
    _reference: opts.reference, _description: opts.description,
    _lines: opts.lines.map(l => ({ account_id: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description })),
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, entryId: data as string };
}

export async function postBankAllocation(opts: {
  userId: string;
  txn: { id: string; txn_date: string; amount: number; description: string | null; reference: string | null };
  accountId: string; amount?: number; memo?: string; targetType?: string; targetId?: string; targetRef?: string;
}) {
  const bankId = await ensureBankAccount(opts.userId);
  if (!bankId) return { ok: false, error: "Bank account missing" };
  const txnAmt = Math.abs(Number(opts.txn.amount));
  if (!txnAmt) return { ok: false, error: "Zero amount" };

  const { data: existing } = await supabase.from("bank_allocations").select("amount")
    .eq("bank_txn_id", opts.txn.id).eq("is_reversed", false);
  const already = (existing ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const remaining = Math.max(0, txnAmt - already);
  const amt = Number((opts.amount ?? remaining).toFixed(2));
  if (amt <= 0) return { ok: false, error: "Nothing left to allocate" };
  if (amt > remaining + 0.005) return { ok: false, error: `Amount exceeds remaining ${remaining.toFixed(2)}` };

  const isInflow = Number(opts.txn.amount) > 0;
  const shortId = opts.txn.id.slice(0, 8);
  const ref = `BANK:${shortId}:${Date.now().toString(36)}`;
  const lines = isInflow
    ? [{ accountId: bankId, debit: amt, credit: 0, description: "Bank inflow" }, { accountId: opts.accountId, debit: 0, credit: amt, description: opts.memo || "Allocation" }]
    : [{ accountId: opts.accountId, debit: amt, credit: 0, description: opts.memo || "Allocation" }, { accountId: bankId, debit: 0, credit: amt, description: "Bank outflow" }];

  const posted = await atomicPost({ userId: opts.userId, entryNumber: `JE-${ref}`, entryDate: opts.txn.txn_date,
    reference: ref, description: opts.memo || opts.txn.description || `Bank txn ${opts.txn.reference ?? ""}`, lines });
  if (!posted.ok) return posted;

  const { data: alloc, error: ae } = await supabase.from("bank_allocations").insert({
    user_id: opts.userId, bank_txn_id: opts.txn.id, target_type: opts.targetType ?? "account", target_id: opts.targetId ?? null,
    target_ref: opts.targetRef ?? null, amount: amt, memo: opts.memo ?? null, reference: ref, journal_entry_id: posted.entryId, allocated_by: opts.userId,
  }).select("id").single();
  if (ae) return { ok: false, error: ae.message };
  return { ok: true, entryId: posted.entryId, allocationId: alloc?.id, amount: amt, remaining: remaining - amt };
}

export async function reverseBankAllocation(allocationId: string, reason: string) {
  const { data, error } = await supabase.rpc("reverse_bank_allocation", { _alloc_id: allocationId, _reason: reason });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function postSpendMoney(opts: {
  userId: string; bankAccountId: string; txnDate: string; amount: number; supplierName?: string;
  paymentMethod?: string; reference: string; memo?: string;
  allocations: Array<{ accountId: string; amount: number; side: "DR" | "CR"; description?: string }>;
}) {
  const isSpend = opts.amount > 0;
  const total = Math.abs(opts.amount);
  const allocSum = opts.allocations.reduce((s, a) => s + Math.abs(a.amount), 0);
  if (Math.abs(allocSum - total) > 0.01) return { ok: false, error: `Allocations (${allocSum.toFixed(2)}) must equal amount (${total.toFixed(2)})` };
  if (!opts.allocations.length) return { ok: false, error: "Add at least one allocation line" };

  const bankId = await ensureBankAccount(opts.userId);
  if (!bankId) return { ok: false, error: "Bank GL account missing" };

  const signed = isSpend ? -total : total;
  const { data: txn, error: txErr } = await supabase.from("bank_transactions").insert({
    user_id: opts.userId, bank_account_id: opts.bankAccountId, txn_date: opts.txnDate,
    description: opts.memo || opts.supplierName || "Payment", amount: signed,
    reference: opts.reference, payee: opts.supplierName ?? null, source_file: "manual",
  } as any).select("id").single();
  if (txErr || !txn) return { ok: false, error: txErr?.message ?? "Bank txn failed" };

  const bankLine = isSpend
    ? { accountId: bankId, debit: 0, credit: total, description: "Bank outflow" }
    : { accountId: bankId, debit: total, credit: 0, description: "Bank inflow" };
  const allocLines = opts.allocations.map(a => ({
    accountId: a.accountId, debit: a.side === "DR" ? Math.abs(a.amount) : 0,
    credit: a.side === "CR" ? Math.abs(a.amount) : 0, description: a.description || opts.memo || "Allocation",
  }));
  const posted = await atomicPost({ userId: opts.userId, entryNumber: `JE-${opts.reference}`, entryDate: opts.txnDate,
    reference: opts.reference, description: opts.memo || `${isSpend ? "Payment" : "Receipt"} ${opts.supplierName ?? ""}`.trim(),
    lines: [bankLine, ...allocLines] });
  if (!posted.ok) return posted;
  return { ok: true, txnId: txn.id, entryId: posted.entryId };
}
