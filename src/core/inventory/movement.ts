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


export interface InventoryTransferPlan {
  itemId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference?: string;
  note?: string;
}

/** Prepare the two-sided inventory movement for a warehouse/location transfer.
 * Persistence is deliberately left to the runtime adapter so both sides can
 * remain inside the caller's existing transaction. */
export function prepareInventoryTransfer(input: {
  itemId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  unitCost: number;
  reference?: string;
  note?: string;
}): { out: PreparedInventoryMovement; in: PreparedInventoryMovement; transfer: InventoryTransferPlan } {
  if (!input.itemId) throw new Error("STOCK_ITEM_REQUIRED");
  if (!input.sourceLocationId || !input.destinationLocationId) throw new Error("TRANSFER_LOCATION_REQUIRED");
  if (input.sourceLocationId === input.destinationLocationId) throw new Error("TRANSFER_SAME_LOCATION");

  const quantity = stockNumber(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("INVALID_TRANSFER_QUANTITY");

  const out = prepareInventoryMovement({
    itemId: input.itemId,
    movementType: "TRANSFER_OUT",
    quantityDelta: -quantity,
    unitCost: input.unitCost,
    reference: input.reference,
    note: input.note ?? "Warehouse transfer out",
  });
  const incoming = prepareInventoryMovement({
    itemId: input.itemId,
    movementType: "TRANSFER_IN",
    quantityDelta: quantity,
    unitCost: input.unitCost,
    reference: input.reference,
    note: input.note ?? "Warehouse transfer in",
  });

  return {
    out,
    in: incoming,
    transfer: {
      itemId: input.itemId,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: input.destinationLocationId,
      quantity,
      unitCost: out.unitCost,
      totalCost: out.totalCost,
      reference: input.reference,
      note: input.note,
    },
  };
}


export interface InventoryAdjustmentPlan {
  itemId: string;
  quantityDelta: number;
  unitCost: number;
  totalCost: number;
  reference?: string;
  note?: string;
}

/** Prepare a controlled stock adjustment. The sign is explicit: positive adds
 * stock and negative removes stock. Persistence and authorization remain in
 * the runtime/application layer. */
export function prepareInventoryAdjustment(input: {
  itemId: string;
  quantityDelta: number;
  unitCost: number;
  reference?: string;
  note?: string;
}): { movement: PreparedInventoryMovement; adjustment: InventoryAdjustmentPlan } {
  if (!input.itemId) throw new Error("STOCK_ITEM_REQUIRED");
  const movement = prepareInventoryMovement({
    itemId: input.itemId,
    movementType: "ADJUSTMENT",
    quantityDelta: input.quantityDelta,
    unitCost: input.unitCost,
    reference: input.reference,
    note: input.note ?? "Stock adjustment",
  });
  return {
    movement,
    adjustment: {
      itemId: movement.itemId,
      quantityDelta: movement.quantityDelta,
      unitCost: movement.unitCost,
      totalCost: movement.totalCost,
      reference: movement.reference,
      note: movement.note,
    },
  };
}


export interface InventoryProductionComponent {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export interface InventoryProductionPlan {
  output: PreparedInventoryMovement;
  inputs: PreparedInventoryMovement[];
  totalInputCost: number;
  outputCost: number;
  reference?: string;
  note?: string;
}

/** Prepare a production batch: consume component stock and add the finished
 * item. Persistence remains outside the core so callers can keep the entire
 * production operation atomic. */
export function prepareInventoryProduction(input: {
  outputItemId: string;
  outputQuantity: number;
  outputUnitCost: number;
  components: InventoryProductionComponent[];
  reference?: string;
  note?: string;
}): InventoryProductionPlan {
  if (!input.outputItemId) throw new Error("PRODUCTION_OUTPUT_REQUIRED");
  if (!Number.isFinite(Number(input.outputQuantity)) || Number(input.outputQuantity) <= 0) {
    throw new Error("INVALID_PRODUCTION_OUTPUT_QUANTITY");
  }
  if (!Array.isArray(input.components) || input.components.length === 0) {
    throw new Error("PRODUCTION_COMPONENTS_REQUIRED");
  }

  const inputs = input.components.map((component) => prepareInventoryMovement({
    itemId: String(component.itemId),
    movementType: "PRODUCTION",
    quantityDelta: -Number(component.quantity),
    unitCost: Number(component.unitCost),
    reference: input.reference,
    note: input.note ?? "Production component consumption",
  }));

  const invalid = inputs.some((movement) => movement.quantityDelta >= 0);
  if (invalid) throw new Error("INVALID_PRODUCTION_COMPONENT_QUANTITY");

  const totalInputCost = Math.round((inputs.reduce((sum, movement) => sum + movement.totalCost, 0) + Number.EPSILON) * 100) / 100;
  const output = prepareInventoryMovement({
    itemId: String(input.outputItemId),
    movementType: "PRODUCTION",
    quantityDelta: Number(input.outputQuantity),
    unitCost: Number(input.outputUnitCost),
    reference: input.reference,
    note: input.note ?? "Finished goods production",
  });

  return {
    output,
    inputs,
    totalInputCost,
    outputCost: output.totalCost,
    reference: input.reference,
    note: input.note,
  };
}
