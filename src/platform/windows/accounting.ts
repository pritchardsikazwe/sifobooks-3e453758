import { postJournal } from "@/core/accounting/post-journal";
import { getWindowsDatabase } from "@/platform/windows/database";
import { windowsTransactionProvider } from "@/platform/windows/transaction";
import { generateUUID } from "@/lib/db/database";

export const windowsAccounting = {
  postJournal(input: Parameters<typeof postJournal>[4]) {
    return postJournal(
      getWindowsDatabase(),
      windowsTransactionProvider,
      { nextId: generateUUID },
      { now: () => new Date().toISOString() },
      input,
    );
  },
};
