import { deriveStockStatus, prepareStockMovement } from "../src/core/inventory/stock";

if (deriveStockStatus({ quantityOnHand: 0, reservedQty: 0, reorderLevel: 5, safetyStock: 2, maxStock: 100 }) !== "out") {
  throw new Error("Out-of-stock rule failed");
}

if (deriveStockStatus({ quantityOnHand: 10, reservedQty: 9, reorderLevel: 2, safetyStock: 2, maxStock: 100 }) !== "critical") {
  throw new Error("Critical-stock rule failed");
}

const movement = prepareStockMovement(-3, 25);
if (movement.quantityDelta !== -3 || movement.unitCost !== 25 || movement.totalCost !== 75) {
  throw new Error("Stock movement calculation failed");
}

console.log("[inventory-core] OK");
