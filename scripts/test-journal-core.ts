import { prepareJournalLines } from "../src/core/accounting/journal";

const lines = prepareJournalLines([
  { accountId: "cash", debit: 100, description: "Cash" },
  { accountId: "sales", credit: 100, description: "Sales" },
]);

if (lines.length !== 2 || lines[0].debit !== 100 || lines[1].credit !== 100) {
  throw new Error("Journal preparation failed");
}

let rejected = false;
try {
  prepareJournalLines([{ accountId: "cash", debit: 100 }, { accountId: "sales", credit: 90 }]);
} catch (error) {
  rejected = error instanceof Error && error.message === "UNBALANCED_JOURNAL";
}

if (!rejected) throw new Error("Unbalanced journal was not rejected");
console.log("[journal-core] OK");
