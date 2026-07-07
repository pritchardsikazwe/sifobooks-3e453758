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

export async function postBankAllocation(opts: {
  userId: string;
  txn: { id: string; txn_date: string; amount: number; description: string | null; reference: string | null };
  accountId: string;   // the counter account (expense or revenue or other)
  memo?: string;
}) {
  const bankId = await ensureBankAccount(opts.userId);
  if (!bankId) return { ok: false, error: "Bank account missing" };
  const amt = Math.abs(Number(opts.txn.amount));
  if (!amt) return { ok: false, error: "Zero amount" };
  const isInflow = Number(opts.txn.amount) > 0;
  const ref = `BANK:${opts.txn.id.slice(0, 8)}`;

  const { data: prior } = await supabase.from("journal_entries")
    .select("id").eq("user_id", opts.userId).eq("reference", ref).maybeSingle();
  if (prior) return { ok: true, alreadyPosted: true, entryId: prior.id };

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

  await supabase.from("bank_transactions").update({
    reconciled: true, matched_type: "journal_entry", matched_id: entry.id,
    reconciled_at: new Date().toISOString(),
    category: opts.memo || null,
  }).eq("id", opts.txn.id);

  return { ok: true, entryId: entry.id };
}
