import { completeSale, type SaleDraft, type SalePayment } from "@/lib/pos";
import { validatePosTransaction } from "@/lib/pos-integrity";

/**
 * Defense-in-depth checkout entry point. UI callers can use this wrapper while
 * the server-side posting RPC remains the accounting authority.
 */
export async function completeValidatedSale(
  draft: SaleDraft,
  payments: SalePayment[],
  changeDue: number,
) {
  const lineNet = draft.lines.reduce(
    (sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0) * (1 - Number(line.discount_pct || 0) / 100),
    0,
  );
  const subtotal = Number(draft.totals.subtotal || 0);
  const tax = Number(draft.totals.tax || 0);
  const taxRate = subtotal > 0 ? (tax / subtotal) * 100 : 0;
  const taxInclusive = Math.abs(lineNet - Number(draft.totals.total || 0)) <= 0.01;

  const validation = validatePosTransaction({
    lines: draft.lines.map((line) => ({
      itemId: line.item_id,
      qty: line.qty,
      price: line.price,
      unitCost: line.unit_cost,
      discountPct: line.discount_pct,
    })),
    saleDiscountPct: draft.saleDiscountPct,
    taxRate,
    taxInclusive,
    subtotal: draft.totals.subtotal,
    tax: draft.totals.tax,
    total: draft.totals.total,
    costTotal: draft.totals.cost,
    payments,
    changeDue,
    allowNegativeStock: false,
  });

  if (!validation.ok) {
    throw new Error(`POS validation failed: ${validation.errors.join("; ")}`);
  }

  return completeSale(draft, payments, changeDue);
}
