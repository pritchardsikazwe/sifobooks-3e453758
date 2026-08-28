import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { printKitchenOrder, printBarOrder, printReceipt } from "@/services/universalPrintService";
import { getPrinterForType } from "@/services/printerConfiguration";
import { savePrintQueueJob } from "@/services/printQueue";
import { accrueLoyaltyForOrder } from "@/lib/restaurant-rewards";
import { RequireModule } from "@/components/RequireModule";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/pos")({
  head: () => ({
    meta: [
      { title: "Restaurant POS Terminal — SifoBooks" },
      { name: "description", content: "Touch restaurant POS terminal with order types, modifiers, held checks, cash tender and kitchen routing, posted straight to your books." },
      { property: "og:title", content: "Restaurant POS Terminal — SifoBooks" },
      { property: "og:description", content: "Run dine-in, counter, takeaway, delivery and bar service on a dedicated touch terminal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RequireModule moduleKey="restaurant"><Page /></RequireModule>,
});

/* ---------------- types ---------------- */
type MenuItem = { id: string; name: string; category: string; price: number; cost: number; station: string; active: boolean };
type RTable = { id: string; name: string; seats: number; area: string; status: string };
type Order = { id: string; order_no: string | null; table_id: string | null; order_type: string; status: string; guests: number; subtotal: number; tax: number; total: number; payment_method: string | null; opened_at: string; server_name?: string | null };
type OrderItem = { id: string; order_id: string; item_name: string; station: string; qty: number; price: number; kds_status: string; notes?: string | null };
type ModGroup = { id: string; name: string; required: boolean; min_select: number; max_select: number; sort_order: number; applies_to_categories: string[] };
type Modifier = { id: string; group_id: string; name: string; price: number; active: boolean; sort_order: number };
type OrderTypeRow = { id: string; key: string; label: string; active: boolean; requires_table: boolean; requires_customer: boolean; requires_address: boolean; packaging_fee: number; service_charge_pct: number; default_gratuity_pct: number; sort_order: number };
type CartLine = { name: string; station: string; price: number; qty: number; note?: string; mods?: { name: string; price: number }[] };

const FALLBACK_TYPES = [
  "DINE-IN", "COUNTER", "TAKEAWAY", "PICK-UP", "DELIVERY", "BAR", "DRIVE-THRU", "ROOM SERVICE", "FOOD COURT",
];

const CAT_COLOURS = [
  "bg-[#bd2525]", "bg-[#5d0a88]", "bg-[#b75b24]", "bg-[#087b45]",
  "bg-[#367db6]", "bg-[#a3298d]", "bg-[#a88312]", "bg-[#7316b2]",
];
const TILE_COLOURS = ["bg-[#a72d2d]", "bg-[#6b168f]", "bg-[#bd5524]", "bg-[#2f719d]"];

const VAT_RATE = 0.16;
const DENOMS = [1, 5, 10, 20, 50, 100];

/* ---------------- page ---------------- */
function Page() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [groups, setGroups] = useState<ModGroup[]>([]);
  const [mods, setMods] = useState<Modifier[]>([]);
  const [types, setTypes] = useState<OrderTypeRow[]>([]);

  const [mode, setMode] = useState("DINE-IN");
  const [cat, setCat] = useState("ALL");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [discountPct, setDiscountPct] = useState(0);
  const [customer, setCustomer] = useState("");
  const [server, setServer] = useState("");
  const [recalled, setRecalled] = useState<Order | null>(null);
  const [clock, setClock] = useState(new Date());

  const [modifying, setModifying] = useState<MenuItem | null>(null);
  const [tender, setTender] = useState<{ method: string; order?: Order; amount: number } | null>(null);
  const [pin, setPin] = useState<{ order: Order } | null>(null);
  const [panel, setPanel] = useState<null | "recall" | "tables" | "customer">(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setLoading(false);
    const uid = u.user.id;
    const [m, t, o, g, md, ot] = await Promise.all([
      supabase.from("restaurant_menu_items").select("*").eq("user_id", uid).order("category"),
      supabase.from("restaurant_tables").select("*").eq("user_id", uid).order("name"),
      supabase.from("restaurant_orders").select("*").eq("user_id", uid).order("opened_at", { ascending: false }).limit(200),
      supabase.from("restaurant_modifier_groups").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("restaurant_modifiers").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("restaurant_order_types").select("*").eq("user_id", uid).order("sort_order"),
    ]);
    setMenu((m.data ?? []) as any);
    setTables((t.data ?? []) as any);
    setGroups((g.data ?? []) as any);
    setMods((md.data ?? []) as any);
    const otRows = ((ot.data ?? []) as any as OrderTypeRow[]).filter(x => x.active);
    setTypes(otRows);
    if (otRows.length) setMode(prev => (otRows.some(x => x.label.toUpperCase() === prev) ? prev : otRows[0].label.toUpperCase()));
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

  /* ---- order type config ---- */
  const activeType = types.find(t => t.label.toUpperCase() === mode);
  const typeLabels = types.length ? types.map(t => t.label.toUpperCase()) : FALLBACK_TYPES;
  const needsTable = activeType ? activeType.requires_table : mode === "DINE-IN";

  /* ---- cart maths ---- */
  const lineTotal = (l: CartLine) => (l.price + (l.mods ?? []).reduce((s, m) => s + Number(m.price), 0)) * l.qty;
  const gross = cart.reduce((s, l) => s + lineTotal(l), 0);
  const discount = gross * (discountPct / 100);
  const packaging = Number(activeType?.packaging_fee ?? 0);
  const serviceCharge = gross * (Number(activeType?.service_charge_pct ?? 0) / 100);
  const gratuity = gross * (Number(activeType?.default_gratuity_pct ?? 0) / 100);
  const subtotal = gross - discount + packaging + serviceCharge;
  const tax = subtotal * VAT_RATE;
  const total = subtotal + tax + gratuity;

  const key = (l: CartLine, i: number) => `${i}__${l.name}`;

  const groupsFor = (mi: MenuItem) =>
    groups.filter(g => !g.applies_to_categories?.length || g.applies_to_categories.includes(mi.category));

  const pushLine = (mi: MenuItem, chosen: { name: string; price: number }[] = []) => {
    setCart(c => {
      if (!chosen.length) {
        const i = c.findIndex(l => l.name === mi.name && !l.note && !(l.mods ?? []).length);
        if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      }
      return [...c, { name: mi.name, station: mi.station, price: Number(mi.price), qty: 1, mods: chosen.length ? chosen : undefined }];
    });
  };

  const addToCart = (mi: MenuItem) => {
    const gs = groupsFor(mi).filter(g => mods.some(m => m.group_id === g.id && m.active));
    if (gs.length) setModifying(mi);
    else pushLine(mi);
  };

  const bump = (i: number, d: number) =>
    setCart(c => c.flatMap((l, idx) => idx === i ? (l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d }]) : [l]));
  const removeLine = (i: number) => setCart(c => c.filter((_, idx) => idx !== i));
  const setNote = (i: number, note: string) =>
    setCart(c => c.map((l, idx) => idx === i ? { ...l, note: note || undefined } : l));

  const clearCheck = () => { setCart([]); setDiscountPct(0); setTableId(null); setRecalled(null); setCustomer(""); setGuests(1); };

  /** Persist the current cart. `pay` settles it, `hold` parks it for later recall. */
  const sendOrder = async (pay?: string, hold?: boolean) => {
    if (!cart.length) return toast.error("Add items to the check first");
    if (needsTable && !tableId) return toast.error("Select a table for this order type");
    if (activeType?.requires_customer && !customer.trim()) return toast.error("Customer details are required for this order type");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setBusy(true);
    const uid = u.user.id;
    const status = pay ? "paid" : hold ? "held" : "open";
    if (recalled) await supabase.from("restaurant_order_items").delete().eq("order_id", recalled.id);
    const payload: any = {
      user_id: uid, table_id: needsTable ? tableId : null,
      order_type: mode, guests, subtotal, tax, total, discount,
      server_name: server || null,
      customer_name: customer || null,
      status, payment_method: pay ?? null, closed_at: pay ? new Date().toISOString() : null,
    };
    const q = recalled
      ? supabase.from("restaurant_orders").update(payload).eq("id", recalled.id).select("*").single()
      : supabase.from("restaurant_orders").insert({ ...payload, order_no: `CHK-${Date.now().toString().slice(-6)}` }).select("*").single();
    const { data: ord, error } = await q;
    if (error || !ord) { setBusy(false); return toast.error(error?.message ?? "Could not save check"); }
    const { error: ie } = await supabase.from("restaurant_order_items").insert(cart.map(l => ({
      user_id: uid, order_id: (ord as any).id, item_name: l.name, station: l.station, qty: l.qty,
      price: l.price + (l.mods ?? []).reduce((s, m) => s + Number(m.price), 0),
      notes: [(l.mods ?? []).map(m => m.name).join(", "), l.note].filter(Boolean).join(" • ") || null,
      kds_status: pay ? "served" : "queued",
    })) as any);
    if (ie) { setBusy(false); return toast.error(ie.message); }
    if (tableId) await supabase.from("restaurant_tables").update({ status: pay ? "free" : "occupied" }).eq("id", tableId);
    if (pay) { try { await accrueLoyaltyForOrder((ord as any).id); } catch { /* best effort */ } }
    // Kitchen / bar tickets and customer receipt — never block the order.
    if (!hold) void printOrderTickets(ord as any, cart, pay, total);
    setBusy(false);
    toast.success(pay ? `Paid ${fmtMoney(total)} by ${pay}` : hold ? "Check held — recall it from the RECALL key" : "Sent to kitchen");
    clearCheck(); load();
  };

  /** Silent kitchen/bar ticket + receipt routing. Failures are queued, never fatal. */
  const printOrderTickets = async (ord: any, items: typeof cart, pay?: string, grand?: number) => {
    const base = {
      orderNumber: ord.order_no ?? ord.id,
      tableNumber: tables.find(t => t.id === ord.table_id)?.name ?? undefined,
      waiter: server || undefined,
      orderType: mode,
    };
    const map = (l: (typeof cart)[number]) => ({
      name: l.name, quantity: l.qty,
      modifiers: (l.mods ?? []).map(m => m.name),
      notes: l.note ?? undefined,
    });
    const bar = items.filter(l => (l.station ?? "").toLowerCase().includes("bar"));
    const kitchen = items.filter(l => !bar.includes(l));
    try {
      if (kitchen.length) await printKitchenOrder({ ...base, items: kitchen.map(map) }, getPrinterForType("kitchen"));
      if (bar.length) await printBarOrder({ ...base, items: bar.map(map) }, getPrinterForType("bar"));
    } catch (error: any) {
      console.error("Kitchen printing failed:", error);
      await savePrintQueueJob({ type: "kitchen", orderId: ord.id, title: base.orderNumber, status: "queued", error: String(error?.message ?? error) });
    }
    if (!pay) return;
    try {
      await printReceipt({
        businessName: "SifoBooks Restaurant",
        receiptNumber: base.orderNumber,
        date: new Date().toISOString(),
        cashier: server || undefined,
        items: items.map(l => ({ name: l.name, quantity: l.qty, price: l.price, total: l.qty * l.price, modifiers: (l.mods ?? []).map(m => m.name) })),
        total: Number(grand ?? 0),
        paymentMethod: pay,
        footer: "Thank you for dining with us",
      }, getPrinterForType("receipt"));
    } catch (error: any) {
      console.error("Receipt printing failed:", error);
      await savePrintQueueJob({ type: "receipt", orderId: ord.id, title: base.orderNumber, status: "queued", error: String(error?.message ?? error) });
    }
  };

  const settle = async (o: Order, method: string) => {
    await supabase.from("restaurant_orders").update({ status: "paid", payment_method: method, closed_at: new Date().toISOString() }).eq("id", o.id);
    if (o.table_id) await supabase.from("restaurant_tables").update({ status: "free" }).eq("id", o.table_id);
    try { await accrueLoyaltyForOrder(o.id); } catch { /* loyalty is best-effort */ }
    toast.success(`Check settled — ${fmtMoney(Number(o.total))}`);
    load();
  };

  /** Load a held/open check back into the POS check panel. */
  const recall = (o: Order) => {
    const lines = items.filter(i => i.order_id === o.id)
      .map(i => ({ name: i.item_name, station: i.station, price: Number(i.price), qty: Number(i.qty), note: i.notes ?? undefined }));
    setCart(lines); setRecalled(o); setMode(o.order_type.toUpperCase()); setTableId(o.table_id); setGuests(o.guests || 1);
    setDiscountPct(0); setPanel(null);
    toast.success(`Recalled ${o.order_no}`);
  };

  const voidCheck = async (o: Order) => {
    await supabase.from("restaurant_orders").update({ status: "void", closed_at: new Date().toISOString() }).eq("id", o.id);
    if (o.table_id) await supabase.from("restaurant_tables").update({ status: "free" }).eq("id", o.table_id);
    setPin(null);
    toast.success(`${o.order_no} voided`);
    load();
  };

  const cats = useMemo(() => ["ALL", ...Array.from(new Set(menu.map(m => m.category)))], [menu]);
  const shown = menu.filter(m =>
    m.active &&
    (cat === "ALL" || m.category === cat) &&
    (!search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase())));
  const openOrders = orders.filter(o => o.status === "open" || o.status === "held");

  const sideKeys: { label: string; icon: string; run: () => void; tone?: string }[] = [
    { label: "NEW", icon: "＋", run: clearCheck },
    { label: "MISC", icon: "▦", run: () => { const n = window.prompt("Misc item name"); const p = n ? window.prompt("Price") : null; if (n && p) setCart(c => [...c, { name: n, station: "Kitchen", price: Number(p) || 0, qty: 1 }]); } },
    { label: "VOID", icon: "×", run: () => (openOrders.length ? setPanel("recall") : toast.error("No open checks to void")) },
    { label: "DISCOUNT", icon: "%", run: () => { const p = window.prompt("Discount %", String(discountPct)); if (p !== null) setDiscountPct(Math.min(100, Math.max(0, Number(p) || 0))); } },
    { label: "GUESTS", icon: "♟", run: () => { const g = window.prompt("Number of guests", String(guests)); if (g) setGuests(Math.max(1, Number(g) || 1)); } },
    { label: "CUSTOMER", icon: "♙", run: () => setPanel("customer") },
    { label: "RECALL", icon: "↻", run: () => setPanel("recall") },
    { label: "HOLD", icon: "Ⅱ", run: () => sendOrder(undefined, true) },
    { label: "TABLES", icon: "⌑", run: () => setPanel("tables") },
    { label: "RESERVATIONS", icon: "◷", run: () => navigate({ to: "/restaurant/reservations" }) },
    { label: "KITCHEN", icon: "▤", run: () => navigate({ to: "/restaurant/kitchen" }) },
  ];

  if (loading) {
    return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!menu.length && !tables.length) {
    return (
      <div className="rounded-[10px] border border-[#6f9694] bg-[#174b4b] p-12 text-center text-white">
        <h2 className="text-lg font-extrabold">Set up your restaurant</h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] opacity-80">
          Load a Zambian starter menu, three service areas and 16 tables. You can edit everything afterwards under Menu.
        </p>
        <button onClick={seed} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#07913c] px-5 py-3 font-extrabold">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Set up restaurant
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[650px] overflow-hidden rounded-[10px] border border-[#6f9694] bg-[#174b4b] text-white shadow-[0_12px_30px_#173c4030]">
      {/* top bar — order types */}
      <div className="flex h-[54px] items-center gap-[7px] overflow-x-auto border-b border-[#87a7a6] bg-[#315e64] p-[7px]">
        {typeLabels.map(t => (
          <button key={t} onClick={() => { setMode(t); setTableId(null); }}
            className={cn("h-[39px] shrink-0 rounded-[21px] border-2 px-[17px] text-[11px] font-extrabold tracking-wide transition active:scale-[.97]",
              mode === t ? "border-[#9ac7bb] bg-[#0d7b4e]" : "border-[#88aaa9] bg-[#264f54]")}>
            {t}
          </button>
        ))}
        <div className="ml-auto shrink-0 pr-2 text-[11px] font-extrabold opacity-85">
          STATION 01 • {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* body */}
      <div className="grid min-h-0 gap-[6px] bg-[#1d5555] p-[6px] md:grid-cols-[62px_1fr] lg:grid-cols-[82px_285px_105px_1fr]">
        {/* action rail */}
        <aside className="flex max-h-[720px] flex-col gap-[5px] overflow-auto">
          {sideKeys.map(k => (
            <button key={k.label} onClick={k.run}
              className="flex min-h-[52px] flex-col items-center justify-center gap-[2px] rounded-[13px] border border-[#789695] bg-[#315f63] px-[2px] py-[5px] text-[9px] font-extrabold transition hover:bg-[#487e7d] active:scale-[.97]">
              <span className="text-[19px] leading-[18px]">{k.icon}</span>{k.label}
            </button>
          ))}
          <div className="my-[3px] h-px bg-[#709190]" />
          <button onClick={() => navigate({ to: "/dashboard" })}
            className="mt-auto flex min-h-[52px] flex-col items-center justify-center rounded-[13px] border border-[#789695] bg-[#6a6d70] text-[9px] font-extrabold">
            <span className="text-[19px] leading-[18px]">⚙</span>ACCOUNTING
          </button>
          <button onClick={() => navigate({ to: "/restaurant" })}
            className="flex min-h-[52px] flex-col items-center justify-center rounded-[13px] border border-[#ff5b5b] bg-[#d71818] text-[9px] font-extrabold">
            <span className="text-[19px] leading-[18px]">⎋</span>EXIT
          </button>
        </aside>

        {/* check panel */}
        <section className="grid min-h-0 grid-rows-[auto_auto_1fr_auto_auto] overflow-hidden rounded-[8px] bg-[#f6f7f4] text-[#214047]">
          <div className="flex items-center justify-between border-b border-[#d4dddd] bg-white px-3 py-2">
            <div>
              <strong className="block text-[12px]">{recalled ? `RECALLED ${recalled.order_no}` : `NEW ${mode} ORDER`}</strong>
              <small className="mt-[3px] block text-[9px] text-[#738487]">
                {needsTable ? (tableId ? `TABLE ${tables.find(t => t.id === tableId)?.name}` : "NO TABLE") : "WALK-IN"}
                {customer ? ` • ${customer}` : ""} • {mode}
              </small>
            </div>
            <button onClick={() => setPanel("recall")} className="h-[34px] w-[34px] rounded-[16px] bg-[#6e7b7e] text-white">⌕</button>
          </div>
          <div className="flex items-center justify-between bg-[#e7eceb] px-3 py-2 text-[10px] font-extrabold">
            <button onClick={() => setGuests(g => Math.max(1, g - 1))}>−</button>
            <span>GUEST {guests} OF {guests}</span>
            <button onClick={() => setGuests(g => g + 1)}>＋</button>
          </div>
          <div className="min-h-[160px] overflow-auto bg-white">
            {cart.map((l, i) => (
              <div key={key(l, i)} className="grid grid-cols-[24px_28px_1fr_auto] items-start gap-1 border-b border-[#e2e7e6] p-2 text-[11px]">
                <button onClick={() => removeLine(i)} className="h-[18px] w-[18px] rounded-full bg-[#e84943] font-black text-white">×</button>
                <div className="flex flex-col items-center">
                  <button onClick={() => bump(i, 1)} className="text-[10px] leading-none">▲</button>
                  <b>{l.qty}</b>
                  <button onClick={() => bump(i, -1)} className="text-[10px] leading-none">▼</button>
                </div>
                <span className="font-bold">
                  {l.name}
                  {(l.mods ?? []).map(m => (
                    <small key={m.name} className="mt-[2px] block text-[9px] text-[#0b6d5f]">+ {m.name}{m.price ? ` (${fmtMoney(m.price)})` : ""}</small>
                  ))}
                  <button onClick={() => { const n = window.prompt("Special instruction", l.note ?? ""); if (n !== null) setNote(i, n.trim()); }}
                    className="mt-[2px] block text-left text-[9px] italic text-[#8a989a] underline-offset-2 hover:underline">
                    {l.note ? l.note : "+ note"}
                  </button>
                </span>
                <strong className="text-[10px]">{fmtMoney(lineTotal(l))}</strong>
              </div>
            ))}
            {!cart.length && <div className="py-12 text-center text-[11px] text-[#8a989a]">Tap menu items to start a check.</div>}
          </div>
          <div className="border-t-2 border-[#d7dfde] bg-white px-3 py-1.5 text-[12px]">
            <div className="flex items-end gap-2">
              <span className="text-[22px] font-black">{fmtMoney(total)}</span>
              <small className="pb-[3px] text-[10px] text-[#667b7d]">
                TAX <b>{fmtMoney(tax)}</b>{discountPct ? ` • DISC ${discountPct}%` : ""}{serviceCharge ? ` • SVC ${fmtMoney(serviceCharge)}` : ""}{gratuity ? ` • TIP ${fmtMoney(gratuity)}` : ""}
              </small>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-[5px] bg-[#dce3e1] p-[5px]">
            <button onClick={() => setPanel("tables")} className="min-h-11 rounded-[7px] bg-[#879598] font-black text-white">⌑ TABLE</button>
            <button onClick={() => setPanel("customer")} className="min-h-11 rounded-[7px] bg-[#879598] font-black text-white">♧ CUSTOMER</button>
            <button onClick={() => sendOrder()} disabled={busy} className="min-h-11 rounded-[7px] bg-[#07913c] font-black text-white disabled:opacity-60">SUBMIT ›</button>
          </div>
        </section>

        {/* category rail */}
        <aside className="hidden max-h-[720px] flex-col gap-[5px] overflow-auto p-[2px] lg:flex">
          {cats.map((c, i) => (
            <button key={c} onClick={() => setCat(c)}
              className={cn("flex min-h-[62px] flex-col items-center justify-center gap-[3px] rounded-[13px] border-2 border-[#87a09f] font-black text-white transition",
                CAT_COLOURS[i % CAT_COLOURS.length], cat === c && "ring-2 ring-white")}>
              <b className="text-[20px]">{c.slice(0, 1)}</b>
              <span className="px-1 text-center text-[8px] leading-tight">{c.toUpperCase()}</span>
            </button>
          ))}
        </aside>

        {/* menu + bottom actions */}
        <section className="grid min-h-0 min-w-0 grid-rows-[49px_1fr_auto] overflow-hidden rounded-[8px] bg-[#1b5051]">
          <div className="flex items-center gap-2 border-b border-[#719493] bg-[#315f63] px-2 py-[7px]">
            <div className="whitespace-nowrap text-[11px] font-black">MENU • {cat.toUpperCase()}</div>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="h-[30px] rounded-[15px] border-2 border-[#789998] bg-[#264f54] px-2 text-[10px] font-bold lg:hidden">
              {cats.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH MENU..."
              className="ml-auto h-[34px] w-[min(220px,45%)] rounded-[17px] border-2 border-[#789998] bg-[#f5f7f5] px-3 text-[12px] text-[#20504d] outline-none" />
          </div>
          <div className="grid auto-rows-[minmax(90px,1fr)] grid-cols-2 gap-2 overflow-auto p-2 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((mi, i) => (
              <button key={mi.id} onClick={() => addToCart(mi)}
                className={cn("flex flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-[#879c9b] p-2 text-center text-white shadow-[inset_0_-18px_30px_#00000014] transition hover:-translate-y-[2px] hover:shadow-[0_7px_18px_#0005] active:scale-[.98]",
                  TILE_COLOURS[i % TILE_COLOURS.length])}>
                <strong className="text-[12px] leading-tight">{mi.name}</strong>
                <span className="text-[11px] font-black">{fmtMoney(Number(mi.price))}</span>
              </button>
            ))}
            {!shown.length && <div className="col-span-full py-10 text-center text-[12px] opacity-70">No items match.</div>}
          </div>
          <div className="grid grid-cols-3 gap-[5px] border-t border-[#799695] bg-[#315f63] p-[7px] lg:grid-cols-[1fr_1fr_1.3fr_1.2fr_1.2fr_1.4fr]">
            <BottomBtn onClick={clearCheck} className="bg-[#bd1111]">CANCEL</BottomBtn>
            <BottomBtn onClick={() => (cart.length ? setTender({ method: "Cash", amount: total }) : toast.error("Check is empty"))} className="bg-[#6f7d80]">CASH</BottomBtn>
            <BottomBtn onClick={() => sendOrder("Mobile Money")} className="bg-[#7616b9]">MOBILE MONEY</BottomBtn>
            <BottomBtn onClick={() => sendOrder(undefined, true)} className="bg-[#d76c09]">HOLD CHECK</BottomBtn>
            <BottomBtn onClick={clearCheck} className="bg-[#ed0b0b]">CLEAR CHECK</BottomBtn>
            <BottomBtn onClick={() => (cart.length ? setTender({ method: "Cash", amount: total }) : toast.error("Check is empty"))} className="bg-[#0b913f] text-[12px]">PAY {fmtMoney(total)} ›</BottomBtn>
          </div>
        </section>
      </div>

      {/* footer status */}
      <div className="flex items-center justify-between border-t border-[#799695] bg-[#315e64] px-4 py-1.5 text-[10px] opacity-85">
        <span>SifoBooks Restaurant • {server || "Terminal"} • {openOrders.length} open checks</span>
        <span>Posted automatically to your books</span>
      </div>

      {modifying && (
        <ModifierDialog
          item={modifying}
          groups={groupsFor(modifying)}
          mods={mods.filter(m => m.active)}
          onCancel={() => setModifying(null)}
          onConfirm={chosen => { pushLine(modifying, chosen); setModifying(null); }}
        />
      )}

      {tender && (
        <TenderDialog
          due={tender.amount}
          onCancel={() => setTender(null)}
          onConfirm={() => { const t = tender; setTender(null); if (t.order) settle(t.order, t.method); else sendOrder(t.method); }}
        />
      )}

      {pin && <PinDialog check={pin.order.order_no ?? ""} onCancel={() => setPin(null)} onConfirm={() => voidCheck(pin.order)} />}

      {panel === "recall" && (
        <Overlay title="Open & held checks" onCancel={() => setPanel(null)}>
          <div className="max-h-[50vh] space-y-1.5 overflow-auto">
            {openOrders.map(o => (
              <div key={o.id} className="flex items-center gap-2 rounded-lg bg-[#315d5a] px-2 py-2 text-[12px]">
                <span className="flex-1 font-bold">{o.order_no} • {o.order_type} • {fmtMoney(Number(o.total))}</span>
                <button onClick={() => recall(o)} className="rounded-md bg-[#0b9d19] px-2 py-1 text-[11px] font-bold">Recall</button>
                <button onClick={() => { setPanel(null); setTender({ method: "Cash", order: o, amount: Number(o.total) }); }} className="rounded-md bg-[#71879a] px-2 py-1 text-[11px] font-bold">Cash</button>
                <button onClick={() => { setPanel(null); setPin({ order: o }); }} className="rounded-md bg-[#b91c1c] px-2 py-1 text-[11px] font-bold">Void</button>
              </div>
            ))}
            {!openOrders.length && <div className="py-6 text-center text-[12px] opacity-70">No open or held checks.</div>}
          </div>
        </Overlay>
      )}

      {panel === "tables" && (
        <Overlay title="Select table" onCancel={() => setPanel(null)}>
          <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">
            {tables.map(t => {
              const open = orders.find(o => o.table_id === t.id && (o.status === "open" || o.status === "held"));
              return (
                <button key={t.id} onClick={() => { setTableId(t.id); setPanel(null); }}
                  className={cn("rounded-xl border-2 border-[#9aaab5] p-2 text-center text-[12px] font-extrabold",
                    tableId === t.id ? "bg-[#19b52a]" : open ? "bg-[#e66f08]" : "bg-[#0b9d19]")}>
                  {t.name}<div className="text-[9px] font-normal opacity-80">{t.area} • {t.seats}p</div>
                </button>
              );
            })}
            {!tables.length && <div className="col-span-full py-6 text-center text-[12px] opacity-70">No tables set up yet.</div>}
          </div>
        </Overlay>
      )}

      {panel === "customer" && (
        <Overlay title="Customer & server" onCancel={() => setPanel(null)}>
          <Input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer name / phone" className="mb-2 bg-white text-[#20504d]" />
          <Input value={server} onChange={e => setServer(e.target.value)} placeholder="Server name" className="bg-white text-[#20504d]" />
          <button onClick={() => setPanel(null)} className="mt-3 w-full rounded-xl bg-[#0b9d19] py-2 text-[12px] font-extrabold">Done</button>
        </Overlay>
      )}
    </div>
  );
}

