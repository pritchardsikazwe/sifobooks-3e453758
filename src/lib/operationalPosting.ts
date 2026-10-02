import { supabase } from "@/integrations/supabase/client";

type PostingResult = { ok: boolean; journalId?: string; number?: string; error?: string };

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function ensureAccount(userId: string, code: string, name: string, type: string) {
  const existing = await supabase.from("chart_of_accounts").select("id,account_code,account_name,account_type").eq("user_id", userId).eq("account_code", code).maybeSingle();
  if (existing.data?.id) return existing.data;
  const inserted = await supabase.from("chart_of_accounts").insert({
    user_id: userId, account_code: code, account_name: name, account_type: type, is_active: true,
  }).select("id,account_code,account_name,account_type").single();
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function postJournal(input: {
  reference: string; description: string; date?: string;
  lines: { code: string; name: string; type: string; description: string; debit?: number; credit?: number }[];
}): Promise<PostingResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in" };

  const existing = await supabase.from("journal_entries").select("id,entry_number").eq("user_id", userId).eq("reference", input.reference).limit(1).maybeSingle();
  if (existing.data?.id) return { ok: true, journalId: existing.data.id, number: existing.data.entry_number ?? undefined };

  const accounts: Record<string, any> = {};
  for (const line of input.lines) accounts[line.code] ??= await ensureAccount(userId, line.code, line.name, line.type);

  const totalDebit = input.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = input.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (!(totalDebit > 0) || Math.abs(totalDebit - totalCredit) > 0.005) {
    return { ok: false, error: "Posting is not balanced" };
  }

  const number = `JE-${Date.now().toString().slice(-8)}`;
  const je = await supabase.from("journal_entries").insert({
    user_id: userId, entry_number: number, entry_date: input.date ?? new Date().toISOString().slice(0, 10),
    reference: input.reference, description: input.description, status: "posted",
    total_debit: totalDebit, total_credit: totalCredit,
  }).select("id,entry_number").single();
  if (je.error || !je.data) return { ok: false, error: je.error?.message ?? "Could not create journal entry" };

  const lines = input.lines.map(l => ({
    user_id: userId, entry_id: je.data.id, account_id: accounts[l.code].id,
    description: l.description, debit: Number(l.debit || 0), credit: Number(l.credit || 0),
  }));
  const jl = await supabase.from("journal_lines").insert(lines);
  if (jl.error) {
    await supabase.from("journal_entries").delete().eq("id", je.data.id).eq("user_id", userId);
    return { ok: false, error: jl.error.message };
  }
  return { ok: true, journalId: je.data.id, number: je.data.entry_number };
}

export async function postPropertyChargeToLedger(charge: any): Promise<PostingResult> {
  const amount = Number(charge?.amount || 0);
  if (!(amount > 0)) return { ok: false, error: "Charge amount must be greater than zero" };
  return postJournal({
    reference: `PROPERTY_CHARGE:${charge.id}`,
    description: `Property rent/charge · ${charge.description ?? charge.id}`,
    date: charge.charge_date ?? new Date().toISOString().slice(0, 10),
    lines: [
      { code: "1110", name: "Property Receivables", type: "asset", description: "Property receivable", debit: amount },
      { code: "4100", name: "Property Rental Income", type: "revenue", description: charge.description ?? "Property income", credit: amount },
    ],
  });
}

export async function postPropertyPaymentToLedger(payment: any): Promise<PostingResult> {
  const amount = Number(payment?.amount || 0);
  if (!(amount > 0)) return { ok: false, error: "Payment amount must be greater than zero" };
  return postJournal({
    reference: `PROPERTY_PAYMENT:${payment.id}`,
    description: `Property collection · ${payment.reference ?? payment.payment_no ?? payment.id}`,
    date: payment.payment_date ?? new Date().toISOString().slice(0, 10),
    lines: [
      { code: "1000", name: "Cash & Bank", type: "asset", description: `Received by ${payment.method ?? "cash"}`, debit: amount },
      { code: "1110", name: "Property Receivables", type: "asset", description: "Property receivable settlement", credit: amount },
    ],
  });
}

export async function postSchoolFeePaymentToLedger(payment: any): Promise<PostingResult> {
  const amount = Number(payment?.amount || 0);
  if (!(amount > 0)) return { ok: false, error: "Payment amount must be greater than zero" };
  return postJournal({
    reference: `SCHOOL_FEE_PAYMENT:${payment.id}`,
    description: `School fee collection · ${payment.receipt_no ?? payment.reference ?? payment.id}`,
    date: payment.payment_date ?? new Date().toISOString().slice(0, 10),
    lines: [
      { code: "1000", name: "Cash & Bank", type: "asset", description: `School fee received by ${payment.method ?? "cash"}`, debit: amount },
      { code: "1120", name: "School Fees Receivable", type: "asset", description: "School fee receivable settlement", credit: amount },
    ],
  });
}

export async function postHotelPaymentToLedger(payment: any): Promise<PostingResult> {
  const amount = Number(payment?.amount || 0);
  if (!(amount > 0)) return { ok: false, error: "Payment amount must be greater than zero" };
  return postJournal({
    reference: `HOTEL_PAYMENT:${payment.id}`,
    description: `Hotel guest collection · ${payment.number ?? payment.id}`,
    date: payment.receipt_date ?? new Date().toISOString().slice(0, 10),
    lines: [
      { code: "1000", name: "Cash & Bank", type: "asset", description: `Hotel payment by ${payment.method ?? "cash"}`, debit: amount },
      { code: "1130", name: "Hotel Guest Receivables", type: "asset", description: "Hotel folio settlement", credit: amount },
    ],
  });
}
