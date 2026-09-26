import { prepareJournalLines, type JournalLineInput, type PreparedJournalLine } from "@/core/accounting/journal";

export interface JournalPostingPlan {
  lines: PreparedJournalLine[];
  totalDebit: number;
  totalCredit: number;
}

export function prepareJournalPosting(lines: JournalLineInput[]): JournalPostingPlan {
  const prepared = prepareJournalLines(lines);
  const totalDebit = Math.round((prepared.reduce((sum, line) => sum + line.debit, 0) + Number.EPSILON) * 100) / 100;
  const totalCredit = Math.round((prepared.reduce((sum, line) => sum + line.credit, 0) + Number.EPSILON) * 100) / 100;
  return { lines: prepared, totalDebit, totalCredit };
}