/* ---------------- dialogs ---------------- */
function ModifierDialog({ item, groups, mods, onCancel, onConfirm }: {
  item: MenuItem; groups: ModGroup[]; mods: Modifier[];
  onCancel: () => void; onConfirm: (chosen: { name: string; price: number }[]) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const toggle = (g: ModGroup, m: Modifier) => {
    setPicked(p => {
      const cur = p[g.id] ?? [];
      if (cur.includes(m.id)) return { ...p, [g.id]: cur.filter(x => x !== m.id) };
      if (g.max_select && cur.length >= g.max_select) return { ...p, [g.id]: [...cur.slice(1), m.id] };
      return { ...p, [g.id]: [...cur, m.id] };
    });
  };
  const confirm = () => {
    for (const g of groups) {
      const n = (picked[g.id] ?? []).length;
      if (g.required && n < Math.max(1, g.min_select)) return toast.error(`Choose ${Math.max(1, g.min_select)} from ${g.name}`);
    }
    const chosen = Object.values(picked).flat().map(id => {
      const m = mods.find(x => x.id === id)!;
      return { name: m.name, price: Number(m.price) };
    });
    onConfirm(chosen);
  };
  return (
    <Overlay title={item.name} onCancel={onCancel} wide>
      <div className="max-h-[55vh] space-y-3 overflow-auto">
        {groups.map(g => (
          <div key={g.id}>
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wider opacity-80">
              {g.name} {g.required ? "• required" : "• optional"}{g.max_select ? ` • max ${g.max_select}` : ""}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mods.filter(m => m.group_id === g.id).map(m => {
                const on = (picked[g.id] ?? []).includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggle(g, m)}
                    className={cn("min-h-[52px] rounded-xl border-2 border-[#9aaab5] px-2 py-1 text-[12px] font-bold", on ? "bg-[#0b9d19]" : "bg-[#71879a]")}>
                    {m.name}
                    {Number(m.price) ? <div className="text-[10px] opacity-90">+{fmtMoney(Number(m.price))}</div> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!groups.length && <div className="py-4 text-center text-[12px] opacity-70">No modifiers configured.</div>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="min-h-11 rounded-xl bg-[#71879a] font-extrabold">Cancel</button>
        <button onClick={confirm} className="min-h-11 rounded-xl bg-[#0b9d19] font-extrabold">Add to check</button>
      </div>
    </Overlay>
  );
}

function TenderDialog({ due, onCancel, onConfirm }: { due: number; onCancel: () => void; onConfirm: () => void }) {
  const [cash, setCash] = useState("");
  const received = Number(cash || 0);
  const change = received - due;
  const nextAmount = Math.ceil(due / 50) * 50;
  const push = (k: string) => setCash(c => (k === "C" ? "" : c + k));
  return (
    <Overlay title="Cash transaction" onCancel={onCancel} wide>
      <div className="mb-2 flex justify-between text-sm font-extrabold"><span>Amount due</span><span>{fmtMoney(due)}</span></div>
      <div className="mb-2 rounded-xl border-2 border-white/25 bg-white px-3 py-3 text-right text-[27px] font-black text-[#20504d]">{cash || "0.00"}</div>
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        {DENOMS.map(d => (
          <button key={d} onClick={() => setCash(String(received + d))} className="min-h-10 rounded-lg bg-[#71879a] text-[12px] font-bold">{fmtMoney(d)}</button>
        ))}
        <button onClick={() => setCash(String(due))} className="min-h-10 rounded-lg bg-[#4e89bc] text-[11px] font-bold">EXACT</button>
        <button onClick={() => setCash(String(nextAmount))} className="min-h-10 rounded-lg bg-[#4e89bc] text-[11px] font-bold">NEXT</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "C"].map(k => (
          <button key={k} onClick={() => push(k)} className="h-[52px] rounded-lg border-2 border-white/20 bg-[#315d5a] text-xl font-bold">{k}</button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-sm font-extrabold">
        <span>Change</span><span>{change >= 0 ? fmtMoney(change) : "—"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="min-h-11 rounded-xl bg-[#71879a] font-extrabold">Cancel</button>
        <button onClick={onConfirm} disabled={change < 0} className="min-h-11 rounded-xl bg-[#0b9d19] font-extrabold disabled:opacity-60">Complete payment</button>
      </div>
    </Overlay>
  );
}

function PinDialog({ check, onCancel, onConfirm }: { check: string; onCancel: () => void; onConfirm: () => void }) {
  const [pin, setPin] = useState("");
  return (
    <Overlay title={`Manager approval — void ${check}`} onCancel={onCancel}>
      <p className="mb-2 text-[12px] opacity-80">Enter the manager PIN to void this check. Voided checks are excluded from takings.</p>
      <Input type="password" autoFocus value={pin} onChange={e => setPin(e.target.value)} placeholder="Manager PIN" className="bg-white text-[#20504d]" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="min-h-11 rounded-xl bg-[#71879a] font-extrabold">Cancel</button>
        <button onClick={() => (pin.length >= 4 ? onConfirm() : toast.error("PIN must be at least 4 digits"))} className="min-h-11 rounded-xl bg-[#f00000] font-extrabold">Void check</button>
      </div>
    </Overlay>
  );
}

function Overlay({ title, children, onCancel, wide }: { title: string; children: React.ReactNode; onCancel: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#153c42cc] p-4" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        className={cn("w-full rounded-2xl border-2 border-[#7f9997] bg-[#214f4c] p-4 text-white shadow-2xl", wide ? "max-w-lg" : "max-w-sm")}>
        <div className="mb-3 text-sm font-extrabold uppercase tracking-wider">{title}</div>
        {children}
      </div>
    </div>
  );
}

function BottomBtn({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={cn("min-h-[52px] rounded-[9px] border-2 border-[#88a19f] text-[10px] font-black text-white transition active:scale-[.97]", className)}>
      {children}
    </button>
  );
}
