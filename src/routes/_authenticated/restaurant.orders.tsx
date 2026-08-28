import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { PAYMENT_METHODS, recordPayments, statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/restaurant/orders")({
  head: () => ({
    meta: [
      { title: "Restaurant Orders — SifoBooks" },
      { name: "description", content: "Every dine-in, takeaway and delivery check with items, tenders, discounts and the journal entry it posted." },
      { property: "og:title", content: "Restaurant Orders — SifoBooks" },
      { property: "og:description", content: "Search, settle, void and export restaurant checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Orders,
});

const db: any = supabase;

function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const { data } = await db.from("restaurant_orders").select("*").eq("user_id", u)
      .gte("business_date", from).lte("business_date", to).order("opened_at", { ascending: false });
    const os = data ?? [];
    setOrders(os);
    if (os.length) {
      const { data: oi } = await db.from("restaurant_order_items").select("*").in("order_id", os.map((o: any) => o.id));
      setItems(oi ?? []);
    } else setItems([]);
  };
  useEffect(() => { load(); }, [from, to]);

  const settle = async (o: any, method: string) => {
    await recordPayments(o.id, [{ method, amount: Number(o.total) }]);
    const { error } = await db.from("restaurant_orders")
      .update({ status: "paid", payment_method: method, amount_paid: Number(o.total), closed_at: new Date().toISOString() })
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    if (o.table_id) await db.from("restaurant_tables").update({ status: "dirty", occupied_since: null, current_order_id: null }).eq("id", o.table_id);
    toast.success(`Settled ${fmtMoney(Number(o.total))} by ${method} — posted to the ledger`);
    load();
  };

  const voidOrder = async (o: any) => {
    const reason = window.prompt("Reason for voiding this check?");
    if (!reason) return;
    const { error } = await db.from("restaurant_orders").update({ status: "void", void_reason: reason, closed_at: new Date().toISOString() }).eq("id", o.id);
    if (error) return toast.error(error.message);
    if (o.table_id) await db.from("restaurant_tables").update({ status: "available", occupied_since: null }).eq("id", o.table_id);
    toast.success("Check voided");
    load();
  };

  const shown = useMemo(() => orders.filter((o) =>
    (status === "all" || o.status === status) &&
    (!q || `${o.order_no} ${o.customer_name ?? ""} ${o.server_name ?? ""} ${o.order_type}`.toLowerCase().includes(q.toLowerCase()))
  ), [orders, status, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{shown.length} checks · {fmtMoney(shown.filter((o) => o.status !== "void").reduce((s, o) => s + Number(o.total || 0), 0))}</p>
        </div>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "open", "held", "paid", "void"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Search check / server / customer" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
        <ExportMenu filename={`restaurant-orders-${from}_${to}`} title="Restaurant orders" rows={shown.map((o) => ({
          Check: o.order_no, Date: o.business_date, Type: o.order_type, Status: o.status,
          Server: o.server_name ?? "", Guests: o.guests, Subtotal: Number(o.subtotal),
          Discount: Number(o.discount), Tax: Number(o.tax), Total: Number(o.total), Method: o.payment_method ?? "",
        }))} />
      </div>

      {shown.length === 0 ? (
        <Card className="p-10 rounded-2xl text-center text-sm text-muted-foreground">No checks in this range.</Card>
      ) : (
        <div className="space-y-2">
          {shown.map((o) => {
            const lines = items.filter((i) => i.order_id === o.id);
            const open = openId === o.id;
            return (
              <Card key={o.id} className="rounded-2xl overflow-hidden">
                <button className="w-full text-left p-3 flex flex-wrap items-center gap-3 hover:bg-muted/50"
                  onClick={() => setOpenId(open ? null : o.id)}>
                  <span className="font-semibold">{o.order_no}</span>
                  <span className="text-sm text-muted-foreground">{o.order_type}</span>
                  <span className={cn("text-[11px] uppercase rounded-full border px-2 py-0.5", toneClass[statusTone(o.status)])}>{o.status}</span>
                  <span className="text-sm text-muted-foreground">{new Date(o.opened_at).toLocaleString()}</span>
                  {o.server_name && <span className="text-sm text-muted-foreground">{o.server_name}</span>}
                  <span className="ml-auto tabular-nums font-semibold">{fmtMoney(Number(o.total))}</span>
                </button>
                {open && (
                  <div className="border-t p-3 space-y-3">
                    <ul className="text-sm space-y-1">
                      {lines.map((l) => (
                        <li key={l.id} className="flex justify-between">
                          <span>{l.qty} × {l.item_name}{l.notes ? ` — ${l.notes}` : ""}</span>
                          <span className="tabular-nums">{fmtMoney(Number(l.price) * Number(l.qty))}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="grid gap-1 text-sm max-w-xs ml-auto">
                      <Row label="Subtotal" value={Number(o.subtotal)} />
                      {Number(o.discount) > 0 && <Row label="Discount" value={-Number(o.discount)} />}
                      {Number(o.service_charge) > 0 && <Row label="Service charge" value={Number(o.service_charge)} />}
                      {Number(o.delivery_fee) > 0 && <Row label="Delivery" value={Number(o.delivery_fee)} />}
                      {Number(o.gratuity) > 0 && <Row label="Gratuity" value={Number(o.gratuity)} />}
                      <Row label="VAT" value={Number(o.tax)} />
                      <Row label="Total" value={Number(o.total)} bold />
                    </div>
                    {o.status !== "paid" && o.status !== "void" && (
                      <div className="flex flex-wrap gap-2">
                        {PAYMENT_METHODS.slice(0, 4).map((m) => (
                          <Button key={m} size="sm" variant="outline" onClick={() => settle(o, m)}>Settle · {m}</Button>
                        ))}
                        <Button size="sm" variant="destructive" onClick={() => voidOrder(o)}>Void</Button>
                      </div>
                    )}
                    {o.status !== "void" && (
                      <div className="rounded-xl border bg-muted/30 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accounting impact</div>
                        <DocumentImpact kind="pos" reference={`RPOS:${o.id}`} entryId={o.journal_entry_id ?? null} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold && "font-semibold border-t pt-1")}>
      <span>{label}</span><span className="tabular-nums">{fmtMoney(value)}</span>
    </div>
  );
}
