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

export async function voidInvoiceLedger(opts: {
  userId: string;
  invoiceId: string;
  number: string;
  reason?: string;
}) {
  // 1. Load original invoice + items
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", opts.invoiceId).maybeSingle();
  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.status === "voided") return { ok: false, error: "Already voided" };

  const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", opts.invoiceId);

  // 2. Reverse stock: put quantities back with an "in" movement
  for (const it of items ?? []) {
    if (it.stock_item_id) {
      await supabase.from("stock_movements").insert({
        user_id: opts.userId, item_id: it.stock_item_id, movement_type: "in",
        quantity: it.quantity, reference: `VOID:${opts.number}`,
        note: `Reversal of invoice ${opts.number}`,
      });
    }
  }

  // 3. Create reversing journal entry (mirror of original with swapped debits/credits)
  const accounts = await ensureAccounts(opts.userId);
  const total = Number(inv.total);
  const subtotal = Number(inv.subtotal);
  const vat = Number(inv.vat_amount);

  const { data: entry } = await supabase.from("journal_entries").insert({
    user_id: opts.userId,
    entry_number: `JE-VOID-${opts.number}`,
    entry_date: new Date().toISOString().slice(0, 10),
    reference: `INV:${opts.number}:VOID`,
    description: `Void of invoice ${opts.number}${opts.reason ? ` — ${opts.reason}` : ""}`,
    status: "posted",
    total_debit: total, total_credit: total,
  }).select().single();

  if (entry) {
    const lines = [
      { account_id: accounts["4000"], debit: subtotal, credit: 0, description: "Reverse sales revenue" },
      { account_id: accounts["1100"], debit: 0, credit: total, description: "Reverse trade receivable" },
    ];
    if (vat > 0) lines.unshift({ account_id: accounts["2200"], debit: vat, credit: 0, description: "Reverse VAT output" });
    await supabase.from("journal_lines").insert(lines.map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })));
  }

  // 4. Mark invoice voided
  await supabase.from("invoices").update({
    status: "voided", voided_at: new Date().toISOString(), void_reason: opts.reason ?? null,
  }).eq("id", opts.invoiceId);

  return { ok: true };
}

export async function postCreditNoteLedger(opts: {
  userId: string;
  creditNoteId: string;
  number: string;
  issueDate: string;
  subtotal: number;
  vat: number;
  total: number;
  customerName?: string;
}) {
  const accounts = await ensureAccounts(opts.userId);
  const ref = `CN:${opts.number}`;
  const { data: prior } = await supabase.from("journal_entries").select("id").eq("reference", ref).eq("user_id", opts.userId).maybeSingle();
  if (prior) return { ok: true, alreadyPosted: true };

  const { data: entry } = await supabase.from("journal_entries").insert({
    user_id: opts.userId,
    entry_number: `JE-${opts.number}`,
    entry_date: opts.issueDate,
    reference: ref,
    description: `Credit note ${opts.number}${opts.customerName ? ` — ${opts.customerName}` : ""}`,
    status: "posted",
    total_debit: opts.total, total_credit: opts.total,
  }).select().single();
  if (!entry) return { ok: false, error: "Journal entry failed" };

  // DR Sales (reduce revenue), DR VAT Payable (reduce liability), CR AR (reduce receivable)
  const lines = [
    { account_id: accounts["4000"], debit: opts.subtotal, credit: 0, description: "Sales returns / credit" },
    { account_id: accounts["1100"], debit: 0, credit: opts.total, description: "Reduce trade receivable" },
  ];
  if (opts.vat > 0) lines.push({ account_id: accounts["2200"], debit: opts.vat, credit: 0, description: "Reverse VAT output" });

  await supabase.from("journal_lines").insert(lines.map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })));
  return { ok: true };
}
