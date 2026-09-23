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
import { PAYMENT_METHODS, statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { DocumentImpact } from "@/components/accounting/LedgerImpactSheet";
import { CheckOperations } from "@/components/restaurant/CheckOperations";
import { checkCost, linesMissingCost } from "@/lib/restaurant-checks";
import { Printer, ChefHat, Wine } from "lucide-react";
import { loadPosContext, canFully, type PosContext } from "@/lib/pos-permissions";
import { getTerminalInfo } from "@/services/printTerminal";
import { printReceipt, printKitchenOrder, printBarOrder } from "@/services/universalPrintService";
import { reverseRestaurantSaleFn } from "@/lib/restaurant/reversal";

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
  const [posContext, setPosContext] = useState<PosContext | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

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
  useEffect(() => {
    void loadPosContext().then(setPosContext);
  }, []);

  const refundOrder = async (o: any) => {
    if (!canFully(posContext, "void_item")) {
      return toast.error("Manager or supervisor permission is required to refund a restaurant check.");
    }
    const reason = window.prompt("Reason for refunding this posted check?");
    if (!reason?.trim()) return;
    try {
      const result = await reverseRestaurantSaleFn({ data: {
        orderId: o.id,
        action: "refund",
        reason: reason.trim(),
      }});
      if (result.error) return toast.error(result.error.message);
      toast.success(`Refund posted: ${result.data?.reversalNo ?? "complete"}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Refund failed");
    }
  };


  const voidOrder = async (o: any) => {
    if (!canFully(posContext, "void_item")) {
      return toast.error("Manager or supervisor permission is required to void a restaurant check.");
    }
    const reason = window.prompt("Reason for voiding this check?");
    if (!reason) return;
    const { error } = await db.from("restaurant_orders").update({ status: "void", void_reason: reason, closed_at: new Date().toISOString() }).eq("id", o.id).in("status", ["open", "held"]);
    if (error) return toast.error(error.message);
    if (o.table_id) await db.from("restaurant_tables").update({ status: "available", occupied_since: null }).eq("id", o.table_id);
    toast.success("Check voided");
    load();
  };

  const buildReceipt = async (o: any, lines: any[]) => {
    const terminal = getTerminalInfo();
    const { data: payments } = await db.from("restaurant_payments")
      .select("method,amount,tendered,change_given,reference")
      .eq("order_id", o.id)
      .order("created_at", { ascending: true });
    const rows = payments ?? [];
    const paid = rows.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const tendered = rows.reduce((sum: number, p: any) => sum + Number(p.tendered || p.amount || 0), 0);
    const change = rows.reduce((sum: number, p: any) => sum + Number(p.change_given || 0), 0);
    const methods = rows.map((p: any) => `${p.method}: ${fmtMoney(Number(p.amount || 0))}`).join(" + ");
    return {
      businessName: terminal.company_name || "SifoBooks",
      branchName: terminal.branch_name,
      receiptNumber: o.receipt_number ?? o.order_no ?? o.id,
      date: o.closed_at ?? o.opened_at ?? new Date().toISOString(),
      cashier: o.server_name ?? undefined,
      items: lines.map((l: any) => ({
        name: l.item_name ?? l.name ?? "Item",
        quantity: Number(l.qty ?? l.quantity ?? 1),
        price: Number(l.price || 0),
        total: Number(l.price || 0) * Number(l.qty ?? l.quantity ?? 1),
        modifiers: l.notes ? [String(l.notes)] : undefined,
      })),
      subtotal: Number(o.subtotal || 0),
      discount: Number(o.discount || 0),
      tax: Number(o.tax || 0),
      total: Number(o.total || 0),
      paymentMethod: methods || o.payment_method || undefined,
      amountPaid: paid || Number(o.amount_paid || 0),
      change,
      footer: "SifoBooks Restaurant — customer copy",
    };
  };

  const reprintReceipt = async (o: any, lines: any[]) => {
    if (!canFully(posContext, "reports")) {
      return toast.error("Manager or supervisor permission is required for historical receipt reprints.");
    }
    if (printingId) return;
    setPrintingId(o.id);
    try {
      const receipt = await buildReceipt(o, lines);
      const result = await printReceipt(receipt, undefined, 1, {
        jobId: `reprint:receipt:${o.id}:${Date.now()}`,
        reference: o.order_no ?? o.id,
        openCashDrawer: false,
      });
      if (!result.ok) toast.warning(`Receipt queued: ${result.error ?? "printer unavailable"}`);
      else toast.success(`Receipt reprint sent for ${o.order_no ?? o.id}`);
    } finally {
      setPrintingId(null);
    }
  };

  const reprintKitchen = async (o: any, lines: any[]) => {
    if (!canFully(posContext, "reports")) return toast.error("Manager or supervisor permission is required for kitchen reprints.");
    const items = lines.map((l: any) => ({
      name: l.item_name ?? l.name ?? "Item",
      quantity: Number(l.qty ?? l.quantity ?? 1),
      modifiers: l.notes ? [String(l.notes)] : undefined,
      notes: l.notes ? String(l.notes) : undefined,
    }));
    const result = await printKitchenOrder({
      orderNumber: o.order_no ?? o.id,
      tableNumber: o.table_name ?? undefined,
      waiter: o.server_name ?? undefined,
      orderType: o.order_type ?? undefined,
      items,
      notes: "REPRINT — kitchen copy",
    }, undefined, { jobId: `reprint:kitchen:${o.id}:${Date.now()}`, reference: o.order_no ?? o.id });
    if (!result.ok) toast.warning(`Kitchen ticket queued: ${result.error ?? "printer unavailable"}`);
    else toast.success(`Kitchen reprint sent for ${o.order_no ?? o.id}`);
  };

  const reprintBar = async (o: any, lines: any[]) => {
    if (!canFully(posContext, "reports")) return toast.error("Manager or supervisor permission is required for bar reprints.");
    const items = lines.map((l: any) => ({
      name: l.item_name ?? l.name ?? "Item",
      quantity: Number(l.qty ?? l.quantity ?? 1),
      modifiers: l.notes ? [String(l.notes)] : undefined,
      notes: l.notes ? String(l.notes) : undefined,
    }));
    const result = await printBarOrder({
      orderNumber: o.order_no ?? o.id,
      tableNumber: o.table_name ?? undefined,
      waiter: o.server_name ?? undefined,
      orderType: o.order_type ?? undefined,
      items,
      notes: "REPRINT — bar copy",
    }, undefined, { jobId: `reprint:bar:${o.id}:${Date.now()}`, reference: o.order_no ?? o.id });
    if (!result.ok) toast.warning(`Bar ticket queued: ${result.error ?? "printer unavailable"}`);
    else toast.success(`Bar reprint sent for ${o.order_no ?? o.id}`);
  };

  const shown = useMemo(() => orders.filter((o) =>
    (status === "all" || o.status === status) &&
    (!q || `${o.order_no} ${o.customer_name ?? ""} ${o.server_name ?? ""} ${o.order_type}`.toLowerCase().includes(q.toLowerCase()))
  ), [orders, status, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <div className="text-[11px] font-black uppercase tracking-[.18em] text-[#087b4b]">Sales control</div><h1 className="text-2xl font-black tracking-tight text-[#173b3a]">Orders & History</h1>
          <p className="text-sm text-muted-foreground">{shown.length} checks · net {fmtMoney(shown.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.total || 0), 0))} · refunds {fmtMoney(shown.filter((o) => o.status === "refunded").reduce((s, o) => s + Number(o.total || 0), 0))}</p>
        </div>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "open", "held", "paid", "refunded", "void"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
              <Card key={o.id} className="rounded-2xl overflow-hidden border-[#dbe5e2] bg-white shadow-sm">
                <button className="w-full text-left p-4 flex flex-wrap items-center gap-3 hover:bg-[#f3f8f6]"
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
                    {(o.status === "open" || o.status === "held") && !o.journal_entry_id && (
                      <CheckOperations
                        order={o}
                        lines={lines as any}
                        openChecks={orders.filter((x) => (x.status === "open" || x.status === "held") && !x.journal_entry_id)}
                        onDone={load}
                      />
                    )}
                    <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost of sales (server-calculated)</span>
                        <span className="tabular-nums">{fmtMoney(checkCost(lines as any))}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Gross margin</span>
                        <span className="tabular-nums">{fmtMoney(Number(o.subtotal || 0) - Number(o.discount || 0) - checkCost(lines as any))}</span>
                      </div>
                      {linesMissingCost(lines as any).length > 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          {linesMissingCost(lines as any).length} line(s) have no recipe or item cost yet — margin is understated until you add one.
                        </p>
                      )}
                    </div>
                    {(o.status === "open" || o.status === "held") && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => voidOrder(o)}>Void</Button>
                        <span className="self-center text-xs text-muted-foreground">Open/held checks must be settled from the POS so stock, drawer and accounting post atomically.</span>
                      </div>
                    )}
                    {o.status === "paid" && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="destructive" onClick={() => refundOrder(o)}>Refund posted check</Button>
                        <span className="self-center text-xs text-muted-foreground">Manager approval reverses stock, payment, cash drawer and journal impact together.</span>
                      </div>
                    )}
                    {o.status !== "void" && (
                      <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={printingId === o.id} onClick={() => reprintReceipt(o, lines)}>
                        <Printer className="mr-1 h-4 w-4" /> {printingId === o.id ? "Printing…" : "Reprint receipt"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reprintKitchen(o, lines)}>
                        <ChefHat className="mr-1 h-4 w-4" /> Kitchen reprint
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reprintBar(o, lines)}>
                        <Wine className="mr-1 h-4 w-4" /> Bar reprint
                      </Button>
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
