import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can, canFully, type PosFeature } from "@/lib/pos-permissions";
import { fetchMenu, fetchTables, cartTotals, createOrder, payOrder, money, type CartLine, type MenuItem } from "@/lib/worker-pos";

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
  component: WorkerPos,
});

const ORDER_TYPES: { key: string; label: string; feature: PosFeature; table?: boolean }[] = [
  { key: "counter", label: "Counter", feature: "pos_sales" },
  { key: "dine-in", label: "Dine-in", feature: "dine_in", table: true },
  { key: "takeaway", label: "Takeaway", feature: "takeaway" },
  { key: "delivery", label: "Delivery", feature: "delivery" },
  { key: "drive-thru", label: "Drive-thru", feature: "takeaway" },
  { key: "bar", label: "Bar", feature: "pos_sales" },
];

function WorkerPos() {
  const ctx = usePosContext();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [orderType, setOrderType] = useState<string>("counter");
  const [tableId, setTableId] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [cat, setCat] = useState<string>("All");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [tender, setTender] = useState<string>("");

  const types = ORDER_TYPES.filter((t) => can(ctx, t.feature));

  useEffect(() => {
    if (!ctx?.tenantId) return;
    fetchMenu(ctx.tenantId).then(setMenu);
    fetchTables(ctx.tenantId).then(setTables);
  }, [ctx?.tenantId]);

  useEffect(() => { if (types.length && !types.some(t => t.key === orderType)) setOrderType(types[0].key); }, [types.length]);

  const cats = useMemo(() => ["All", ...Array.from(new Set(menu.map((m) => m.category || "Other")))], [menu]);
  const shown = cat === "All" ? menu : menu.filter((m) => (m.category || "Other") === cat);
  const totals = cartTotals(lines, discount);
  const needsTable = ORDER_TYPES.find((t) => t.key === orderType)?.table;

  const add = (m: MenuItem) => {
    if (m.is_86) return toast.error(`${m.name} is 86'd`);
    setLines((ls) => {
      const found = ls.find((l) => l.menu_item_id === m.id && !l.notes);
      if (found) return ls.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { key: crypto.randomUUID(), menu_item_id: m.id, item_name: m.name, qty: 1, price: m.price, unit_cost: m.cost ?? 0, station: m.station, notes: "", modifiers: [] }];
    });
  };

  const removeLine = (key: string) => {
    if (!can(ctx, "void_item")) return toast.error("Your role cannot void items");
    setLines((ls) => ls.filter((l) => l.key !== key));
  };

  const send = async () => {
    if (!ctx?.tenantId || !lines.length) return;
    if (needsTable && !tableId) return toast.error("Select a table first");
    setBusy(true);
    try {
      const o = await createOrder({
        tenantId: ctx.tenantId, orderType, lines, tableId, guests,
        serverName: ctx.displayName, discount,
      });
      setOpenOrderId(o.id);
      toast.success(`Order ${o.order_no} sent to kitchen`);
    } catch (e: any) { toast.error(e.message ?? "Could not send order"); }
    finally { setBusy(false); }
  };

  const settle = async (method: string) => {
    if (!openOrderId) return toast.error("Send the order to the kitchen first");
    setBusy(true);
    try {
      await payOrder(openOrderId, method, method === "cash" ? Number(tender || totals.total) : totals.total);
      toast.success("Payment captured — posted to accounting automatically");
      setLines([]); setDiscount(0); setOpenOrderId(null); setTableId(null); setTender("");
    } catch (e: any) { toast.error(e.message ?? "Payment failed"); }
    finally { setBusy(false); }
  };

  if (!can(ctx, "pos_sales")) {
    return <div className="p-10 text-center text-slate-400">Your role does not have POS sales access.</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* Menu */}
      <div className="flex-1 min-w-0 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button key={t.key} onClick={() => { setOrderType(t.key); if (!t.table) setTableId(null); }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${orderType === t.key ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {needsTable && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={tableId ?? ""} onChange={(e) => setTableId(e.target.value || null)}
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm">
              <option value="">Select table…</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.status}</option>)}
            </select>
            <input type="number" min={1} value={guests} onChange={(e) => setGuests(+e.target.value)}
              className="w-24 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm" placeholder="Guests" />
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${cat === c ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-300"}`}>{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {shown.map((m) => (
            <button key={m.id} onClick={() => add(m)}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left hover:border-emerald-500 active:scale-[0.98] transition">
              <div className="font-semibold leading-tight">{m.name}</div>
              <div className="mt-2 text-emerald-400 font-bold">{money(m.price)}</div>
              {m.is_86 && <div className="text-[11px] text-rose-400 mt-1">86'd</div>}
            </button>
          ))}
          {!shown.length && <div className="col-span-full text-slate-500 text-sm">No menu items yet.</div>}
        </div>
      </div>

      {/* Check */}
      <aside className="lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="font-semibold">Current check</div>
          <div className="text-xs text-slate-400 uppercase">{orderType}</div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{l.item_name}</div>
                <div className="text-xs text-slate-400">{l.qty} × {money(l.price)}</div>
              </div>
              <div className="text-sm font-semibold">{money(l.qty * l.price)}</div>
              <button onClick={() => removeLine(l.key)} className="text-slate-500 hover:text-rose-400"><Icons.X className="h-4 w-4" /></button>
            </div>
          ))}
          {!lines.length && <div className="text-slate-500 text-sm p-3">Tap menu items to build the check.</div>}
        </div>

        <div className="border-t border-slate-800 p-4 space-y-2 text-sm">
          {can(ctx, "discount") && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Discount</span>
              <input type="number" min={0} value={discount}
                onChange={(e) => {
                  const v = +e.target.value;
                  const cap = canFully(ctx, "discount") ? Infinity : totals.subtotal * 0.1;
                  setDiscount(Math.min(v, cap));
                }}
                className="ml-auto w-28 rounded-lg bg-slate-800 px-2 py-1 text-right" />
            </div>
          )}
          <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="flex justify-between text-slate-400"><span>VAT 16%</span><span>{money(totals.tax)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(totals.total)}</span></div>

          <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            disabled={busy || !lines.length} onClick={send}>
            <Icons.ChefHat className="h-4 w-4 mr-2" /> Send to kitchen
          </Button>

          {can(ctx, "cash_drawer") || ctx?.isOwner ? (
            <div className="grid grid-cols-3 gap-2">
              {["cash", "card", "momo"].map((m) => (
                <Button key={m} variant="secondary" disabled={busy || !openOrderId}
                  className="h-11 capitalize" onClick={() => settle(m)}>{m}</Button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center">Payment is handled by the cashier.</div>
          )}
        </div>
      </aside>
    </div>
  );
}
