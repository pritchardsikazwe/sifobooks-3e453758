import { prepareInventoryMovement } from "../src/core/inventory/movement";

const sale = prepareInventoryMovement({
  itemId: "item-1",
  movementType: "SALE",
  quantityDelta: -4,
  unitCost: 30,
  reference: "POS-1001",
});

if (sale.quantityDelta !== -4 || sale.totalCost !== 120 || sale.movementType !== "SALE") {
  throw new Error(`Inventory movement failed: ${JSON.stringify(sale)}`);
}

console.log("[inventory-movement] OK");
