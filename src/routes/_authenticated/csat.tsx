import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/csat")({
  head: () => ({ meta: [{ title: "CSAT — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Customer Satisfaction (CSAT)"
      icon={Star}
      table="csat_responses"
      orderBy={{ column: "response_date", ascending: false }}
      searchKeys={["comment"]}
      columns={[
        { key: "response_date", header: "Date" },
        { key: "score", header: "Score (1-5)" },
        { key: "comment", header: "Comment" },
      ]}
      fields={[
        { name: "response_date", label: "Response Date", type: "date" },
        { name: "score", label: "Score (1-5)", type: "number", required: true, defaultValue: 5 },
        { name: "comment", label: "Comment", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
