import { supabase } from "@/integrations/supabase/client";

async function getBankGlAccount(userId: string, bankAccountId?: string | null): Promise<string | null> {
  if (bankAccountId) {
    const { data } = await supabase
      .from("bank_accounts")
      .select("gl_account_id")
      .eq("id", bankAccountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.gl_account_id) return data.gl_account_id;
  }

  const { data } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_code", "1000")
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Allocate part or all of a bank transaction to a counter account.
 * The bank side is posted to the actual bank account's GL mapping rather
 * than silently using the generic Cash account.
 */
export async function postBankAllocation(opts: {
  userId: string;
  txn: { id: string; txn_date: string; amount: number; description: string | null; reference: string | null };
  accountId: string;
  amount?: number;
  memo?: string;
  targetType?: string;
  targetId?: string;
  targetRef?: string;
}) {
  const { data: txnRow } = await supabase
    .from("bank_transactions")
    .select("bank_account_id")
    .eq("id", opts.txn.id)
    .eq("user_id", opts.userId)
    .maybeSingle();
  const bankId = await getBankGlAccount(opts.userId, txnRow?.bank_account_id);
  if (!bankId) return { ok: false, error: "Bank GL account missing" };

  const txnAmt = Math.abs(Number(opts.txn.amount));
  if (!txnAmt) return { ok: false, error: "Zero amount" };

  const { data: existing } = await supabase.from("bank_allocations")
    .select("amount").eq("bank_txn_id", opts.txn.id).eq("is_reversed", false);
  const already = (existing ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const remaining = Math.max(0, txnAmt - already);
  const amt = Number((opts.amount ?? remaining).toFixed(2));
  if (amt <= 0) return { ok: false, error: "Nothing left to allocate" };
  if (amt > remaining + 0.005) return { ok: false, error: `Amount exceeds remaining ${remaining.toFixed(2)}` };

  const isInflow = Number(opts.txn.amount) > 0;
  const shortId = opts.txn.id.slice(0, 8);
  const ref = `BANK:${shortId}:${Date.now().toString(36)}`;

  const { data: entry, error } = await supabase.from("journal_entries").insert({
    user_id: opts.userId,
    entry_number: `JE-${ref}`,
    entry_date: opts.txn.txn_date,
    reference: ref,
    description: opts.memo || opts.txn.description || `Bank txn ${opts.txn.reference ?? ""}`,
    status: "posted",
    total_debit: amt,
    total_credit: amt,
  }).select("id").single();
  if (error || !entry) return { ok: false, error: error?.message ?? "JE failed" };

  const lines = isInflow
    ? [
        { account_id: bankId, debit: amt, credit: 0, description: "Bank inflow" },
        { account_id: opts.accountId, debit: 0, credit: amt, description: opts.memo || "Allocation" },
      ]
    : [
        { account_id: opts.accountId, debit: amt, credit: 0, description: opts.memo || "Allocation" },
        { account_id: bankId, debit: 0, credit: amt, description: "Bank outflow" },
      ];

  const { error: le } = await supabase.from("journal_lines").insert(
    lines.map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })),
  );
  if (le) return { ok: false, error: le.message };

  const { data: alloc, error: ae } = await supabase.from("bank_allocations").insert({
    user_id: opts.userId,
    bank_txn_id: opts.txn.id,
    target_type: opts.targetType ?? "account",
    target_id: opts.targetId ?? null,
    target_ref: opts.targetRef ?? null,
    amount: amt,
    memo: opts.memo ?? null,
    reference: ref,
    journal_entry_id: entry.id,
    allocated_by: opts.userId,
  }).select("id").single();
  if (ae) return { ok: false, error: ae.message };

  return { ok: true, entryId: entry.id, allocationId: alloc?.id, amount: amt, remaining: remaining - amt };
}

export async function reverseBankAllocation(allocationId: string, reason: string) {
  const { data, error } = await supabase.rpc("reverse_bank_allocation", {
    _alloc_id: allocationId, _reason: reason,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

/**
 * Sage-style "Spend Money" or "Receive Money" transaction.
 * Uses the selected bank_accounts.gl_account_id for the bank side.
 */
export async function postSpendMoney(opts: {
  userId: string;
  bankAccountId: string;
  txnDate: string;
  amount: number;
  supplierName?: string;
  paymentMethod?: string;
  reference: string;
  memo?: string;
  allocations: Array<{
    accountId: string;
    amount: number;
    side: "DR" | "CR";
    description?: string;
  }>;
}) {
  const isSpend = opts.amount > 0;
  const total = Math.abs(opts.amount);
  const allocSum = opts.allocations.reduce((s, a) => s + Math.abs(a.amount), 0);
  if (Math.abs(allocSum - total) > 0.01)
    return { ok: false, error: `Allocations (${allocSum.toFixed(2)}) must equal amount (${total.toFixed(2)})` };
  if (!opts.allocations.length) return { ok: false, error: "Add at least one allocation line" };

  const bankId = await getBankGlAccount(opts.userId, opts.bankAccountId);
  if (!bankId) return { ok: false, error: "Selected bank account has no GL mapping" };

  const signed = isSpend ? -total : total;
  const { data: txn, error: txErr } = await supabase.from("bank_transactions").insert({
    user_id: opts.userId,
    bank_account_id: opts.bankAccountId,
    txn_date: opts.txnDate,
    description: opts.memo || opts.supplierName || "Payment",
    amount: signed,
    reference: opts.reference,
    payee: opts.supplierName ?? null,
    source_file: "manual",
  } as any).select("id").single();
  if (txErr || !txn) return { ok: false, error: txErr?.message ?? "Bank txn failed" };

  const { data: entry, error: jeErr } = await supabase.from("journal_entries").insert({
    user_id: opts.userId,
    entry_number: `JE-${opts.reference}`,
    entry_date: opts.txnDate,
    reference: opts.reference,
    description: opts.memo || `${isSpend ? "Payment" : "Receipt"} ${opts.supplierName ?? ""}`.trim(),
    status: "posted",
    total_debit: total,
    total_credit: total,
  }).select("id").single();
  if (jeErr || !entry) return { ok: false, error: jeErr?.message ?? "JE failed" };

  const bankLine = isSpend
    ? { account_id: bankId, debit: 0, credit: total, description: "Bank outflow" }
    : { account_id: bankId, debit: total, credit: 0, description: "Bank inflow" };

  const allocLines = opts.allocations.map(a => ({
    account_id: a.accountId,
    debit: a.side === "DR" ? Math.abs(a.amount) : 0,
    credit: a.side === "CR" ? Math.abs(a.amount) : 0,
    description: a.description || opts.memo || "Allocation",
  }));

  const { error: leErr } = await supabase.from("journal_lines").insert(
    [bankLine, ...allocLines].map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })),
  );
  if (leErr) return { ok: false, error: leErr.message };

  return { ok: true, txnId: txn.id, entryId: entry.id };
}
