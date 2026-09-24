import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Loader2, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { normalizeOrderItem, posErrorMessage } from "@/lib/worker-pos";
import { can, loadPosContext, type PosContext } from "@/lib/pos-permissions";
import { recordPayments } from "@/lib/restaurant";


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
type MenuItem = { id: string; name: string; category: string; price: number; cost: number; station: string; active: boolean; barcode?: string | null; sku?: string | null };
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
const restaurantBusinessDate = () => new Date().toISOString().slice(0, 10);

function restaurantCheckoutErrorMessage(error: any) {
  const raw = String(error?.message ?? error ?? "").replace(/^Error:\s*/i, "").trim();
  const code = raw.toUpperCase();
  if (code.includes("NO_ACTIVE_RESTAURANT_SHIFT")) return "Start your cashier shift before taking a paid sale.";
  if (code.includes("NO_OPEN_CASH_DRAWER")) return "Open the cashier cash drawer before taking a cash payment.";
  if (code.includes("MENU_ITEM_NOT_FOUND")) return raw.split(":").slice(1).join(":").trim() ? `Menu item is not available to this POS: ${raw.split(":").slice(1).join(":").trim()}` : "Menu item is not available to this POS.";
  if (code.includes("INSUFFICIENT_STOCK")) return "Not enough ingredient stock at the selected POS location.";
  if (code.includes("LOCATION_STOCK_NOT_INITIALIZED")) return "This ingredient has no stock balance at the selected POS location. Transfer stock to the POS first.";
  if (code.includes("PAYMENT_SHORT")) return "Payment received is less than the amount due.";
  if (code.includes("INVALID_CASH_TENDER")) return "Cash tender does not cover the amount due. Use EXACT or enter the amount received.";
  if (code.includes("INVALID_RESTAURANT_PAYMENT")) return "Invalid payment amount. Review the tender and retry.";
  if (code.includes("RESTAURANT_ORDER_NOT_SETTLEABLE")) return "This check is no longer open for payment.";
  if (code.includes("ACCOUNTING_POSTING_RULE_MISSING")) return "The accounting fallback could not find a sales account. Check your Chart of Accounts setup.";
  if (code.includes("RPC \"RESTAURANT_CHECKOUT\"")) return "Restaurant checkout service is not available in this database mode yet.";
  return raw || "Restaurant sale could not be posted. Please retry.";
}

