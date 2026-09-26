export interface DatabasePort {
  readonly dialect: "sqlite" | "postgres";
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

export interface DatabaseProvider {
  getDatabase(): DatabasePort;
}


export interface InventoryMovementRepository {
  insertMovement(movement: {
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
  }): Promise<void>;
}
