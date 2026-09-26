import { prepareWindowsJournal } from "../src/platform/windows/accounting-plan";

const plan = prepareWindowsJournal([
  { accountId: "cash", debit: 116 },
  { accountId: "sales", credit: 100 },
  { accountId: "vat", credit: 16 },
]);

if (plan.totalDebit !== 116 || plan.totalCredit !== 116) {
  throw new Error(`Windows accounting plan failed: ${JSON.stringify(plan)}`);
}

console.log("[windows-accounting-plan] OK");
