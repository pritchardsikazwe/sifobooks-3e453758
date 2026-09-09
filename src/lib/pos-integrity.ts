export type PosIntegrityLine = {
  itemId?: string | null;
  qty: number;
  price: number;
  unitCost: number;
  discountPct?: number;
};

export type PosIntegrityPayment = {
  method: string;
  amount: number;
  reference?: string | null;
};

export type PosIntegrityInput = {
  lines: PosIntegrityLine[];
  subtotal: number;
  tax: number;
  total: number;
  costTotal: number;
  payments: PosIntegrityPayment[];
  changeDue: number;
  allowNegativeStock?: boolean;
};

export type PosIntegrityResult = {
  ok: boolean;
  errors: string[];
};

const money = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const EPSILON = 0.01;

/**
 * Client-side guard for the POS posting contract.
 *
 * The authoritative stock/GL transaction remains the server-side
 * `sync_pos_sale` / `complete_pos_sale` routine. This helper prevents malformed
 * payloads from reaching that routine and makes offline replay use the same
 * validation rules as online checkout.
 */
export function validatePosTransaction(input: PosIntegrityInput): PosIntegrityResult {
  const errors: string[] = [];

  if (!input.lines.length) errors.push("A sale must contain at least one line");
  if (!Number.isFinite(input.subtotal) || input.subtotal < 0) errors.push("Subtotal must be a non-negative number");
  if (!Number.isFinite(input.tax) || input.tax < 0) errors.push("Tax must be a non-negative number");
  if (!Number.isFinite(input.total) || input.total < 0) errors.push("Total must be a non-negative number");
  if (!Number.isFinite(input.costTotal) || input.costTotal < 0) errors.push("Cost total must be a non-negative number");
  if (!Number.isFinite(input.changeDue) || input.changeDue < 0) errors.push("Change due must be a non-negative number");

  let calculatedNet = 0;
  let calculatedCost = 0;

  for (const [index, line] of input.lines.entries()) {
    const qty = Number(line.qty);
    const price = Number(line.price);
    const unitCost = Number(line.unitCost);
    const discountPct = Number(line.discountPct ?? 0);

    if (!Number.isFinite(qty) || qty <= 0) errors.push(`Line ${index + 1}: quantity must be greater than zero`);
    if (!Number.isFinite(price) || price < 0) errors.push(`Line ${index + 1}: price must be non-negative`);
    if (!Number.isFinite(unitCost) || unitCost < 0) errors.push(`Line ${index + 1}: unit cost must be non-negative`);
    if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
      errors.push(`Line ${index + 1}: discount must be between 0% and 100%`);
    }
    if (!input.allowNegativeStock && !line.itemId) {
      errors.push(`Line ${index + 1}: stock item is required for a stock-controlled sale`);
    }

    if (Number.isFinite(qty) && Number.isFinite(price) && Number.isFinite(discountPct)) {
      calculatedNet += qty * price * (1 - discountPct / 100);
    }
    if (Number.isFinite(qty) && Number.isFinite(unitCost)) calculatedCost += qty * unitCost;
  }

  if (Math.abs(money(calculatedNet) - money(input.subtotal + input.tax)) > EPSILON) {
    errors.push("Sale lines do not reconcile to subtotal plus tax");
  }
  if (Math.abs(money(calculatedCost) - money(input.costTotal)) > EPSILON) {
    errors.push("Sale lines do not reconcile to cost total");
  }

  const paid = input.payments.reduce((sum, payment, index) => {
    const amount = Number(payment.amount);
    if (!payment.method?.trim()) errors.push(`Payment ${index + 1}: payment method is required`);
    if (!Number.isFinite(amount) || amount <= 0) errors.push(`Payment ${index + 1}: amount must be greater than zero`);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  if (!input.payments.length) errors.push("At least one payment is required");
  if (money(paid + EPSILON) < money(input.total + input.changeDue)) {
    errors.push("Payments are insufficient for the sale total and change");
  }
  if (Math.abs(money(paid - input.total - input.changeDue)) > EPSILON) {
    errors.push("Payments do not reconcile to total plus change");
  }

  return { ok: errors.length === 0, errors };
}