/* ---------------- page ---------------- */
const POS_SCROLL_STYLE = `
  .pos-scrollbar { scrollbar-width: thin; scrollbar-color: #6f9694 transparent; }
  .pos-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .pos-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .pos-scrollbar::-webkit-scrollbar-thumb { background: #6f9694; border-radius: 999px; }
`;

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
  const [stockLocations, setStockLocations] = useState<{ id: string; name: string; location_type: string }[]>([]);
  const [posStockLocation, setPosStockLocation] = useState("");
  const [recipes, setRecipes] = useState<{ menu_item_id: string; stock_item_id: string; quantity: number; unit: string | null }[]>([]);
  const [stockBalances, setStockBalances] = useState<{ item_id: string; location_id: string; quantity: number }[]>([]);

  const [mode, setMode] = useState("DINE-IN");
  const [cat, setCat] = useState("ALL");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [discountPct, setDiscountPct] = useState(0);
  const [customer, setCustomer] = useState("");
  const [server, setServer] = useState("");
  const [recalled, setRecalled] = useState<Order | null>(null);
  const [clock, setClock] = useState(new Date());
  const [fullScreen, setFullScreen] = useState(false);
  const [cashierCode, setCashierCode] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [posContext, setPosContext] = useState<PosContext | null>(null);
  const [textScale, setTextScale] = useState<"normal" | "large" | "xl">("normal");
  // Stable client reference for a checkout attempt. Keeping this reference
  // across a retry makes Close Order idempotent when the response is lost.
  const checkoutClientRef = useRef<string | null>(null);

  const [modifying, setModifying] = useState<MenuItem | null>(null);
  const [tender, setTender] = useState<{ method: string; order?: Order; amount: number } | null>(null);
  const [pin, setPin] = useState<{ order: Order } | null>(null);
  const [panel, setPanel] = useState<null | "recall" | "tables" | "customer">(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000);
    const onFs = () => setFullScreen(Boolean(document.fullscreenElement));
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        void toggleFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => { clearInterval(t); document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("employee_pos_permissions")
        .select("cashier_code,display_name,full_name,pos_role")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (p) {
        setCashierCode(p.cashier_code ?? "");
        setCashierName(p.display_name ?? p.full_name ?? "");
        if (p.display_name ?? p.full_name) setServer(p.display_name ?? p.full_name);
      }
    })();
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { setFullScreen(v => !v); }
  };

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setLoading(false);
    const uid = u.user.id;
    const [m, t, o, g, md, ot, loc, rec, bal] = await Promise.all([
      supabase.from("restaurant_menu_items").select("*").eq("user_id", uid).eq("active", true).order("category").order("name"),
      supabase.from("restaurant_tables").select("*").eq("user_id", uid).order("name"),
      supabase.from("restaurant_orders").select("*").eq("user_id", uid).order("opened_at", { ascending: false }).limit(200),
      supabase.from("restaurant_modifier_groups").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("restaurant_modifiers").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("restaurant_order_types").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("inventory_locations").select("id,name,location_type").eq("user_id", uid).eq("is_active", true).order("name"),
      supabase.from("restaurant_recipes").select("menu_item_id,stock_item_id,quantity,unit").eq("user_id", uid),
      supabase.from("stock_balances").select("item_id,location_id,quantity").eq("user_id", uid),
    ]);
    // Menu, tables, orders and modifier/order-type data are the POS core.
    // Stock-location data is auxiliary: an old database must not hide the
    // entire selling screen just because its location balances are incomplete.
    const coreError = [m, t, o, g, md, ot].find((r: any) => r?.error);
    if (coreError?.error) {
      console.error("[Restaurant POS] core load failed", coreError.error);
      toast.error("Restaurant POS could not load its setup data.", {
        description: String(coreError.error.message ?? coreError.error),
      });
      setLoading(false);
      return;
    }
    const optionalErrors = [loc, rec, bal].filter((r: any) => r?.error);
    if (optionalErrors.length) {
      console.warn("[Restaurant POS] optional stock data unavailable", optionalErrors.map((r: any) => r.error));
      toast.warning("POS loaded without complete stock-location data.", {
        description: "You can still view and sell menu items; refresh after stock setup is repaired.",
      });
    }
    setMenu((m.data ?? []) as any);
    const locations = (loc?.data ?? []) as any[];
    setStockLocations(locations);
    const savedLocation = window.localStorage.getItem("sifobooks.restaurant.pos.location") ?? "";
    const preferred = locations.find(x => x.id === savedLocation) ?? locations.find(x => ["outlet","branch","store","kitchen","bar"].includes(String(x.location_type))) ?? locations[0];
    if (preferred) setPosStockLocation(preferred.id);
    setRecipes((rec?.data ?? []) as any); setStockBalances((bal?.data ?? []) as any);
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
  useEffect(() => { const timer = window.setTimeout(() => searchRef.current?.focus(), 250); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(); }, 15000);
    return () => window.clearInterval(timer);
  }, []);

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
    const available = itemStock(mi);
    const hasRecipe = recipes.some(r => r.menu_item_id === mi.id && Number(r.quantity) > 0);
    if (hasRecipe && !posStockLocation) {
      toast.warning("Select a POS stock location first.", {
        description: "Choose the stock location in the POS toolbar before selling recipe-controlled items.",
      });
      return;
    }
    if (available === 0) {
      toast.error("Out of stock at this POS location", {
        description: posStockLocation ? "Transfer or replenish stock before selling this item." : "Select the POS stock location to check availability.",
      });
      return;
    }
    const gs = groupsFor(mi).filter(g => mods.some(m => m.group_id === g.id && m.active));
    if (gs.length) setModifying(mi);
    else pushLine(mi);
  };

  const bump = (i: number, d: number) =>
    setCart(c => c.flatMap((l, idx) => idx === i ? (l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d }]) : [l]));
  const removeLine = (i: number) => setCart(c => c.filter((_, idx) => idx !== i));
  const setNote = (i: number, note: string) =>
    setCart(c => c.map((l, idx) => idx === i ? { ...l, note: note || undefined } : l));

  const clearCheck = () => {
    setCart([]);
    setDiscountPct(0);
    setTableId(null);
    setRecalled(null);
    setCustomer("");
    setGuests(1);
    checkoutClientRef.current = null;
  };

  const getCheckoutClientRef = (uid: string, existingOrder?: Order | null) => {
    if (existingOrder?.id) return `restaurant-settle:${existingOrder.id}`;
    if (!checkoutClientRef.current) checkoutClientRef.current = `restaurant-sale:${uid}:${crypto.randomUUID()}`;
    return checkoutClientRef.current;
  };

  /** Finalize an order exactly once through the atomic restaurant checkout engine. */
  const closeOrder = async (pay: string, tendered?: number, change?: number) => {
    if (!cart.length || busy) return;
    if (needsTable && !tableId) return toast.error("Select a table for this order type");
    if (activeType?.requires_customer && !customer.trim()) return toast.error("Customer details are required for this order type");

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Please sign in again and retry.");
    if (!(await requireActiveCashierSession())) return;

    setBusy(true);
    const uid = u.user.id;
    const clientRef = getCheckoutClientRef(uid, recalled);

    try {
      const paymentAmount = Number(total.toFixed(2));
      const tender = Number((tendered ?? paymentAmount).toFixed(2));
      const cashChange = Math.max(0, Number((change ?? Math.max(0, tender - paymentAmount)).toFixed(2)));

      const { data: result, error } = await supabase.rpc("restaurant_checkout", {
        _sale: {
          order_id: recalled?.id ?? null,
          client_ref: clientRef,
          order_no: recalled?.order_no ?? undefined,
          business_date: restaurantBusinessDate(),
          table_id: needsTable ? tableId : null,
          order_type: mode,
          guests,
          subtotal,
          discount,
          tax,
          service_charge: serviceCharge,
          gratuity,
          delivery_fee: Number(activeType?.delivery_fee ?? 0),
          total: paymentAmount,
          server_name: server || null,
          customer_name: customer || null,
          shift_id: undefined,
          location_id: posStockLocation || null,
        },
        _items: cart.map(l => ({
          name: l.name,
          station: l.station,
          qty: l.qty,
          price: l.price,
          note: l.note ?? null,
          modifiers: (l.mods ?? []).map(m => ({ name: m.name, price: Number(m.price || 0) })),
        })),
        _payments: [{
          method: pay,
          amount: paymentAmount,
          tendered: tender,
          change: cashChange,
        }],
      } as any);

      if (error || !result) {
        console.error("[POS] close order failed", error);
        toast.error(restaurantCheckoutErrorMessage(error));
        return;
      }

      const alreadyClosed = Boolean((result as any).duplicate);
      try { await accrueLoyaltyForOrder((result as any).orderId ?? (result as any).order_id); } catch { /* best effort */ }
      void attachPaymentToOpenDrawer((result as any).orderId ?? (result as any).order_id);
      void printOrderTickets(
        { ...(result as any), order_no: (result as any).orderNo ?? (result as any).order_no, id: (result as any).orderId ?? (result as any).order_id, table_id: tableId },
        cart, pay, paymentAmount, tender, cashChange,
      );

      toast.success(
        alreadyClosed
          ? `Order ${(result as any).orderNo ?? (result as any).order_no} was already closed — no duplicate posting created.`
          : `Order ${(result as any).orderNo ?? (result as any).order_no} closed and paid ${fmtMoney(paymentAmount)} by ${pay}`
      );
      clearCheck();
      await load();
    } catch (e: any) {
      console.error("[POS] close order exception", e);
      toast.error(restaurantCheckoutErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /** Recipe-driven inventory control. A paid menu item consumes its configured ingredients. */
  const prepareStockConsumption = async (uid: string, sourceCart = cart) => {
    const menuByName = new Map(menu.map(m => [m.name, m]));
    const menuIds = [...new Set(sourceCart.map(l => menuByName.get(l.name)?.id).filter(Boolean) as string[])];
    if (!menuIds.length) return { ok: true, deductions: [] as any[] };
    const { data: recipes, error: re } = await supabase.from("restaurant_recipes").select("menu_item_id,stock_item_id,quantity,unit").eq("user_id", uid).in("menu_item_id", menuIds);
    if (re) return { ok: false, error: re.message, deductions: [] as any[] };
    const totals = new Map<string, { qty: number; unit?: string }>();
    for (const line of sourceCart) {
      const mi = menuByName.get(line.name);
      if (!mi) continue;
      for (const rr of (recipes ?? []).filter((x: any) => x.menu_item_id === mi.id)) {
        const cur = totals.get(rr.stock_item_id) ?? { qty: 0, unit: rr.unit };
        cur.qty += Number(rr.quantity || 0) * Number(line.qty || 0);
        totals.set(rr.stock_item_id, cur);
      }
    }
    const ids = [...totals.keys()];
    if (!ids.length) return { ok: true, deductions: [] as any[] };
    const { data: stock, error: se } = await supabase.from("stock_items").select("id,name,quantity_on_hand,cost_price,unit").eq("user_id", uid).in("id", ids);
    if (se) return { ok: false, error: se.message, deductions: [] as any[] };
    const byId = new Map((stock ?? []).map((x: any) => [x.id, x]));
    const deductions = ids.map(id => ({ id, ...(byId.get(id) ?? {}), ...totals.get(id) }));
    const shortage = deductions.find(x => Number(x.quantity_on_hand ?? 0) < Number(x.qty ?? 0));
    if (shortage) return { ok: false, error: "Insufficient stock: " + shortage.name + " (" + Number(shortage.quantity_on_hand ?? 0) + " " + (shortage.unit ?? "") + " available, " + Number(shortage.qty ?? 0) + " required)", deductions };
    return { ok: true, deductions };
  };

  const commitStockConsumption = async (uid: string, orderNo: string, deductions: any[]) => {
    for (const d of deductions) {
      const next = Number(d.quantity_on_hand) - Number(d.qty);
      const { error } = await supabase.from("stock_items").update({ quantity_on_hand: next, updated_at: new Date().toISOString() }).eq("id", d.id).eq("user_id", uid);
      if (error) throw error;
      await supabase.from("stock_movements").insert({
        id: crypto.randomUUID(), user_id: uid, item_id: d.id, movement_type: "sale", quantity: -Number(d.qty),
        unit_cost: Number(d.cost_price || 0), reference: orderNo, note: "Restaurant recipe consumption", location_id: null,
      } as never);
    }
  };

  /** Persist the current cart. `pay` settles it, `hold` parks it for later recall. */
  const sendOrder = async (pay?: string, hold?: boolean, tendered?: number, change?: number) => {
    if (!cart.length) return toast.error("Add items to the check first");
    if (needsTable && !tableId) return toast.error("Select a table for this order type");
    if (activeType?.requires_customer && !customer.trim()) return toast.error("Customer details are required for this order type");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setBusy(true);
    const uid = u.user.id;
    if (pay) {
      if (!(await requireActiveCashierSession())) {
        setBusy(false);
        return;
      }
      try {
        const { data: result, error } = await supabase.rpc("restaurant_checkout", {
          _sale: {
            order_id: recalled?.id ?? null,
            client_ref: recalled?.id ? `restaurant-settle:${recalled.id}` : `restaurant-sale:${uid}:${Date.now()}:${crypto.randomUUID()}`,
            order_no: recalled?.order_no ?? undefined,
            business_date: restaurantBusinessDate(),
            table_id: needsTable ? tableId : null,
            order_type: mode,
            guests,
            subtotal,
            discount,
            tax,
            service_charge: serviceCharge,
            gratuity,
            delivery_fee: Number(activeType?.delivery_fee ?? 0),
            total,
            server_name: server || null,
            customer_name: customer || null,
            shift_id: undefined,
            location_id: posStockLocation || null,
          },
          _items: cart.map(l => ({
            name: l.name, station: l.station, qty: l.qty, price: l.price,
            note: l.note ?? null,
            modifiers: (l.mods ?? []).map(m => ({ name: m.name, price: Number(m.price || 0) })),
          })),
          _payments: [{
          method: pay,
          amount: total,
          tendered: tendered ?? total,
          change: change ?? 0,
        }],
        } as any);
        if (error || !result) {
          setBusy(false);
          console.error("[POS] restaurant checkout failed", error);
          return toast.error(restaurantCheckoutErrorMessage(error));
        }
        try { await accrueLoyaltyForOrder(result.orderId); } catch { /* loyalty is best-effort */ }
        void attachPaymentToOpenDrawer(result.orderId);
        void printOrderTickets(
          { ...(result as any), order_no: result.orderNo, id: result.orderId, table_id: tableId },
          cart, pay, total, tendered, change,
        );
        setBusy(false);
        toast.success(`Paid ${fmtMoney(total)} by ${pay}`);
        clearCheck();
        load();
        return;
      } catch (e: any) {
        setBusy(false);
        return toast.error(restaurantCheckoutErrorMessage(e));
      }
    }

    const stockPlan = { ok: true, deductions: [] as any[] };
    const status = hold ? "held" : "open";
    if (recalled) await supabase.from("restaurant_order_items").delete().eq("order_id", recalled.id);
    const payload: any = {
      user_id: uid, business_date: restaurantBusinessDate(), table_id: needsTable ? tableId : null,
      order_type: mode, guests, subtotal, tax, total, discount,
      service_charge: serviceCharge, gratuity, delivery_fee: Number(activeType?.delivery_fee ?? 0),
      server_name: server || null,
      customer_name: customer || null,
      status, payment_method: pay ?? null, amount_paid: pay ? total : 0,
      closed_at: pay ? new Date().toISOString() : null,
    };
    const q = recalled
      ? supabase.from("restaurant_orders").update(payload).eq("id", recalled.id).select("*").single()
      : supabase.from("restaurant_orders").insert({ ...payload, order_no: `CHK-${Date.now().toString().slice(-6)}` }).select("*").single();
    const { data: ord, error } = await q;
    if (error || !ord) { setBusy(false); return toast.error(posErrorMessage(error)); }
    const rows = cart.map(l => {
      const n = normalizeOrderItem({
        item_name: l.name, station: l.station, qty: l.qty, price: l.price,
        modifiers: (l.mods ?? []).map(m => ({ name: m.name, price: Number(m.price) })),
        notes: l.note ?? "",
      });
      return {
        user_id: uid, order_id: (ord as any).id, item_name: n.item_name, station: n.station,
        qty: n.qty, price: n.price, unit_cost: n.unit_cost, discount: n.discount,
        modifiers: n.modifiers,
        notes: [n.modifiers.map(m => m.name).join(", "), n.notes].filter(Boolean).join(" • ") || null,
        kds_status: pay ? "served" : "queued",
      };
    });
    const { error: ie } = await supabase.from("restaurant_order_items").insert(rows as any);
    if (ie) {
      console.error("[POS] order items failed", ie);
      if (!recalled) await supabase.from("restaurant_orders").delete().eq("id", (ord as any).id);
      setBusy(false);
      return toast.error(posErrorMessage(ie));
    }

    if (pay && stockPlan.deductions.length) {
      try { await commitStockConsumption(uid, (ord as any).order_no ?? (ord as any).id, stockPlan.deductions); }
      catch (e) { console.error("[POS] stock deduction failed", e); setBusy(false); return toast.error("Sale posted but stock update failed — review Inventory immediately."); }
    }
    if (pay) {
      await recordPayments((ord as any).id, [{ method: pay, amount: total, tendered: tendered ?? total, change: change ?? 0 }]);
      await attachPaymentToOpenDrawer((ord as any).id);
    }

    if (tableId) await supabase.from("restaurant_tables").update({ status: pay ? "payment pending" : "occupied" }).eq("id", tableId);
    if (pay) { try { await accrueLoyaltyForOrder((ord as any).id); } catch { /* best effort */ } }
    // Kitchen / bar tickets and customer receipt — never block the order.
    if (!hold) void printOrderTickets(ord as any, cart, pay, total, tendered, change);
    setBusy(false);
    toast.success(pay ? `Paid ${fmtMoney(total)} by ${pay}` : hold ? "Check held — recall it from the RECALL key" : "Sent to kitchen");
    clearCheck(); load();
  };

  /** Silent kitchen/bar ticket + receipt routing. Failures are queued, never fatal. */
  const printOrderTickets = async (ord: any, items: typeof cart, pay?: string, grand?: number, tendered?: number, change?: number) => {
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
      try { await savePrintQueueJob({ type: "kitchen", orderId: ord.id, title: base.orderNumber, status: "queued", error: String(error?.message ?? error) }); } catch (queueError) { console.error("Kitchen print queue recovery failed:", queueError); }
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
        amountPaid: tendered ?? Number(grand ?? 0),
        change: Math.max(0, Number(change ?? 0)),
        footer: "Thank you for dining with us",
      }, getPrinterForType("receipt"));
    } catch (error: any) {
      console.error("Receipt printing failed:", error);
      try { await savePrintQueueJob({ type: "receipt", orderId: ord.id, title: base.orderNumber, status: "queued", error: String(error?.message ?? error) }); } catch (queueError) { console.error("Receipt print queue recovery failed:", queueError); }
    }
  };

  const attachPaymentToOpenDrawer = async (orderId: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: drawer } = await supabase.from("restaurant_cash_drawers")
      .select("id").eq("user_id", u.user.id).eq("business_date", restaurantBusinessDate()).eq("status", "open")
      .order("opened_at", { ascending: false }).limit(1).maybeSingle();
    if (drawer?.id) {
      await supabase.from("restaurant_payments").update({ drawer_id: drawer.id }).eq("order_id", orderId).eq("user_id", u.user.id);
    }
  };

  const requireActiveCashierSession = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return false;
    const cashier = String(server || cashierName || "Owner / Administrator").trim();
    const [shift, drawer] = await Promise.all([
      supabase.from("restaurant_shifts").select("id").eq("user_id", u.user.id).eq("business_date", restaurantBusinessDate()).is("clock_out", null).limit(1).maybeSingle(),
      supabase.from("restaurant_cash_drawers").select("id").eq("user_id", u.user.id).eq("business_date", restaurantBusinessDate()).eq("status", "open").limit(1).maybeSingle(),
    ]);
    if (shift.error) {
      toast.error("Could not verify the restaurant cashier shift.", { description: String(shift.error.message ?? shift.error) });
      return false;
    }
    if (!shift.data) {
      // First-run convenience: a brand-new restaurant account has no shift
      // history yet, so create the initial owner shift. Existing restaurants
      // must continue to use the normal Shifts workflow.
      const { data: priorShift } = await supabase.from("restaurant_shifts")
        .select("id").eq("user_id", u.user.id).limit(1).maybeSingle();
      if (!priorShift?.id) {
        const { error: createShiftError } = await supabase.from("restaurant_shifts").insert({
          id: crypto.randomUUID(),
          user_id: u.user.id,
          staff_name: cashier || "Owner / Administrator",
          role: "owner",
          business_date: restaurantBusinessDate(),
          created_by: u.user.id,
        });
        if (createShiftError) {
          toast.error("Could not start the first cashier shift.", { description: createShiftError.message });
          return false;
        }
      } else {
        toast.error("Start your cashier shift before taking sales.", { description: "Restaurant → Shifts" });
        return false;
      }
    }
    if (drawer.error) {
      toast.error("Could not verify the restaurant cash drawer.", { description: String(drawer.error.message ?? drawer.error) });
      return false;
    }
    if (!drawer.data) {
      const { data: priorDrawer } = await supabase.from("restaurant_cash_drawers")
        .select("id").eq("user_id", u.user.id).limit(1).maybeSingle();
      if (!priorDrawer?.id) {
        const { error: createDrawerError } = await supabase.from("restaurant_cash_drawers").insert({
          id: crypto.randomUUID(),
          user_id: u.user.id,
          name: "Main Cash Drawer",
          station: "Restaurant POS",
          business_date: restaurantBusinessDate(),
          opening_float: 0,
          expected_cash: 0,
          status: "open",
          opened_by: u.user.id,
          created_by: u.user.id,
        });
        if (createDrawerError) {
          toast.error("Could not open the first restaurant cash drawer.", { description: createDrawerError.message });
          return false;
        }
      } else {
        toast.error("No cash drawer is open for this restaurant.", { description: "Restaurant → Cash drawers" });
        return false;
      }
    }
    return true;
  };

  const settle = async (o: Order, method: string, tendered?: number, change?: number) => {
    if (!(await requireActiveCashierSession())) return;
    setBusy(true);
    try {
      const savedLines = items.filter(i => i.order_id === o.id).map(i => ({
        name: i.item_name, station: i.station, price: Number(i.price), qty: Number(i.qty),
        note: i.notes ?? undefined, modifiers: (() => {
          try { return Array.isArray(i.modifiers) ? i.modifiers : JSON.parse(i.modifiers || "[]"); } catch { return []; }
        })(),
      }));
      const { data: result, error } = await supabase.rpc("restaurant_checkout", {
        _sale: {
          order_id: o.id,
          client_ref: `restaurant-settle:${o.id}`,
          order_no: o.order_no,
          business_date: restaurantBusinessDate(),
          table_id: o.table_id,
          order_type: o.order_type,
          guests: o.guests,
          subtotal: Number(o.subtotal || 0),
          discount: Number(o.discount || 0),
          tax: Number(o.tax || 0),
          service_charge: Number(o.service_charge || 0),
          gratuity: Number(o.gratuity || 0),
          delivery_fee: Number(o.delivery_fee || 0),
          total: Number(o.total || 0),
          server_name: o.server_name || server || null,
          customer_name: o.customer_name || customer || null,
          shift_id: undefined,
        },
        _items: savedLines,
        _payments: [{ method, amount: Number(o.total || 0), tendered: tendered ?? Number(o.total || 0), change: change ?? 0 }],
      } as any);
      if (error || !result) return toast.error(restaurantCheckoutErrorMessage(error));
      try { await accrueLoyaltyForOrder(o.id); } catch { /* loyalty is best-effort */ }
      toast.success(`Check settled — ${fmtMoney(Number(o.total))}`);
      load();
    } finally {
      setBusy(false);
    }
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

  const cats = useMemo(() => ["ALL", ...Array.from(new Set(menu.map(m => m.category).filter(Boolean)))], [menu]);
  const itemStock = (mi: MenuItem) => { const rr = recipes.filter(r => r.menu_item_id === mi.id && Number(r.quantity) > 0); if (!rr.length || !posStockLocation) return null; return Math.max(0, Math.min(...rr.map(r => Math.floor(Number(stockBalances.find(x => x.item_id === r.stock_item_id && x.location_id === posStockLocation)?.quantity ?? 0) / Number(r.quantity))))); };
  const searchTerm = search.trim().toLowerCase();
  const barcodeMatch = searchTerm ? menu.find(m => String(m.barcode ?? "").toLowerCase() === searchTerm || String(m.sku ?? "").toLowerCase() === searchTerm) : undefined;
  const shown = menu.filter(m =>
    m.active &&
    (cat === "ALL" || m.category === cat) &&
    (!searchTerm || [m.name, m.barcode, m.sku, m.category].some(v => String(v ?? "").toLowerCase().includes(searchTerm))));
  const openOrders = orders.filter(o => o.status === "open" || o.status === "held");

  const sideKeys: { label: string; icon: string; run: () => void; feature?: any; channel?: "retail" | "restaurant" }[] = [
    { label: "NEW", icon: "＋", run: clearCheck },
    { label: "MISC", icon: "▦", run: () => { const n = window.prompt("Misc item name"); const p = n ? window.prompt("Price") : null; if (n && p) setCart(c => [...c, { name: n, station: "Kitchen", price: Number(p) || 0, qty: 1 }]); } },
    { label: "VOID", icon: "×", run: () => (openOrders.length ? setPanel("recall") : toast.error("No open checks to void")), feature: "void_item" },
    { label: "DISCOUNT", icon: "%", run: () => { const p = window.prompt("Discount %", String(discountPct)); if (p !== null) setDiscountPct(Math.min(100, Math.max(0, Number(p) || 0))); } },
    { label: "GUESTS", icon: "♟", run: () => { const g = window.prompt("Number of guests", String(guests)); if (g) setGuests(Math.max(1, Number(g) || 1)); } },
    { label: "CUSTOMER", icon: "♙", run: () => setPanel("customer") },
    { label: "RECALL", icon: "↻", run: () => setPanel("recall") },
    { label: "HOLD", icon: "Ⅱ", run: () => sendOrder(undefined, true), feature: "hold_order" },
    { label: "TABLES", icon: "⌑", run: () => setPanel("tables"), feature: "tables", channel: "restaurant" },
    { label: "RESERVATIONS", icon: "◷", run: () => navigate({ to: "/restaurant/reservations" }) },
    { label: "KITCHEN", icon: "▤", run: () => navigate({ to: "/restaurant/kitchen" }), feature: "kitchen_display", channel: "restaurant" },
    { label: "SETTINGS", icon: "⚙", run: () => navigate({ to: "/pos/settings" }), feature: "settings" },
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
    <>
    <style>{POS_SCROLL_STYLE}
      .sifopos-touch button, .sifopos-touch select, .sifopos-touch input { min-height: 44px; }
      .sifopos-touch button { touch-action: manipulation; }
    </style>
    <div className={cn("sifopos-touch flex flex-col overflow-hidden border border-[#dbe5e2] bg-[#f4f7f6] text-[#173b3a] shadow-[0_12px_30px_#173c4030]", fullScreen ? "fixed inset-0 z-[100] h-screen w-screen rounded-none" : "h-[calc(100dvh-9.5rem)] min-h-[620px] rounded-[10px]")}>
      {/* top bar — order types */}
      <div className="pos-scrollbar flex h-[50px] shrink-0 items-center gap-[5px] overflow-x-auto scroll-smooth border-b border-[#164744] bg-[#073b38] px-[6px] py-[5px] text-white">
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="inline-flex h-[38px] shrink-0 items-center gap-1 rounded-[19px] border border-white/30 bg-[#20504d] px-3 text-[9px] font-black shadow-sm transition hover:bg-[#2a625e] active:scale-[.97]"
          title="Full screen POS"
        >
          {fullScreen ? <><Minimize2 className="h-4 w-4" /><span> EXIT FULL</span></> : <><Maximize2 className="h-4 w-4" /><span> FULL SCREEN</span></>}
        </button>
        {typeLabels.map(t => (
          <button key={t} onClick={() => { setMode(t); setTableId(null); }}
            className={cn("h-[36px] shrink-0 whitespace-nowrap rounded-[18px] border-2 px-[13px] text-[10px] font-extrabold tracking-[.02em] transition active:scale-[.97]",
              mode === t ? "border-[#9ac7bb] bg-[#0d7b4e]" : "border-[#88aaa9] bg-[#264f54]")}>
            {t}
          </button>
        ))}
        <div className="ml-auto shrink-0 whitespace-nowrap px-2 text-[10px] font-extrabold opacity-85">
          {cashierCode ? "CASHIER " + cashierCode + (cashierName ? " • " + cashierName + " • " : " • ") : "STATION 01 • "}{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* body */}
      <div className="grid min-h-0 flex-1 gap-[6px] overflow-y-auto bg-[#1d5555] p-[6px] md:grid-cols-[66px_minmax(0,1fr)] md:grid-rows-[minmax(240px,40%)_minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[82px_300px_105px_minmax(0,1fr)] lg:grid-rows-1">
        {/* action rail */}
        <aside className="flex min-h-0 flex-row gap-[5px] overflow-x-auto md:row-span-2 md:h-full lg:row-span-1 md:flex-col md:overflow-x-visible md:overflow-y-auto">
          {visibleSideKeys.map(k => (
            <button key={k.label} onClick={k.run}
              className="flex min-h-[58px] w-[62px] shrink-0 flex-col items-center justify-center gap-[2px] rounded-[13px] border border-[#789695] bg-[#315f63] md:w-auto px-[2px] py-[5px] text-[10px] font-extrabold transition hover:bg-[#487e7d] active:scale-[.97]">
              <span className="text-[19px] leading-[18px]">{k.icon}</span>{k.label}
            </button>
          ))}
          <div className="my-[3px] hidden h-px bg-[#709190] md:block" />
          <button onClick={() => navigate({ to: "/dashboard" })}
            className="flex min-h-[52px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[13px] border border-[#789695] bg-[#6a6d70] md:mt-auto md:w-auto text-[9px] font-extrabold">
            <span className="text-[19px] leading-[18px]">⚙</span>ACCOUNTING
          </button>
          <button onClick={() => navigate({ to: "/restaurant" })}
            className="flex min-h-[52px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[13px] border border-[#ff5b5b] bg-[#d71818] md:w-auto text-[9px] font-extrabold">
            <span className="text-[19px] leading-[18px]">⎋</span>EXIT
          </button>
        </aside>

        {/* check panel */}
        <section className="grid min-h-[320px] grid-rows-[auto_auto_1fr_auto_auto] overflow-hidden rounded-[8px] bg-[#f6f7f4] text-[#214047] md:h-full md:min-h-0">
          <div className="flex items-center justify-between border-b border-[#d4dddd] bg-white px-3 py-2">
            <div>
              <strong className="block text-[12px]">{recalled ? `RECALLED ${recalled.order_no}` : `NEW ${mode} ORDER`}</strong>
              <small className="mt-[3px] block text-[9px] text-[#738487]">
                {needsTable ? (tableId ? `TABLE ${tables.find(t => t.id === tableId)?.name}` : "NO TABLE") : "WALK-IN"}
                {customer ? ` • ${customer}` : ""} • {mode}
              </small>
            </div>
            <button
          onClick={() => setPanel("recall")}
          disabled={busy}
          className="h-[34px] w-[34px] rounded-[16px] bg-[#6e7b7e] text-white disabled:opacity-50"
          aria-label="Recall or settle open check"
        >⌕</button>
          </div>
          <div className="flex items-center justify-between bg-[#e7eceb] px-3 py-2 text-[10px] font-extrabold">
            <button onClick={() => setGuests(g => Math.max(1, g - 1))}>−</button>
            <span>GUEST {guests} OF {guests}</span>
            <button onClick={() => setGuests(g => g + 1)}>＋</button>
          </div>
          <div className="min-h-0 overflow-y-auto bg-white">
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
        <aside className="hidden min-h-0 flex-col gap-[5px] overflow-y-auto p-[2px] lg:flex lg:h-full">
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
        <section className="grid min-h-[360px] min-w-0 grid-rows-[49px_1fr_auto] overflow-hidden rounded-[8px] bg-[#1b5051] md:h-full md:min-h-0">
          <div className="flex items-center gap-2 border-b border-[#719493] bg-[#315f63] px-2 py-[6px]">
            <div className="whitespace-nowrap text-[11px] font-black">MENU • {cat.toUpperCase()}</div><button type="button" onClick={() => void load()} disabled={loading} className="ml-auto inline-flex h-[30px] items-center gap-1 rounded-[15px] border-2 border-[#789998] bg-[#264f54] px-2 text-[10px] font-bold text-white disabled:opacity-50"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> REFRESH</button><select value={posStockLocation} onChange={e => { setPosStockLocation(e.target.value); window.localStorage.setItem("sifobooks.restaurant.pos.location", e.target.value); }} className="h-[30px] max-w-[180px] rounded-[15px] border-2 border-[#789998] bg-[#264f54] px-2 text-[10px] font-bold text-white"><option value="">Stock location</option>{stockLocations.map(l => <option key={l.id} value={l.id}>{l.name} · {l.location_type}</option>)}</select>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="h-[30px] rounded-[15px] border-2 border-[#789998] bg-[#264f54] px-2 text-[10px] font-bold lg:hidden">
              {cats.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
            <div className="ml-auto flex shrink-0 items-center gap-1 rounded-[16px] border border-[#789998] bg-[#264f54] p-1">
              {(["normal","large","xl"] as const).map(s => <button key={s} type="button" onClick={() => setTextScale(s)} className={cn("rounded-full px-2 py-1 text-[10px] font-black text-white", textScale === s ? "bg-[#07913c]" : "bg-transparent")} aria-label={`Text size ${s}`}>{s === "normal" ? "A" : s === "large" ? "A+" : "A++"}</button>)}
            </div>\n            <div className="relative w-[min(260px,42%)] shrink-0">
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && barcodeMatch) {
                    e.preventDefault();
                    addToCart(barcodeMatch);
                    setSearch("");
                  }
                }}
                placeholder="SEARCH ITEM / BARCODE..."
                aria-label="Search menu item or barcode"
                className="h-[32px] w-full rounded-[16px] border-2 border-[#789998] bg-[#f5f7f5] px-3 pr-7 text-[11px] font-semibold text-[#20504d] outline-none transition focus:border-[#9de0c7] focus:ring-2 focus:ring-[#07913c55]" />
              {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); searchRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[14px] font-black text-[#58706f]">×</button>}
            </div>
          </div>
          <div className={cn("pos-scrollbar grid auto-rows-[minmax(100px,1fr)] grid-cols-2", textScale === "large" ? "text-[13px]" : textScale === "xl" ? "text-[15px]" : "text-[12px]" gap-2 overflow-auto scroll-smooth p-2 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((mi, i) => (
              <button key={mi.id} onClick={() => addToCart(mi)}
                disabled={itemStock(mi) === 0}
                className={cn("relative flex flex-col items-center justify-center gap-2 rounded-[14px] border border-[#d8e4e1] bg-white p-3 text-center text-[#173b3a] shadow-sm transition hover:-translate-y-[2px] hover:border-[#07834f] hover:shadow-[0_8px_24px_#174b4b18] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:border-[#d8e4e1] disabled:hover:shadow-sm")}>
                {itemStock(mi) === 0 && <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black text-white">SOLD OUT</span>}
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-2xl", itemStock(mi) === 0 ? "bg-red-50 grayscale" : "bg-[#eaf5f0]")}>🍽️</span>
                <strong className="text-[12px] leading-tight">{mi.name}</strong>
                <span className="rounded-full bg-[#07834f] px-3 py-1 text-[11px] font-black text-white">{fmtMoney(Number(mi.price))}</span>
                {itemStock(mi) !== null && <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black", (itemStock(mi) ?? 0) <= 0 ? "border-red-200 bg-red-50 text-red-600" : (itemStock(mi) ?? 0) <= 3 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{itemStock(mi) === 0 ? "OUT OF STOCK" : String(itemStock(mi)) + " available"}</span>}
                {itemStock(mi) === null && recipes.some(r => r.menu_item_id === mi.id) && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-600">SELECT STOCK LOCATION</span>}
              </button>
            ))}
            {!shown.length && <div className="col-span-full py-10 text-center text-[12px] opacity-70">No items match.</div>}
          </div>
          <div className="grid grid-cols-3 gap-[5px] border-t border-[#799695] bg-[#315f63] p-[7px] lg:grid-cols-[1fr_1fr_1.3fr_1.2fr_1.2fr_1.4fr]">
            <BottomBtn onClick={clearCheck} className="bg-[#bd1111]">CANCEL</BottomBtn>
            <BottomBtn onClick={() => (cart.length ? setTender({ method: "Cash", amount: total }) : toast.error("Check is empty"))} className="bg-[#6f7d80]">CASH</BottomBtn>
            <BottomBtn onClick={() => (cart.length ? setTender({ method: "Card", amount: total }) : toast.error("Check is empty"))} className="bg-[#315f91]">CARD</BottomBtn>
            <BottomBtn onClick={() => (cart.length ? setTender({ method: "momo", amount: total }) : toast.error("Check is empty"))} className="bg-[#7616b9]">MTN MOMO</BottomBtn>
            <BottomBtn onClick={() => (cart.length ? setTender({ method: "airtel", amount: total }) : toast.error("Check is empty"))} className="bg-[#b3122c]">AIRTEL</BottomBtn>
            <BottomBtn onClick={() => sendOrder(undefined, true)} className="bg-[#d76c09]">HOLD CHECK</BottomBtn>
            <BottomBtn onClick={clearCheck} className="bg-[#ed0b0b]">CLEAR CHECK</BottomBtn>
            <BottomBtn onClick={() => (cart.length ? setTender({ method: "Cash", amount: total }) : toast.error("Check is empty"))} className="bg-[#0b913f] text-[12px]">PAY {fmtMoney(total)} ›</BottomBtn>
          </div>
        </section>
      </div>

      {/* footer status */}
      <div className="flex shrink-0 items-center justify-between border-t border-[#799695] bg-[#315e64] px-4 py-1.5 text-[10px] opacity-85">
        <span>SifoBooks Restaurant • {cashierCode ? "Cashier " + cashierCode : (server || "Terminal")} • {openOrders.length} open checks</span>
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
          method={tender.method}
          due={tender.amount}
          onCancel={() => setTender(null)}
          onConfirm={(tendered, change) => {
            const t = tender;
            setTender(null);
            if (t.order) settle(t.order, t.method, tendered, change);
            else void closeOrder(t.method, tendered, change);
          }}
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
    </>
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

function TenderDialog({ method = "Cash", due, onCancel, onConfirm }: { method?: string; due: number; onCancel: () => void; onConfirm: (tendered: number, change: number) => void }) {
  const safeMethod = method || "Cash";
  const isCash = safeMethod.toLowerCase() === "cash";
  const [cash, setCash] = useState(isCash ? "" : due.toFixed(2));
  const received = Number(cash || 0);
  const change = received - due;
  const nextAmount = Math.ceil(due / 50) * 50;
  const push = (k: string) => setCash(c => (k === "C" ? "" : c + k));
  return (
    <Overlay title={`${safeMethod} payment`} onCancel={onCancel} wide>
      <div className="mb-2 flex justify-between text-sm font-extrabold"><span>Amount due</span><span>{fmtMoney(due)}</span></div>
      <div className="mb-2 rounded-xl border-2 border-white/25 bg-white px-3 py-3 text-right text-[27px] font-black text-[#20504d]">{cash || "0.00"}</div>
      {isCash && <div className="mb-2 grid grid-cols-4 gap-1.5">
        {DENOMS.map(d => (
          <button key={d} onClick={() => setCash(String(received + d))} className="min-h-10 rounded-lg bg-[#71879a] text-[12px] font-bold">{fmtMoney(d)}</button>
        ))}
        <button onClick={() => setCash(String(due))} className="min-h-10 rounded-lg bg-[#4e89bc] text-[11px] font-bold">EXACT</button>
        <button onClick={() => setCash(String(nextAmount))} className="min-h-10 rounded-lg bg-[#4e89bc] text-[11px] font-bold">NEXT</button>
      </div>}
      {!isCash && <div className="mb-2 rounded-lg bg-white/10 p-3 text-center text-xs font-bold">Confirm the {safeMethod} amount received from the customer.</div>}
      {isCash && <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "C"].map(k => (
          <button key={k} onClick={() => push(k)} className="h-[52px] rounded-lg border-2 border-white/20 bg-[#315d5a] text-xl font-bold">{k}</button>
        ))}
        </div>}
      <div className="mt-2 flex justify-between text-sm font-extrabold">
        <span>{isCash ? "Change" : "Amount to post"}</span><span>{isCash ? (change >= 0 ? fmtMoney(change) : "—") : fmtMoney(due)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="min-h-11 rounded-xl bg-[#71879a] font-extrabold">Cancel</button>
        <button onClick={() => onConfirm(isCash ? received : due, isCash ? Math.max(0, change) : 0)} disabled={isCash && change < 0} className="min-h-11 rounded-xl bg-[#0b9d19] font-extrabold disabled:opacity-60">Complete payment</button>
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
