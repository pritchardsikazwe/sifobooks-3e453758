import { supabase } from "@/integrations/supabase/client";
import { capturePostingFailure } from "@/lib/posting-failure";

async function ensureAccounts(userId: string) {
  const defaults = [
    { code: "5000", name: "Cost of Sales / Purchases", type: "expense" },
    { code: "2201", name: "VAT Input", type: "asset" },
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
  userId: string; billId: string; billNumber: string; billDate: string;
  subtotal: number; vat: number; total: number;
}) {
  const accounts = await ensureAccounts(opts.userId);
  const lines = [
    { accountId: accounts["5000"], debit: opts.subtotal, credit: 0, description: "Purchases / expense" },
    { accountId: accounts["2100"], debit: 0, credit: opts.total, description: "Supplier payable" },
  ];
  if (opts.vat > 0) lines.push({ accountId: accounts["2201"], debit: opts.vat, credit: 0, description: "VAT input" });

  const { data, error } = await (supabase as any).rpc("post_journal_entry", {
    _user_id: opts.userId,
    _entry_number: `JE-${opts.billNumber}`,
    _entry_date: opts.billDate,
    _reference: `BILL:${opts.billNumber}`,
    _description: `Supplier bill ${opts.billNumber}`,
    _lines: lines.map(l => ({ account_id: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description })),
  });

  if (error) {
    await capturePostingFailure({
      userId: opts.userId,
      sourceModule: "purchases",
      sourceType: "bill",
      sourceId: opts.billId,
      sourceReference: `BILL:${opts.billNumber}`,
      operation: "post",
      error,
      payload: { billNumber: opts.billNumber, billDate: opts.billDate, subtotal: opts.subtotal, vat: opts.vat, total: opts.total },
    });
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, entryId: data as string };
}

export async function postSupplierBillLedger(opts: {
  userId: string; billId: string; billNumber: string; billDate: string;
  subtotal: number; vat: number; total: number;
}) {
  try {
    return await atomicPost(opts);
  } catch (error) {
    await capturePostingFailure({
      userId: opts.userId,
      sourceModule: "purchases",
      sourceType: "bill",
      sourceId: opts.billId,
      sourceReference: `BILL:${opts.billNumber}`,
      operation: "post",
      error,
      payload: opts,
    });
    return { ok: false as const, error: String(error) };
  }
}
