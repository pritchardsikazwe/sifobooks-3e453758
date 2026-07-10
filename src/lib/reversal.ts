import { supabase } from "@/integrations/supabase/client";

/**
 * Reverse a posted journal entry by creating a mirror entry with swapped
 * debits/credits on the reversal date. Original and reversal reference each
 * other via journal_entries.reversal_of / reversed_by.
 */
export async function reverseJournalEntry(entryId: string, reversalDate?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  const { data: orig, error: e1 } = await supabase.from("journal_entries").select("*").eq("id", entryId).maybeSingle();
  if (e1 || !orig) throw new Error(e1?.message ?? "Entry not found");
  if ((orig as any).reversed_by) throw new Error("Entry already reversed");
  if (orig.status !== "posted") throw new Error("Only posted entries can be reversed");

  const { data: lines, error: e2 } = await supabase.from("journal_lines").select("*").eq("entry_id", entryId);
  if (e2) throw new Error(e2.message);

  const date = reversalDate ?? new Date().toISOString().slice(0, 10);
  const newNumber = `${orig.entry_number}-REV`;

  const { data: rev, error: e3 } = await supabase.from("journal_entries").insert({
    user_id: u.user.id,
    entry_number: newNumber,
    entry_date: date,
    reference: orig.reference ? `REV:${orig.reference}` : `REV:${orig.entry_number}`,
    description: `Reversal of ${orig.entry_number}${orig.description ? ` — ${orig.description}` : ""}`,
    status: "posted",
    total_debit: Number(orig.total_credit ?? 0),
    total_credit: Number(orig.total_debit ?? 0),
    reversal_of: entryId,
  } as any).select().single();
  if (e3 || !rev) throw new Error(e3?.message ?? "Failed to create reversal");

  if (lines?.length) {
    await supabase.from("journal_lines").insert(
      lines.map((l: any) => ({
        user_id: u.user!.id,
        entry_id: rev.id,
        account_id: l.account_id,
        description: `Reversal — ${l.description ?? ""}`.trim(),
        debit: Number(l.credit ?? 0),
        credit: Number(l.debit ?? 0),
      })),
    );
  }

  await supabase.from("journal_entries").update({ reversed_by: rev.id } as any).eq("id", entryId);
  return rev.id;
}
