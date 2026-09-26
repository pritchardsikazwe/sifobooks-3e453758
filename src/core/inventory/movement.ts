import { prepareStockMovement, type StockMovementPlan } from "@/core/inventory/stock";

export type InventoryMovementType = "SALE" | "PURCHASE" | "RETURN" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT" | "PRODUCTION";

export interface InventoryMovementInput {
  itemId: string;
  movementType: InventoryMovementType;
  quantityDelta: number;
  unitCost: number;
  reference?: string;
  note?: string;
}

export interface PreparedInventoryMovement extends InventoryMovementInput, StockMovementPlan {
  itemId: string;
}

/** Shared inventory movement preparation. It contains no database or runtime
 * code, so Windows and Cloud can persist the same movement semantics. */
export function prepareInventoryMovement(input: InventoryMovementInput): PreparedInventoryMovement {
  if (!input.itemId) throw new Error("STOCK_ITEM_REQUIRED");
  const plan = prepareStockMovement(input.quantityDelta, input.unitCost);
  return {
    ...input,
    itemId: String(input.itemId),
    quantityDelta: plan.quantityDelta,
    unitCost: plan.unitCost,
    totalCost: plan.totalCost,
  };
}
