import { createFileRoute } from "@tanstack/react-router";
import { JournalEntryEditor } from "@/components/accounting/JournalEntryEditor";

export const Route = createFileRoute("/_authenticated/journal-entry/edit/$id")({
  head: () => ({ meta: [{ title: "Edit Journal Entry — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: EditJournalEntry,
});

function EditJournalEntry() {
  const { id } = Route.useParams();
  return <JournalEntryEditor entryId={id} />;
}
