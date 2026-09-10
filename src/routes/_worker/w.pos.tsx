import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can, canFully, type PosFeature } from "@/lib/pos-permissions";
import {
  fetchMenu, fetchTables, cartTotals, createOrder, payOrder, money, posErrorMessage,
  normalizeOrderItem, type CartLine, type MenuItem, type PaymentDetails,
} from "@/lib/worker-pos";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export const Route = createFileRoute("/_worker/w/pos")({
  head: () => ({
    meta: [
      { title: "POS Terminal — SifoBooks POS" },
      { name: "description", content: "Take counter, dine-in, takeaway, delivery, drive-thru and bar orders and settle payment." },
      { property: "og:title", content: "POS Terminal — SifoBooks POS" },
      { property: "og:description", content: "Order type, menu, modifiers, send to kitchen and payment in one screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    table: typeof search['table'] === "string" ? (search['table'] as string) : undefined,
  }),
  component: WorkerPos,
});

const ORDER_TYPES: { key: string; label: string; feature: PosFeature; table?: boolean; kitchen?: boolean }[] = [
  { key: "counter", label: "Counter", feature: "pos_sales" },
  { key: "dine-in", label: "Dine-in", feature: "dine_in", table: true, kitchen: true },
  { key: "takeaway", label: "Takeaway", feature: "takeaway", kitchen: true },
  { key: "delivery", label: "Delivery", feature: "delivery", kitchen: true },
  { key: "drive-thru", label: "Drive-thru", feature: "takeaway" },
  { key: "bar", label: "Bar", feature: "pos_sales" },
];

type Stage = "draft" | "sent_to_kitchen" | "payment" | "completed";

function WorkerPos() {
  const ctx = usePosContext();
  const net = useNetworkStatus();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  /* A waiter arriving from the floor plan already picked a table — carry it through. */
  const { table: tableFromFloor } = Route.useSearch();
  const [orderType, setOrderType] = useState<string>(tableFromFloor ? "dine-in" : "counter");
  const [tableId, setTableId] = useState<string | null>(tableFromFloor ?? null);
  const [guests, setGuests] = useState(1);
  const [cat, setCat] = useState<string>("All");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isPaying, setPaying] = useState(false);
  const [openOrder, setOpenOrder] = useState<{ id: string; order_no: string | null } | null>(null);
  const [stage, setStage] = useState<Stage>("draft");
  const [lastError, setLastError] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<PaymentDetails["method"] | null>(null);
  const submitLock = useRef(false);

  const types = ORDER_TYPES.filter((t) => can(ctx, t.feature));

  useEffect(() => {
    if (!ctx?.tenantId) return;
    fetchMenu(ctx.tenantId).then(setMenu);
    fetchTables(ctx.tenantId).then(setTables);
  }, [ctx?.tenantId]);

  useEffect(() => { if (types.length && !types.some(t => t.key === orderType)) setOrderType(types[0].key); }, [types.length]);
  useEffect(() => { if (tableFromFloor) { setTableId(tableFromFloor); setOrderType("dine-in"); } }, [tableFromFloor]);

  const cats = useMemo(() => ["All", ...Array.from(new Set(menu.map((m) => m.category || "Other")))], [menu]);
  const shown = cat === "All" ? menu : menu.filter((m) => (m.category || "Other") === cat);
  const totals = cartTotals(lines, discount);
  const typeCfg = ORDER_TYPES.find((t) => t.key === orderType);
  const needsTable = !!typeCfg?.table;
  const usesKitchen = !!typeCfg?.kitchen;

  const resetCheck = () => {
    setLines([]); setDiscount(0); setOpenOrder(null); setTableId(null);
    setStage("draft"); setLastError(null);
  };

  const add = (m: MenuItem) => {
    if (m.is_86) return toast.error(`${m.name} is 86'd`);
    if (stage !== "draft") return toast.error("Order already sent — start a new check for more items.");
    setLines((ls) => {
      const found = ls.find((l) => l.menu_item_id === m.id && !l.notes && !l.modifiers.length);
      if (found) return ls.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, normalizeCartLine({
        key: crypto.randomUUID(), menu_item_id: m.id, item_name: m.name, qty: 1,
        price: Number(m.price), unit_cost: Number(m.cost ?? 0), station: m.station, notes: "", modifiers: [],
      })];
    });
  };

  /** Keep cart state itself normalized — modifiers can never become null. */
  const normalizeCartLine = (l: CartLine): CartLine => {
    const n = normalizeOrderItem(l);
    return { ...l, qty: n.qty, unit_cost: n.unit_cost, station: n.station, notes: n.notes, modifiers: n.modifiers };
  };

  const bump = (key: string, d: number) =>
    setLines((ls) => ls.flatMap((l) => (l.key === key ? (l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d }]) : [l])));

  const removeLine = (key: string) => {
    if (!can(ctx, "void_item")) return toast.error("Your role cannot void items");
    setLines((ls) => ls.filter((l) => l.key !== key));
  };

  /** Create the order (and kitchen tickets) exactly once. Returns the order or null. */
  const submitOrder = async (opts: { skipKitchen?: boolean } = {}) => {
    if (!ctx?.tenantId) return null;
    if (openOrder) return openOrder;                       // idempotency guard
    if (submitLock.current) { toast.message("Order already sending…"); return null; }
    if (!lines.length) { toast.error("Add items to the check first"); return null; }
    if (needsTable && !tableId) { toast.error("Select a table first"); return null; }

    submitLock.current = true;
    setSubmitting(true);
    setLastError(null);
    try {
      const o = await createOrder({
        tenantId: ctx.tenantId, orderType, lines, tableId, guests,
        serverName: ctx.displayName, discount, skipKitchen: opts.skipKitchen,
      });
      setOpenOrder(o);
      if (!opts.skipKitchen) {
        setStage("sent_to_kitchen");
        toast.success(`✓ Sent to Kitchen — Order ${o.order_no}`);
      } else {
        setStage("payment");
      }
      return o;
    } catch (e: any) {
      console.error("[POS] order submission failed", e);
      const msg = posErrorMessage(e);
      setLastError(msg);
      toast.error(msg);
      return null;                                          // cart is intentionally kept
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const sendToKitchen = () => {
    if (stage !== "draft") return toast.message("Order already sent");
    void submitOrder();
  };

  const openPayment = (method: PaymentDetails["method"]) => {
    if (!lines.length) return toast.error("Add items to the check first");
    if (needsTable && !tableId) return toast.error("Select a table first");
    setPayFor(method);
  };

  const completePayment = async (details: PaymentDetails) => {
    setPaying(true);
    try {
      const order = openOrder ?? (await submitOrder({ skipKitchen: !usesKitchen }));
      if (!order) return;
      const res = await payOrder(order.id, details);
      setStage("completed");
      toast.success(
        details.method === "cash" && res.change > 0
          ? `Paid ${money(res.amount)} — change ${money(res.change)}`
          : `Paid ${money(res.amount)} — posted to accounting`,
      );
      setPayFor(null);
      resetCheck();
    } catch (e: any) {
      console.error("[POS] payment failed", e);
      const msg = posErrorMessage(e);
      setLastError(msg);
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  };

  if (!can(ctx, "pos_sales")) {
    return <div className="p-10 text-center text-slate-400">Your role does not have POS sales access.</div>;
  }

  const canTakePayment = can(ctx, "cash_drawer") || !!ctx?.isOwner;

  return (
    <div className="flex min-h-0 flex-col lg:flex-row" style={{ height: "100%", touchAction: "manipulation" }}>
      {/* Menu */}
      <div className="min-w-0 flex-1 space-y-3 overflow-x-hidden p-4">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button key={t.key} type="button" onClick={() => { setOrderType(t.key); if (!t.table) setTableId(null); }}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold ${orderType === t.key ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {needsTable && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={tableId ?? ""} onChange={(e) => setTableId(e.target.value || null)}
              className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Select table…</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.status}</option>)}
            </select>
            <input type="number" min={1} value={guests} onChange={(e) => setGuests(Math.max(1, +e.target.value || 1))}
              className="min-h-[44px] w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Guests" />
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${cat === c ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-300"}`}>{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((m) => (
            <button key={m.id} type="button" onClick={() => add(m)}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-emerald-500 active:scale-[0.98]">
              <div className="font-semibold leading-tight">{m.name}</div>
              <div className="mt-2 font-bold text-emerald-400">{money(m.price)}</div>
              {m.is_86 && <div className="mt-1 text-[11px] text-rose-400">86'd</div>}
            </button>
          ))}
          {!shown.length && <div className="col-span-full text-sm text-slate-500">No menu items yet.</div>}
        </div>
      </div>

      {/* Check */}
      <aside
        className="flex shrink-0 flex-col border-t border-slate-800 bg-slate-900/60 lg:w-[380px] lg:border-l lg:border-t-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="font-semibold">Current check</div>
          <div className="flex items-center gap-2 text-xs uppercase text-slate-400">
            {net.state === "offline" && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300">Offline</span>}
            {stage !== "draft" && <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">{stage.replace(/_/g, " ")}</span>}
            <span>{orderType}</span>
          </div>
        </div>

        <div className="max-h-[38vh] flex-1 space-y-2 overflow-auto p-3 lg:max-h-none">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{l.item_name}</div>
                <div className="text-xs text-slate-400">{l.qty} × {money(l.price)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Decrease" onClick={() => bump(l.key, -1)} className="h-8 w-8 rounded-lg bg-slate-700 text-sm font-bold">−</button>
                <button type="button" aria-label="Increase" onClick={() => bump(l.key, 1)} className="h-8 w-8 rounded-lg bg-slate-700 text-sm font-bold">+</button>
              </div>
              <div className="text-sm font-semibold">{money(l.qty * l.price)}</div>
              <button type="button" aria-label="Remove" onClick={() => removeLine(l.key)} className="text-slate-500 hover:text-rose-400"><Icons.X className="h-4 w-4" /></button>
            </div>
          ))}
          {!lines.length && <div className="p-3 text-sm text-slate-500">Tap menu items to build the check.</div>}
        </div>

        <div className="space-y-2 border-t border-slate-800 p-4 text-sm">
          {lastError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              <div className="font-semibold">Unable to send order</div>
              <div className="mt-0.5">{lastError}</div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void submitOrder()} className="rounded-lg bg-rose-500 px-3 py-1.5 font-semibold text-white">Retry</button>
                <button type="button" onClick={() => setLastError(null)} className="rounded-lg bg-slate-700 px-3 py-1.5 font-semibold">Dismiss</button>
              </div>
            </div>
          )}

          {can(ctx, "discount") && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Discount</span>
              <input type="number" min={0} value={discount}
                onChange={(e) => {
                  const v = +e.target.value;
                  const cap = canFully(ctx, "discount") ? Infinity : totals.subtotal * 0.1;
                  setDiscount(Math.max(0, Math.min(v, cap)));
                }}
                className="ml-auto w-28 rounded-lg bg-slate-800 px-2 py-1 text-right" />
            </div>
          )}
          <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="flex justify-between text-slate-400"><span>VAT 16%</span><span>{money(totals.tax)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(totals.total)}</span></div>

          {usesKitchen && (
            <Button type="button" className="h-[52px] w-full bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
              disabled={isSubmitting || !lines.length || stage !== "draft"} onClick={sendToKitchen}>
              {isSubmitting ? <><Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                : stage !== "draft" ? <>✓ Sent to Kitchen{openOrder?.order_no ? ` — ${openOrder.order_no}` : ""}</>
                : <><Icons.ChefHat className="mr-2 h-4 w-4" /> Send to kitchen</>}
            </Button>
          )}

          {canTakePayment ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <PayButton label="Cash" className="sm:col-span-1" disabled={isPaying || !lines.length} onClick={() => openPayment("cash")} />
              <PayButton label="Card" disabled={isPaying || !lines.length} onClick={() => openPayment("card")} />
              <PayButton label="MoMo" disabled={isPaying || !lines.length} onClick={() => openPayment("momo")} />
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500">Payment is handled by the cashier.</div>
          )}
        </div>
      </aside>

      {payFor && (
        <PaymentDialog
          method={payFor}
          due={totals.total}
          busy={isPaying}
          onCancel={() => setPayFor(null)}
          onConfirm={completePayment}
        />
      )}
    </div>
  );
}

