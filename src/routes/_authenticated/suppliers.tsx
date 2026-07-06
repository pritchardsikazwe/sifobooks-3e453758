import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Suppliers"
      icon={Truck}
      table="suppliers"
      orderBy={{ column: "name" }}
      searchKeys={["name", "supplier_code", "email", "tpin"]}
      columns={[
        { key: "supplier_code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "contact_person", header: "Contact" },
        { key: "phone", header: "Phone" },
        { key: "tpin", header: "TPIN" },
        { key: "current_balance", header: "Balance", render: r => fmtMoney(r.current_balance ?? 0) },
        { key: "status", header: "Status" },
      ]}
      fields={[
        { name: "supplier_code", label: "Supplier Code" },
        { name: "name", label: "Name", required: true },
        { name: "contact_person", label: "Contact Person" },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        { name: "tpin", label: "TPIN" },
        { name: "vat_number", label: "VAT Number" },
        { name: "payment_terms", label: "Payment Terms (days)", type: "number", defaultValue: 30 },
        { name: "currency", label: "Currency", defaultValue: "ZMW" },
        { name: "opening_balance", label: "Opening Balance", type: "number" },
        { name: "status", label: "Status", type: "select", defaultValue: "active",
          options: [{value:"active",label:"Active"},{value:"inactive",label:"Inactive"},{value:"on_hold",label:"On Hold"}] },
        { name: "address", label: "Address", type: "textarea" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  ),
});
