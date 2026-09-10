import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  loadProducts, loadSettings, currentShift, completeSale, computeTotals, posErrorMessage,
  DEFAULT_SETTINGS, type PosSettings, type CartLine,
} from "@/lib/pos";
import {
  ShoppingCart, Utensils, Coffee, Truck, Package, ArrowRightLeft, Wallet, BarChart3,
  Printer, LogOut, Menu, X, Search, Plus, Minus, Trash2, Pause, RotateCcw, Lock,
  ChevronRight, ChefHat, Receipt, Banknote, Smartphone, CreditCard, CheckCircle2, AlertTriangle,
} from "lucide-react";

type Role = "cashier" | "waiter" | "supervisor" | "manager" | "kitchen";
type OrderType = "COUNTER" | "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "DRIVE_THRU" | "BAR";
type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  color: string;
  modifiers?: string[];
};

type CartItem = Product & { quantity: number; note?: string };

type FloorTable = {
  id: string;
  name: string;
  seats: number;
  status: "available" | "occupied" | "reserved" | "dirty";
  x: number;
  y: number;
};

/** Tile colours are cosmetic only — real prices, stock and cost come from the inventory ledger. */
const TILE_COLOURS = ["#b91c1c", "#991b1b", "#d97706", "#ea580c", "#dc2626", "#0369a1", "#111827", "#65a30d", "#78350f"];
const tileColour = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  return TILE_COLOURS[hash % TILE_COLOURS.length]!;
};

const TABLES: FloorTable[] = [
  { id: "T1", name: "1", seats: 2, status: "available", x: 5, y: 5 },
  { id: "T2", name: "2", seats: 4, status: "occupied", x: 30, y: 5 },
  { id: "T3", name: "3", seats: 4, status: "available", x: 55, y: 5 },
  { id: "T4", name: "4", seats: 6, status: "reserved", x: 75, y: 5 },
  { id: "T5", name: "5", seats: 2, status: "available", x: 5, y: 45 },
  { id: "T6", name: "6", seats: 4, status: "dirty", x: 30, y: 45 },
  { id: "T7", name: "7", seats: 4, status: "available", x: 55, y: 45 },
  { id: "T8", name: "8", seats: 6, status: "occupied", x: 75, y: 45 },
];

