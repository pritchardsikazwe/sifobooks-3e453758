import { supabase } from "@/integrations/supabase/client";
import { capturePostingFailure } from "@/lib/posting-failure";

export type SupplierPaymentPostingOptions = {
  userId: string;
  paymentId: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  supplierId?: string | null;
  billId?: string | null;
  currency?: string | null;
};

export async function postSupplierPaymentLedger(opts: SupplierPaymentPostingOptions) {
  const {
    userId, paymentId, paymentNumber, paymentDate, amount,
    debitAccountId, creditAccountId, supplierId, billId, currency,
  } = opts;

  const payload = {
    paymentId, supplierId: supplierId ?? null, billId: billId ?? null,
    amount, currency: currency ?? null, debitAccountId, creditAccountId,
  };

  try {
    if (amount <= 0) throw new Error("Supplier payment amount must be positive");
    if (!debitAccountId || !creditAccountId) throw new Error("Supplier payment posting accounts are required");

    const { data, error } = await supabase.rpc("post_journal_entry", {
      _user_id: userId,
      _entry_number: `PAY-${paymentNumber}`,
      _entry_date: paymentDate,
      _reference: `PAY:${paymentNumber}`,
      _description: `Supplier payment ${paymentNumber}`,
      _lines: [
        { account_id: debitAccountId, debit: amount, credit: 0, description: `Payment ${paymentNumber}` },
        { account_id: creditAccountId, debit: 0, credit: amount, description: `Payment ${paymentNumber}` },
      ],
    });

    if (error) {
      await capturePostingFailure({
        userId, sourceModule: "purchases", sourceType: "payment",
        sourceId: paymentId, sourceReference: paymentNumber, operation: "post",
        payload, error,
      });
      throw error;
    }
    return data;
  } catch (error: any) {
    await capturePostingFailure({
      userId, sourceModule: "purchases", sourceType: "payment",
      sourceId: paymentId, sourceReference: paymentNumber, operation: "post",
      payload, error,
    }).catch(() => undefined);
    throw error;
  }
}
