import { readFileSync } from "fs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

function requirePattern(text: string, pattern: RegExp, label: string) {
  if (!pattern.test(text)) throw new Error(`[inventory-sync-qa] Missing invariant: ${label}`);
}

const local = source("src/lib/db/server-api.ts");
const cloud = source("src/lib/cloud/accounting-transactions.ts");
const cloudRpc = source("src/lib/db/cloud-rpc.ts");

requirePattern(
  local,
  /"SALE",-l\.baseQty,l\.unitCost,saleNo,"POS sale"/,
  "local POS sale movement records a negative quantity",
);
requirePattern(
  local,
  /movementType:"SALE"[\s\S]{0,900}quantityOut:x\.qty[\s\S]{0,500}sourceType:"sales_invoice"/,
  "local sales invoices use the inventory ledger with quantity-out",
);
requirePattern(
  local,
  /function ledger\([\s\S]{0,1600}UPDATE stock_balances SET quantity/,
  "local ledger updates location balances",
);
requirePattern(
  cloud,
  /async function adjustCloudStockBalance\([\s\S]{0,1800}UPDATE stock_balances SET quantity/,
  "cloud has a centralized location-balance adjustment",
);
requirePattern(
  cloud,
  /cloudPostPurchaseBill[\s\S]{0,9000}adjustCloudStockBalance\(tx, uid, String\(x\.item_id\)/,
  "cloud purchases update location balances",
);
requirePattern(
  cloud,
  /cloudPostCreditNote[\s\S]{0,7000}adjustCloudStockBalance\(tx, uid, String\(x\.stock_item_id\)/,
  "cloud credit-note returns update location balances",
);
requirePattern(
  cloud,
  /cloudReversePosSale[\s\S]{0,7000}adjustCloudStockBalance\(tx, uid, String\(line\.item_id\)/,
  "cloud POS reversals update location balances",
);

console.log("[inventory-sync-qa] OK: local and cloud stock movement/location-balance invariants are present");

requirePattern(cloud, /export async function cloudTransferStock[\\s\\S]{0,9000}TRANSFER_OUT[\\s\\S]{0,5000}TRANSFER_IN/, "cloud transfers create paired location movements");
requirePattern(cloud, /cloudTransferStock[\\s\\S]{0,7000}adjustCloudStockBalance\\(tx, uid, itemId, fromLocationId, out\.quantityDelta\\)/, "cloud transfer reduces source location");
requirePattern(cloud, /cloudTransferStock[\\s\\S]{0,7000}adjustCloudStockBalance\\(tx, uid, itemId, toLocationId, inn\.quantityDelta\\)/, "cloud transfer increases destination location");
requirePattern(cloudRpc, /case "transfer_stock": return \{ data: await cloudTransferStock\(uid, args\), error: null \};/, "cloud transfer RPC is exposed");
requirePattern(cloudRpc, /cloudButcheryProcessing[\\s\\S]{0,7000}stock_balances/, "cloud butchery synchronizes location balances");

requirePattern(source("src/lib/erp/phase2.ts"), /postOpeningStock[\\s\\S]{0,5000}movementType:"opening"[\\s\\S]{0,1500}sourceType:"opening_stock"/, "local opening stock updates ledger and balance");
requirePattern(source("src/lib/cloud/accounting-transactions.ts"), /cloudPostOpeningStock[\\s\\S]{0,8000}adjustCloudStockBalance\\(tx, uid, itemId, locationId, qty\\)/, "cloud opening stock updates location balance");
requirePattern(source("src/lib/db/cloud-rpc.ts"), /case "post_opening_stock": return \{ data: await cloudPostOpeningStock\(uid, args\), error: null \};/, "opening stock RPC is exposed");

requirePattern(source("src/lib/erp/phase2.ts"), /function assertInventoryLocation[\\s\\S]{0,2500}WAREHOUSE_LOCATION_MISMATCH/, "local warehouse/location relationship validation");
requirePattern(source("src/lib/erp/phase2.ts"), /receivePurchase[\\s\\S]{0,1000}assertInventoryLocation\(db,args\)/, "purchase requires explicit valid location");
requirePattern(source("src/lib/erp/phase2.ts"), /transferStock[\\s\\S]{0,1000}assertInventoryLocation\(db,\{userId:args.userId,locationId:args.fromLocationId\}\)/, "transfer validates source location");
requirePattern(source("src/lib/erp/phase2.ts"), /transferStock[\\s\\S]{0,1200}assertInventoryLocation\(db,\{userId:args.userId,locationId:args.toLocationId\}\)/, "transfer validates destination location");
