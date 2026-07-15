import { createFileRoute } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { CURRENCIES } from "@/lib/currency";

const options = CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.label}` }));

export const Route = createFileRoute("/_authenticated/fx-rates")({
  head: () => ({ meta: [{ title: "FX Rates — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Exchange Rates"
      icon={Coins}
      table="fx_rates"
      orderBy={{ column: "as_of_date", ascending: false }}
      searchKeys={["from_currency", "to_currency", "source"]}
      columns={[
        { key: "as_of_date", header: "Date" },
        { key: "from_currency", header: "From" },
        { key: "to_currency", header: "To" },
        { key: "rate", header: "Rate", render: r => Number(r.rate).toFixed(6) },
        { key: "source", header: "Source" },
      ]}
      fields={[
        { name: "as_of_date", label: "As of date", type: "date", required: true },
        { name: "from_currency", label: "From currency", type: "select", required: true, options },
        { name: "to_currency", label: "To currency", type: "select", required: true, options, defaultValue: "ZMW" },
        { name: "rate", label: "Rate (units of TO per 1 FROM)", type: "number", required: true },
        { name: "source", label: "Source (e.g. BoZ)" },
      ]}
    />
  ),
});
