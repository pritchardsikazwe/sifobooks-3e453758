import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-700",
  on_hold: "bg-amber-100 text-amber-700",
};

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      module="purchases"
      description="Supplier master and balances"
      title="Suppliers"
      icon={Truck}
      table="suppliers"
      orderBy={{ column: "name" }}
      searchKeys={["name", "supplier_code", "email", "tpin", "phone"]}
      statusField="status"
      columns={[
        { key: "supplier_code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "contact_person", header: "Contact" },
        { key: "phone", header: "Phone" },
        { key: "tpin", header: "TPIN" },
        { key: "current_balance", header: "Balance", render: r => fmtMoney(r.current_balance ?? 0) },
        { key: "status", header: "Status", render: r => <Badge className={COLOR[r.status] ?? ""} variant="secondary">{r.status}</Badge> },
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
