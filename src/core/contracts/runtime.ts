/**
 * Platform-neutral runtime contracts.
 *
 * IMPORTANT:
 * This file must remain free of Bun/Node/browser/Windows/PostgreSQL imports.
 * Platform implementations live outside core.
 */

export type SifoBooksMode =
  | "windows"
  | "offline"
  | "lan-server"
  | "pos-client"
  | "cloud";

export interface RuntimeCapabilities {
  mode: SifoBooksMode;
  offline: boolean;
  localDatabase: boolean;
  cloudDatabase: boolean;
  localPrinting: boolean;
  windowsHardware: boolean;
  vsdc: boolean;
}

export interface LocalStoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface PrintPort {
  printRaw?(printerName: string, data: Uint8Array): Promise<void>;
  printDocument?(document: unknown): Promise<void>;
}

export interface SyncPort {
  isEnabled(): boolean;
  push?(items: unknown[]): Promise<unknown>;
  pull?(): Promise<unknown>;
}

export interface RuntimePort {
  capabilities(): RuntimeCapabilities;
  storage?: LocalStoragePort;
  printing?: PrintPort;
  sync?: SyncPort;
}
