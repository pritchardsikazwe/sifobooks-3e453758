import type { ReactNode } from "react";
import {
  BarChart3, Boxes, Building2, ChefHat, GraduationCap, Landmark, Mountain,
  ReceiptText, ScanBarcode, ShieldCheck, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────
   Product previews. Presentational only — no data source, no
   network, no production records. Every figure below is
   illustrative and is labelled as such in the window chrome.
   ──────────────────────────────────────────────────────────────── */

export type ScreenKey =
  | "dashboard" | "pos" | "accounting" | "inventory" | "compliance"
  | "hotel" | "restaurant" | "school" | "mining";

/* ── chrome ─────────────────────────────────────────────────── */

export function AppWindow({
  title, crumb, accent = "#12A557", children, className, compact,
}: {
  title: string; crumb?: string; accent?: string; children: ReactNode; className?: string; compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-sifo-line/80 bg-sifo-ink-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-sifo-line/70 bg-sifo-ink-3/70 px-3 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#F05D52]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F5BE4F]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#5AC46B]" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-sifo-line/70 bg-sifo-ink px-2.5 py-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
          <span className="truncate text-[11px] font-semibold text-sifo-haze">
            app.sifobooks.com<span className="text-white/45">{crumb ?? "/dashboard"}</span>
          </span>
        </div>
        <span className="hidden shrink-0 rounded border border-sifo-copper/30 bg-sifo-copper/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-copper sm:inline">
          Preview
        </span>
      </div>
      <div className={cn("bg-sifo-ink-2", compact ? "p-3" : "p-3 sm:p-4")}>
        <p className="sr-only">{title} — illustrative product preview, not live business data.</p>
        {children}
      </div>
    </div>
  );
}

const NAV: { k: ScreenKey | "reports" | "people"; label: string; icon: typeof Landmark }[] = [
  { k: "dashboard", label: "Home", icon: BarChart3 },
  { k: "pos", label: "Till", icon: ScanBarcode },
  { k: "accounting", label: "Finance", icon: Landmark },
  { k: "inventory", label: "Stock", icon: Boxes },
  { k: "people", label: "People", icon: Building2 },
  { k: "compliance", label: "Compliance", icon: ShieldCheck },
  { k: "reports", label: "Reports", icon: ReceiptText },
];

function Rail({ active, accent = "#12A557" }: { active: string; accent?: string }) {
  return (
    <aside className="hidden w-[132px] shrink-0 flex-col gap-0.5 border-r border-sifo-line/60 pr-2 sm:flex">
      <div className="mb-2 flex items-center gap-1.5 px-1.5 py-1">
        <span className="h-4 w-4 rounded" style={{ background: accent }} />
        <span className="font-display text-[11px] font-bold tracking-tight text-white">SifoBooks</span>
      </div>
      {NAV.map((n) => {
        const on = n.k === active;
        return (
          <div
            key={n.k}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[10.5px] font-semibold",
              on ? "text-white" : "text-sifo-haze/70",
            )}
            style={on ? { background: `${accent}1f`, boxShadow: `inset 2px 0 0 ${accent}` } : undefined}
          >
            <n.icon className="h-3 w-3" style={on ? { color: accent } : undefined} />
            {n.label}
          </div>
        );
      })}
      <div className="mt-auto rounded-md border border-sifo-line/70 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-sifo-haze/60">
        FY 2026 · open
      </div>
    </aside>
  );
}

function Kpi({ label, value, delta, tone = "mint" }: { label: string; value: string; delta?: string; tone?: "mint" | "copper" | "sky" | "rose" }) {
  const c = tone === "copper" ? "#C87A3C" : tone === "sky" ? "#5AA9E6" : tone === "rose" ? "#E0687A" : "#12A557";
  return (
    <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">{label}</p>
      <p className="mt-1 whitespace-nowrap font-display text-[0.9rem] font-bold tracking-tight text-white sm:text-base lg:text-lg">{value}</p>
      {delta ? <p className="mt-0.5 text-[9.5px] font-semibold" style={{ color: c }}>{delta}</p> : null}
      <div className="mt-2 h-0.5 w-full rounded bg-white/5"><div className="h-0.5 rounded" style={{ width: "62%", background: c }} /></div>
    </div>
  );
}

function Bars({ data, accent = "#12A557" }: { data: number[]; accent?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-20 items-end gap-1">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${(v / max) * 100}%`, background: i === data.length - 1 ? accent : `${accent}59` }} />
      ))}
    </div>
  );
}

