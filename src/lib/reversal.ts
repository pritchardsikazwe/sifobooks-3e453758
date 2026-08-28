import { supabase } from "@/integrations/supabase/client";

/**
 * Reverse a posted journal entry through the audited server routine
 * `safe_reverse_journal_entry`. The routine enforces:
 *  - a mandatory reason (min 4 chars)
 *  - only posted entries, never a reversal of a reversal
 *  - never twice (reversed_by must be null)
 *  - never into a closed financial period
 * and writes an audit log record.
 */
export async function reverseJournalEntry(
  entryId: string,
  reason: string,
  reversalDate?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("safe_reverse_journal_entry" as any, {
    _entry_id: entryId,
    _reason: reason,
    _reversal_date: reversalDate ?? null,
  });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));
  const res = data as { ok?: boolean; reversal_id?: string } | null;
  if (!res?.reversal_id) throw new Error("Reversal failed");
  return res.reversal_id;
}
