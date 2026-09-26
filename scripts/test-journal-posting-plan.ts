import { prepareJournalPosting } from "../src/core/accounting/journal-plan";

const plan = prepareJournalPosting([
  { accountId: "cash", debit: 116, description: "POS cash" },
  { accountId: "sales", credit: 100, description: "Sales" },
  { accountId: "vat", credit: 16, description: "VAT" },
]);

if (plan.totalDebit !== 116 || plan.totalCredit !== 116 || plan.lines.length !== 3) {
  throw new Error(`Journal posting plan failed: ${JSON.stringify(plan)}`);
}

console.log("[journal-posting-plan] OK: shared preparation produces balanced journal");