function Line({ accent = "#12A557" }: { accent?: string }) {
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="h-20 w-full">
      <defs>
        <linearGradient id={`g-${accent.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity=".45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 46 L25 40 L50 44 L75 28 L100 33 L125 18 L150 23 L175 10 L200 14 V60 H0Z" fill={`url(#g-${accent.slice(1)})`} />
      <path d="M0 46 L25 40 L50 44 L75 28 L100 33 L125 18 L150 23 L175 10 L200 14" fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Rows({ head, rows, accent = "#12A557" }: { head: string[]; rows: (string | { t: string; tone: string })[][]; accent?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-sifo-line/70">
      <div className="grid gap-2 border-b border-sifo-line/70 bg-sifo-ink/80 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-sifo-haze/70"
        style={{ gridTemplateColumns: `repeat(${head.length}, minmax(0,1fr))` }}>
        {head.map((h, i) => <span key={h} className={cn("truncate", i === head.length - 1 && "text-right")}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 border-b border-sifo-line/40 px-2.5 py-[7px] text-[10.5px] font-medium text-white/85 last:border-0"
          style={{ gridTemplateColumns: `repeat(${head.length}, minmax(0,1fr))` }}>
          {r.map((c, j) => typeof c === "string"
            ? <span key={j} className={cn("truncate", j === r.length - 1 && "text-right tabular-nums", j === 0 && "text-white")}>{c}</span>
            : <span key={j} className={cn("truncate", j === r.length - 1 && "text-right")}>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${c.tone}22`, color: c.tone }}>{c.t}</span>
              </span>)}
        </div>
      ))}
      <div className="bg-sifo-ink/60 px-2.5 py-1 text-right text-[9px] font-semibold text-sifo-haze/60" style={{ borderTop: `1px solid ${accent}33` }}>
        Illustrative figures
      </div>
    </div>
  );
}

function Tile({ label, sub, tone }: { label: string; sub: string; tone: string }) {
  return (
    <div className="rounded-md border p-1.5 text-center" style={{ borderColor: `${tone}40`, background: `${tone}14` }}>
      <p className="font-display text-[11px] font-bold text-white">{label}</p>
      <p className="text-[8.5px] font-semibold uppercase tracking-wide" style={{ color: tone }}>{sub}</p>
    </div>
  );
}

/* ── screens ────────────────────────────────────────────────── */

export function DashboardScreen() {
  return (
    <div className="flex gap-3">
      <Rail active="dashboard" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[13px] font-bold text-white">Good morning, Chanda</p>
            <p className="text-[10px] text-sifo-haze/70">Kabulonga branch · ZMW · 12 items need you today</p>
          </div>
          <span className="rounded-md bg-[#12A557] px-2 py-1 text-[9.5px] font-bold text-white">New invoice</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Sales MTD" value="K 486,200" delta="▲ 12.4% vs last month" />
          <Kpi label="Cash & bank" value="K 213,940" delta="3 accounts reconciled" tone="sky" />
          <Kpi label="Receivables" value="K 92,180" delta="K 18,400 over 60 days" tone="copper" />
          <Kpi label="VAT due 18 Oct" value="K 34,760" delta="Return not yet filed" tone="rose" />
        </div>
        <div className="grid gap-2.5 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Revenue vs cost of sales</p>
              <span className="text-[9px] font-semibold text-sifo-mint">Last 9 months</span>
            </div>
            <Line />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Your work queue</p>
            {[["4 supplier bills to approve", "#C87A3C"], ["2 bank lines unmatched", "#5AA9E6"], ["Payroll ready to post", "#12A557"]].map(([t, c]) => (
              <div key={t} className="flex items-center gap-2 rounded-md border border-sifo-line/70 bg-sifo-ink/70 px-2 py-[7px] text-[10.5px] font-semibold text-white/85">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{t}
              </div>
            ))}
          </div>
        </div>
        <Rows
          head={["Recent activity", "Reference", "Module", "Amount"]}
          rows={[
            ["Invoice · Zambeef Products", "INV-2041", "Sales", "K 42,300.00"],
            ["Receipt · Pick n Pay Manda Hill", "RCT-0912", "Banking", "K 18,750.00"],
            ["Bill · Lusaka Water & Sanitation", "BILL-3388", "Purchases", "K 6,420.00"],
            ["Stock transfer · Store → Outlet 2", "TRF-0177", "Inventory", "38 units"],
          ]}
        />
      </div>
    </div>
  );
}

export function PosScreen() {
  const keys = ["Mosi Lager", "Chibuku 1L", "Fanta 400ml", "Bread loaf", "Cooking oil 2L", "Mealie meal 25kg", "Sugar 1kg", "Eggs tray"];
  return (
    <div className="grid gap-2.5 lg:grid-cols-[1fr_240px]">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[#1D4ED8] px-2 py-1 text-[9.5px] font-bold text-white">Shift open · Till 2</span>
          <span className="rounded-md border border-sifo-line/70 px-2 py-1 text-[9.5px] font-semibold text-sifo-haze">Cashier: M. Banda</span>
          <span className="ml-auto text-[9.5px] font-semibold text-sifo-mint">Float K 500.00</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {keys.map((k, i) => (
            <div key={k} className={cn("rounded-md px-2 py-3 text-center text-[10px] font-bold leading-tight text-white", i % 3 === 0 ? "bg-[#1D4ED8]" : "bg-sifo-ink-3 border border-sifo-line/70")}>{k}</div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[["CASH", "#16A34A"], ["CARD", "#2563EB"], ["MOMO", "#0D9488"], ["HOLD", "#F59E0B"]].map(([t, c]) => (
            <div key={t} className="rounded-md py-2 text-center text-[10px] font-bold text-white" style={{ background: c }}>{t}</div>
          ))}
        </div>
      </div>
      <div className="flex flex-col rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Sale · SL-4417</p>
        <div className="mt-2 flex-1 space-y-1.5">
          {[["2 × Mosi Lager", "K 60.00"], ["1 × Mealie meal 25kg", "K 285.00"], ["3 × Bread loaf", "K 46.50"], ["1 × Cooking oil 2L", "K 89.00"]].map(([a, b]) => (
            <div key={a} className="flex justify-between text-[10.5px] font-medium text-white/85"><span>{a}</span><span className="tabular-nums">{b}</span></div>
          ))}
        </div>
        <div className="mt-2 space-y-1 border-t border-sifo-line/70 pt-2 text-[10px] text-sifo-haze">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">K 414.22</span></div>
          <div className="flex justify-between"><span>VAT 16%</span><span className="tabular-nums">K 66.28</span></div>
          <div className="flex justify-between font-display text-sm font-bold text-white"><span>Due</span><span className="tabular-nums">K 480.50</span></div>
        </div>
        <div className="mt-2 rounded-md bg-[#16A34A] py-2 text-center text-[11px] font-bold text-white">COMPLETE SALE</div>
      </div>
    </div>
  );
}

export function AccountingScreen() {
  return (
    <div className="flex gap-3">
      <Rail active="accounting" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {["Trial balance", "General ledger", "P&L", "Balance sheet", "Cashbook"].map((t, i) => (
            <span key={t} className={cn("rounded-md px-2 py-1 text-[10px] font-bold", i === 0 ? "bg-[#12A557]/20 text-sifo-mint shadow-[inset_0_-2px_0_#12A557]" : "text-sifo-haze/70")}>{t}</span>
          ))}
          <span className="ml-auto text-[9.5px] font-semibold text-sifo-haze">Period: 01–30 Sep 2026</span>
        </div>
        <Rows
          head={["Account", "Code", "Debit", "Credit"]}
          rows={[
            ["Bank — Zanaco current", "1100", "213,940.00", "—"],
            ["Trade receivables", "1200", "92,180.00", "—"],
            ["Inventory", "1300", "148,600.00", "—"],
            ["Trade payables", "2100", "—", "76,410.00"],
            ["VAT control", "2200", "—", "34,760.00"],
            ["Sales — retail", "4000", "—", "486,200.00"],
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <Kpi label="Debits" value="K 597,370" delta="Balanced" />
          <Kpi label="Credits" value="K 597,370" delta="Balanced" />
          <Kpi label="Unposted journals" value="0" delta="Period locked after close" tone="copper" />
        </div>
      </div>
    </div>
  );
}

export function InventoryScreen() {
  return (
    <div className="flex gap-3">
      <Rail active="inventory" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Stock value" value="K 148,600" delta="4 locations" />
          <Kpi label="Below reorder" value="11 items" delta="Reorder suggested" tone="copper" />
          <Kpi label="Variance last count" value="0.8%" delta="Within tolerance" tone="sky" />
        </div>
        <div className="grid gap-2.5 lg:grid-cols-[1fr_150px]">
          <Rows
            head={["Item", "On hand", "Location", "Status"]}
            rows={[
              ["Mealie meal 25kg", "182", "Main store", { t: "OK", tone: "#12A557" }],
              ["Cooking oil 2L", "24", "Outlet 2", { t: "LOW", tone: "#C87A3C" }],
              ["Sugar 1kg", "0", "Outlet 1", { t: "OUT", tone: "#E0687A" }],
              ["Bottled water 500ml", "640", "Warehouse", { t: "OK", tone: "#12A557" }],
              ["Rice 10kg", "58", "Main store", { t: "OK", tone: "#12A557" }],
            ]}
          />
          <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Movement</p>
            <Bars data={[8, 14, 9, 18, 12, 22, 16]} accent="#7C3AED" />
            <p className="mt-1 text-[9px] text-sifo-haze/70">Receipts, issues and transfers, last 7 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComplianceScreen() {
  return (
    <div className="flex gap-3">
      <Rail active="compliance" accent="#C87A3C" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="rounded-lg border border-sifo-copper/30 bg-sifo-copper/8 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sifo-copper">Smart Invoice connection</p>
          <p className="mt-1 text-[11px] font-semibold text-white">Configured with your own ZRA-issued VSDC credentials. SifoBooks queues and tracks each invoice; ZRA certifies the connection, not the software.</p>
        </div>
        <Rows
          accent="#C87A3C"
          head={["Obligation", "Period", "Due", "Status"]}
          rows={[
            ["VAT return", "Sep 2026", "18 Oct", { t: "DUE", tone: "#C87A3C" }],
            ["PAYE", "Sep 2026", "10 Oct", { t: "FILED", tone: "#12A557" }],
            ["NAPSA", "Sep 2026", "10 Oct", { t: "FILED", tone: "#12A557" }],
            ["Turnover tax", "Sep 2026", "14 Oct", { t: "DRAFT", tone: "#5AA9E6" }],
            ["Tourism levy", "Sep 2026", "14 Oct", { t: "DUE", tone: "#C87A3C" }],
          ]}
        />
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Invoices queued" value="128" delta="Awaiting transmission" tone="copper" />
          <Kpi label="Licences tracked" value="7" delta="2 expire in 60 days" tone="rose" />
          <Kpi label="Audit trail" value="Complete" delta="Every change stamped" />
        </div>
      </div>
    </div>
  );
}

export function HotelScreen() {
  const rooms = [["101", "#5AA9E6", "In-house"], ["102", "#12A557", "Vacant"], ["103", "#C87A3C", "Dirty"], ["104", "#5AA9E6", "In-house"], ["105", "#12A557", "Vacant"], ["106", "#E0687A", "OOO"], ["107", "#5AA9E6", "In-house"], ["108", "#12A557", "Vacant"], ["109", "#C87A3C", "Dirty"], ["110", "#5AA9E6", "In-house"], ["111", "#12A557", "Vacant"], ["112", "#5AA9E6", "In-house"]];
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Occupancy" value="78%" delta="37 of 48 rooms" tone="sky" />
        <Kpi label="ADR" value="K 1,240" delta="▲ 4.1%" />
        <Kpi label="RevPAR" value="K 967" delta="Month to date" />
        <Kpi label="Arrivals today" value="18" delta="6 departures" tone="copper" />
      </div>
      <div className="grid gap-2.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Room rack · floor 1</p>
          <div className="grid grid-cols-6 gap-1.5">{rooms.map(([n, c, s]) => <Tile key={n} label={n} sub={s} tone={c} />)}</div>
        </div>
        <Rows
          accent="#5AA9E6"
          head={["Folio", "Guest", "Balance"]}
          rows={[
            ["F-2201", "N. Mwanza · Rm 104", "K 3,480.00"],
            ["F-2204", "Copperbelt Energy (corp)", "K 12,900.00"],
            ["F-2209", "T. Phiri · Rm 110", "K 1,240.00"],
            ["F-2211", "Walk-in · Rm 107", "K 620.00"],
          ]}
        />
      </div>
    </div>
  );
}

export function RestaurantScreen() {
  const tables = [["T1", "#C87A3C", "Ordering"], ["T2", "#12A557", "Free"], ["T3", "#5AA9E6", "Seated"], ["T4", "#E0687A", "Bill"], ["T5", "#12A557", "Free"], ["T6", "#5AA9E6", "Seated"], ["T7", "#C87A3C", "Ordering"], ["T8", "#12A557", "Free"]];
  return (
    <div className="grid gap-2.5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-2.5">
        <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Floor plan · terrace</p>
          <div className="grid grid-cols-4 gap-1.5">{tables.map(([n, c, s]) => <Tile key={n} label={n} sub={s} tone={c} />)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Sales today" value="K 68,400" delta="212 covers" tone="copper" />
          <Kpi label="Avg ticket" value="K 322" delta="▲ K 18" />
          <Kpi label="Food cost" value="31.4%" delta="Target 32%" tone="sky" />
        </div>
      </div>
      <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Kitchen display</p>
          <span className="rounded bg-[#C87A3C]/20 px-1.5 py-0.5 text-[9px] font-bold text-sifo-copper">3 firing</span>
        </div>
        <div className="space-y-1.5">
          {[["#118 · T3", "2× T-bone, 1× Nshima", "04:12", "#C87A3C"], ["#119 · T7", "3× Grilled tilapia", "01:45", "#12A557"], ["#120 · Takeaway", "1× Chicken curry", "00:38", "#12A557"], ["#117 · T4", "2× Beef stew", "08:56", "#E0687A"]].map(([id, items, t, c]) => (
            <div key={id} className="rounded-md border-l-2 border-sifo-line/70 bg-sifo-ink-3/60 px-2 py-1.5" style={{ borderLeftColor: c }}>
              <div className="flex justify-between text-[10px] font-bold text-white"><span>{id}</span><span className="tabular-nums" style={{ color: c }}>{t}</span></div>
              <p className="text-[9.5px] text-sifo-haze">{items}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SchoolScreen() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Learners" value="640" delta="18 classes" />
        <Kpi label="Fees collected" value="82%" delta="Term 3" tone="sky" />
        <Kpi label="Arrears" value="K 96,300" delta="41 accounts" tone="copper" />
        <Kpi label="Attendance today" value="94.2%" delta="37 absent" />
      </div>
      <div className="grid gap-2.5 lg:grid-cols-[1fr_170px]">
        <Rows
          head={["Learner", "Class", "Fee balance", "Status"]}
          rows={[
            ["Mutinta Hachaambwa", "Grade 9A", "K 0.00", { t: "PAID", tone: "#12A557" }],
            ["Chileshe Bwalya", "Grade 7B", "K 2,400.00", { t: "PART", tone: "#5AA9E6" }],
            ["Natasha Zulu", "Grade 11A", "K 5,800.00", { t: "ARREARS", tone: "#C87A3C" }],
            ["Joseph Tembo", "Grade 8A", "K 0.00", { t: "PAID", tone: "#12A557" }],
            ["Lweendo Siame", "Grade 10B", "K 1,150.00", { t: "PART", tone: "#5AA9E6" }],
          ]}
        />
        <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Collections by week</p>
          <Bars data={[12, 19, 14, 24, 20, 28]} accent="#12A557" />
          <p className="mt-1 text-[9px] text-sifo-haze/70">Receipts posted to the fee ledger</p>
        </div>
      </div>
    </div>
  );
}

export function MiningScreen() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Tonnes hauled" value="14,820 t" delta="Week 39" tone="copper" />
        <Kpi label="Fuel issued" value="38,400 L" delta="Against job cards" tone="sky" />
        <Kpi label="Plant availability" value="87%" delta="3 units in workshop" />
        <Kpi label="Cost per tonne" value="K 214" delta="▼ K 9 vs plan" />
      </div>
      <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr]">
        <Rows
          accent="#C87A3C"
          head={["Job card", "Asset", "Cost centre", "Status"]}
          rows={[
            ["JC-8841", "Excavator EX-04", "Pit A stripping", { t: "OPEN", tone: "#5AA9E6" }],
            ["JC-8836", "Haul truck HT-11", "Haulage", { t: "SERVICE", tone: "#C87A3C" }],
            ["JC-8829", "Dozer DZ-02", "Road maintenance", { t: "CLOSED", tone: "#12A557" }],
            ["JC-8822", "Genset GS-01", "Plant power", { t: "OPEN", tone: "#5AA9E6" }],
          ]}
        />
        <div className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sifo-haze/70">Consumables & spares issued</p>
          <Bars data={[16, 11, 19, 14, 22, 18, 25]} accent="#C87A3C" />
          <p className="mt-1 text-[9px] text-sifo-haze/70">Stores issues costed straight to the cost centre</p>
        </div>
      </div>
    </div>
  );
}

/* ── registry ───────────────────────────────────────────────── */

export const SCREENS: Record<ScreenKey, {
  label: string; icon: typeof Landmark; accent: string; crumb: string;
  title: string; lede: string; points: string[]; render: () => ReactNode;
}> = {
  dashboard: {
    label: "Overview", icon: BarChart3, accent: "#12A557", crumb: "/dashboard",
    title: "The whole business on one morning screen",
    lede: "Cash, sales, receivables and what needs a decision today — pulled from the same ledger the accountant signs off.",
    points: ["Live work queue instead of a static dashboard", "Drill from any figure to the transaction", "Multi-company and branch switching"],
    render: () => <DashboardScreen />,
  },
  pos: {
    label: "POS", icon: ScanBarcode, accent: "#1D4ED8", crumb: "/pos",
    title: "A till your cashiers can run at speed",
    lede: "Touch keys, shift control, cash / card / MTN MoMo / Airtel Money, and every sale costed into stock and the ledger as it happens.",
    points: ["Shift float, cash-up and variance approval", "PIN-based cashier access with an audit trail", "Offline-tolerant, receipt and kitchen printing"],
    render: () => <PosScreen />,
  },
  accounting: {
    label: "Accounting", icon: Landmark, accent: "#12A557", crumb: "/reports/trial-balance",
    title: "Double-entry that never drifts",
    lede: "Trial balance, general ledger, IFRS-for-SME statements and cashbooks built from posted journals — not spreadsheets.",
    points: ["Period close, reopen and controlled reversal", "Maker-checker approvals on posting", "Full drill-down to source documents"],
    render: () => <AccountingScreen />,
  },
  inventory: {
    label: "Inventory", icon: Boxes, accent: "#7C3AED", crumb: "/inventory/stock",
    title: "Stock you can actually trust",
    lede: "Multi-location balances, transfers, batches, counts and valuation reconciled to the inventory control account.",
    points: ["Warehouse, store and outlet separation", "Costed movements with variance approval", "Reorder alerts and stock reconciliation"],
    render: () => <InventoryScreen />,
  },
  compliance: {
    label: "Compliance", icon: ShieldCheck, accent: "#C87A3C", crumb: "/compliance",
    title: "Zambian statutory work, kept visible",
    lede: "VAT, PAYE, NAPSA, NHIMA, turnover tax and tourism levy tracked with due dates, plus a Smart Invoice queue that uses your own ZRA-issued VSDC credentials.",
    points: ["Obligation calendar with reminders", "Licence and permit register with expiry alerts", "Tax modelled per rule — levy is never just VAT"],
    render: () => <ComplianceScreen />,
  },
  hotel: {
    label: "Hotel", icon: Building2, accent: "#5AA9E6", crumb: "/hotel/room-rack",
    title: "Front desk to night audit",
    lede: "Room rack, reservations, folios, housekeeping and a day close that reports occupancy, ADR and RevPAR.",
    points: ["Charge restaurant and bar to the room folio", "Deposits, corporate billing and split folios", "Housekeeping board with attendant tasks"],
    render: () => <HotelScreen />,
  },
  restaurant: {
    label: "Restaurant", icon: ChefHat, accent: "#C87A3C", crumb: "/restaurant/tables",
    title: "Floor, kitchen and cash in one flow",
    lede: "Table plan to order to kitchen display to bill to cash-up, with recipe costing behind every plate.",
    points: ["Split, merge and transfer bills", "Kitchen and bar routing with timers", "Recipe costing, wastage and food-cost %"],
    render: () => <RestaurantScreen />,
  },
  school: {
    label: "School", icon: GraduationCap, accent: "#12A557", crumb: "/school/fees",
    title: "Learners, fees and the books together",
    lede: "Enrolment, classes, fee structures, invoicing, receipts and arrears that post straight into the school's accounts.",
    points: ["Fee structures per class and term", "Receipts, statements and arrears follow-up", "Staff payroll on the same ledger"],
    render: () => <SchoolScreen />,
  },
  mining: {
    label: "Mining", icon: Mountain, accent: "#C87A3C", crumb: "/assets/job-cards",
    title: "Plant, stores and cost per tonne",
    lede: "Job cards, fixed assets, fuel and spares issued from stores and costed to the pit, haul or plant cost centre.",
    points: ["Asset register with depreciation posting", "Job cards linked to stores issues", "Cost-centre reporting down to unit cost"],
    render: () => <MiningScreen />,
  },
};

export const SCREEN_ORDER: ScreenKey[] = ["dashboard", "pos", "accounting", "inventory", "compliance", "hotel", "restaurant", "school", "mining"];

export { Wallet, ReceiptText };
