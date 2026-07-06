import { createFileRoute } from "@tanstack/react-router";
import { Warehouse } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/warehouses")({
  head: () => ({ meta: [{ title: "Warehouses — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Warehouses"
      icon={Warehouse}
      table="warehouses"
      orderBy={{ column: "name" }}
      searchKeys={["name", "code", "location"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "location", header: "Location" },
        { key: "manager", header: "Manager" },
        { key: "is_active", header: "Active", render: r => (r.is_active ? "Yes" : "No") },
      ]}
      fields={[
        { name: "code", label: "Code" },
        { name: "name", label: "Name", required: true },
        { name: "location", label: "Location" },
        { name: "manager", label: "Manager" },
      ]}
    />
  ),
});
