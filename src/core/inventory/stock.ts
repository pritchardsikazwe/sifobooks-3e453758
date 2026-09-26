export type StockStatus = "in_stock" | "low" | "critical" | "out" | "overstock" | "negative";

export const stockNumber = (value: unknown) => Number(value ?? 0);

export function deriveStockStatus(input: {
  quantityOnHand: number;
  reservedQty: number;
  reorderLevel: number;
  safetyStock: number;
  maxStock: number;
}): StockStatus {
  const onHand = stockNumber(input.quantityOnHand);
  if (onHand < 0) return "negative";
  if (onHand === 0) return "out";
  const available = onHand - stockNumber(input.reservedQty);
  if (stockNumber(input.safetyStock) > 0 && available <= stockNumber(input.safetyStock)) return "critical";
  if (stockNumber(input.reorderLevel) > 0 && available <= stockNumber(input.reorderLevel)) return "low";
  if (stockNumber(input.maxStock) > 0 && onHand > stockNumber(input.maxStock)) return "overstock";
  return "in_stock";
}

export interface StockMovementPlan {
  quantityDelta: number;
  unitCost: number;
  totalCost: number;
}

export function prepareStockMovement(quantityDelta: number, unitCost: number): StockMovementPlan {
  const quantity = stockNumber(quantityDelta);
  const cost = stockNumber(unitCost);
  if (!Number.isFinite(quantity) || quantity === 0) throw new Error("INVALID_STOCK_QUANTITY");
  if (!Number.isFinite(cost) || cost < 0) throw new Error("INVALID_STOCK_COST");
  const totalCost = Math.round((Math.abs(quantity) * cost + Number.EPSILON) * 100) / 100;
  return { quantityDelta: quantity, unitCost: cost, totalCost };
}