function PayButton({ label, disabled, onClick, className = "" }: { label: string; disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ touchAction: "manipulation" }}
      className={`relative z-10 min-h-[52px] rounded-xl bg-slate-700 text-base font-bold text-white transition hover:bg-slate-600 active:scale-[0.98] active:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${className}`}
    >
      {label}
    </button>
  );
}

/* ------------------------- payment dialogs ------------------------- */

const PROVIDERS = ["MTN MoMo", "Airtel Money", "Zamtel Kwacha"];

function PaymentDialog({
  method, due, busy, onCancel, onConfirm,
}: {
  method: PaymentDetails["method"];
  due: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (d: PaymentDetails) => void;
}) {
  const [received, setReceived] = useState<string>("");
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const tendered = Number(received || 0);
  const change = Math.max(0, +(tendered - due).toFixed(2));
  const cashShort = method === "cash" && tendered < due;

  const title = method === "cash" ? "Cash payment" : method === "card" ? "Card payment" : "Mobile money";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 sm:items-center"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
        <h2 className="text-lg font-bold uppercase tracking-wide">{title}</h2>

        <div className="mt-4 rounded-xl bg-slate-800 p-4">
          <div className="text-xs uppercase text-slate-400">Amount due</div>
          <div className="text-3xl font-black text-emerald-400">{money(due)}</div>
        </div>

        {method === "cash" && (
          <>
            <label className="mt-4 block text-xs uppercase text-slate-400">Amount received</label>
            <input autoFocus type="number" inputMode="decimal" min={0} value={received}
              onChange={(e) => setReceived(e.target.value)}
              className="mt-1 h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-2xl font-bold outline-none focus:border-emerald-500" />
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[due, 50, 100, 200, 500].slice(0, 4).map((v, i) => (
                <button key={i} type="button" onClick={() => setReceived(String(+Number(v).toFixed(2)))}
                  className="min-h-[44px] rounded-lg bg-slate-800 text-sm font-semibold">{i === 0 ? "Exact" : money(Number(v))}</button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
              <span className="text-xs uppercase text-slate-400">Change</span>
              <span className="text-xl font-bold">{money(change)}</span>
            </div>
          </>
        )}

        {method === "momo" && (
          <>
            <label className="mt-4 block text-xs uppercase text-slate-400">Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3">
              {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <label className="mt-3 block text-xs uppercase text-slate-400">Customer phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="097XXXXXXX"
              className="mt-1 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3" />
            <label className="mt-3 block text-xs uppercase text-slate-400">Reference (optional)</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3" />
          </>
        )}

        {method === "card" && (
          <>
            <label className="mt-4 block text-xs uppercase text-slate-400">Approval / reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Terminal approval code"
              className="mt-1 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3" />
          </>
        )}

        {method !== "cash" && (
          <label className="mt-4 flex items-start gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>I confirm the {method === "card" ? "card terminal" : "mobile money"} payment was approved.</span>
          </label>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={busy}
            className="min-h-[52px] rounded-xl bg-slate-700 font-bold disabled:opacity-50">Cancel</button>
          <button
            type="button"
            disabled={busy || cashShort || (method !== "cash" && !confirmed)}
            onClick={() => onConfirm({
              method, amount: due,
              tendered: method === "cash" ? tendered : due,
              reference: reference || null,
              provider: method === "momo" ? provider : null,
              phone: method === "momo" ? (phone || null) : null,
            })}
            className="min-h-[52px] rounded-xl bg-emerald-500 font-bold text-slate-950 transition active:scale-[0.98] disabled:opacity-50">
            {busy ? "Processing…" : method === "cash" ? "Complete sale" : method === "card" ? "Complete card sale" : "Complete payment"}
          </button>
        </div>
        {cashShort && <p className="mt-2 text-center text-xs text-amber-300">Cash received is less than the amount due.</p>}
      </div>
    </div>
  );
}
