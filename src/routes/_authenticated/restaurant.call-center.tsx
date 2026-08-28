import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { uid } from "@/lib/restaurant";
import { Phone, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/call-center")({
  head: () => ({
    meta: [
      { title: "Call Centre — SifoBooks Restaurant" },
      { name: "description", content: "Look up callers by phone, view order history and fire a repeat delivery or pickup order to the right branch." },
      { property: "og:title", content: "Call Centre — SifoBooks Restaurant" },
      { property: "og:description", content: "Phone lookup, customer history and one-tap repeat orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CallCentre,
});

const db: any = supabase;

function CallCentre() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [newCust, setNewCust] = useState({ name: "", phone: "", address: "" });

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [c, o, z] = await Promise.all([
      db.from("customers").select("*").eq("user_id", u).order("name").limit(500),
      db.from("restaurant_orders").select("*").eq("user_id", u).order("created_at", { ascending: false }).limit(300),
      db.from("restaurant_delivery_zones").select("*").eq("user_id", u).order("name"),
    ]);
    setCustomers(c.data ?? []); setOrders(o.data ?? []); setZones(z.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const matches = useMemo(() => {
    if (!phone.trim()) return [];
    const t = phone.toLowerCase();
    return customers.filter((c) => `${c.name} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase().includes(t)).slice(0, 8);
  }, [phone, customers]);

  const history = useMemo(
    () => (selected ? orders.filter((o) => o.customer_id === selected.id) : []),
    [selected, orders],
  );

  const createCustomer = async () => {
    if (!newCust.name.trim()) return toast.error("Customer name is required");
    const u = await uid();
    const { data, error } = await db.from("customers").insert({ user_id: u, ...newCust }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Customer saved");
    setNewCust({ name: "", phone: "", address: "" });
    setCustomers((l) => [data, ...l]);
    setSelected(data);
  };

  const startOrder = (type: string, repeat?: any) => {
    if (!selected) return toast.error("Select a caller first");
    sessionStorage.setItem("sifo.callcentre", JSON.stringify({
      customerId: selected.id, customerName: selected.name, phone: selected.phone,
      address: selected.address, orderType: type, repeatOrderId: repeat?.id ?? null,
    }));
    toast.success(`${type} order started for ${selected.name}`);
    navigate({ to: "/restaurant/pos" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Phone className="h-5 w-5" /> Call centre</h1>
        <p className="text-sm text-muted-foreground">Answer the phone, find the caller, repeat their usual.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 rounded-2xl space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Phone number or name" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            {matches.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)}
                className="w-full text-left rounded-xl border px-3 py-2 hover:bg-muted/50">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone ?? "no phone"} · {c.address ?? "no address"}</div>
              </button>
            ))}
            {phone && matches.length === 0 && <p className="text-sm text-muted-foreground">No match — add them below.</p>}
          </div>
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm font-semibold">New caller</div>
            <Input placeholder="Name" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} />
            <Input placeholder="Phone" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
            <Input placeholder="Delivery address" value={newCust.address} onChange={(e) => setNewCust({ ...newCust, address: e.target.value })} />
            <Button variant="outline" className="w-full" onClick={createCustomer}>Save caller</Button>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl lg:col-span-2 space-y-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Search a caller to see their history and start an order.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-auto">
                  <div className="text-lg font-semibold">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">{selected.phone ?? "no phone"} · {selected.address ?? "no address"}</div>
                </div>
                <Button onClick={() => startOrder("delivery")}>New delivery</Button>
                <Button variant="outline" onClick={() => startOrder("pickup")}>New pickup</Button>
              </div>

              <div className="text-sm">
                Lifetime value <span className="font-semibold tabular-nums">{fmtMoney(history.reduce((s, o) => s + Number(o.total || 0), 0))}</span> over {history.length} order(s).
              </div>

              <div className="space-y-1">
                {history.slice(0, 15).map((o) => (
                  <div key={o.id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                    <span className="font-medium">#{o.order_number}</span>
                    <span className="text-muted-foreground capitalize">{o.order_type} · {o.business_date}</span>
                    <span className="ml-auto tabular-nums">{fmtMoney(Number(o.total || 0))}</span>
                    <Button size="sm" variant="ghost" onClick={() => startOrder(o.order_type, o)}>Repeat</Button>
                  </div>
                ))}
                {history.length === 0 && <p className="text-sm text-muted-foreground">First-time caller.</p>}
              </div>

              {zones.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Delivery zones: {zones.map((z) => `${z.name} (${fmtMoney(Number(z.fee || 0))})`).join(" · ")}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
