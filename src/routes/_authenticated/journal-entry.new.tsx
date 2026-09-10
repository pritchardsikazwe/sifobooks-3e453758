import { createFileRoute } from "@tanstack/react-router";
import { JournalEntryEditor } from "@/components/accounting/JournalEntryEditor";

export const Route = createFileRoute("/_authenticated/journal-entry/new")({
  head: () => ({ meta: [{ title: "New Journal Entry — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => <JournalEntryEditor />,
});