const ROLE_LABELS: Record<Role, string> = {
  cashier: "CASHIER",
  waiter: "WAITER",
  supervisor: "SUPERVISOR",
  manager: "MANAGER",
  kitchen: "KITCHEN",
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", minimumFractionDigits: 2 }).format(value);

export default function POSCommandCenter() {
  const [role, setRole] = useState<Role>("cashier");
  const [screen, setScreen] = useState<"POS" | "TABLES" | "CASH" | "STOCK" | "REPORTS" | "KITCHEN" | "END_DAY">("POS");
  const [orderType, setOrderType] = useState<OrderType>("COUNTER");
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<CartItem[][]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<PosSettings>(DEFAULT_SETTINGS);
  const [shift, setShift] = useState<any | null>(null);
  const [posting, setPosting] = useState(false);

  // Live catalogue, till settings and the cashier's open shift.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [items, cfg, openShift] = await Promise.all([loadProducts(), loadSettings(), currentShift()]);
        if (!alive) return;
        setProducts(
          items
            .filter((p) => p.is_active)
            .map((p) => ({
              id: p.id,
              name: p.name,
              category: (p.category ?? "GENERAL").toUpperCase(),
              price: p.price,
              stock: p.stock,
              color: tileColour(p.category ?? p.name),
            })),
        );
        setSettings(cfg);
        setShift(openShift);
      } catch {
        toast.error("Could not load the till. Check your connection and retry.");
      }
    })();
    return () => { alive = false; };
  }, []);

  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "ALL" || product.category === category;
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, category, search]);

  // Display figures only — the server recomputes VAT, totals and cost of sales.
  const gross = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const rate = Number(settings.tax_rate || 0) / 100;
  const tax = settings.tax_inclusive ? gross - gross / (1 + rate) : gross * rate;
  const subtotal = settings.tax_inclusive ? gross - tax : gross;
  const total = settings.tax_inclusive ? gross : gross + tax;

  const addItem = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const decreaseItem = (id: string) => {
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item)).filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => setCart((current) => current.filter((item) => item.id !== id));

  const holdOrder = () => {
    if (!cart.length) return;
    setHeldOrders((current) => [...current, cart]);
    setCart([]);
  };

  const clearOrder = () => {
    if (cart.length && !window.confirm("Clear current order?")) return;
    setCart([]);
  };

  const submitPayment = async () => {
    if (!cart.length || posting) return;
    if (!shift) { toast.error("No open shift. Open your shift before selling."); return; }
    setPosting(true);
    try {
      const lines: CartLine[] = cart.map((item, index) => ({
        key: `${item.id}-${index}`,
        item_id: item.id,
        name: item.name,
        sku: null,
        qty: item.quantity,
        price: item.price,
        unit_cost: 0,
        discount_pct: 0,
        note: item.note,
      }));
      const totals = computeTotals(lines, 0, settings);
      const method = paymentMethod === "CASH" ? "cash" : paymentMethod === "CARD" ? "card" : "momo";
      const tendered = paymentMethod === "CASH" ? Math.max(Number(cashReceived || 0), totals.total) : totals.total;
      const result = await completeSale(
        {
          lines,
          totals,
          customer: null,
          customerName: customerName || settings.default_customer,
          priceLevel: settings.default_price_level,
          saleDiscountPct: 0,
          shiftId: shift.id,
          registerId: shift.register_id ?? null,
          taxRate: settings.tax_rate,
          taxInclusive: settings.tax_inclusive,
          allowNegativeStock: settings.allow_negative_stock,
        },
        [{ method, amount: tendered }],
        Math.max(0, tendered - totals.total),
      );
      toast.success(result.offline ? "Saved offline — it will post when you reconnect." : `Sale ${result.sale_no} completed`);
      setPaymentOpen(false);
      setCart([]);
      setCashReceived("");
      setCustomerName("");
      const refreshed = await loadProducts();
      setProducts(
        refreshed.filter((p) => p.is_active).map((p) => ({
          id: p.id, name: p.name, category: (p.category ?? "GENERAL").toUpperCase(),
          price: p.price, stock: p.stock, color: tileColour(p.category ?? p.name),
        })),
      );
    } catch (e: any) {
      toast.error(posErrorMessage(e?.message ?? ""));
    } finally {
      setPosting(false);
    }
  };

  const change = paymentMethod === "CASH" ? Math.max(0, Number(cashReceived || 0) - total) : 0;

  const canSeeCash = role === "cashier" || role === "supervisor" || role === "manager";
  const canSeeStock = role === "supervisor" || role === "manager";
  const canSeeReports = role === "supervisor" || role === "manager";
  const canSeeEndDay = role === "manager";

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#102f2f] text-white">
      {/* MOBILE MENU */}
      {mobileMenu && (
        <div className="absolute inset-0 z-50 bg-[#0b2424] lg:hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <div className="text-xl font-black">SifoBooks POS</div>
              <div className="text-xs text-white/50">{ROLE_LABELS[role]}</div>
            </div>
            <button onClick={() => setMobileMenu(false)} className="rounded-xl bg-white/10 p-3">
              <X />
            </button>
          </div>
          <MobileNavigation
            role={role}
            screen={screen}
            setScreen={setScreen}
            setMobileMenu={setMobileMenu}
            canSeeCash={canSeeCash}
            canSeeStock={canSeeStock}
            canSeeReports={canSeeReports}
            canSeeEndDay={canSeeEndDay}
          />
        </div>
      )}

      {/* DESKTOP SIDE BAR */}
      <aside className="hidden w-[92px] flex-col border-r border-white/10 bg-[#123838] lg:flex xl:w-[105px]">
        <div className="flex h-[72px] items-center justify-center border-b border-white/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f5b] font-black">SF</div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          <POSNavButton active={screen === "POS"} icon={<ShoppingCart size={21} />} label="POS" onClick={() => setScreen("POS")} />
          {role !== "kitchen" && (
            <POSNavButton active={screen === "TABLES"} icon={<Utensils size={21} />} label="TABLES" onClick={() => setScreen("TABLES")} />
          )}
          {role === "waiter" && (
            <POSNavButton active={screen === "KITCHEN"} icon={<ChefHat size={21} />} label="KITCHEN" onClick={() => setScreen("KITCHEN")} />
          )}
          {canSeeCash && (
            <POSNavButton active={screen === "CASH"} icon={<Wallet size={21} />} label="CASH" onClick={() => setScreen("CASH")} />
          )}
          {canSeeStock && (
            <POSNavButton active={screen === "STOCK"} icon={<Package size={21} />} label="STOCK" onClick={() => setScreen("STOCK")} />
          )}
          {canSeeReports && (
            <POSNavButton active={screen === "REPORTS"} icon={<BarChart3 size={21} />} label="REPORTS" onClick={() => setScreen("REPORTS")} />
          )}
          {canSeeEndDay && (
            <POSNavButton active={screen === "END_DAY"} icon={<Lock size={21} />} label="END DAY" onClick={() => setScreen("END_DAY")} />
          )}
        </div>
        <button className="m-2 rounded-2xl bg-red-600 p-3 transition hover:bg-red-500" onClick={() => window.history.back()}>
          <LogOut size={20} className="mx-auto" />
          <span className="mt-1 block text-[10px]">EXIT</span>
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-white/10 bg-[#163f3f] px-3 lg:px-5">
          <button className="rounded-xl bg-white/10 p-3 lg:hidden" onClick={() => setMobileMenu(true)}>
            <Menu />
          </button>
          <div className="hidden sm:block">
            <div className="font-black">SifoBooks POS</div>
            <div className="text-xs text-white/45">My Company • Restaurant</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-xl border border-white/10 bg-[#214d4d] px-3 py-2 text-sm outline-none"
            >
              <option value="cashier">Cashier</option>
              <option value="waiter">Waiter</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="kitchen">Kitchen</option>
            </select>
            <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-2 md:flex">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs">ONLINE</span>
            </div>
            <button className="rounded-xl bg-white/5 p-3">
              <Lock size={18} />
            </button>
          </div>
        </header>

        {screen === "POS" && (
          <POSScreen
            orderType={orderType}
            setOrderType={setOrderType}
            categories={categories}
            category={category}
            setCategory={setCategory}
            search={search}
            setSearch={setSearch}
            filteredProducts={filteredProducts}
            cart={cart}
            subtotal={subtotal}
            tax={tax}
            total={total}
            addItem={addItem}
            decreaseItem={decreaseItem}
            removeItem={removeItem}
            holdOrder={holdOrder}
            clearOrder={clearOrder}
            heldOrders={heldOrders}
            setCart={setCart}
            setPaymentOpen={setPaymentOpen}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            customerName={customerName}
            setCustomerName={setCustomerName}
            guestCount={guestCount}
            setGuestCount={setGuestCount}
          />
        )}
        {screen === "TABLES" && <TablesScreen selectedTable={selectedTable} setSelectedTable={setSelectedTable} />}
        {screen === "CASH" && <CashScreen />}
        {screen === "STOCK" && <StockScreen />}
        {screen === "REPORTS" && <ReportsScreen />}
        {screen === "KITCHEN" && <KitchenScreen />}
        {screen === "END_DAY" && <EndDayScreen />}
      </main>

      {paymentOpen && (
        <PaymentModal
          total={total}
          method={paymentMethod}
          setMethod={setPaymentMethod}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          change={change}
          submitPayment={submitPayment}
          close={() => setPaymentOpen(false)}
        />
      )}
    </div>
  );
}

