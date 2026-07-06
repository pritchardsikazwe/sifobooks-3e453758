import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Notifications"
      icon={Bell}
      table="notifications"
      orderBy={{ column: "created_at", ascending: false }}
      searchKeys={["title", "message"]}
      columns={[
        { key: "title", header: "Title" },
        { key: "type", header: "Type" },
        { key: "message", header: "Message" },
        { key: "read", header: "Read", render: r => (r.read ? "Yes" : "No") },
      ]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "type", label: "Type", type: "select", defaultValue: "info",
          options: [{value:"info",label:"Info"},{value:"warning",label:"Warning"},{value:"success",label:"Success"},{value:"error",label:"Error"}] },
        { name: "message", label: "Message", type: "textarea" },
        { name: "link", label: "Link" },
      ]}
    />
  ),
});
