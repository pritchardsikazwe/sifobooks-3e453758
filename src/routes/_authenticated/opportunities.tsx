import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Opportunities"
      icon={Target}
      table="opportunities"
      orderBy={{ column: "expected_close_date", ascending: true }}
      searchKeys={["name", "owner"]}
      columns={[
        { key: "name", header: "Opportunity" },
        { key: "stage", header: "Stage" },
        { key: "amount", header: "Amount" },
        { key: "probability", header: "Prob %" },
        { key: "expected_close_date", header: "Close Date" },
        { key: "owner", header: "Owner" },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "stage", label: "Stage", type: "select", defaultValue: "prospecting",
          options: [
            { value: "prospecting", label: "Prospecting" }, { value: "proposal", label: "Proposal" },
            { value: "negotiation", label: "Negotiation" }, { value: "won", label: "Won" }, { value: "lost", label: "Lost" },
          ] },
        { name: "amount", label: "Amount", type: "number", defaultValue: 0 },
        { name: "probability", label: "Probability %", type: "number", defaultValue: 50 },
        { name: "expected_close_date", label: "Expected Close", type: "date" },
        { name: "owner", label: "Owner" },
        { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
