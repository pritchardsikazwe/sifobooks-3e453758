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
  saleDiscountPct?: number;
  taxRate?: number;
  taxInclusive?: boolean;
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
  const saleDiscountPct = Number(input.saleDiscountPct ?? 0);
  const taxRate = Number(input.taxRate ?? 0);
  const taxInclusive = input.taxInclusive !== false;

  if (!input.lines.length) errors.push("A sale must contain at least one line");
  if (!Number.isFinite(input.subtotal) || input.subtotal < 0) errors.push("Subtotal must be a non-negative number");
  if (!Number.isFinite(input.tax) || input.tax < 0) errors.push("Tax must be a non-negative number");
  if (!Number.isFinite(input.total) || input.total < 0) errors.push("Total must be a non-negative number");
  if (!Number.isFinite(input.costTotal) || input.costTotal < 0) errors.push("Cost total must be a non-negative number");
  if (!Number.isFinite(input.changeDue) || input.changeDue < 0) errors.push("Change due must be a non-negative number");
  if (!Number.isFinite(saleDiscountPct) || saleDiscountPct < 0 || saleDiscountPct > 100) errors.push("Sale discount must be between 0% and 100%");
  if (!Number.isFinite(taxRate) || taxRate < 0) errors.push("Tax rate must be a non-negative number");

  let grossAfterLineDiscount = 0;
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
      grossAfterLineDiscount += qty * price * (1 - discountPct / 100);
    }
    if (Number.isFinite(qty) && Number.isFinite(unitCost)) calculatedCost += qty * unitCost;
  }

  const saleDiscount = grossAfterLineDiscount * (saleDiscountPct / 100);
  const net = Math.max(grossAfterLineDiscount - saleDiscount, 0);
  const expectedTax = taxInclusive
    ? net - net / (1 + taxRate / 100)
    : net * (taxRate / 100);
  const expectedSubtotal = taxInclusive ? net - expectedTax : net;
  const expectedTotal = taxInclusive ? net : net + expectedTax;

  if (Math.abs(money(expectedSubtotal) - money(input.subtotal)) > EPSILON) {
    errors.push("Sale lines and discounts do not reconcile to subtotal");
  }
  if (Math.abs(money(expectedTax) - money(input.tax)) > EPSILON) {
    errors.push("Sale tax does not reconcile to the configured tax rate");
  }
  if (Math.abs(money(expectedTotal) - money(input.total)) > EPSILON) {
    errors.push("Sale lines, discounts and tax do not reconcile to total");
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
