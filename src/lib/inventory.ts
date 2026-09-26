import { supabase } from "@/integrations/supabase/client";
import { deriveStockStatus, stockNumber } from "@/core/inventory/stock";

export type InvItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string | null;
  bin: string | null;
  warehouse_id: string | null;
  warehouse_name?: string;
  item_type: string | null;
  cost_price: number;
  sell_price: number;
  quantity_on_hand: number;
  reserved_qty: number;
  on_order_qty: number;
  reorder_level: number;
  safety_stock: number;
  max_stock: number;
  is_active: boolean;
  /** Derived */
  available: number;
  stock_value: number;
  status: StockStatus;
};

export const num = stockNumber;

/** Central stock rules — one place so every grid agrees. */
export function deriveStatus(r: {
  quantity_on_hand: number; reserved_qty: number; reorder_level: number;
  safety_stock: number; max_stock: number;
}): StockStatus {
  return deriveStockStatus({
    quantityOnHand: r.quantity_on_hand,
    reservedQty: r.reserved_qty,
    reorderLevel: r.reorder_level,
    safetyStock: r.safety_stock,
    maxStock: r.max_stock,
  });
}
