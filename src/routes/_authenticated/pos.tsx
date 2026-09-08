import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Barcode, Check, CreditCard, Minus, Percent, Plus, Printer, RotateCcw, Search,
  Settings2, ShoppingBag, Smartphone, Star, Trash2, User, Wallet, X, Clock, Ban,
  PauseCircle, PlayCircle, Undo2, Utensils, LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { RequireModule } from "@/components/RequireModule";
import {
  DEFAULT_SETTINGS, PRICE_LEVELS, closeShift, completeSale, computeTotals, currentShift,
  ensureRegister, holdSale, listHeldSales, listRecentSales, loadCustomers, loadFavorites,
  loadProducts, loadSettings, openShift, priceFactor, recallSale, refundSale, round2,
  saveSettings, shiftSummary, toggleFavorite, todayMetrics, voidSale,
  type CartLine, type PosCustomer, type PosProduct, type PosSettings, type PriceLevel, type SalePayment,
} from "@/lib/pos";
import { printReceipt as sendReceiptToPrinter, type ReceiptData } from "@/services/universalPrintService";
import { getPrinterForType } from "@/services/printerConfiguration";
import { savePrintQueueJob } from "@/services/printQueue";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({
    meta: [
      { title: "Retail POS Terminal — SifoPOS" },
      { name: "description", content: "Fast touchscreen retail point of sale: barcode scanning, product grid, split payments, cash drawer, shifts and automatic stock and accounting posting." },
      { property: "og:title", content: "Retail POS Terminal — SifoPOS" },
      { property: "og:description", content: "Sell fast on any touchscreen — scan, tap, pay. Stock and ledgers post automatically." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RequireModule moduleKey="retail_pos"><RetailPos /></RequireModule>,
});

const TENDERS = [
  { key: "cash", label: "CASH", icon: Wallet },
  { key: "card", label: "CARD", icon: CreditCard },
  { key: "mobile money", label: "MOBILE MONEY", icon: Smartphone },
  { key: "credit", label: "CREDIT", icon: User },
];

const PAY_KEYS: { label: string; icon: any; bg: string }[] = [
  { label: "Cash", icon: Wallet, bg: "bg-till-cash" },
  { label: "Split", icon: Percent, bg: "bg-till-discount" },
  { label: "Visa", icon: CreditCard, bg: "bg-till-card" },
  { label: "MoMo", icon: Smartphone, bg: "bg-till-momo" },
  { label: "Account", icon: User, bg: "bg-till-nav" },
  { label: "Returns", icon: Undo2, bg: "bg-till-void" },
];

const DENOMS = [5, 10, 20, 50, 100, 200, 500];
const QUICK_QTY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 24];
const VOID_REASONS = ["Wrong product", "Wrong quantity", "Customer cancelled", "Duplicate sale", "Other"];


function RetailPos() {
  const net = useNetworkStatus();

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [settings, setSettings] = useState<PosSettings>(DEFAULT_SETTINGS);
  const [register, setRegister] = useState<{ id: string; name: string; branch: string | null } | null>(null);
  const [shift, setShift] = useState<any>(null);
  const [metrics, setMetrics] = useState({ sales: 0, transactions: 0, average: 0 });

  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saleDiscountPct, setSaleDiscountPct] = useState(0);
  const [priceLevel, setPriceLevel] = useState<PriceLevel>("normal");
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [clock, setClock] = useState(() => new Date());

  const [payOpen, setPayOpen] = useState(false);
  const [qtyPad, setQtyPad] = useState<PosProduct | null>(null);
  const [custOpen, setCustOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [held, setHeld] = useState<any[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ sale_no: string; total: number; offline: boolean; snapshot?: any } | null>(null);
  const [voidFor, setVoidFor] = useState<any>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------- bootstrap ------------------------------ */
  const refresh = useCallback(async () => {
    const [p, c, f, s, r, m] = await Promise.all([
      loadProducts(), loadCustomers(), loadFavorites().catch(() => []),
      loadSettings().catch(() => DEFAULT_SETTINGS), ensureRegister().catch(() => null), todayMetrics().catch(() => ({ sales: 0, transactions: 0, average: 0 })),
    ]);
    setProducts(p); setCustomers(c); setFavorites(f); setSettings(s); setRegister(r); setMetrics(m);
    setPriceLevel(s.default_price_level);
    const sh = await currentShift(r?.id).catch(() => null);
    setShift(sh);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  // Re-pull products/metrics once queued offline sales finish uploading.
  const prevPending = useRef(0);
  useEffect(() => {
    if (prevPending.current > 0 && net.pending === 0 && net.state === "online") {
      toast.success("Offline sales uploaded");
      void refresh();
    }
    prevPending.current = net.pending;
  }, [net.pending, net.state, refresh]);
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { searchRef.current?.focus(); }, []);

  /* --------------------------------- derived ------------------------------ */
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["ALL", ...(settings.enable_fast_sellers ? ["FAST SELLERS"] : []), ...[...set].sort()];
  }, [products, settings.enable_fast_sellers]);

  const factor = priceFactor(priceLevel);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.is_active) return false;
      if (category === "FAST SELLERS" && !favorites.includes(p.id)) return false;
      if (category !== "ALL" && category !== "FAST SELLERS" && (p.category ?? "") !== category) return false;
      if (!q) return true;
      return [p.name, p.sku, p.barcode, p.category].some((v) => (v ?? "").toLowerCase().includes(q));
    }).slice(0, 300);
  }, [products, category, search, favorites]);

  const totals = useMemo(() => computeTotals(lines, saleDiscountPct, settings), [lines, saleDiscountPct, settings]);
  const selectedLine = lines.find((l) => l.key === selected) ?? null;

  /* ---------------------------------- cart -------------------------------- */
  const addProduct = useCallback((p: PosProduct, qty = 1) => {
    if (!settings.allow_negative_stock && p.stock <= 0) {
      toast.error(`${p.name} is out of stock`);
      return;
    }
    const price = round2(p.price * factor);
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.item_id === p.id && l.price === price && !l.note);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        setSelected(next[idx].key);
        return next;
      }
      const line: CartLine = {
        key: `${p.id}-${Date.now()}`, item_id: p.id, name: p.name, sku: p.sku,
        qty, price, unit_cost: p.cost, discount_pct: 0,
      };
      setSelected(line.key);
      return [...prev, line];
    });
  }, [factor, settings.allow_negative_stock]);

  const patchLine = (key: string, patch: Partial<CartLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)).filter((l) => l.qty > 0));

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
    setSelected(null);
  };

  const newSale = useCallback(() => {
    setLines([]); setSelected(null); setSaleDiscountPct(0); setCustomer(null);
    setSearch(""); searchRef.current?.focus();
  }, []);

  /* -------------------------------- barcode ------------------------------- */
  const submitSearch = () => {
    const q = search.trim();
    if (!q) return;
    const exact = products.find(
      (p) => (p.barcode ?? "").toLowerCase() === q.toLowerCase() || (p.sku ?? "").toLowerCase() === q.toLowerCase(),
    );
    const hit = exact ?? (visible.length === 1 ? visible[0] : null);
    if (hit) { addProduct(hit); setSearch(""); }
    else if (!visible.length) toast.error("No product matches that code");
  };

  /* ------------------------------- shortcuts ------------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, () => void> = {
        F1: () => newSale(),
        F2: () => searchRef.current?.focus(),
        F3: () => setCustOpen(true),
        F4: () => void doHold(),
        F5: () => void openHeld(),
        F6: () => setSaleDiscountPct((d) => (d ? 0 : 10)),
        F9: () => lines.length && setPayOpen(true),
        F10: () => lines.length && setPayOpen(true),
      };
      if (map[e.key]) { e.preventDefault(); map[e.key](); }
      if (e.key === "Escape") { setPayOpen(false); setQtyPad(null); setCustOpen(false); setHeldOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* --------------------------------- actions ------------------------------ */
  const doHold = async () => {
    if (!lines.length) return;
    try {
      const no = await holdSale({
        lines, totals, customer, customerName: customer?.name ?? settings.default_customer,
        priceLevel, saleDiscountPct, shiftId: shift?.id ?? null, registerId: register?.id ?? null,
      });
      toast.success(`Held as ${no}`);
      newSale();
    } catch (e: any) { toast.error(e.message ?? "Could not hold sale"); }
  };

  const openHeld = async () => { setHeld(await listHeldSales()); setHeldOpen(true); };
  const openRecent = async () => { setRecent(await listRecentSales()); setRecentOpen(true); };

  /** Printing must never block or reverse a completed sale. */
  const printSaleReceipt = useCallback(async (snapshot: {
    saleNo: string; saleId?: string; lines: CartLine[];
    totals: ReturnType<typeof computeTotals>; payments: SalePayment[]; change: number;
  }) => {
    const data: ReceiptData = {
      businessName: register?.branch ?? "SifoBooks",
      branchName: register?.name,
      receiptNumber: snapshot.saleNo,
      date: new Date().toISOString(),
      items: snapshot.lines.map((l) => ({
        name: l.name,
        quantity: l.qty,
        price: l.price,
        total: round2(l.qty * l.price * (1 - (l.discount_pct || 0) / 100)),
      })),
      subtotal: snapshot.totals.subtotal,
      discount: round2(snapshot.totals.lineDiscount + snapshot.totals.saleDiscount),
      tax: snapshot.totals.tax,
      total: snapshot.totals.total,
      paymentMethod: snapshot.payments.map((p) => p.method).join(", "),
      amountPaid: round2(snapshot.payments.reduce((a, p) => a + Number(p.amount || 0), 0)),
      change: snapshot.change,
      footer: settings.receipt_footer ?? "Thank you for your business",
    };
    try {
      await sendReceiptToPrinter(data, getPrinterForType("receipt"), 1);
    } catch (error: any) {
      console.error("Receipt printing failed:", error);
      await savePrintQueueJob({
        type: "receipt", saleId: snapshot.saleId, title: snapshot.saleNo,
        status: "queued", error: String(error?.message ?? error),
      });
      toast.message("Printer unavailable — receipt queued");
    }
  }, [register, settings]);

  const finishSale = async (payments: SalePayment[], change: number) => {
    const res = await completeSale(
      { lines, totals, customer, customerName: customer?.name ?? settings.default_customer, priceLevel, saleDiscountPct, shiftId: shift?.id ?? null, registerId: register?.id ?? null },
      payments, change,
    );
    const snapshot = { saleNo: res.sale_no, saleId: (res as any).id as string | undefined, lines, totals, payments, change };
    setPayOpen(false);
    setReceipt({ sale_no: res.sale_no, total: totals.total, offline: res.offline, snapshot });
    // Fire-and-forget: the sale is already saved and must never be reversed by a print failure.
    if (settings.auto_print_receipt !== false) void printSaleReceipt(snapshot);
    newSale();
    void refresh();
  };

  /* ---------------------------------- render ------------------------------ */
  const cartPanel = (
    <SalePanel
      lines={lines} selected={selected} setSelected={setSelected} totals={totals}
      settings={settings} customerName={customer?.name ?? settings.default_customer}
      priceLevel={priceLevel} setPriceLevel={setPriceLevel}
      patchLine={patchLine} removeLine={removeLine}
      saleDiscountPct={saleDiscountPct} setSaleDiscountPct={setSaleDiscountPct}
      onPay={() => lines.length ? setPayOpen(true) : toast.info("Add items first")}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col bg-muted/30">
      {/* ------------------------------- top bar ------------------------------ */}
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-card px-3 py-2 lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold">SifoPOS · Retail</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {register?.branch ?? "Main"} · {register?.name ?? "Register 01"} · {shift?.cashier_name ?? "Cashier"}
              </div>
            </div>
          </div>
          <div className="relative min-w-0 flex-1">
            <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitSearch(); } }}
              placeholder="Scan barcode or search product, SKU, code…"
              className="h-11 rounded-xl pl-9 text-base"
            />
          </div>
          <Button size="lg" className="h-11 shrink-0 rounded-xl" onClick={submitSearch}>
            <Search className="mr-1.5 h-4 w-4" /> SCAN
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right lg:block">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sale total</div>
            <div className="text-2xl font-black tabular-nums">{fmtMoney(totals.total)}</div>
          </div>
          <div className="hidden flex-col items-end text-[11px] text-muted-foreground sm:flex">
            <span className={cn("flex items-center gap-1 font-semibold",
              net.state === "offline" ? "text-destructive" : net.state === "syncing" ? "text-amber-600" : "text-emerald-600")}>
              ● {net.state === "offline" ? "OFFLINE" : net.state === "syncing" ? "SYNCING" : "ONLINE"}
              {net.pending > 0 && (
                <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-700">{net.pending} to upload</span>
              )}
            </span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setShiftOpen(true)} title="Shift & drawer">
            <Wallet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setSettingsOpen(true)} title="POS settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* --------------------------- metrics + tabs --------------------------- */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b bg-card/60 px-3 py-1.5 text-[11px] lg:px-4">
        <Metric label="Today" value={fmtMoney(metrics.sales)} />
        <Metric label="Txns" value={String(metrics.transactions)} />
        <Metric label="Avg sale" value={fmtMoney(metrics.average)} />
        <Metric label="Items in cart" value={String(totals.items)} />
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <Link to="/restaurant/pos" className="flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold hover:bg-muted">
            <Utensils className="h-3.5 w-3.5" /> Restaurant POS
          </Link>
          <Link to="/inventory" className="flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold hover:bg-muted">
            <LayoutGrid className="h-3.5 w-3.5" /> Inventory
          </Link>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ---------------------------- categories ---------------------------- */}
        <nav className="hidden w-40 shrink-0 space-y-1.5 overflow-y-auto border-r bg-card p-2 md:block xl:w-48">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn("w-full rounded-xl px-3 py-3 text-left text-xs font-bold uppercase tracking-wide transition-colors",
                category === c ? "bg-primary text-primary-foreground shadow" : "bg-muted/60 hover:bg-muted")}
            >
              {c}
            </button>
          ))}
        </nav>

        {/* ------------------------------ grid -------------------------------- */}
        <main className="min-w-0 flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex gap-2 overflow-x-auto md:hidden">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={cn("shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase",
                  category === c ? "bg-primary text-primary-foreground" : "bg-card border")}>
                {c}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-lg bg-till-nav px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-till-nav-foreground">
            <LayoutGrid className="h-3.5 w-3.5 opacity-70" />
            <button onClick={() => setCategory("ALL")} className="opacity-70 hover:opacity-100">All products</button>
            {category !== "ALL" && <><span className="opacity-50">›</span><span>{category}</span></>}
            <span className="ml-auto opacity-70">{visible.length} items</span>
          </div>

          {visible.length === 0 ? (
            <div className="grid h-64 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
              No products here — add stock items in Inventory, or clear the search.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {visible.map((p) => {
                const price = round2(p.price * factor);
                const out = p.stock <= 0;
                const low = !out && p.reorder_level > 0 && p.stock <= p.reorder_level;
                return (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    onContextMenu={(e) => { e.preventDefault(); setQtyPad(p); }}
                    onPointerDown={() => { pressTimer.current = setTimeout(() => setQtyPad(p), 550); }}
                    onPointerUp={() => pressTimer.current && clearTimeout(pressTimer.current)}
                    onPointerLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
                    className={cn("group relative flex min-h-[9.5rem] flex-col overflow-hidden rounded-xl bg-till-tile p-3 text-left text-till-tile-foreground shadow-sm transition-all active:scale-[0.97] hover:brightness-110",
                      out && "opacity-60")}
                  >
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const on = !favorites.includes(p.id);
                        setFavorites((f) => (on ? [...f, p.id] : f.filter((x) => x !== p.id)));
                        await toggleFavorite(p.id, on).catch(() => {});
                      }}
                      className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/25"
                    >
                      <Star className={cn("h-3.5 w-3.5", favorites.includes(p.id) ? "fill-amber-300 text-amber-300" : "text-white/70")} />
                    </span>
                    {settings.show_images && (
                      <div className="mb-2 grid h-16 place-items-center rounded-lg bg-white/15 text-xl font-black">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="line-clamp-2 text-sm font-bold uppercase leading-tight">{p.name}</div>
                    {settings.show_sku && p.sku && <div className="mt-0.5 truncate text-[10px] text-white/70">{p.sku}</div>}
                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <span className="text-lg font-black tabular-nums">{fmtMoney(price)}</span>
                      {settings.show_stock && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black",
                          out ? "bg-till-void text-white" : low ? "bg-till-hold text-black" : "bg-white/20 text-white")}>
                          {out ? "OUT" : low ? `LOW ${p.stock}` : `${p.stock}`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* ------------------------------ cart -------------------------------- */}
        <aside className="hidden w-[24rem] shrink-0 border-l bg-card lg:block xl:w-[26rem]">{cartPanel}</aside>
      </div>

      {/* --------------------------- bottom action bar ------------------------ */}
      <footer className="flex shrink-0 gap-2 overflow-x-auto border-t bg-till-nav px-3 py-2">
        <Act label="+1" icon={Plus} className="bg-till-cash text-till-key-foreground border-transparent hover:brightness-110"
          onClick={() => selectedLine ? patchLine(selectedLine.key, { qty: selectedLine.qty + 1 }) : toast.info("Select a cart line")} />
        <Act label="−1" icon={Minus} className="bg-till-card text-till-key-foreground border-transparent hover:brightness-110"
          onClick={() => selectedLine ? patchLine(selectedLine.key, { qty: selectedLine.qty - 1 }) : toast.info("Select a cart line")} />
        <Act label="NEW" icon={RotateCcw} className="bg-till-momo text-till-key-foreground border-transparent hover:brightness-110" onClick={newSale} />
        <Act label="HOLD" icon={PauseCircle} className="bg-till-hold text-black border-transparent hover:brightness-110" onClick={() => void doHold()} />
        <Act label="RECALL" icon={PlayCircle} className="bg-till-hold text-black border-transparent hover:brightness-110" onClick={() => void openHeld()} />
        <Act label="CUSTOMER" icon={User} className="bg-till-card text-till-key-foreground border-transparent hover:brightness-110" onClick={() => setCustOpen(true)} />
        <Act label="DISCOUNT" icon={Percent} className="bg-till-discount text-till-key-foreground border-transparent hover:brightness-110" onClick={() => setSaleDiscountPct((d) => (d ? 0 : 10))} />
        <Act label="CHANGE PRICE" icon={Barcode} className="bg-till-discount text-till-key-foreground border-transparent hover:brightness-110"
          onClick={() => {
            if (!selectedLine) return toast.info("Select a cart line");
            const v = window.prompt("New unit price", String(selectedLine.price));
            if (v != null && !Number.isNaN(Number(v))) patchLine(selectedLine.key, { price: Number(v) });
          }} />
        <Act label="QTY" icon={LayoutGrid} className="bg-till-card text-till-key-foreground border-transparent hover:brightness-110" onClick={() => selectedLine ? setQtyPad({ id: selectedLine.item_id ?? "", name: selectedLine.name, price: selectedLine.price, cost: selectedLine.unit_cost, stock: 999, sku: selectedLine.sku, barcode: null, category: null, unit: null, reorder_level: 0, is_active: true }) : toast.info("Select a cart line")} />
        <Act label="PAYOUT" icon={Wallet} className="bg-till-discount text-till-key-foreground border-transparent hover:brightness-110" onClick={() => setShiftOpen(true)} />
        <Act label="REMOVE" icon={Trash2} className="bg-till-void text-till-key-foreground border-transparent hover:brightness-110" onClick={() => selectedLine ? removeLine(selectedLine.key) : toast.info("Select a cart line")} />
        <Act label="VOID" icon={Ban} className="bg-till-void text-till-key-foreground border-transparent hover:brightness-110" onClick={() => { setLines([]); setSelected(null); toast.info("Sale cleared"); }} />
        <Act label="REFUND" icon={Undo2} className="bg-till-void text-till-key-foreground border-transparent hover:brightness-110" onClick={() => void openRecent()} />
        <Act label="RECEIPTS" icon={Printer} className="bg-slate-600 text-till-key-foreground border-transparent hover:brightness-110" onClick={() => void openRecent()} />
        <Act label="CART" icon={ShoppingBag} onClick={() => setCartOpen(true)} className="bg-till-cash text-till-key-foreground border-transparent lg:hidden" />
        <div className="ml-auto hidden lg:block" />
      </footer>

      {/* mobile/tablet cart drawer */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="sr-only"><SheetTitle>Current sale</SheetTitle></SheetHeader>
          {cartPanel}
        </SheetContent>
      </Sheet>

      {payOpen && (
        <PaymentDialog
          open={payOpen} onOpenChange={setPayOpen} total={totals.total}
          defaultMethod={settings.default_payment} onComplete={finishSale}
        />
      )}

      <QtyPadDialog
        product={qtyPad} onClose={() => setQtyPad(null)}
        onPick={(qty) => {
          if (!qtyPad) return;
          if (selectedLine && selectedLine.name === qtyPad.name) patchLine(selectedLine.key, { qty });
          else addProduct(qtyPad, qty);
          setQtyPad(null);
        }}
      />

      <CustomerDialog
        open={custOpen} onOpenChange={setCustOpen} customers={customers}
        onPick={(c) => { setCustomer(c); setCustOpen(false); }}
        onCreated={(c) => { setCustomers((p) => [c, ...p]); setCustomer(c); setCustOpen(false); }}
      />

      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Held sales</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {held.length === 0 && <p className="text-sm text-muted-foreground">No held sales.</p>}
            {held.map((h) => (
              <button key={h.id} onClick={async () => {
                setLines(await recallSale(h.id)); setHeldOpen(false); toast.success(`Recalled ${h.sale_no}`);
              }} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-muted">
                <span>
                  <span className="block font-semibold">{h.sale_no}</span>
                  <span className="block text-xs text-muted-foreground">{h.customer_name}</span>
                </span>
                <span className="font-black tabular-nums">{fmtMoney(Number(h.total))}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recentOpen} onOpenChange={setRecentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Recent sales — refund, void or reprint</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">No sales yet today.</p>}
            {recent.map((s) => (
              <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.sale_no} · {s.customer_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.sold_at).toLocaleString()} · <span className="uppercase">{s.status}</span>
                    {s.__offline && <span className="ml-1 rounded bg-amber-500/15 px-1 text-[10px] font-semibold text-amber-700">WAITING TO UPLOAD</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black tabular-nums">{fmtMoney(Number(s.total))}</span>
                  {s.status === "completed" && !s.__offline && (
                    <>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try { await refundSale(s.id); toast.success("Refunded"); setRecent(await listRecentSales()); void refresh(); }
                        catch (e: any) { toast.error(e.message ?? "Refund failed"); }
                      }}>Refund</Button>
                      <Button size="sm" variant="ghost" onClick={() => setVoidFor(s)}>Void</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidFor} onOpenChange={(o) => !o && setVoidFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Void {voidFor?.sale_no}</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            {VOID_REASONS.map((r) => (
              <Button key={r} variant="outline" className="h-12 justify-start" onClick={async () => {
                await voidSale(voidFor.id, r); toast.success("Sale voided"); setVoidFor(null);
                setRecent(await listRecentSales());
              }}>{r}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ShiftDialog
        open={shiftOpen} onOpenChange={setShiftOpen} shift={shift} register={register}
        onOpened={(s) => setShift(s)} onClosed={() => setShift(null)}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSave={(s) => setSettings(s)} />

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle className="text-center">Sale completed</DialogTitle></DialogHeader>
          <div className="grid h-16 w-16 place-self-center rounded-full bg-emerald-500/15 place-items-center">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="text-sm text-muted-foreground">{receipt?.sale_no}</div>
          <div className="text-4xl font-black tabular-nums">{fmtMoney(receipt?.total ?? 0)}</div>
          {receipt?.offline && <p className="text-xs text-amber-600">Saved on this device — it will sync when you're back online.</p>}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" className="h-12" onClick={() => receipt?.snapshot && void printSaleReceipt(receipt.snapshot)}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
            <Button className="h-12" onClick={() => setReceipt(null)}>New sale</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ small pieces ------------------------------ */

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="shrink-0 rounded-lg bg-muted px-2.5 py-1">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="px-2 py-2 text-center">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn("font-display text-xl font-black tabular-nums leading-tight", className)}>
        {fmtMoney(value)}
      </div>
    </div>
  );
}

function Act({ label, icon: Icon, onClick, className }: { label: string; icon: any; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={cn("flex h-14 min-w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-muted/50 px-3 text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-muted active:scale-95", className)}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SalePanel(props: {
  lines: CartLine[]; selected: string | null; setSelected: (k: string | null) => void;
  totals: ReturnType<typeof computeTotals>; settings: PosSettings; customerName: string;
  priceLevel: PriceLevel; setPriceLevel: (p: PriceLevel) => void;
  patchLine: (k: string, p: Partial<CartLine>) => void; removeLine: (k: string) => void;
  saleDiscountPct: number; setSaleDiscountPct: (n: number) => void; onPay: () => void;
}) {
  const { lines, selected, setSelected, totals, customerName, priceLevel, setPriceLevel,
    patchLine, removeLine, saleDiscountPct, setSaleDiscountPct, onPay, settings } = props;
  const sel = lines.find((l) => l.key === selected) ?? null;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* due / tendered / change */}
      <div className="grid shrink-0 grid-cols-3 divide-x border-b">
        <Stat label="Total due" value={totals.total} className="text-till-due" />
        <Stat label="Tendered" value={0} className="text-till-tendered" />
        <Stat label="Change" value={0} className="text-till-change" />
      </div>

      {/* live clock */}
      <div className="shrink-0 border-b bg-muted/40 py-2 text-center">
        <div className="font-display text-3xl font-black tabular-nums leading-none">
          {now.toLocaleTimeString("en-GB", { hour12: false })}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {now.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Items · {totals.items}</div>
          <div className="truncate text-sm font-semibold">{customerName}</div>
        </div>
        <select
          value={priceLevel}
          onChange={(e) => setPriceLevel(e.target.value as PriceLevel)}
          className="h-9 rounded-lg border bg-background px-2 text-xs font-semibold uppercase"
          disabled={!settings.allow_price_change}
        >
          {PRICE_LEVELS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {/* column headers */}
      <div className="grid shrink-0 grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_3.25rem_5rem] gap-1 border-b bg-muted/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span>Qty</span><span>Item</span><span className="text-right">Unit</span><span className="text-right">Tax</span><span className="text-right">Total</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            Scan a barcode or tap a product to start selling.
          </div>
        ) : lines.map((l) => {
          const net = l.qty * l.price * (1 - l.discount_pct / 100);
          const tax = settings.tax_inclusive ? 0 : round2(net * (settings.tax_rate / 100));
          return (
          <div key={l.key}>
            <button onClick={() => setSelected(l.key === selected ? null : l.key)}
              className={cn("grid w-full grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_3.25rem_5rem] items-center gap-1 border-b px-2 py-2 text-left text-sm tabular-nums",
                l.key === selected ? "bg-primary/10" : "hover:bg-muted/60")}>
              <span className="font-bold">{l.qty}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold uppercase leading-tight">{l.name}</span>
                {l.discount_pct ? <span className="text-[10px] text-muted-foreground">−{l.discount_pct}%</span> : null}
              </span>
              <span className="text-right">{l.price.toFixed(2)}</span>
              <span className="text-right text-muted-foreground">{tax.toFixed(2)}</span>
              <span className="text-right font-bold">{net.toFixed(2)}</span>
            </button>
            {l.key === selected && (
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 p-2">
                <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => patchLine(l.key, { qty: l.qty - 1 })}><Minus className="h-4 w-4" /></Button>
                <span className="w-10 text-center text-lg font-black tabular-nums">{l.qty}</span>
                <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => patchLine(l.key, { qty: l.qty + 1 })}><Plus className="h-4 w-4" /></Button>
                {settings.allow_price_change && (
                  <Button size="sm" variant="outline" className="h-10" onClick={() => {
                    const v = window.prompt("New unit price", String(l.price));
                    if (v != null && !Number.isNaN(Number(v))) patchLine(l.key, { price: Number(v) });
                  }}>Price</Button>
                )}
                <Button size="sm" variant="outline" className="h-10" onClick={() => {
                  const v = window.prompt("Line discount %", String(l.discount_pct));
                  if (v != null && !Number.isNaN(Number(v))) patchLine(l.key, { discount_pct: Number(v) });
                }}>Disc</Button>
                <Button size="sm" variant="outline" className="h-10" onClick={() => {
                  const v = window.prompt("Note for this line", l.note ?? "");
                  if (v != null) patchLine(l.key, { note: v });
                }}>Note</Button>
                <Button size="icon" variant="destructive" className="h-10 w-10" onClick={() => removeLine(l.key)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          );
        })}
      </div>


      {settings.enable_quick_discounts && (
        <div className="flex gap-1.5 border-t p-2">
          {[0, 5, 10, 15, 20].map((d) => (
            <button key={d} onClick={() => setSaleDiscountPct(d)}
              className={cn("h-9 flex-1 rounded-lg border text-xs font-bold",
                saleDiscountPct === d ? "bg-primary text-primary-foreground" : "bg-muted/50")}>
              {d === 0 ? "NONE" : `${d}%`}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1 border-t p-3 text-sm">
        <Row label="Subtotal" value={fmtMoney(totals.subtotal)} />
        <Row label="Discount" value={`− ${fmtMoney(totals.lineDiscount + totals.saleDiscount)}`} />
        <Row label={`VAT (${settings.tax_rate}%${settings.tax_inclusive ? " incl" : ""})`} value={fmtMoney(totals.tax)} />
        <div className="mt-2 flex items-end justify-between rounded-xl bg-primary/10 px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wide">Total</span>
          <span className="text-3xl font-black tabular-nums">{fmtMoney(totals.total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 border-t p-2">
        {PAY_KEYS.map((t) => (
          <button key={t.label} onClick={onPay}
            className={cn("flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black uppercase tracking-wide text-till-key-foreground transition-transform active:scale-95", t.bg)}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
        <button onClick={onPay}
          className="col-span-3 h-16 rounded-xl bg-till-cash text-lg font-black uppercase text-till-key-foreground transition-transform active:scale-[0.98]">
          Pay {fmtMoney(totals.total)}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span><span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/* ------------------------------ payment dialog ---------------------------- */

function PaymentDialog({ open, onOpenChange, total, defaultMethod, onComplete }: {
  open: boolean; onOpenChange: (o: boolean) => void; total: number; defaultMethod: string;
  onComplete: (payments: SalePayment[], change: number) => Promise<void>;
}) {
  const [method, setMethod] = useState(defaultMethod || "cash");
  const [entry, setEntry] = useState("");
  const [taken, setTaken] = useState<SalePayment[]>([]);
  const [busy, setBusy] = useState(false);

  const paid = taken.reduce((a, p) => a + p.amount, 0);
  const remaining = round2(Math.max(total - paid, 0));
  const received = Number(entry || 0);
  const change = round2(Math.max(paid + received - total, 0));

  const key = (k: string) => setEntry((e) => (k === "." && e.includes(".") ? e : e + k));

  const addTender = () => {
    const amt = received || remaining;
    if (amt <= 0) return;
    setTaken((t) => [...t, { method, amount: amt }]);
    setEntry("");
  };

  const finish = async () => {
    const payments = received > 0 ? [...taken, { method, amount: received }] : taken.length ? taken : [{ method, amount: total }];
    const sum = payments.reduce((a, p) => a + p.amount, 0);
    if (sum + 0.001 < total) { toast.error(`Still short ${fmtMoney(total - sum)}`); return; }
    setBusy(true);
    try { await onComplete(payments, round2(sum - total)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Take payment</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-2xl bg-primary/10 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total due</div>
              <div className="text-4xl font-black tabular-nums">{fmtMoney(total)}</div>
              {taken.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Paid {fmtMoney(paid)} · Remaining <span className="font-bold text-foreground">{fmtMoney(remaining)}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["cash", "card", "mobile money", "bank", "credit"].map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={cn("h-12 rounded-xl border text-xs font-bold uppercase",
                    method === m ? "bg-primary text-primary-foreground" : "bg-muted/50")}>
                  {m}
                </button>
              ))}
              <Button variant="outline" className="h-12 text-xs font-bold uppercase" onClick={addTender}>Split / add tender</Button>
            </div>
            {taken.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
                <span className="uppercase">{t.method}</span>
                <span className="flex items-center gap-2 font-bold tabular-nums">
                  {fmtMoney(t.amount)}
                  <button onClick={() => setTaken((p) => p.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Input value={entry} onChange={(e) => setEntry(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Amount received" inputMode="decimal" className="h-14 text-center text-2xl font-black" />
            <div className="grid grid-cols-4 gap-1.5">
              {DENOMS.map((d) => (
                <button key={d} onClick={() => setEntry(String(d))} className="h-11 rounded-lg border bg-muted/50 text-sm font-bold">K{d}</button>
              ))}
              <button onClick={() => setEntry(String(remaining || total))} className="h-11 rounded-lg border bg-muted/50 text-sm font-bold">EXACT</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {["1","2","3","4","5","6","7","8","9"].map((k) => (
                <button key={k} onClick={() => key(k)} className="h-14 rounded-xl border bg-card text-xl font-bold active:scale-95">{k}</button>
              ))}
              <button onClick={() => setEntry("")} className="h-14 rounded-xl border bg-muted text-sm font-bold">CLEAR</button>
              <button onClick={() => key("0")} className="h-14 rounded-xl border bg-card text-xl font-bold">0</button>
              <button onClick={() => key(".")} className="h-14 rounded-xl border bg-card text-xl font-bold">.</button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-2">
              <span className="text-xs font-bold uppercase">Change</span>
              <span className="text-2xl font-black tabular-nums text-emerald-600">{fmtMoney(change)}</span>
            </div>
            <Button className="h-16 w-full text-lg font-black" disabled={busy} onClick={() => void finish()}>
              COMPLETE SALE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- qty pad --------------------------------- */

function QtyPadDialog({ product, onClose, onPick }: { product: PosProduct | null; onClose: () => void; onPick: (q: number) => void }) {
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{product?.name} — quantity</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_QTY.map((q) => (
            <button key={q} onClick={() => onPick(q)} className="h-16 rounded-xl border bg-card text-xl font-black active:scale-95 hover:bg-muted">{q}</button>
          ))}
        </div>
        <Button variant="outline" className="h-12" onClick={() => {
          const v = window.prompt("Quantity");
          if (v && Number(v) > 0) onPick(Number(v));
        }}>Custom quantity</Button>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- customers -------------------------------- */

function CustomerDialog({ open, onOpenChange, customers, onPick, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; customers: PosCustomer[];
  onPick: (c: PosCustomer | null) => void; onCreated: (c: PosCustomer) => void;
}) {
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const list = customers.filter((c) => (c.name + (c.phone ?? "")).toLowerCase().includes(q.toLowerCase())).slice(0, 40);

  const create = async () => {
    if (!name.trim()) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.from("customers").insert({ name: name.trim(), phone: phone || null } as any).select("id,name,phone").maybeSingle();
    if (error || !data) { toast.error("Could not create customer"); return; }
    onCreated({ id: (data as any).id, name: (data as any).name, phone: (data as any).phone, code: null });
    setName(""); setPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Customer</DialogTitle></DialogHeader>
        <Button variant="outline" className="h-12" onClick={() => onPick(null)}>Walk-in customer</Button>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" className="h-11" />
        <div className="max-h-52 space-y-1.5 overflow-y-auto">
          {list.map((c) => (
            <button key={c.id} onClick={() => onPick(c)} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-muted">
              <span className="truncate font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.phone}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 border-t pt-3">
          <div><Label className="text-xs">New name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <Button onClick={() => void create()}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- shift ---------------------------------- */

function ShiftDialog({ open, onOpenChange, shift, register, onOpened, onClosed }: {
  open: boolean; onOpenChange: (o: boolean) => void; shift: any; register: any;
  onOpened: (s: any) => void; onClosed: () => void;
}) {
  const [cashier, setCashier] = useState("");
  const [float_, setFloat] = useState("0");
  const [actual, setActual] = useState("");
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (open && shift?.id) void shiftSummary(shift.id).then(setSummary).catch(() => {});
  }, [open, shift?.id]);

  const expected = Number(shift?.opening_float ?? 0) + Number(summary?.byMethod?.cash ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{shift ? "Shift & cash drawer" : "Open shift"}</DialogTitle></DialogHeader>
        {!shift ? (
          <div className="space-y-3">
            <div><Label>Cashier</Label><Input value={cashier} onChange={(e) => setCashier(e.target.value)} placeholder="Cashier name" /></div>
            <div><Label>Opening float</Label><Input value={float_} onChange={(e) => setFloat(e.target.value)} inputMode="decimal" /></div>
            <Button className="h-12 w-full" onClick={async () => {
              const s = await openShift(register?.id ?? null, cashier || "Cashier", Number(float_ || 0));
              onOpened(s); toast.success("Shift opened"); onOpenChange(false);
            }}>Start shift</Button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <Row label="Cashier" value={shift.cashier_name ?? "—"} />
            <Row label="Opened" value={new Date(shift.opened_at).toLocaleString()} />
            <Row label="Opening float" value={fmtMoney(Number(shift.opening_float))} />
            <Row label="Transactions" value={String(summary?.transactions ?? 0)} />
            <Row label="Sales" value={fmtMoney(summary?.salesTotal ?? 0)} />
            {Object.entries(summary?.byMethod ?? {}).map(([m, v]) => (
              <Row key={m} label={m.toUpperCase()} value={fmtMoney(Number(v))} />
            ))}
            <Row label="Expected cash" value={fmtMoney(expected)} />
            <div><Label>Actual cash counted</Label><Input value={actual} onChange={(e) => setActual(e.target.value)} inputMode="decimal" /></div>
            <Row label="Variance" value={fmtMoney(Number(actual || 0) - expected)} />
            <Button variant="destructive" className="h-12 w-full" onClick={async () => {
              await closeShift(shift.id, Number(actual || 0), expected);
              onClosed(); toast.success("Shift closed"); onOpenChange(false);
            }}>Close shift</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- settings -------------------------------- */

function SettingsDialog({ open, onOpenChange, settings, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; settings: PosSettings; onSave: (s: PosSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);

  const toggles: [keyof PosSettings, string][] = [
    ["show_images", "Show product images"],
    ["show_stock", "Show stock levels"],
    ["show_sku", "Show SKU"],
    ["enable_fast_sellers", "Fast sellers tab"],
    ["enable_quick_qty", "Quick quantity pad"],
    ["enable_quick_discounts", "Quick discounts"],
    ["allow_price_change", "Allow price change"],
    ["allow_negative_stock", "Allow negative stock"],
    ["tax_inclusive", "Prices include VAT"],
    ["auto_new_sale", "Auto start new sale"],
    ["auto_print_receipt", "Auto print receipt"],
    ["silent_print", "Silent printing"],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>POS settings</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Default customer</Label><Input value={draft.default_customer} onChange={(e) => setDraft({ ...draft, default_customer: e.target.value })} /></div>
          <div><Label>VAT rate %</Label><Input value={String(draft.tax_rate)} inputMode="decimal" onChange={(e) => setDraft({ ...draft, tax_rate: Number(e.target.value || 0) })} /></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {toggles.map(([k, label]) => (
            <label key={k} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              {label}
              <Switch checked={Boolean(draft[k])} onCheckedChange={(v) => setDraft({ ...draft, [k]: v } as PosSettings)} />
            </label>
          ))}
        </div>
        <Button className="h-12" onClick={async () => {
          await saveSettings(draft); onSave(draft); toast.success("Settings saved"); onOpenChange(false);
        }}>Save settings</Button>
      </DialogContent>
    </Dialog>
  );
}
