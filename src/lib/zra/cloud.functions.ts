// @ts-nocheck — handler return types are untyped VSDC JSON; see AGENTS.md ts-nocheck rule.
// Hosted ZRA server-function wrappers.
// This module is safe to import from client-reachable code because the
// server-only implementation is referenced only inside createServerFn handlers.
import { createServerFn } from "@tanstack/react-start";
import {
  cloudSaveItem,
  cloudSubmitPosSale,
  cloudSubmitCorrection,
  cloudSelectInvoice,
  cloudSaveStockItems,
  cloudSaveStockMaster,
  cloudListDevices,
  cloudSaveDevice,
  cloudGetConfig,
  cloudSaveConfig,
  cloudInitializeDevice,
  cloudTestVsdcConnection,
  cloudCheckConnectorCommand,
  cloudGetStandardCodes,
  cloudGetItemClasses,
  cloudSyncCatalog,
  cloudListInventory,
  cloudSearchItemClasses,
  cloudListStandardCodes,
  cloudMapInventoryItem,
  cloudRegisterInventoryItem,
} from "./cloud.server";

export const cloudSaveItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSaveItem(data));
export const cloudSubmitPosSaleFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSubmitPosSale(data));
export const cloudSubmitCorrectionFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSubmitCorrection(data));
export const cloudSelectInvoiceFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSelectInvoice(data));
export const cloudSaveStockItemsFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSaveStockItems(data));
export const cloudSaveStockMasterFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSaveStockMaster(data));

export const cloudListDevicesFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudListDevices(data));
export const cloudSaveDeviceFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSaveDevice(data));
export const cloudGetConfigFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudGetConfig(data));
export const cloudSaveConfigFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSaveConfig(data));
export const cloudInitializeDeviceFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudInitializeDevice(data));
export const cloudGetStandardCodesFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudGetStandardCodes(data));
export const cloudGetItemClassesFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudGetItemClasses(data));
export const cloudSyncCatalogFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSyncCatalog(data));
export const cloudListInventoryFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudListInventory(data));
export const cloudSearchItemClassesFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudSearchItemClasses(data));
export const cloudListStandardCodesFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudListStandardCodes(data));
export const cloudMapInventoryItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudMapInventoryItem(data));
export const cloudRegisterInventoryItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudRegisterInventoryItem(data));
export const cloudTestVsdcConnectionFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudTestVsdcConnection(data));
export const cloudCheckConnectorCommandFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as any)
  .handler(({ data }) => cloudCheckConnectorCommand(data));
