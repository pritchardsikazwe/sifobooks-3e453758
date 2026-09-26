export interface DatabasePort {
  readonly dialect: "sqlite" | "postgres";
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

export interface DatabaseProvider {
  getDatabase(): DatabasePort;
}


export interface InventoryMovementRecord {
  id: string;
  userId: string;
  itemId: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference?: string;
  note?: string;
  locationId?: string | null;
}

export interface InventoryMovementRepository {
  insertMovement(movement: InventoryMovementRecord): Promise<void>;
}

export interface TransactionalInventoryMovementRepository extends InventoryMovementRepository {
  insertMovementInTransaction(tx: unknown, movement: InventoryMovementRecord): Promise<void>;
}
