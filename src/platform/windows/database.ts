import type { DatabasePort, DatabaseProvider } from "@/core/contracts/database";
import { getDb } from "@/lib/db/database";

class WindowsSqliteDatabase implements DatabasePort {
  readonly dialect = "sqlite" as const;

  async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return getDb().prepare(sql).all(...params) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    getDb().prepare(sql).run(...params);
  }
}

let database: DatabasePort | null = null;

export function getWindowsDatabase(): DatabasePort {
  if (!database) database = new WindowsSqliteDatabase();
  return database;
}

export const windowsDatabaseProvider: DatabaseProvider = {
  getDatabase: getWindowsDatabase,
};


import type { InventoryMovementRepository } from "@/core/contracts/database";

export const windowsInventoryMovementRepository: InventoryMovementRepository = {
  async insertMovement(movement) {
    await getWindowsDatabase().execute(
      "INSERT INTO stock_movements (id,user_id,item_id,movement_type,quantity,unit_cost,total_cost,reference,note,location_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [movement.id, movement.userId, movement.itemId, movement.movementType, movement.quantity, movement.unitCost, movement.totalCost, movement.reference ?? null, movement.note ?? null, movement.locationId ?? null],
    );
  },
};
