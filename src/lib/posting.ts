import { supabase } from "@/integrations/supabase/client";
import { capturePostingFailure } from "@/lib/posting-failure";

async function ensureAccounts(userId: string) {
  const defaults = [
    { code: "1100", name: "Accounts Receivable", type: "asset" },
    { code: "2200", name: "VAT Payable", type: "liability" },
    { code: "2201", name: "VAT Input", type: "asset" },
    { code: "4000", name: "Sales Revenue", type: "revenue" },
    { code: "1000", name: "Cash & Bank", type: "asset" },
    { code: "5000", name: "Cost of Sales", type: "expense" },
    { code: "2100", name: "Accounts Payable", type: "liability" },
  ];
  const { data: existing } = await supabase.from("chart_of_accounts").select("id, account_code").eq("user_id", userId);
  const have = new Set((existing ?? []).map(a => a.account_code));
  const missing = defaults.filter(d => !have.has(d.code));
  if (missing.length) {
    await supabase.from("chart_of_accounts").insert(missing.map(m => ({
      user_id: userId, account_code: m.code, account_name: m.name, account_type: m.type, is_active: true,
    })));
  }
  const { data: all } = await supabase.from("chart_of_accounts").select("id, account_code").eq("user_id", userId);
  const map: Record<string, string> = {};
  (all ?? []).forEach(a => { map[a.account_code] = a.id; });
  return map;
}

async function atomicPost(opts: {
  userId: string; entryNumber: string; entryDate: string; reference: string; description: string;
  lines: Array<{ accountId: string; debit: number; credit: number; description: string }>;
  failure?: {
    sourceModule: string;
    sourceType?: string;
    sourceId?: string;
    operation?: string;
    payload?: Record<string, unknown> | null;
  };
}) {
  const { data, error } = await (supabase as any).rpc("post_journal_entry", {
    _user_id: opts.userId,
    _entry_number: opts.entryNumber,
    _entry_date: opts.entryDate,
    _reference: opts.reference,
    _description: opts.description,
    _lines: opts.lines.map(l => ({ account_id: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description })),
  });
  if (error) {
    if (opts.failure) {
      await capturePostingFailure({
        userId: opts.userId,
        sourceModule: opts.failure.sourceModule,
        sourceType: opts.failure.sourceType,
        sourceId: opts.failure.sourceId,
        sourceReference: opts.reference,
        operation: opts.failure.operation ?? "post",
        error,
        payload: opts.failure.payload ?? { entryNumber: opts.entryNumber, entryDate: opts.entryDate, lines: opts.lines },
      });
    }
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, entryId: data as string };
}

export async function postInvoiceLedger(opts: {
  userId: string; invoiceId: string; number: string; issueDate: string;
  subtotal: number; vat: number; total: number; customerName?: string;
}) {
  const accounts = await ensureAccounts(opts.userId);
  const lines = [
    { accountId: accounts["1100"], debit: opts.total, credit: 0, description: "Trade receivable" },
    { accountId: accounts["4000"], debit: 0, credit: opts.subtotal, description: "Sales revenue" },
  ];
  if (opts.vat > 0) lines.push({ accountId: accounts["2200"], debit: 0, credit: opts.vat, description: "VAT output" });
  return atomicPost({
    userId: opts.userId,
    entryNumber: `JE-${opts.number}`,
    entryDate: opts.issueDate,
    reference: `INV:${opts.number}`,
    description: `Sales invoice ${opts.number}${opts.customerName ? ` — ${opts.customerName}` : ""}`,
    lines,
    failure: {
      sourceModule: "sales",
      sourceType: "invoice",
      sourceId: opts.invoiceId,
      operation: "post_invoice",
      payload: { invoiceId: opts.invoiceId, number: opts.number, subtotal: opts.subtotal, vat: opts.vat, total: opts.total },
    },
  });
}

export async function voidInvoiceLedger(opts: { userId: string; invoiceId: string; number: string; reason?: string }) {
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", opts.invoiceId).maybeSingle();
  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.status === "voided") return { ok: false, error: "Already voided" };

  const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", opts.invoiceId);
  for (const it of items ?? []) if (it.stock_item_id) {
    await supabase.from("stock_movements").insert({ user_id: opts.userId, item_id: it.stock_item_id, movement_type: "in",
      quantity: it.quantity, reference: `VOID:${opts.number}`, note: `Reversal of invoice ${opts.number}` });
  }

  const accounts = await ensureAccounts(opts.userId);
  const total = Number(inv.total), subtotal = Number(inv.subtotal), vat = Number(inv.vat_amount);
  const lines = [
    { accountId: accounts["4000"], debit: subtotal, credit: 0, description: "Reverse sales revenue" },
    { accountId: accounts["1100"], debit: 0, credit: total, description: "Reverse trade receivable" },
  ];
  if (vat > 0) lines.unshift({ accountId: accounts["2200"], debit: vat, credit: 0, description: "Reverse VAT output" });
  const posted = await atomicPost({
    userId: opts.userId,
    entryNumber: `JE-VOID-${opts.number}`,
    entryDate: new Date().toISOString().slice(0, 10),
    reference: `INV:${opts.number}:VOID`,
    description: `Void of invoice ${opts.number}${opts.reason ? ` — ${opts.reason}` : ""}`,
    lines,
    failure: {
      sourceModule: "sales",
      sourceType: "invoice",
      sourceId: opts.invoiceId,
      operation: "void_invoice",
      payload: { invoiceId: opts.invoiceId, number: opts.number, reason: opts.reason ?? null },
    },
  });
  if (!posted.ok) return posted;

  const { error } = await supabase.from("invoices").update({ status: "voided", voided_at: new Date().toISOString(), void_reason: opts.reason ?? null }).eq("id", opts.invoiceId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, entryId: posted.entryId };
}

export async function postCreditNoteLedger(opts: {
  userId: string; creditNoteId: string; number: string; issueDate: string;
  subtotal: number; vat: number; total: number; customerName?: string;
}) {
  const accounts = await ensureAccounts(opts.userId);
  const lines = [
    { accountId: accounts["4000"], debit: opts.subtotal, credit: 0, description: "Sales returns / credit" },
    { accountId: accounts["1100"], debit: 0, credit: opts.total, description: "Reduce trade receivable" },
  ];
  if (opts.vat > 0) lines.push({ accountId: accounts["2200"], debit: opts.vat, credit: 0, description: "Reverse VAT output" });
  return atomicPost({
    userId: opts.userId,
    entryNumber: `JE-${opts.number}`,
    entryDate: opts.issueDate,
    reference: `CN:${opts.number}`,
    description: `Credit note ${opts.number}${opts.customerName ? ` — ${opts.customerName}` : ""}`,
    lines,
    failure: {
      sourceModule: "sales",
      sourceType: "credit_note",
      sourceId: opts.creditNoteId,
      operation: "post_credit_note",
      payload: { creditNoteId: opts.creditNoteId, number: opts.number, subtotal: opts.subtotal, vat: opts.vat, total: opts.total },
    },
  });
}
