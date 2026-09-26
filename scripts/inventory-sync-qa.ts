import { readFileSync } from "fs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

function requirePattern(text: string, pattern: RegExp, label: string) {
  if (!pattern.test(text)) throw new Error(`[inventory-sync-qa] Missing invariant: ${label}`);
}

const local = source("src/lib/db/server-api.ts");
const cloud = source("src/lib/cloud/accounting-transactions.ts");

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
