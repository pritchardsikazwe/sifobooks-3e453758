import { supabase } from "@/integrations/supabase/client";

// Ensures baseline accounts exist and returns their IDs.
async function ensureAccounts(userId: string) {
  const defaults = [
    { code: "1100", name: "Accounts Receivable", type: "asset" },
    { code: "2200", name: "VAT Payable", type: "liability" },
    { code: "4000", name: "Sales Revenue", type: "revenue" },
    { code: "1000", name: "Cash & Bank", type: "asset" },
    { code: "5000", name: "Cost of Sales", type: "expense" },
    { code: "2100", name: "Accounts Payable", type: "liability" },
  ];
  const { data: existing } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map(a => a.account_code));
  const missing = defaults.filter(d => !have.has(d.code));
  if (missing.length) {
    await supabase.from("chart_of_accounts").insert(
      missing.map(m => ({
        user_id: userId, account_code: m.code, account_name: m.name,
        account_type: m.type, is_active: true,
      })),
    );
  }
  const { data: all } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code")
    .eq("user_id", userId);
  const map: Record<string, string> = {};
  (all ?? []).forEach(a => { map[a.account_code] = a.id; });
  return map;
}

export async function postInvoiceLedger(opts: {
  userId: string;
  invoiceId: string;
  number: string;
  issueDate: string;
  subtotal: number;
  vat: number;
  total: number;
  customerName?: string;
}) {
  const accounts = await ensureAccounts(opts.userId);
  const ref = `INV:${opts.number}`;

  // Skip if already posted
  const { data: prior } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("reference", ref)
    .maybeSingle();
  if (prior) return { ok: true, alreadyPosted: true };

  const { data: entry, error } = await supabase.from("journal_entries").insert({
    user_id: opts.userId,
    entry_number: `JE-${opts.number}`,
    entry_date: opts.issueDate,
    reference: ref,
    description: `Sales invoice ${opts.number}${opts.customerName ? ` — ${opts.customerName}` : ""}`,
    status: "posted",
    total_debit: opts.total,
    total_credit: opts.total,
  }).select().single();
  if (error || !entry) return { ok: false, error: error?.message };

  const lines = [
    { account_id: accounts["1100"], debit: opts.total, credit: 0, description: "Trade receivable" },
    { account_id: accounts["4000"], debit: 0, credit: opts.subtotal, description: "Sales revenue" },
  ];
  if (opts.vat > 0) lines.push({ account_id: accounts["2200"], debit: 0, credit: opts.vat, description: "VAT output" });

  await supabase.from("journal_lines").insert(
    lines.map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })),
  );
  return { ok: true, entryId: entry.id };
}
