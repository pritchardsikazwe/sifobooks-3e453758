import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PostingFlow, type FlowKind } from "@/components/accounting/PostingFlow";
import { JournalImpact } from "@/components/accounting/JournalImpact";

export type LedgerTarget = {
  kind: FlowKind;
  /** Journal reference stored on journal_entries, e.g. "INV:INV1" or "EXP:EXP-0001". */
  reference: string | null;
  /** Known journal entry id — skips the reference lookup when present. */
  entryId?: string | null;
  title: string;
  subtitle?: string;
};

/** Resolves the posted journal for a source document by its stored reference. */
export function useJournalByReference(reference?: string | null, entryId?: string | null) {
  const [id, setId] = useState<string | null>(entryId ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (entryId) { setId(entryId); return; }
    if (!reference) { setId(null); return; }
    setLoading(true);
    supabase
      .from("journal_entries")
      .select("id")
      .eq("reference", reference)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        setId(data?.[0]?.id ?? null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reference, entryId]);

  return { entryId: id, loading };
}

/** Side panel showing the accounting flow and real ledger effect of one document. */
export function LedgerImpactSheet({
  target,
  onOpenChange,
}: {
  target: LedgerTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { entryId, loading } = useJournalByReference(target?.reference, target?.entryId);

  return (
    <Sheet open={Boolean(target)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {target && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>{target.title}</SheetTitle>
              <SheetDescription>{target.subtitle ?? "How this document lands in the general ledger."}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <PostingFlow kind={target.kind} reference={target.reference} activeStep={entryId ? undefined : 0} />
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <JournalImpact entryId={entryId} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