function POSScreen(props: any) {
  return (
    <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
      {/* ORDER */}
      <section className="flex min-h-[42vh] flex-col bg-[#f5f7f6] text-slate-900 xl:min-h-0 xl:w-[390px] 2xl:w-[440px]">
        <div className="bg-[#183f3f] p-3 text-white">
          <div className="flex items-center justify-between">
            <div className="font-black">NEW {props.orderType.replace("_", " ")} ORDER</div>
            <span className="text-xs text-white/50">ORDER #00128</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b bg-white p-2">
          {([
            ["COUNTER", ShoppingCart],
            ["DINE_IN", Utensils],
            ["TAKEAWAY", Package],
            ["DELIVERY", Truck],
            ["DRIVE_THRU", Truck],
            ["BAR", Coffee],
          ] as any[]).map(([type, Icon]: any) => (
            <button
              key={type}
              onClick={() => props.setOrderType(type)}
              className={`rounded-xl border p-2 text-[10px] font-bold transition ${
                props.orderType === type ? "border-[#087f5b] bg-[#087f5b] text-white" : "bg-white hover:bg-slate-50"
              }`}
            >
              <Icon size={17} className="mx-auto mb-1" />
              {type.replace("_", " ")}
            </button>
          ))}
        </div>

        {props.orderType === "DINE_IN" && (
          <div className="grid grid-cols-2 gap-2 bg-[#eef4f1] p-2">
            <button
              onClick={() => {
                const table = window.prompt("Enter table number");
                if (table) props.setSelectedTable(table);
              }}
              className="rounded-xl bg-[#214d4d] p-3 text-sm font-bold text-white"
            >
              <Utensils size={17} className="mr-2 inline" />
              {props.selectedTable ? `TABLE ${props.selectedTable}` : "SELECT TABLE"}
            </button>
            <div className="rounded-xl bg-white px-3 py-2">
              <div className="text-[10px] text-slate-500">GUESTS</div>
              <input
                type="number"
                min={1}
                value={props.guestCount}
                onChange={(e) => props.setGuestCount(Number(e.target.value))}
                className="w-full font-bold outline-none"
              />
            </div>
          </div>
        )}

        {(props.orderType === "TAKEAWAY" || props.orderType === "DELIVERY" || props.orderType === "COUNTER") && (
          <div className="bg-[#eef4f1] p-2">
            <input
              value={props.customerName}
              onChange={(e) => props.setCustomerName(e.target.value)}
              placeholder="Customer name..."
              className="w-full rounded-xl border bg-white px-3 py-3 outline-none"
            />
          </div>
        )}

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {!props.cart.length && (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <ShoppingCart size={48} />
              <div className="mt-3 font-bold">No items added</div>
              <div className="text-xs">Select products from the menu</div>
            </div>
          )}
          {props.cart.map((item: CartItem) => (
            <div key={item.id} className="flex items-center gap-2 rounded-xl border bg-white p-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg font-black text-white" style={{ background: item.color }}>
                {item.quantity}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{item.name}</div>
                <div className="text-xs text-slate-500">{currency(item.price)}</div>
              </div>
              <button onClick={() => props.decreaseItem(item.id)} className="h-8 w-8 rounded-lg bg-slate-100">
                <Minus size={14} className="mx-auto" />
              </button>
              <button onClick={() => props.addItem(item)} className="h-8 w-8 rounded-lg bg-[#087f5b] text-white">
                <Plus size={14} className="mx-auto" />
              </button>
              <button onClick={() => props.removeItem(item.id)} className="h-8 w-8 rounded-lg bg-red-50 text-red-600">
                <Trash2 size={14} className="mx-auto" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t bg-white p-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <b>{currency(props.subtotal)}</b>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT</span>
            <b>{currency(props.tax)}</b>
          </div>
          <div className="mt-2 flex justify-between text-xl font-black">
            <span>TOTAL</span>
            <span className="text-[#087f5b]">{currency(props.total)}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <button onClick={props.holdOrder} className="rounded-xl bg-orange-500 p-3 text-xs font-bold text-white">
              <Pause size={17} className="mx-auto" />
              HOLD
            </button>
            <button onClick={props.clearOrder} className="rounded-xl bg-red-600 p-3 text-xs font-bold text-white">
              <Trash2 size={17} className="mx-auto" />
              CLEAR
            </button>
            <button className="rounded-xl bg-slate-700 p-3 text-xs font-bold text-white">
              <Printer size={17} className="mx-auto" />
              RECEIPT
            </button>
            <button
              onClick={() => props.setPaymentOpen(true)}
              disabled={!props.cart.length}
              className="rounded-xl bg-[#087f5b] p-3 text-xs font-black text-white disabled:opacity-40"
            >
              PAY
              <ChevronRight size={17} className="mx-auto" />
            </button>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section className="flex min-w-0 flex-1 flex-col bg-[#102f2f]">
        <div className="flex gap-2 border-b border-white/10 p-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-3 text-white/40" />
            <input
              value={props.search}
              onChange={(e) => props.setSearch(e.target.value)}
              placeholder="Search menu..."
              className="w-full rounded-xl border border-white/10 bg-white/10 px-10 py-3 outline-none placeholder:text-white/40"
            />
          </div>
          <button onClick={() => props.setSearch("")} className="rounded-xl bg-white/10 px-4">
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto p-3">
          {props.categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => props.setCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-xs font-bold transition ${
                props.category === cat ? "bg-[#087f5b] text-white" : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {props.filteredProducts.map((product: Product) => (
              <button
                key={product.id}
                onClick={() => props.addItem(product)}
                disabled={product.stock <= 0}
                className="group min-h-[125px] overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition hover:bg-white/10 active:scale-95 disabled:opacity-30"
              >
                <div className="flex h-[72px] items-center justify-center text-lg font-black text-white" style={{ background: product.color }}>
                  {product.name.split(" ").map((x) => x[0]).join("").slice(0, 3)}
                </div>
                <div className="p-2">
                  <div className="truncate text-sm font-bold">{product.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-black text-[#6ee7b7]">{currency(product.price)}</span>
                    <span className="text-[10px] text-white/40">{product.stock} left</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TablesScreen({
  selectedTable,
  setSelectedTable,
}: {
  selectedTable: string | null;
  setSelectedTable: (x: string) => void;
}) {
  return (
    <div className="flex-1 overflow-auto bg-[#102f2f] p-4 lg:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">RESTAURANT FLOOR</h1>
          <p className="text-sm text-white/40">Select a table to start or recall an order</p>
        </div>
        <div className="flex gap-2 text-xs">
          <Legend color="bg-green-500" text="Available" />
          <Legend color="bg-red-500" text="Occupied" />
          <Legend color="bg-yellow-500" text="Reserved" />
        </div>
      </div>

      <div className="relative min-h-[650px] overflow-hidden rounded-3xl border border-white/10 bg-[#183f3f]">
        <div className="absolute left-1/2 top-1/2 flex h-[330px] w-[180px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[50px] border-8 border-orange-700 bg-[#235353]">
          <div className="text-center">
            <Utensils className="mx-auto mb-2" />
            <div className="font-black">MAIN DINING</div>
          </div>
        </div>

        {TABLES.map((table) => {
          const colors = {
            available: "bg-green-600",
            occupied: "bg-red-600",
            reserved: "bg-yellow-600",
            dirty: "bg-gray-500",
          };
          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table.name)}
              className={`absolute h-[80px] w-[105px] rounded-2xl ${colors[table.status]} border-2 shadow-xl ${
                selectedTable === table.name ? "scale-110 border-white" : "border-white/20"
              } transition`}
              style={{ left: `${table.x}%`, top: `${table.y}%` }}
            >
              <div className="text-2xl font-black">{table.name}</div>
              <div className="text-[10px] uppercase">{table.status}</div>
              <div className="text-[10px] opacity-70">{table.seats} seats</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CashScreen() {
  return (
    <DashboardScreen title="CASH MANAGEMENT">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric label="Opening Float" value="ZMW 500.00" icon={<Banknote />} />
        <Metric label="Cash Sales" value="ZMW 8,420.00" icon={<ShoppingCart />} />
        <Metric label="Cash Payouts" value="ZMW 450.00" icon={<ArrowRightLeft />} />
        <Metric label="Expected Drawer" value="ZMW 8,470.00" icon={<Wallet />} green />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="DRAWER ACTIONS">
          <ActionRow icon={<Wallet />} title="Open Cash Drawer" subtitle="Manager or supervisor authorization" />
          <ActionRow icon={<ArrowRightLeft />} title="Cash Payout" subtitle="Vendor payment / petty cash" />
          <ActionRow icon={<Plus />} title="Cash In" subtitle="Add cash to drawer" />
          <ActionRow icon={<RotateCcw />} title="Drawer Recount" subtitle="Compare expected vs actual" />
        </Panel>
        <Panel title="TODAY'S CASH SUMMARY">
          <SummaryRow label="Cash Sales" value="8,420.00" />
          <SummaryRow label="Cash Refunds" value="150.00" />
          <SummaryRow label="Cash Payouts" value="450.00" />
          <SummaryRow label="Opening Float" value="500.00" />
          <SummaryRow label="Expected Cash" value="8,320.00" bold />
        </Panel>
      </div>
    </DashboardScreen>
  );
}

function StockScreen() {
  const [from, setFrom] = useState("WAREHOUSE");
  const [to, setTo] = useState("POS");
  const [item, setItem] = useState("Chicken Burger");
  const [qty, setQty] = useState("10");

  return (
    <DashboardScreen title="POS STOCK MANAGEMENT">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="POS Stock Value" value="ZMW 24,850" icon={<Package />} />
        <Metric label="Low Stock" value="7" icon={<AlertTriangle />} />
        <Metric label="Pending Transfers" value="3" icon={<ArrowRightLeft />} />
      </div>

      <Panel title="STOCK TRANSFER" className="mt-5">
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField label="FROM" value={from} onChange={setFrom} options={["WAREHOUSE", "POS", "BAR", "KITCHEN"]} />
          <SelectField label="TO" value={to} onChange={setTo} options={["POS", "WAREHOUSE", "BAR", "KITCHEN"]} />
          <SelectField
            label="ITEM"
            value={item}
            onChange={setItem}
            options={["Chicken Burger", "Beef Burger", "French Fries", "Coke", "Pizza"]}
          />
          <div>
            <label className="text-xs text-white/40">QUANTITY</label>
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 outline-none"
            />
          </div>
        </div>
        <button className="mt-4 rounded-xl bg-[#087f5b] px-6 py-3 font-black">
          <ArrowRightLeft size={17} className="mr-2 inline" />
          CREATE TRANSFER
        </button>
      </Panel>

      <Panel title="RECENT TRANSFERS" className="mt-5">
        <SimpleTable
          headers={["DATE", "REFERENCE", "FROM", "TO", "ITEM", "QTY", "STATUS"]}
          rows={[
            ["28/08/2026", "TRF-00129", "WAREHOUSE", "POS", "Coke", "50", "POSTED"],
            ["28/08/2026", "TRF-00128", "WAREHOUSE", "KITCHEN", "Chicken", "20", "POSTED"],
            ["28/08/2026", "TRF-00127", "POS", "WAREHOUSE", "Pizza", "5", "PENDING"],
          ]}
        />
      </Panel>
    </DashboardScreen>
  );
}

function ReportsScreen() {
  return (
    <DashboardScreen title="POS REPORTS">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Today's Sales" value="ZMW 18,940" icon={<BarChart3 />} green />
        <Metric label="Orders" value="128" icon={<Receipt />} />
        <Metric label="Average Ticket" value="ZMW 148" icon={<ShoppingCart />} />
        <Metric label="Voids" value="4" icon={<AlertTriangle />} />
      </div>

      <Panel title="QUICK REPORTS" className="mt-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            "Sales Summary", "Sales By Hour", "Sales By Employee", "Sales By Item",
            "Sales By Category", "Payment Methods", "Cash Drawer Report", "Voids & Refunds",
            "Discount Report", "Tax Report", "Stock Movement", "Kitchen Performance",
          ].map((report) => (
            <button key={report} className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
              <BarChart3 size={18} className="text-[#6ee7b7]" />
              <div className="mt-2 font-bold">{report}</div>
              <div className="text-xs text-white/40">View / print report</div>
            </button>
          ))}
        </div>
      </Panel>
    </DashboardScreen>
  );
}

function KitchenScreen() {
  const orders = [
    { id: "#128", type: "DINE-IN", table: "T4", age: "04:12", items: ["2 Chicken Burger", "1 Fries", "2 Coke"] },
    { id: "#129", type: "TAKEAWAY", table: "", age: "02:34", items: ["1 Pizza", "1 Juice"] },
    { id: "#130", type: "DELIVERY", table: "", age: "01:22", items: ["3 Beef Burger", "2 Fries"] },
  ];

  return (
    <DashboardScreen title="KITCHEN DISPLAY">
      <div className="grid gap-4 lg:grid-cols-3">
        {orders.map((order) => (
          <div key={order.id} className="overflow-hidden rounded-2xl border border-white/20 bg-black">
            <div className="flex justify-between bg-red-700 p-3 font-black">
              <span>
                {order.type} {order.id}
              </span>
              <span>{order.age}</span>
            </div>
            <div className="space-y-3 p-4">
              {order.items.map((item) => (
                <div key={item} className="font-black text-red-400">
                  {item}
                </div>
              ))}
            </div>
            <button className="w-full bg-green-700 p-4 font-black">
              <CheckCircle2 size={18} className="mr-2 inline" />
              READY
            </button>
          </div>
        ))}
      </div>
    </DashboardScreen>
  );
}

function EndDayScreen() {
  return (
    <DashboardScreen title="END OF DAY">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel title="BUSINESS DAY SUMMARY">
            <SimpleTable
              headers={["DESCRIPTION", "AMOUNT"]}
              rows={[
                ["Gross Sales", "ZMW 18,940.00"],
                ["Discounts", "ZMW 420.00"],
                ["Refunds", "ZMW 150.00"],
                ["Tax", "ZMW 2,556.00"],
                ["Cash Sales", "ZMW 8,420.00"],
                ["Card Sales", "ZMW 5,920.00"],
                ["Mobile Money", "ZMW 4,600.00"],
                ["TOTAL", "ZMW 18,940.00"],
              ]}
            />
          </Panel>
        </div>
        <Panel title="CONTROL CHECKLIST">
          <Checklist text="All orders settled" />
          <Checklist text="Cash drawer counted" />
          <Checklist text="Stock transfers posted" />
          <Checklist text="Kitchen orders completed" />
          <Checklist text="Refunds reviewed" />
          <Checklist text="Voids reviewed" />
          <button className="mt-5 w-full rounded-xl bg-red-600 p-4 font-black">
            <Lock size={18} className="mr-2 inline" />
            RUN END OF DAY
          </button>
        </Panel>
      </div>
    </DashboardScreen>
  );
}

function PaymentModal({ total, method, setMethod, cashReceived, setCashReceived, change, submitPayment, close }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#163f3f] shadow-2xl">
        <div className="flex justify-between border-b border-white/10 p-5">
          <div>
            <div className="text-xl font-black">CASH TRANSACTION</div>
            <div className="text-xs text-white/40">Select payment method</div>
          </div>
          <button onClick={close}>
            <X />
          </button>
        </div>

        <div className="grid lg:grid-cols-2">
          <div className="p-5">
            <div className="rounded-2xl bg-black/20 p-5">
              <div className="text-xs text-white/40">AMOUNT DUE</div>
              <div className="mt-1 text-4xl font-black">{currency(total)}</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {([
                ["CASH", Banknote],
                ["CARD", CreditCard],
                ["MOBILE_MONEY", Smartphone],
              ] as any[]).map(([name, Icon]: any) => (
                <button
                  key={name}
                  onClick={() => setMethod(name)}
                  className={`rounded-xl p-4 text-xs font-black ${method === name ? "bg-[#087f5b]" : "bg-white/10"}`}
                >
                  <Icon size={22} className="mx-auto mb-2" />
                  {name.replace("_", " ")}
                </button>
              ))}
            </div>

            {method === "CASH" && (
              <div className="mt-4">
                <label className="text-xs text-white/40">CASH RECEIVED</label>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 p-4 text-2xl outline-none"
                />
                <div className="mt-3 flex justify-between">
                  <span>CHANGE</span>
                  <strong className="text-xl text-green-400">{currency(change)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="bg-black/10 p-5">
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."].map((n) => (
                <button
                  key={n}
                  onClick={() => method === "CASH" && setCashReceived(`${cashReceived}${n}`)}
                  className="h-16 rounded-xl bg-white/10 text-2xl font-black hover:bg-white/20"
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={submitPayment} className="mt-3 w-full rounded-xl bg-[#16a34a] p-5 text-xl font-black">
              <CheckCircle2 size={22} className="mr-2 inline" />
              COMPLETE PAYMENT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI COMPONENTS ---------- */

function POSNavButton({ active, icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl p-3 transition ${active ? "bg-[#087f5b] text-white shadow-lg" : "text-white/60 hover:bg-white/5"}`}
    >
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1 text-[9px] font-black">{label}</div>
    </button>
  );
}

function MobileNavigation({ role, screen, setScreen, setMobileMenu, canSeeCash, canSeeStock, canSeeReports, canSeeEndDay }: any) {
  const buttons: any[] = [
    ["POS", ShoppingCart, true],
    ["TABLES", Utensils, role !== "kitchen"],
    ["CASH", Wallet, canSeeCash],
    ["STOCK", Package, canSeeStock],
    ["REPORTS", BarChart3, canSeeReports],
    ["KITCHEN", ChefHat, true],
    ["END_DAY", Lock, canSeeEndDay],
  ];

  return (
    <div className="space-y-2 p-4">
      {buttons
        .filter((x) => x[2])
        .map(([name, Icon]: any) => (
          <button
            key={name}
            onClick={() => {
              setScreen(name);
              setMobileMenu(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl p-4 ${screen === name ? "bg-[#087f5b]" : "bg-white/5"}`}
          >
            <Icon size={20} />
            <span className="font-bold">{name}</span>
          </button>
        ))}
    </div>
  );
}

function DashboardScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#102f2f] p-4 lg:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="text-sm text-white/40">SifoBooks Restaurant Operations</p>
      </div>
      {children}
    </div>
  );
}

function Panel({ title, children, className = "" }: any) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#183f3f] ${className}`}>
      <div className="border-b border-white/10 px-4 py-3 text-sm font-black">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Metric({ label, value, icon, green = false }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#183f3f] p-4">
      <div className="flex justify-between">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-[#6ee7b7]">{icon}</span>
      </div>
      <div className={`mt-3 text-2xl font-black ${green ? "text-green-400" : ""}`}>{value}</div>
    </div>
  );
}

function ActionRow({ icon, title, subtitle }: any) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">{icon}</div>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-white/40">{subtitle}</div>
      </div>
      <ChevronRight className="ml-auto text-white/30" />
    </button>
  );
}

function SummaryRow({ label, value, bold = false }: any) {
  return (
    <div className={`flex justify-between border-b border-white/5 py-3 ${bold ? "text-lg font-black text-green-400" : ""}`}>
      <span>{label}</span>
      <span>ZMW {value}</span>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-white/40">
            {headers.map((header) => (
              <th key={header} className="p-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-white/5">
              {row.map((cell, i) => (
                <td key={i} className={`p-3 ${cell === "POSTED" ? "font-bold text-green-400" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-xs text-white/40">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 outline-none"
      >
        {options.map((option: string) => (
          <option key={option} value={option} className="text-black">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checklist({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/5 py-3">
      <CheckCircle2 size={18} className="text-green-400" />
      <span>{text}</span>
    </div>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {text}
    </div>
  );
}
