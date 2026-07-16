import { supabase } from "@/integrations/supabase/client";

async function ensureBankAccount(userId: string): Promise<string | null> {
  const { data } = await supabase.from("chart_of_accounts").select("id, account_code")
    .eq("user_id", userId).eq("account_code", "1000").maybeSingle();
  if (data) return data.id;
  const { data: created } = await supabase.from("chart_of_accounts").insert({
    user_id: userId, account_code: "1000", account_name: "Cash & Bank",
    account_type: "asset", is_active: true,
  }).select("id").single();
  return created?.id ?? null;
}

/**
 * Allocate part or all of a bank transaction to a counter account.
 * Creates a journal entry AND a `bank_allocations` row. The DB trigger
 * updates bank_transactions.status (unallocated | partial | allocated)
 * and allocated_amount automatically.
 */
export async function postBankAllocation(opts: {
  userId: string;
  txn: { id: string; txn_date: string; amount: number; description: string | null; reference: string | null };
  accountId: string;
  amount?: number;     // optional partial amount; defaults to full remaining
  memo?: string;
  targetType?: string;
  targetId?: string;
  targetRef?: string;
}) {
  const bankId = await ensureBankAccount(opts.userId);
  if (!bankId) return { ok: false, error: "Bank account missing" };
  const txnAmt = Math.abs(Number(opts.txn.amount));
  if (!txnAmt) return { ok: false, error: "Zero amount" };

  // remaining balance
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
    total_debit: amt, total_credit: amt,
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
