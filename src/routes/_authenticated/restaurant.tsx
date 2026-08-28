import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { RequireModule } from "@/components/RequireModule";
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed, Wine, LayoutGrid, ShoppingBag, ChefHat, ListOrdered,
  BarChart3, Clock, Plus, Minus, Trash2, Send, CreditCard, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant")({
  head: () => ({
    meta: [
      { title: "Restaurant POS — SifoBooks" },
      { name: "description", content: "Touch restaurant POS with tables, kitchen display, menu management and end-of-day cash-up, posted straight to your books." },
      { property: "og:title", content: "Restaurant POS — SifoBooks" },
      { property: "og:description", content: "Run dine-in, bar and takeaway service with live checks, KDS tickets and daily sales analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RequireModule moduleKey="restaurant"><Page /></RequireModule>,
});

/* ---------------- types ---------------- */
type MenuItem = { id: string; name: string; category: string; price: number; cost: number; station: string; active: boolean };
type RTable = { id: string; name: string; seats: number; area: string; status: string };
type Order = { id: string; order_no: string | null; table_id: string | null; order_type: string; status: string; guests: number; subtotal: number; tax: number; total: number; payment_method: string | null; opened_at: string };
type OrderItem = { id: string; order_id: string; item_name: string; station: string; qty: number; price: number; kds_status: string };
type CartLine = { name: string; station: string; price: number; qty: number; note?: string };

const MODES = [
  { key: "DINE IN", icon: UtensilsCrossed },
  { key: "BAR", icon: Wine },
  { key: "COUNTER", icon: LayoutGrid },
  { key: "TAKEAWAY", icon: ShoppingBag },
];

const SCREENS = [
  { key: "pos", label: "POS", icon: UtensilsCrossed },
  { key: "tables", label: "TABLES", icon: LayoutGrid },
  { key: "orders", label: "ORDERS", icon: ListOrdered },
  { key: "kitchen", label: "KITCHEN", icon: ChefHat },
  { key: "menu", label: "MENU", icon: ListOrdered },
  { key: "analytics", label: "ANALYTICS", icon: BarChart3 },
  { key: "eod", label: "END OF DAY", icon: Clock },
] as const;
type ScreenKey = (typeof SCREENS)[number]["key"];

const VAT_RATE = 0.16;

/* ---------------- page ---------------- */
function Page() {
  const [screen, setScreen] = useState<ScreenKey>("pos");
  const [mode, setMode] = useState("DINE IN");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);

  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [discountPct, setDiscountPct] = useState(0);
  const [server, setServer] = useState("");
  const [recalled, setRecalled] = useState<Order | null>(null);
  const [tender, setTender] = useState<{ method: string; order?: Order; amount: number } | null>(null);
  const [pin, setPin] = useState<{ order: Order } | null>(null);


  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setLoading(false);
    const uid = u.user.id;
    const [m, t, o] = await Promise.all([
      supabase.from("restaurant_menu_items").select("*").eq("user_id", uid).order("category"),
      supabase.from("restaurant_tables").select("*").eq("user_id", uid).order("name"),
      supabase.from("restaurant_orders").select("*").eq("user_id", uid).order("opened_at", { ascending: false }).limit(200),
    ]);
    setMenu((m.data ?? []) as any);
    setTables((t.data ?? []) as any);
    const os = (o.data ?? []) as any as Order[];
    setOrders(os);
    if (os.length) {
      const { data: oi } = await supabase.from("restaurant_order_items").select("*").in("order_id", os.map(x => x.id));
      setItems((oi ?? []) as any);
    } else setItems([]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const seed = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setBusy(true);
    const uid = u.user.id;
    const demoMenu = [
      ["Nshima & Village Chicken", "Mains", 95, 42, "Kitchen"],
      ["Grilled Tilapia", "Mains", 130, 60, "Kitchen"],
      ["Beef Stew & Rice", "Mains", 110, 48, "Kitchen"],
      ["Chicken Burger & Chips", "Grill", 85, 36, "Grill"],
      ["T-Bone Steak", "Grill", 190, 95, "Grill"],
      ["Chips (Large)", "Sides", 35, 12, "Grill"],
      ["Green Salad", "Sides", 40, 14, "Kitchen"],
      ["Mosi Lager", "Bar", 30, 18, "Bar"],
      ["Castle Lite", "Bar", 32, 19, "Bar"],
      ["Soft Drink 300ml", "Bar", 15, 8, "Bar"],
      ["Fresh Juice", "Bar", 25, 10, "Bar"],
      ["Ice Cream", "Desserts", 30, 11, "Kitchen"],
    ] as const;
    await supabase.from("restaurant_menu_items").insert(demoMenu.map(([name, category, price, cost, station]) => ({
      user_id: uid, name, category, price, cost, station,
    })) as any);
    const areas = [["Main", 8], ["Terrace", 4], ["Bar", 4]] as const;
    const rows: any[] = [];
    areas.forEach(([area, n]) => {
      for (let i = 1; i <= (n as number); i++) rows.push({ user_id: uid, name: `${(area as string).slice(0, 1)}${i}`, area, seats: area === "Bar" ? 2 : 4 });
    });
    await supabase.from("restaurant_tables").insert(rows);
    setBusy(false);
    toast.success("Restaurant set up with demo menu and tables");
    load();
  };

  /* ---- cart maths ---- */
  const gross = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = gross * (discountPct / 100);
  const subtotal = gross - discount;
  const tax = subtotal * VAT_RATE;
  const total = subtotal + tax;

  const key = (l: CartLine) => `${l.name}__${l.note ?? ""}`;
  const addToCart = (mi: MenuItem) => {
    setCart(c => {
      const i = c.findIndex(l => l.name === mi.name && !l.note);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { name: mi.name, station: mi.station, price: Number(mi.price), qty: 1 }];
    });
  };
  const bump = (k: string, d: number) =>
    setCart(c => c.flatMap(l => key(l) === k ? (l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d }]) : [l]));
  const setNote = (k: string, note: string) =>
    setCart(c => c.map(l => key(l) === k ? { ...l, note: note || undefined } : l));

  const clearCheck = () => { setCart([]); setDiscountPct(0); setTableId(null); setRecalled(null); };

  /** Persist the current cart. `pay` settles it, `hold` parks it for later recall. */
  const sendOrder = async (pay?: string, hold?: boolean) => {
    if (!cart.length) return toast.error("Add items to the check first");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setBusy(true);
    const uid = u.user.id;
    const status = pay ? "paid" : hold ? "held" : "open";
    if (recalled) await supabase.from("restaurant_order_items").delete().eq("order_id", recalled.id);
    const payload: any = {
      user_id: uid, table_id: mode === "DINE IN" ? tableId : null,
      order_type: mode, guests, subtotal, tax, total, discount,
      server_name: server || null,
      status, payment_method: pay ?? null, closed_at: pay ? new Date().toISOString() : null,
    };
    const q = recalled
      ? supabase.from("restaurant_orders").update(payload).eq("id", recalled.id).select("*").single()
      : supabase.from("restaurant_orders").insert({ ...payload, order_no: `CHK-${Date.now().toString().slice(-6)}` }).select("*").single();
    const { data: ord, error } = await q;
    if (error || !ord) { setBusy(false); return toast.error(error?.message ?? "Could not save check"); }
    const { error: ie } = await supabase.from("restaurant_order_items").insert(cart.map(l => ({
      user_id: uid, order_id: (ord as any).id, item_name: l.name, station: l.station, qty: l.qty, price: l.price,
      notes: l.note ?? null,
      kds_status: pay ? "served" : hold ? "queued" : "queued",
    })) as any);
    if (ie) { setBusy(false); return toast.error(ie.message); }
    if (tableId) await supabase.from("restaurant_tables").update({ status: pay ? "free" : "occupied" }).eq("id", tableId);
    setBusy(false);
    toast.success(pay ? `Paid ${fmtMoney(total)} by ${pay}` : hold ? "Check held — recall it from Orders" : "Sent to kitchen");
    clearCheck(); load();
  };

  const settle = async (o: Order, method: string) => {
    await supabase.from("restaurant_orders").update({ status: "paid", payment_method: method, closed_at: new Date().toISOString() }).eq("id", o.id);
    if (o.table_id) await supabase.from("restaurant_tables").update({ status: "free" }).eq("id", o.table_id);
    toast.success(`Check settled — ${fmtMoney(Number(o.total))}`);
    load();
  };

  /** Load a held/open check back into the POS check panel. */
  const recall = (o: Order) => {
    const lines = items.filter(i => i.order_id === o.id)
      .map(i => ({ name: i.item_name, station: i.station, price: Number(i.price), qty: Number(i.qty), note: (i as any).notes ?? undefined }));
    setCart(lines); setRecalled(o); setMode(o.order_type); setTableId(o.table_id); setGuests(o.guests || 1);
    setDiscountPct(0); setScreen("pos");
    toast.success(`Recalled ${o.order_no}`);
  };

  const voidCheck = async (o: Order) => {
    await supabase.from("restaurant_orders").update({ status: "void", closed_at: new Date().toISOString() }).eq("id", o.id);
    if (o.table_id) await supabase.from("restaurant_tables").update({ status: "free" }).eq("id", o.table_id);
    setPin(null);
    toast.success(`${o.order_no} voided`);
    load();
  };

  const advanceItem = async (it: OrderItem) => {
    const next = it.kds_status === "queued" ? "cooking" : it.kds_status === "cooking" ? "ready" : "served";
    await supabase.from("restaurant_order_items").update({ kds_status: next }).eq("id", it.id);
    setItems(list => list.map(x => x.id === it.id ? { ...x, kds_status: next } : x));
  };


  const cats = useMemo(() => ["All", ...Array.from(new Set(menu.map(m => m.category)))], [menu]);
  const shown = menu.filter(m => m.active && (cat === "All" || m.category === cat));
  const openOrders = orders.filter(o => o.status === "open");
  const heldOrders = orders.filter(o => o.status === "held");
  const today = new Date().toISOString().slice(0, 10);
  const todays = orders.filter(o => o.opened_at.slice(0, 10) === today && o.status !== "void");


  const kpis = {
    orders: todays.length,
    gross: todays.reduce((s, o) => s + Number(o.subtotal), 0),
    tax: todays.reduce((s, o) => s + Number(o.tax), 0),
    net: todays.reduce((s, o) => s + Number(o.total), 0),
    openChecks: openOrders.length,
  };

  const byHour = useMemo(() => {
    const m = new Map<number, number>();
    todays.forEach(o => { const h = new Date(o.opened_at).getHours(); m.set(h, (m.get(h) ?? 0) + Number(o.total)); });
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [orders]);

  const payMix = useMemo(() => {
    const m = new Map<string, number>();
    todays.filter(o => o.status === "paid").forEach(o => m.set(o.payment_method ?? "Cash", (m.get(o.payment_method ?? "Cash") ?? 0) + Number(o.total)));
    return Array.from(m.entries());
  }, [orders]);

  return (
    <div className="p-3 sm:p-5">
      <div className="overflow-hidden rounded-3xl bg-[#7890a4] p-2 shadow-xl sm:p-3">
        {/* topbar */}
        <header className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[#214f4c] px-4 py-3 text-white">
          <span className="text-base font-extrabold tracking-tight">SifoBooks Restaurant</span>
          <span className="flex-1 text-center text-sm font-extrabold tracking-[0.12em] opacity-90">
            {screen === "pos" ? `POS • ${mode}${recalled ? ` • recalled ${recalled.order_no}` : ""}` : SCREENS.find(s => s.key === screen)?.label}
          </span>
          <Input value={server} onChange={e => setServer(e.target.value)} placeholder="Server"
            className="h-8 w-28 border-white/25 bg-white/10 text-xs text-white placeholder:text-white/50" />
          <span className="hidden text-xs opacity-70 sm:block">Posted automatically to your books</span>
        </header>


        <div className="flex gap-3">
          {/* sidebar */}
          <aside className="hidden w-40 shrink-0 flex-col gap-2 lg:flex">
            {SCREENS.map(s => (
              <button key={s.key} onClick={() => setScreen(s.key)}
                className={cn("flex min-h-[58px] items-center gap-2 rounded-[22px] border-2 border-[#aab7c0] px-3 text-left text-[13px] font-bold text-white transition",
                  screen === s.key ? "bg-[#1e514e]" : "bg-[#8193a3] hover:bg-[#748ba0]")}>
                <s.icon className="h-5 w-5 shrink-0" />{s.label}
              </button>
            ))}
          </aside>

          {/* workspace */}
          <section className="min-w-0 flex-1 rounded-[24px] border-2 border-[#7f9896] bg-[#214f4c] p-3 text-white">
            {/* mobile screen pills */}
            <div className="mb-2 flex gap-2 overflow-x-auto lg:hidden">
              {SCREENS.map(s => (
                <button key={s.key} onClick={() => setScreen(s.key)}
                  className={cn("whitespace-nowrap rounded-full border-2 border-[#9aaab5] px-3 py-2 text-[11px] font-extrabold",
                    screen === s.key ? "bg-[#194c49]" : "bg-[#71879a]")}>{s.label}</button>
              ))}
            </div>

            {/* toolbar */}
            <div className="mb-3 flex flex-wrap gap-2">
              {MODES.map(m => (
                <button key={m.key} onClick={() => { setMode(m.key); setScreen("pos"); }}
                  className={cn("flex min-h-[54px] min-w-[76px] flex-col items-center justify-center gap-1 rounded-[28px] border-2 border-[#9aaab5] px-3 text-[11px] font-extrabold",
                    mode === m.key && screen === "pos" ? "bg-[#194c49]" : "bg-[#71879a]")}>
                  <m.icon className="h-5 w-5" />{m.key}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : !menu.length && !tables.length ? (
              <EmptySetup busy={busy} onSeed={seed} />
            ) : screen === "pos" ? (
              <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
                <Card>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {cats.map(c => (
                      <button key={c} onClick={() => setCat(c)}
                        className={cn("rounded-full border-2 border-[#9aaab5] px-3 py-1.5 text-[11px] font-bold", cat === c ? "bg-[#194c49]" : "bg-[#71879a]")}>{c}</button>
                    ))}
                  </div>
                  <div className="grid max-h-[52vh] grid-cols-2 gap-2 overflow-auto sm:grid-cols-3 xl:grid-cols-4">
                    {shown.map(mi => (
                      <button key={mi.id} onClick={() => addToCart(mi)}
                        className="rounded-2xl border-2 border-[#9aaab5] bg-[#f4f5f4] p-3 text-left text-[#20504d] transition hover:bg-white">
                        <div className="text-[13px] font-bold leading-tight">{mi.name}</div>
                        <div className="mt-1 text-[11px] opacity-70">{mi.station}</div>
                        <div className="mt-2 text-sm font-extrabold">{fmtMoney(Number(mi.price))}</div>
                      </button>
                    ))}
                    {!shown.length && <div className="col-span-full py-8 text-center text-sm opacity-70">No items in this category.</div>}
                  </div>
                </Card>

                {/* check */}
                <Card className="flex flex-col">
                  <div className="mb-2 rounded-xl bg-[#eef2f2] px-3 py-2 text-[#38595a]">
                    <strong className="block text-sm">Current check • {mode}</strong>
                    <small className="opacity-75">
                      {mode === "DINE IN" ? (tableId ? `Table ${tables.find(t => t.id === tableId)?.name}` : "No table selected") : "Walk-in"} • {guests} guest(s)
                    </small>
                  </div>
                  {mode === "DINE IN" && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {tables.map(t => (
                        <button key={t.id} onClick={() => setTableId(t.id)}
                          className={cn("rounded-lg border-2 border-[#9aaab5] px-2.5 py-1 text-[11px] font-bold",
                            tableId === t.id ? "bg-[#19b52a]" : t.status === "occupied" ? "bg-[#e66f08]" : "bg-[#71879a]")}>{t.name}</button>
                      ))}
                    </div>
                  )}
                  <div className="min-h-[140px] flex-1 space-y-1.5 overflow-auto rounded-xl bg-[#f4f5f4] p-2 text-[#365454]">
                    {cart.map(l => {
                      const k = key(l);
                      return (
                        <div key={k} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-bold">{l.name}</div>
                            <button
                              onClick={() => {
                                const n = window.prompt("Modifier / kitchen note", l.note ?? "");
                                if (n !== null) setNote(k, n.trim());
                              }}
                              className="text-left text-[11px] italic text-[#0b6d5f] underline-offset-2 hover:underline">
                              {l.note ? l.note : "+ add note"}
                            </button>
                          </div>
                          <button onClick={() => bump(k, -1)} className="rounded-md bg-[#e9eef0] p-1"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-5 text-center text-[12px] font-extrabold">{l.qty}</span>
                          <button onClick={() => bump(k, 1)} className="rounded-md bg-[#e9eef0] p-1"><Plus className="h-3.5 w-3.5" /></button>
                          <span className="w-16 text-right text-[12px] font-extrabold">{fmtMoney(l.price * l.qty)}</span>
                        </div>
                      );
                    })}
                    {!cart.length && <div className="py-10 text-center text-[12px] opacity-60">Tap menu items to start a check.</div>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold opacity-80">Discount</span>
                    {[0, 5, 10, 15].map(p => (
                      <button key={p} onClick={() => setDiscountPct(p)}
                        className={cn("rounded-lg border-2 border-[#9aaab5] px-2 py-1 text-[11px] font-bold", discountPct === p ? "bg-[#19b52a]" : "bg-[#71879a]")}>{p}%</button>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1 rounded-xl bg-[#315d5a] p-3 text-[12px]">
                    <Row label="Gross" value={fmtMoney(gross)} />
                    {discount > 0 && <Row label={`Discount ${discountPct}%`} value={`- ${fmtMoney(discount)}`} />}
                    <Row label="Subtotal" value={fmtMoney(subtotal)} />
                    <Row label={`VAT ${Math.round(VAT_RATE * 100)}%`} value={fmtMoney(tax)} />
                    <div className="flex justify-between border-t border-white/20 pt-1 text-sm font-extrabold"><span>Total</span><span>{fmtMoney(total)}</span></div>
                    {guests > 1 && <Row label={`Split ${guests} ways`} value={fmtMoney(total / guests)} />}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-bold">
                    <span className="opacity-80">Guests</span>
                    <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="rounded-md bg-[#71879a] px-2 py-1">−</button>
                    <span className="w-5 text-center">{guests}</span>
                    <button onClick={() => setGuests(g => g + 1)} className="rounded-md bg-[#71879a] px-2 py-1">+</button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <PosBtn onClick={() => sendOrder()} disabled={busy} className="bg-[#4e89bc]"><Send className="h-4 w-4" /> Send</PosBtn>
                    <PosBtn onClick={() => setTender({ method: "Cash", amount: total })} disabled={busy || !cart.length} className="bg-[#0b9d19]"><CreditCard className="h-4 w-4" /> Cash</PosBtn>
                    <PosBtn onClick={() => sendOrder("Mobile Money")} disabled={busy} className="bg-[#7310c9]">Mobile Money</PosBtn>
                    <PosBtn onClick={() => sendOrder(undefined, true)} disabled={busy} className="bg-[#e66f08]">Hold check</PosBtn>
                    <PosBtn onClick={clearCheck} className="col-span-2 bg-[#f00000]"><Trash2 className="h-4 w-4" /> Clear check</PosBtn>
                  </div>

                </Card>
              </div>
            ) : screen === "tables" ? (
              <Card>
                <H2>Table plan</H2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                  {tables.map(t => {
                    const open = openOrders.find(o => o.table_id === t.id);
                    return (
                      <button key={t.id} onClick={() => { setTableId(t.id); setMode("DINE IN"); setScreen("pos"); }}
                        className={cn("rounded-2xl border-2 border-[#9aaab5] p-3 text-center", open ? "bg-[#e66f08]" : "bg-[#0b9d19]")}>
                        <div className="text-sm font-extrabold">{t.name}</div>
                        <div className="text-[10px] opacity-80">{t.area} • {t.seats}p</div>
                        <div className="mt-1 text-[11px] font-bold">{open ? fmtMoney(Number(open.total)) : "Free"}</div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : screen === "orders" ? (
              <Card>
                <H2>Open checks / orders</H2>
                <Table head={["Check", "Type", "Table", "Items", "Total", "Status", ""]}>
                  {orders.slice(0, 50).map(o => (
                    <tr key={o.id} className="border-b border-white/10">
                      <Td>{o.order_no}</Td>
                      <Td>{o.order_type}</Td>
                      <Td>{tables.find(t => t.id === o.table_id)?.name ?? "—"}</Td>
                      <Td>{items.filter(i => i.order_id === o.id).reduce((s, i) => s + Number(i.qty), 0)}</Td>
                      <Td className="font-extrabold">{fmtMoney(Number(o.total))}</Td>
                      <Td><Pill tone={o.status === "paid" ? "green" : "orange"}>{o.status}</Pill></Td>
                      <Td>{o.status === "open" && (
                        <div className="flex gap-1">
                          <MiniBtn onClick={() => settle(o, "Cash")}>Cash</MiniBtn>
                          <MiniBtn onClick={() => settle(o, "Mobile Money")}>MoMo</MiniBtn>
                        </div>
                      )}</Td>
                    </tr>
                  ))}
                </Table>
              </Card>
            ) : screen === "kitchen" ? (
              <Card>
                <H2>Kitchen display system</H2>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {openOrders.map(o => (
                    <div key={o.id} className="rounded-2xl border-2 border-[#7f9997] bg-[#315d5a] p-3">
                      <div className="mb-2 flex items-center justify-between text-[12px] font-extrabold">
                        <span>{o.order_no} • {o.order_type}</span>
                        <span>{tables.find(t => t.id === o.table_id)?.name ?? "—"}</span>
                      </div>
                      <div className="space-y-1.5">
                        {items.filter(i => i.order_id === o.id).map(i => (
                          <button key={i.id} onClick={() => advanceItem(i)}
                            className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] font-bold",
                              i.kds_status === "queued" ? "bg-[#71879a]" : i.kds_status === "cooking" ? "bg-[#e66f08]" : i.kds_status === "ready" ? "bg-[#0b9d19]" : "bg-[#4e89bc]")}>
                            <span>{Number(i.qty)} × {i.item_name}</span>
                            <span className="text-[10px] uppercase opacity-90">{i.kds_status}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!openOrders.length && <div className="py-10 text-center text-sm opacity-70">No live tickets.</div>}
                </div>
              </Card>
            ) : screen === "menu" ? (
              <MenuAdmin menu={menu} onChanged={load} />
            ) : screen === "analytics" ? (
              <Card>
                <H2>Restaurant analytics — today</H2>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Kpi label="Orders" value={String(kpis.orders)} />
                  <Kpi label="Gross sales" value={fmtMoney(kpis.gross)} />
                  <Kpi label="VAT" value={fmtMoney(kpis.tax)} />
                  <Kpi label="Total" value={fmtMoney(kpis.net)} />
                  <Kpi label="Open checks" value={String(kpis.openChecks)} />
                </div>
                <div className="rounded-2xl bg-[#315d5a] p-3">
                  <div className="mb-2 text-[12px] font-extrabold">Sales by hour</div>
                  <div className="flex h-40 items-end gap-2">
                    {byHour.map(([h, v]) => {
                      const max = Math.max(...byHour.map(x => x[1]), 1);
                      return (
                        <div key={h} className="flex flex-1 flex-col items-center gap-1">
                          <div className="w-full rounded-t-md bg-[#19b52a]" style={{ height: `${(v / max) * 100}%` }} />
                          <span className="text-[9px] opacity-80">{h}:00</span>
                        </div>
                      );
                    })}
                    {!byHour.length && <div className="w-full text-center text-[12px] opacity-70">No sales yet today.</div>}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#315d5a] p-3">
                    <div className="mb-2 text-[12px] font-extrabold">Top selling items</div>
                    {topItems(items).map(([name, qty]) => (
                      <div key={name} className="flex justify-between border-b border-white/10 py-1 text-[12px]"><span>{name}</span><span className="font-bold">{qty}</span></div>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-[#315d5a] p-3">
                    <div className="mb-2 text-[12px] font-extrabold">Payment mix</div>
                    {payMix.map(([m, v]) => (
                      <div key={m} className="flex justify-between border-b border-white/10 py-1 text-[12px]"><span>{m}</span><span className="font-bold">{fmtMoney(v)}</span></div>
                    ))}
                    {!payMix.length && <div className="py-2 text-[12px] opacity-70">Nothing settled yet.</div>}
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <H2>End of day cash-up</H2>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Kpi label="Checks closed" value={String(todays.filter(o => o.status === "paid").length)} />
                  <Kpi label="Checks still open" value={String(kpis.openChecks)} />
                  <Kpi label="Banked total" value={fmtMoney(todays.filter(o => o.status === "paid").reduce((s, o) => s + Number(o.total), 0))} />
                </div>
                <div className="mt-3 rounded-2xl bg-[#315d5a] p-3 text-[12px]">
                  {payMix.map(([m, v]) => (
                    <div key={m} className="flex justify-between border-b border-white/10 py-1"><span>{m} declared</span><span className="font-bold">{fmtMoney(v)}</span></div>
                  ))}
                  <div className="flex justify-between pt-2 text-sm font-extrabold"><span>Net sales incl. VAT</span><span>{fmtMoney(kpis.net)}</span></div>
                </div>
                <p className="mt-3 text-[12px] opacity-80">Closed checks feed daily takings and VAT into your books — no double capture.</p>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- menu admin ---------------- */
function MenuAdmin({ menu, onChanged }: { menu: MenuItem[]; onChanged: () => void }) {
  const [f, setF] = useState({ name: "", category: "Mains", price: "", cost: "", station: "Kitchen" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!f.name.trim()) return toast.error("Item name is required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("restaurant_menu_items").insert({
      user_id: u.user.id, name: f.name, category: f.category, price: Number(f.price || 0), cost: Number(f.cost || 0), station: f.station,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Menu item added");
    setF({ ...f, name: "", price: "", cost: "" });
    onChanged();
  };

  const remove = async (id: string) => {
    await supabase.from("restaurant_menu_items").delete().eq("id", id);
    toast.success("Item removed"); onChanged();
  };

  return (
    <Card>
      <H2>Menu management</H2>
      <div className="mb-3 grid gap-2 rounded-2xl bg-[#315d5a] p-3 sm:grid-cols-6">
        <Input placeholder="Item name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="sm:col-span-2 bg-white text-[#20504d]" />
        <Input placeholder="Category" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} className="bg-white text-[#20504d]" />
        <Input placeholder="Price" type="number" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} className="bg-white text-[#20504d]" />
        <Input placeholder="Cost" type="number" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} className="bg-white text-[#20504d]" />
        <Button onClick={add} disabled={saving} className="bg-[#0b9d19] font-bold hover:bg-[#19b52a]">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Add
        </Button>
      </div>
      <Table head={["Item", "Category", "Station", "Price", "Cost", "GP %", ""]}>
        {menu.map(m => {
          const gp = Number(m.price) ? ((Number(m.price) - Number(m.cost)) / Number(m.price)) * 100 : 0;
          return (
            <tr key={m.id} className="border-b border-white/10">
              <Td className="font-bold">{m.name}</Td>
              <Td>{m.category}</Td>
              <Td>{m.station}</Td>
              <Td>{fmtMoney(Number(m.price))}</Td>
              <Td>{fmtMoney(Number(m.cost))}</Td>
              <Td>{gp.toFixed(0)}%</Td>
              <Td><MiniBtn onClick={() => remove(m.id)}>Delete</MiniBtn></Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

/* ---------------- bits ---------------- */
function topItems(items: OrderItem[]) {
  const m = new Map<string, number>();
  items.forEach(i => m.set(i.item_name, (m.get(i.item_name) ?? 0) + Number(i.qty)));
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[21px] border-2 border-[#7f9997] bg-[#315d5a] p-3", className)}>{children}</div>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-center text-sm font-extrabold uppercase tracking-[0.14em]">{children}</h2>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between opacity-90"><span>{label}</span><span>{value}</span></div>;
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#7f9997] bg-[#214f4c] p-3">
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
function PosBtn({ children, onClick, disabled, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn("flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-white/25 text-[12px] font-extrabold text-white disabled:opacity-60", className)}>
      {children}
    </button>
  );
}
function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg bg-[#71879a] px-2 py-1 text-[11px] font-bold">{children}</button>;
}
function Pill({ children, tone }: { children: React.ReactNode; tone: "green" | "orange" }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase", tone === "green" ? "bg-[#0b9d19]" : "bg-[#e66f08]")}>{children}</span>;
}
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="max-h-[56vh] overflow-auto rounded-2xl bg-[#214f4c]">
      <table className="w-full text-left text-[12px]">
        <thead className="sticky top-0 bg-[#1b423f] text-[10px] uppercase tracking-wider">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 font-extrabold">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}
function EmptySetup({ onSeed, busy }: { onSeed: () => void; busy: boolean }) {
  return (
    <Card className="py-14 text-center">
      <h2 className="text-lg font-extrabold">Set up your restaurant</h2>
      <p className="mx-auto mt-1 max-w-md text-[13px] opacity-80">
        Load a Zambian starter menu, three service areas and 16 tables. You can edit everything afterwards under Menu.
      </p>
      <Button onClick={onSeed} disabled={busy} className="mt-4 bg-[#0b9d19] font-bold hover:bg-[#19b52a]">
        {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Set up restaurant
      </Button>
    </Card>
  );
}
