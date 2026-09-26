export interface InventoryLocationRef {
  locationId: string;
  warehouseId?: string | null;
  branchId?: string | null;
}

export function requireLocationId(ref: InventoryLocationRef): string {
  const id = String(ref.locationId || "").trim();
  if (!id) throw new Error("INVENTORY_LOCATION_REQUIRED");
  return id;
}

export function assertWarehouseBelongsToLocation(ref: InventoryLocationRef & { resolvedWarehouseId?: string | null }) {
  if (ref.warehouseId && ref.resolvedWarehouseId && ref.warehouseId !== ref.resolvedWarehouseId) {
    throw new Error("WAREHOUSE_LOCATION_MISMATCH");
  }
}
