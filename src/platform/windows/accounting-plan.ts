import { prepareJournalPosting } from "@/core/accounting/journal-plan";
import type { JournalLineInput } from "@/core/accounting/journal";

export function prepareWindowsJournal(lines: JournalLineInput[]) {
  return prepareJournalPosting(lines);
}
