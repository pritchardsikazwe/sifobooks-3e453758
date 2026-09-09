import { supabase } from "@/integrations/supabase/client";
import { capturePostingFailure } from "@/lib/posting-failure";

export type CustomerReceiptPostingOptions = {
  userId: string;
  receiptId: string;
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  customerId?: string | null;
  invoiceId?: string | null;
  currency?: string | null;
};

export async function postCustomerReceiptLedger(opts: CustomerReceiptPostingOptions) {
  const {
    userId,
    receiptId,
    receiptNumber,
    receiptDate,
    amount,
    debitAccountId,
    creditAccountId,
    customerId,
    invoiceId,
    currency,
  } = opts;

  const payload = {
    receiptId,
    customerId: customerId ?? null,
    invoiceId: invoiceId ?? null,
    amount,
    currency: currency ?? null,
    debitAccountId,
    creditAccountId,
  };

  try {
    if (amount <= 0) throw new Error("Receipt amount must be positive");
    if (!debitAccountId || !creditAccountId) throw new Error("Receipt posting accounts are required");

    const { data, error } = await supabase.rpc("post_journal_entry", {
      _user_id: userId,
      _entry_number: `RCT-${receiptNumber}`,
      _entry_date: receiptDate,
      _reference: `RCT:${receiptNumber}`,
      _description: `Customer receipt ${receiptNumber}`,
      _lines: [
        { account_id: debitAccountId, debit: amount, credit: 0, description: `Receipt ${receiptNumber}` },
        { account_id: creditAccountId, debit: 0, credit: amount, description: `Receipt ${receiptNumber}` },
      ],
    });

    if (error) {
      await capturePostingFailure({
        userId,
        sourceModule: "sales",
        sourceType: "receipt",
        sourceId: receiptId,
        sourceReference: receiptNumber,
        operation: "post",
        payload,
        error,
      });
      throw error;
    }

    return data;
  } catch (error: any) {
    await capturePostingFailure({
      userId,
      sourceModule: "sales",
      sourceType: "receipt",
      sourceId: receiptId,
      sourceReference: receiptNumber,
      operation: "post",
      payload,
      error,
    }).catch(() => undefined);
    throw error;
  }
}
