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
  const validation = validatePosTransaction({
    lines: draft.lines.map((line) => ({
      itemId: line.item_id,
      qty: line.qty,
      price: line.price,
      unitCost: line.unit_cost,
      discountPct: line.discount_pct,
    })),
    subtotal: draft.totals.subtotal + draft.totals.tax,
    tax: 0,
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
