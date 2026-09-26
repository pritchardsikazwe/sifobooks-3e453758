export interface DatabasePort {
  readonly dialect: "sqlite" | "postgres";
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

export interface DatabaseProvider {
  getDatabase(): DatabasePort;
}
