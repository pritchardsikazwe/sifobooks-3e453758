import type { DatabasePort, DatabaseProvider } from "@/core/contracts/database";
import { getCloudDb } from "@/lib/cloud/postgres";

function toPostgresPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

class CloudPostgresDatabase implements DatabasePort {
  readonly dialect = "postgres" as const;

  async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return await getCloudDb().unsafe(toPostgresPlaceholders(sql), params) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await getCloudDb().unsafe(toPostgresPlaceholders(sql), params);
  }
}

let database: DatabasePort | null = null;

export function getCloudDatabase(): DatabasePort {
  if (!database) database = new CloudPostgresDatabase();
  return database;
}

export const cloudDatabaseProvider: DatabaseProvider = {
  getDatabase: getCloudDatabase,
};


import type { InventoryMovementRepository } from "@/core/contracts/database";

export const cloudInventoryMovementRepository: InventoryMovementRepository = {
  async insertMovement(movement) {
    await getCloudDatabase().execute(
      "INSERT INTO stock_movements (id,user_id,tenant_id,item_id,movement_type,quantity,unit_cost,total_cost,reference,note,location_id) VALUES (?,?,current_setting('app.tenant_id',true)::uuid,?,?,?,?,?,?,?,?)",
      [movement.id, movement.userId, movement.itemId, movement.movementType, movement.quantity, movement.unitCost, movement.totalCost, movement.reference ?? null, movement.note ?? null, movement.locationId ?? null],
    );
  },
};
