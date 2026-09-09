import { supabase } from "@/integrations/supabase/client";

const EPSILON = 0.01;

function nearlyEqual(a: number, b: number) {
  return Math.abs(Number(a) - Number(b)) <= EPSILON;
}

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

  const { data: existing, error: existingError } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code")
    .eq("user_id", userId);
  if (existingError) throw new Error(`Unable to read chart of accounts: ${existingError.message}`);

  const have = new Set((existing ?? []).map(a => a.account_code));
  const missing = defaults.filter(d => !have.has(d.code));
  if (missing.length) {
    const { error } = await supabase.from("chart_of_accounts").insert(
      missing.map(m => ({
        user_id: userId,
        account_code: m.code,
        account_name: m.name,
        account_type: m.type,
        is_active: true,
      })),
    );
    if (error) throw new Error(`Unable to create baseline accounts: ${error.message}`);
  }

  const { data: all, error: allError } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code")
    .eq("user_id", userId);
  if (allError) throw new Error(`Unable to reload chart of accounts: ${allError.message}`);

  const map: Record<string, string> = {};
  (all ?? []).forEach(a => { map[a.account_code] = a.id; });
  for (const code of defaults.map(d => d.code)) {
    if (!map[code]) throw new Error(`Required account ${code} is missing from the chart of accounts`);
  }
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
  try {
    const subtotal = Number(opts.subtotal);
    const vat = Number(opts.vat);
    const total = Number(opts.total);

    if (![subtotal, vat, total].every(Number.isFinite)) {
      return { ok: false, error: "Invoice totals contain an invalid number" };
    }
    if (subtotal < 0 || vat < 0 || total < 0) {
      return { ok: false, error: "Invoice totals cannot be negative" };
    }

    // The core invoice posting supports AR + revenue + VAT only.
    // WHT, tourism levy and turnover-tax components must not be silently omitted.
    if (!nearlyEqual(total, subtotal + vat)) {
      return {
        ok: false,
        error: "Invoice total does not equal subtotal plus VAT. The invoice contains additional tax/withholding components that are not yet mapped to ledger accounts.",
      };
    }

    const accounts = await ensureAccounts(opts.userId);
    const ref = `INV:${opts.number}`;

    const { data: prior, error: priorError } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("user_id", opts.userId)
      .eq("reference", ref)
      .maybeSingle();
    if (priorError) return { ok: false, error: `Unable to check existing posting: ${priorError.message}` };

    if (prior) {
      const { data: priorLines, error: priorLinesError } = await supabase
        .from("journal_lines")
        .select("debit, credit")
        .eq("user_id", opts.userId)
        .eq("entry_id", prior.id);
      if (priorLinesError) return { ok: false, error: `Unable to verify existing posting: ${priorLinesError.message}` };

      const debit = (priorLines ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0);
      const credit = (priorLines ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0);
      if (!priorLines?.length || !nearlyEqual(debit, credit) || !nearlyEqual(debit, total)) {
        return { ok: false, error: `Existing journal ${ref} is incomplete or unbalanced and must be reviewed before reposting` };
      }
      return { ok: true, alreadyPosted: true, entryId: prior.id };
    }

    const { data: entry, error } = await supabase.from("journal_entries").insert({
      user_id: opts.userId,
      entry_number: `JE-${opts.number}`,
      entry_date: opts.issueDate,
      reference: ref,
      description: `Sales invoice ${opts.number}${opts.customerName ? ` — ${opts.customerName}` : ""}`,
      status: "posted",
      total_debit: total,
      total_credit: total,
    }).select().single();
    if (error || !entry) return { ok: false, error: error?.message ?? "Journal entry creation failed" };

    const lines = [
      { account_id: accounts["1100"], debit: total, credit: 0, description: "Trade receivable" },
      { account_id: accounts["4000"], debit: 0, credit: subtotal, description: "Sales revenue" },
    ];
    if (vat > 0) lines.push({ account_id: accounts["2200"], debit: 0, credit: vat, description: "VAT output" });

    const { error: lineError } = await supabase.from("journal_lines").insert(
      lines.map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })),
    );
    if (lineError) {
      await supabase.from("journal_entries").delete().eq("id", entry.id).eq("user_id", opts.userId);
      return { ok: false, error: `Journal lines could not be created: ${lineError.message}` };
    }

    const { data: savedLines, error: verifyError } = await supabase
      .from("journal_lines")
      .select("debit, credit")
      .eq("user_id", opts.userId)
      .eq("entry_id", entry.id);
    if (verifyError) return { ok: false, error: `Journal was created but could not be verified: ${verifyError.message}` };

    const debit = (savedLines ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0);
    const credit = (savedLines ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0);
    if (!savedLines?.length || !nearlyEqual(debit, credit) || !nearlyEqual(debit, total)) {
      return { ok: false, error: `Journal ${ref} failed the post-write balance check (${debit.toFixed(2)} DR / ${credit.toFixed(2)} CR)` };
    }

    return { ok: true, entryId: entry.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected ledger posting error" };
  }
}

