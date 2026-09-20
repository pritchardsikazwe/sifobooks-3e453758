const generateId = () => crypto.randomUUID();

export type UnitConversion = {
  id: string;
  itemId: string;
  fromUnit: string;
  toUnit: string;
  multiplier: number;
};

const clean = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function normalizeUnit(value: unknown, fallback = "unit") {
  return clean(value) || fallback;
}

/**
 * Convert a transaction quantity into the item's base unit.
 * A missing conversion is only allowed when the transaction unit already
 * equals the configured base unit (or no base unit is configured).
 */
export function convertToBaseUnit(
  db: any,
  userId: string,
  item: any,
  quantity: number,
  transactionUnit?: string | null,
) {
  if (!(quantity >= 0)) throw new Error("UNIT_QUANTITY_INVALID");

  const baseUnit = normalizeUnit(item.base_unit, "unit");
  const fromUnit = normalizeUnit(transactionUnit || item.purchase_unit || item.sales_unit || baseUnit, baseUnit);

  if (fromUnit === baseUnit) return { quantity, fromUnit, baseUnit, multiplier: 1 };

  const row = db.prepare(
    "SELECT id,from_unit,to_unit,multiplier FROM item_unit_conversions WHERE user_id=? AND item_id=? AND is_active=1 AND lower(from_unit)=? AND lower(to_unit)=? LIMIT 1",
  ).get(userId, item.id, fromUnit, baseUnit) as any;

  if (!row || !(Number(row.multiplier) > 0)) {
    throw new Error(`UNIT_CONVERSION_MISSING:${fromUnit}->${baseUnit}`);
  }

  return {
    quantity: quantity * Number(row.multiplier),
    fromUnit,
    baseUnit,
    multiplier: Number(row.multiplier),
    conversionId: row.id,
  };
}

export function convertFromBaseUnit(
  db: any,
  userId: string,
  item: any,
  baseQuantity: number,
  targetUnit?: string | null,
) {
  const baseUnit = normalizeUnit(item.base_unit, "unit");
  const toUnit = normalizeUnit(targetUnit || item.sales_unit || baseUnit, baseUnit);
  if (toUnit === baseUnit) return { quantity: baseQuantity, fromUnit: baseUnit, toUnit, multiplier: 1 };

  const row = db.prepare(
    "SELECT id,from_unit,to_unit,multiplier FROM item_unit_conversions WHERE user_id=? AND item_id=? AND is_active=1 AND lower(from_unit)=? AND lower(to_unit)=? LIMIT 1",
  ).get(userId, item.id, baseUnit, toUnit) as any;

  if (!row || !(Number(row.multiplier) > 0)) {
    throw new Error(`UNIT_CONVERSION_MISSING:${baseUnit}->${toUnit}`);
  }

  return {
    quantity: baseQuantity / Number(row.multiplier),
    fromUnit: baseUnit,
    toUnit,
    multiplier: Number(row.multiplier),
    conversionId: row.id,
  };
}

export async function saveUnitConversion(args: {
  userId: string;
  itemId: string;
  fromUnit: string;
  toUnit: string;
  multiplier: number;
  actorId?: string | null;
}) {
  const { getDb } = await import("@/lib/db/database");
  const db = getDb();
  const fromUnit = normalizeUnit(args.fromUnit);
  const toUnit = normalizeUnit(args.toUnit);
  const multiplier = Number(args.multiplier);

  if (fromUnit === toUnit) throw new Error("UNIT_CONVERSION_SAME_UNIT");
  if (!(multiplier > 0)) throw new Error("UNIT_CONVERSION_MULTIPLIER_INVALID");

  const item = db.prepare("SELECT id,base_unit FROM stock_items WHERE id=? AND user_id=? LIMIT 1").get(args.itemId,args.userId) as any;
  if (!item) throw new Error("ITEM_NOT_FOUND");

  const id = generateId();
  db.prepare(
    "INSERT INTO item_unit_conversions (id,user_id,item_id,from_unit,to_unit,multiplier,is_active) VALUES (?,?,?,?,?,?,1) ON CONFLICT(user_id,item_id,from_unit,to_unit) DO UPDATE SET multiplier=excluded.multiplier,is_active=1,updated_at=datetime('now')",
  ).run(id,args.userId,args.itemId,fromUnit,toUnit,multiplier);

  const row = db.prepare(
    "SELECT id FROM item_unit_conversions WHERE user_id=? AND item_id=? AND lower(from_unit)=? AND lower(to_unit)=? LIMIT 1",
  ).get(args.userId,args.itemId,fromUnit,toUnit) as any;

  db.prepare(
    "INSERT INTO item_unit_conversion_audit (id,user_id,item_id,conversion_id,action,from_unit,to_unit,multiplier,actor_id) VALUES (?,?,?,?,?,?,?,?,?)",
  ).run(generateId(),args.userId,args.itemId,row?.id ?? id,"UPSERT",fromUnit,toUnit,multiplier,args.actorId ?? args.userId);

  return { id: row?.id ?? id, itemId: args.itemId, fromUnit, toUnit, multiplier };
}

export async function listUnitConversions(userId: string, itemId: string) {
  const { getDb } = await import("@/lib/db/database");
  const db = getDb();
  return db.prepare(
    "SELECT * FROM item_unit_conversions WHERE user_id=? AND item_id=? AND is_active=1 ORDER BY from_unit,to_unit",
  ).all(userId,itemId);
}