export async function voidInvoiceLedger(opts: {
  userId: string;
  invoiceId: string;
  number: string;
  reason?: string;
}) {
  const { data: inv, error: invError } = await supabase.from("invoices").select("*").eq("id", opts.invoiceId).maybeSingle();
  if (invError) return { ok: false, error: invError.message };
  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.status === "voided") return { ok: false, error: "Already voided" };

  const { data: items, error: itemsError } = await supabase.from("invoice_items").select("*").eq("invoice_id", opts.invoiceId);
  if (itemsError) return { ok: false, error: itemsError.message };

  const accounts = await ensureAccounts(opts.userId);
  const total = Number(inv.total);
  const subtotal = Number(inv.subtotal);
  const vat = Number(inv.vat_amount);
  if (![total, subtotal, vat].every(Number.isFinite) || !nearlyEqual(total, subtotal + vat)) {
    return { ok: false, error: "Invoice cannot be voided automatically because its accounting totals contain unsupported components" };
  }

  // Create and verify the reversing journal before changing the invoice status.
  const ref = `INV:${opts.number}:VOID`;
  const { data: priorVoid } = await supabase.from("journal_entries").select("id").eq("user_id", opts.userId).eq("reference", ref).maybeSingle();
  if (!priorVoid) {
    const { data: entry, error: entryError } = await supabase.from("journal_entries").insert({
      user_id: opts.userId,
      entry_number: `JE-VOID-${opts.number}`,
      entry_date: inv.issue_date ?? new Date().toISOString().slice(0, 10),
      reference: ref,
      description: `Void of invoice ${opts.number}${opts.reason ? ` — ${opts.reason}` : ""}`,
      status: "posted",
      total_debit: total,
      total_credit: total,
    }).select().single();
    if (entryError || !entry) return { ok: false, error: entryError?.message ?? "Void journal creation failed" };

    const lines = [
      { account_id: accounts["4000"], debit: subtotal, credit: 0, description: "Reverse sales revenue" },
      { account_id: accounts["1100"], debit: 0, credit: total, description: "Reverse trade receivable" },
    ];
    if (vat > 0) lines.unshift({ account_id: accounts["2200"], debit: vat, credit: 0, description: "Reverse VAT output" });
    const { error: lineError } = await supabase.from("journal_lines").insert(lines.map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })));
    if (lineError) return { ok: false, error: `Void journal lines failed: ${lineError.message}` };
  }

  for (const it of items ?? []) {
    if (it.stock_item_id) {
      const { error } = await supabase.from("stock_movements").insert({
        user_id: opts.userId,
        item_id: it.stock_item_id,
        movement_type: "in",
        quantity: it.quantity,
        reference: `VOID:${opts.number}`,
        note: `Reversal of invoice ${opts.number}`,
      });
      if (error) return { ok: false, error: `Stock reversal failed: ${error.message}` };
    }
  }

  const { error: updateError } = await supabase.from("invoices").update({
    status: "voided",
    voided_at: new Date().toISOString(),
    void_reason: opts.reason ?? null,
  }).eq("id", opts.invoiceId);
  if (updateError) return { ok: false, error: updateError.message };

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
  const subtotal = Number(opts.subtotal);
  const vat = Number(opts.vat);
  const total = Number(opts.total);
  if (![subtotal, vat, total].every(Number.isFinite) || !nearlyEqual(total, subtotal + vat)) {
    return { ok: false, error: "Credit note total does not equal subtotal plus VAT" };
  }

  try {
    const accounts = await ensureAccounts(opts.userId);
    const ref = `CN:${opts.number}`;
    const { data: prior, error: priorError } = await supabase.from("journal_entries").select("id").eq("reference", ref).eq("user_id", opts.userId).maybeSingle();
    if (priorError) return { ok: false, error: priorError.message };
    if (prior) return { ok: true, alreadyPosted: true, entryId: prior.id };

    const { data: entry, error } = await supabase.from("journal_entries").insert({
      user_id: opts.userId,
      entry_number: `JE-${opts.number}`,
      entry_date: opts.issueDate,
      reference: ref,
      description: `Credit note ${opts.number}${opts.customerName ? ` — ${opts.customerName}` : ""}`,
      status: "posted",
      total_debit: total,
      total_credit: total,
    }).select().single();
    if (error || !entry) return { ok: false, error: error?.message ?? "Journal entry failed" };

    const lines = [
      { account_id: accounts["4000"], debit: subtotal, credit: 0, description: "Sales returns / credit" },
      { account_id: accounts["1100"], debit: 0, credit: total, description: "Reduce trade receivable" },
    ];
    if (vat > 0) lines.push({ account_id: accounts["2200"], debit: vat, credit: 0, description: "Reverse VAT output" });

    const { error: lineError } = await supabase.from("journal_lines").insert(lines.map(l => ({ user_id: opts.userId, entry_id: entry.id, ...l })));
    if (lineError) return { ok: false, error: `Credit note lines failed: ${lineError.message}` };

    const { data: savedLines, error: verifyError } = await supabase.from("journal_lines").select("debit, credit").eq("user_id", opts.userId).eq("entry_id", entry.id);
    if (verifyError) return { ok: false, error: verifyError.message };
    const debit = (savedLines ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0);
    const credit = (savedLines ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0);
    if (!savedLines?.length || !nearlyEqual(debit, credit) || !nearlyEqual(debit, total)) {
      return { ok: false, error: `Credit note journal is unbalanced (${debit.toFixed(2)} DR / ${credit.toFixed(2)} CR)` };
    }
    return { ok: true, entryId: entry.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected credit note posting error" };
  }
}
