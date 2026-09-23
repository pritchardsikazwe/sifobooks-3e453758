import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3, Boxes, Download, FileText, Printer, RefreshCw, Search,
  ArrowDownToLine,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { today, uid } from "@/lib/restaurant";
import { deriveStatus } from "@/lib/inventory";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/restaurant/stock-reports")({
  head: () => ({
    meta: [
      { title: "Stock & Inventory Reports — SifoBooks Restaurant" },
      { name: "description", content: "SifoBooks Restaurant 2026 stock list, movement, usage, valuation, low stock, wastage and recipe costing reports." },
    ],
  }),
  component: RestaurantStockReports,
});

type ReportTab =
  | "stock-list" | "movement" | "usage" | "value" | "low" | "out"
  | "adjustments" | "wastage" | "recipe-costing" | "purchase-usage" | "stock-take";

type StockItem = Record<string, any>;
type Warehouse = { id: string; name: string };
type Movement = Record<string, any>;
type Recipe = Record<string, any>;
type MenuItem = Record<string, any>;

const TABS: { id: ReportTab; label: string }[] = [
  { id: "stock-list", label: "Stock List Report" },
  { id: "movement", label: "Stock Movement" },
  { id: "usage", label: "Stock Usage" },
  { id: "value", label: "Stock Value" },
  { id: "low", label: "Low Stock" },
  { id: "out", label: "Out of Stock" },
  { id: "adjustments", label: "Stock Adjustments" },
  { id: "wastage", label: "Wastage" },
  { id: "recipe-costing", label: "Recipe Costing" },
  { id: "purchase-usage", label: "Purchase vs Usage" },
  { id: "stock-take", label: "Stock Take" },
];

const n = (v: any) => Number(v ?? 0);
const money = (v: any) => fmtMoney(n(v));
const isoDay = (v: any) => String(v || "").slice(0, 10);

function movementKind(m: Movement) {
  const type = String(m.movement_type || "").toLowerCase();
  const hay = `${m.reference || ""} ${m.note || ""}`.toLowerCase();
  if (/(wast|waste|damage|damag|write.?off|scrap)/.test(type + " " + hay)) return "wastage";
  if (/(adjust|count|stock.?take)/.test(type + " " + hay)) return "adjustment";
  if (/(transfer)/.test(type + " " + hay)) return "transfer";
  if (/(sale|pos|consum|issue|production.?out|usage)/.test(type + " " + hay)) return "usage";
  if (/(purchase|purch|receive|receipt|grn|opening|production.?in|transfer.?in|return)/.test(type + " " + hay)) return "purchase";
  return "other";
}

function movementSign(m: Movement) {
  const type = String(m.movement_type || "").toLowerCase();
  const qty = Math.abs(n(m.quantity));
  if (/(adjustment|adjust|count)/.test(type)) {
    if (/_out|out/.test(type)) return -qty;
    if (/_in|in/.test(type)) return qty;
    return n(m.quantity);
  }
  if (/(sale|pos|consum|issue|production.?out|wast|waste|damage|write.?off|scrap|purchase.?return|transfer.?out)/.test(type)) return -qty;
  if (/(^|_)(in|purchase|receive|receipt|grn|opening|production.?in|transfer.?in|sales.?return)/.test(type)) return qty;
  const kind = movementKind(m);
  if (kind === "usage" || kind === "wastage") return -qty;
  return n(m.quantity);
}

function statusFor(item: StockItem) {
  return deriveStatus({
    quantity_on_hand: n(item.quantity_on_hand),
    reserved_qty: n(item.reserved_qty),
    reorder_level: n(item.reorder_level),
    safety_stock: n(item.safety_stock),
    max_stock: n(item.max_stock),
  });
}

function statusBadge(status: string) {
  if (status === "out") return "border-red-200 bg-red-50 text-red-700";
  if (status === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "low") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "overstock") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function csv(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return [keys, ...rows.map(r => keys.map(k => r[k] ?? ""))]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(name: string, rows: Record<string, any>[]) {
  const blob = new Blob([csv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function RestaurantStockReports() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [warehouse, setWarehouse] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ReportTab>("stock-list");
  const [items, setItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState("");

  const load = async () => {
    const u = await uid();
    if (!u) return;
    setLoading(true);
    try {
      const [i, w, m, r, mi] = await Promise.all([
        supabase.from("stock_items").select("*").eq("user_id", u).order("name"),
        supabase.from("warehouses").select("id,name").eq("user_id", u).order("name"),
        supabase.from("stock_movements").select("*").eq("user_id", u).gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`).order("created_at", { ascending: false }),
        supabase.from("restaurant_recipes").select("*").eq("user_id", u),
        supabase.from("restaurant_menu_items").select("*").eq("user_id", u).order("name"),
      ]);
      if (i.error) throw i.error;
      if (m.error) throw m.error;
      setItems(i.data ?? []);
      setWarehouses(w.data ?? []);
      setMovements(m.data ?? []);
      setRecipes(r.data ?? []);
      setMenuItems(mi.data ?? []);
      setLoadedAt(new Date().toLocaleString());
    } catch (e: any) {
      console.error("[Stock Reports]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [from, to]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map(x => String(x.category || "Other")))).sort()],
    [items],
  );

  const filteredItems = useMemo(() => items.filter(item => {
    const q = query.trim().toLowerCase();
    const text = `${item.name || ""} ${item.sku || ""} ${item.category || ""}`.toLowerCase();
    const st = statusFor(item);
    return (!q || text.includes(q))
      && (warehouse === "all" || item.warehouse_id === warehouse)
      && (category === "all" || String(item.category || "Other") === category)
      && (status === "all" || st === status);
  }), [items, query, warehouse, category, status]);

  const itemMap = useMemo(() => new Map(items.map(x => [x.id, x])), [items]);
  const warehouseMap = useMemo(() => new Map(warehouses.map(x => [x.id, x.name])), [warehouses]);

  const filteredMovements = useMemo(() => movements.filter(m => {
    const item = itemMap.get(m.item_id);
    if (!item) return false;
    return warehouse === "all" || item.warehouse_id === warehouse;
  }), [movements, itemMap, warehouse]);

  const stats = useMemo(() => {
    const stockValue = filteredItems.reduce((s, x) => s + n(x.quantity_on_hand) * n(x.cost_price), 0);
    const low = filteredItems.filter(x => ["low", "critical"].includes(statusFor(x))).length;
    const out = filteredItems.filter(x => statusFor(x) === "out").length;
    let used = 0, waste = 0;
    for (const m of filteredMovements) {
      const value = Math.abs(movementSign(m)) * n(m.unit_cost || itemMap.get(m.item_id)?.cost_price);
      if (movementKind(m) === "usage") used += value;
      if (movementKind(m) === "wastage") waste += value;
    }
    return { stockValue, totalItems: filteredItems.length, low, out, used, waste };
  }, [filteredItems, filteredMovements, itemMap]);

  const trend = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of filteredMovements) {
      if (movementKind(m) !== "usage") continue;
      const d = isoDay(m.created_at);
      map[d] = (map[d] || 0) + Math.abs(movementSign(m)) * n(m.unit_cost || itemMap.get(m.item_id)?.cost_price);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }, [filteredMovements, itemMap]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const x of filteredItems) {
      const k = String(x.category || "Other");
      map[k] = (map[k] || 0) + n(x.quantity_on_hand) * n(x.cost_price);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value).slice(0, 8);
  }, [filteredItems]);

  const topUsage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of filteredMovements) {
      if (movementKind(m) !== "usage") continue;
      const item = itemMap.get(m.item_id);
      if (!item) continue;
      map[item.id] = (map[item.id] || 0) + Math.abs(movementSign(m)) * n(m.unit_cost || item.cost_price);
    }
    return Object.entries(map).map(([id,value]) => ({ name: itemMap.get(id)?.name || "Item", value }))
      .sort((a,b) => b.value-a.value).slice(0, 8);
  }, [filteredMovements, itemMap]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const x of filteredItems) {
      const s = statusFor(x);
      map[s] = (map[s] || 0) + 1;
    }
    return [
      { name: "In Stock", value: map.in_stock || 0 },
      { name: "Low", value: (map.low || 0) + (map.critical || 0) },
      { name: "Out", value: map.out || 0 },
      { name: "Overstock", value: map.overstock || 0 },
    ];
  }, [filteredItems]);

  const movementRows = useMemo(() => filteredMovements.map(m => {
    const item = itemMap.get(m.item_id);
    const signed = movementSign(m);
    const kind = movementKind(m);
    return {
      date: isoDay(m.created_at),
      item: item?.name || "Unknown",
      sku: item?.sku || "—",
      warehouse: warehouseMap.get(item?.warehouse_id) || "Unassigned",
      type: kind,
      reference: m.reference || "—",
      note: m.note || "—",
      qty: Math.abs(signed),
      direction: signed >= 0 ? "IN" : "OUT",
      unitCost: n(m.unit_cost || item?.cost_price),
      value: Math.abs(signed) * n(m.unit_cost || item?.cost_price),
    };
  }), [filteredMovements, itemMap, warehouseMap]);

  const usageRows = useMemo(() => movementRows.filter(x => x.type === "usage"), [movementRows]);
  const wasteRows = useMemo(() => movementRows.filter(x => x.type === "wastage"), [movementRows]);
  const adjustmentRows = useMemo(() => movementRows.filter(x => x.type === "adjustment"), [movementRows]);
  const purchaseRows = useMemo(() => movementRows.filter(x => x.type === "purchase"), [movementRows]);

  const recipeRows = useMemo(() => {
    const stock = itemMap;
    return menuItems.map(menu => {
      const rs = recipes.filter(r => r.menu_item_id === menu.id);
      const ingredients = rs.reduce((sum, r) => sum + n(r.quantity) * n(stock.get(r.stock_item_id)?.cost_price), 0);
      const selling = n(menu.price);
      return {
        item: menu.name,
        category: menu.category || "Other",
        ingredients: rs.length,
        cost: ingredients,
        selling,
        margin: selling - ingredients,
        foodCostPct: selling > 0 ? (ingredients / selling) * 100 : 0,
      };
    }).filter(x => x.ingredients > 0).sort((a,b) => b.cost-a.cost);
  }, [menuItems, recipes, itemMap]);

  const purchaseVsUsage = useMemo(() => {
    const p = purchaseRows.reduce((s,x) => s+x.value,0);
    const u = usageRows.reduce((s,x) => s+x.value,0);
    return { purchase: p, usage: u, net: p-u };
  }, [purchaseRows, usageRows]);

  const reportTitle = TABS.find(x => x.id === tab)?.label || "Stock List Report";

  const exportRows = useMemo(() => {
    if (tab === "stock-list" || tab === "value" || tab === "low" || tab === "out" || tab === "stock-take") {
      return filteredItems.map(x => ({
        "Item Code": x.sku || "", "Item Name": x.name, Category: x.category || "",
        Warehouse: warehouseMap.get(x.warehouse_id) || "Unassigned", Unit: x.unit || "",
        "On Hand": n(x.quantity_on_hand), "Reorder Level": n(x.reorder_level),
        "Unit Cost (ZMW)": n(x.cost_price), "Stock Value (ZMW)": n(x.quantity_on_hand)*n(x.cost_price),
        Status: statusFor(x), "Last Updated": isoDay(x.updated_at || x.created_at),
      }));
    }
    if (tab === "recipe-costing") return recipeRows.map(x => ({ Item:x.item,Category:x.category,Ingredients:x.ingredients,Cost:x.cost,Selling:x.selling,Margin:x.margin,"Food Cost %":x.foodCostPct.toFixed(2) }));
    return movementRows.map(x => ({ Date:x.date,SKU:x.sku,Item:x.item,Warehouse:x.warehouse,Type:x.type,Reference:x.reference,Direction:x.direction,Quantity:x.qty,"Unit Cost":x.unitCost,Value:x.value,Note:x.note }));
  }, [tab, filteredItems, warehouseMap, movementRows, recipeRows]);

  const printReport = () => window.print();

  return (
    <div className="stock-reports-2026 space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .stock-print-area, .stock-print-area * { visibility: visible !important; }
          .stock-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .stock-no-print { display: none !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>

      <div className="stock-no-print rounded-2xl bg-[#073b38] p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-start gap-4">
          <div className="mr-auto">
            <div className="flex items-center gap-2 text-xs font-black tracking-[.18em] text-[#e5b83f]"><Boxes className="h-4 w-4" /> SIFOBOOKS RESTAURANT 2026</div>
            <h1 className="mt-1 text-2xl font-black">Stock & Inventory Reports</h1>
            <p className="mt-1 text-sm text-white/70">Live reporting from the existing inventory, warehouse and recipe data.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void load()} disabled={loading}><RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh</Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => downloadCsv(`sifobooks-${tab}-${from}-to-${to}.csv`, exportRows)}><Download className="mr-2 h-4 w-4" /> CSV</Button>
            <Button className="bg-[#e5b83f] text-[#173b3a] hover:bg-[#f0c957]" onClick={printReport}><Printer className="mr-2 h-4 w-4" /> Print Report</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white" /></label>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white" /></label>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Warehouse<select value={warehouse} onChange={e=>setWarehouse(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white"><option value="all" className="text-black">All warehouses</option>{warehouses.map(w=><option key={w.id} value={w.id} className="text-black">{w.name}</option>)}</select></label>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Category<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white">{categories.map(c=><option key={c} value={c} className="text-black">{c==="all"?"All categories":c}</option>)}</select></label>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SKU, item, category" className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white placeholder:text-white/40" /></label>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white"><option value="all" className="text-black">All statuses</option><option value="in_stock" className="text-black">In stock</option><option value="low" className="text-black">Low stock</option><option value="critical" className="text-black">Critical</option><option value="out" className="text-black">Out of stock</option><option value="overstock" className="text-black">Overstock</option></select></label>
        </div>
      </div>

      <div className="stock-no-print grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Total Stock Value", money(stats.stockValue), "text-[#173b3a]"],
          ["Total Items", stats.totalItems, "text-[#173b3a]"],
          ["Low Stock Items", stats.low, "text-amber-700"],
          ["Out of Stock", stats.out, "text-red-700"],
          ["Stock Used (Period)", money(stats.used), "text-[#173b3a]"],
          ["Stock Wastage", money(stats.waste), "text-red-700"],
        ].map(([label,value,cls])=><div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-semibold text-slate-500">{label}</div><div className={`mt-1 text-xl font-black tabular-nums ${cls}`}>{value}</div></div>)}
      </div>

      <div className="stock-no-print grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
        <ChartCard title="Stock Value Trend" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="flex h-44 items-end gap-1 overflow-hidden">
            {(trend.length ? trend : [{date:"No movement",value:0}]).map((x,i)=>{
              const max=Math.max(...trend.map(y=>y.value),1);
              return <div key={x.date+i} className="flex h-full min-w-[18px] flex-1 flex-col justify-end"><div title={`${x.date}: ${money(x.value)}`} style={{height:`${Math.max(3,(x.value/max)*100)}%`}} className="rounded-t bg-[#07834f]"/><span className="mt-1 truncate text-center text-[8px] text-slate-400">{x.date.slice(5)}</span></div>;
            })}
          </div>
        </ChartCard>
        <ChartCard title="Stock by Category (Value)"><Bars rows={byCategory.map(x=>({label:x.name,value:x.value}))} money /></ChartCard>
        <ChartCard title="Stock Status"><Bars rows={statusCounts.map(x=>({label:x.name,value:x.value}))} /></ChartCard>
      </div>

      <div className="stock-no-print grid gap-4 xl:grid-cols-2">
        <ChartCard title="Top Stock Usage (Cost)" icon={<ArrowDownToLine className="h-4 w-4" />}><Bars rows={topUsage.map(x=>({label:x.name,value:x.value}))} money /></ChartCard>
        <ChartCard title="Report Summary">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Summary label="Purchase / Receipts" value={money(purchaseVsUsage.purchase)} />
            <Summary label="Usage / Consumption" value={money(purchaseVsUsage.usage)} />
            <Summary label="Net Stock Movement" value={money(purchaseVsUsage.net)} />
            <Summary label="Items in report" value={filteredItems.length} />
          </div>
        </ChartCard>
      </div>

      <div className="stock-no-print overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <div className="flex min-w-max gap-1 border-b bg-[#f7faf9] p-2">
          {TABS.map(x=><button key={x.id} onClick={()=>setTab(x.id)} className={cn("rounded-xl px-3 py-2 text-xs font-black transition",tab===x.id?"bg-[#073b38] text-white shadow-sm":"text-[#49605e] hover:bg-[#eaf2ef]")}>{x.label}</button>)}
        </div>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="mr-auto flex items-center gap-2"><FileText className="h-4 w-4 text-[#07834f]" /><span className="font-black text-[#173b3a]">{reportTitle}</span><Badge variant="outline">{exportRows.length} rows</Badge></div>
          <div className="relative stock-no-print"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter stock..." className="h-9 w-52 pl-8" /></div>
        </div>
        <ReportTable tab={tab} items={filteredItems} movementRows={movementRows} recipeRows={recipeRows} warehouseMap={warehouseMap} />
      </div>

      <div className="stock-print-area hidden">
        <PrintHeader title={reportTitle} from={from} to={to} warehouse={warehouse==="all"?"All warehouses":warehouseMap.get(warehouse)||"Selected warehouse"} category={category==="all"?"All categories":category} />
        <ReportTable tab={tab} items={filteredItems} movementRows={movementRows} recipeRows={recipeRows} warehouseMap={warehouseMap} />
        <div className="mt-6 border-t pt-3 text-[10px] text-slate-500">Generated {loadedAt || new Date().toLocaleString()} · SifoBooks Inventory · Page 1</div>
      </div>
    </div>
  );
}

function ChartCard({title,icon,children}:{title:string;icon?:ReactNode;children:ReactNode}) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 text-sm font-black text-[#173b3a]">{icon}{title}</div>{children}</div>;
}
function Summary({label,value}:{label:string;value:any}) {
  return <div className="rounded-xl border bg-[#f7faf9] p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 font-black text-[#173b3a]">{value}</div></div>;
}
function Bars({rows,money:asMoney=false}:{rows:{label:string;value:number}[];money?:boolean}) {
  const max=Math.max(...rows.map(x=>x.value),1);
  return <div className="space-y-3">{rows.length?rows.map((x,i)=><div key={x.label}><div className="mb-1 flex justify-between gap-2 text-[10px] font-bold"><span className="truncate">{x.label}</span><span>{asMoney?fmtMoney(x.value):x.value.toLocaleString()}</span></div><div className="h-2 rounded-full bg-slate-100"><div className={cn("h-2 rounded-full",i===0?"bg-[#07834f]":"bg-[#e5b83f]")} style={{width:`${Math.max(3,(x.value/max)*100)}%`}} /></div></div>):<div className="py-6 text-center text-xs text-slate-400">No data</div>}</div>;
}

function ReportTable({tab,items,movementRows,recipeRows,warehouseMap}:{tab:ReportTab;items:StockItem[];movementRows:any[];recipeRows:any[];warehouseMap:Map<string,string>}) {
  if(tab==="recipe-costing") return <TableWrap><thead><tr>{["Menu Item","Category","Ingredients","Recipe Cost","Selling Price","Gross Margin","Food Cost %"].map(h=><Th key={h}>{h}</Th>)}</tr></thead><tbody>{recipeRows.map((x,i)=><tr key={x.item+i}><Td strong>{x.item}</Td><Td>{x.category}</Td><Td right>{x.ingredients}</Td><Td right>{money(x.cost)}</Td><Td right>{money(x.selling)}</Td><Td right>{money(x.margin)}</Td><Td right>{x.foodCostPct.toFixed(1)}%</Td></tr>)}{!recipeRows.length&&<Empty colSpan={7}/>}</tbody></TableWrap>;

  if(tab==="movement"||tab==="usage"||tab==="adjustments"||tab==="wastage"||tab==="purchase-usage"){
    const rows=tab==="usage"?movementRows.filter(x=>x.type==="usage"):tab==="adjustments"?movementRows.filter(x=>x.type==="adjustment"):tab==="wastage"?movementRows.filter(x=>x.type==="wastage"):tab==="purchase-usage"?movementRows.filter(x=>x.type==="purchase"||x.type==="usage"):movementRows;
    return <TableWrap><thead><tr>{["Date","Item Code","Item Name","Warehouse","Type","Reference","Direction","Quantity","Unit Cost","Value","Note"].map(h=><Th key={h}>{h}</Th>)}</tr></thead><tbody>{rows.map((x,i)=><tr key={x.date+x.sku+i}><Td>{x.date}</Td><Td mono>{x.sku}</Td><Td strong>{x.item}</Td><Td>{x.warehouse}</Td><Td><Badge variant="outline">{x.type}</Badge></Td><Td>{x.reference}</Td><Td><span className={x.direction==="OUT"?"text-red-600":"text-emerald-700"}>{x.direction}</span></Td><Td right>{x.qty.toLocaleString()}</Td><Td right>{money(x.unitCost)}</Td><Td right strong>{money(x.value)}</Td><Td>{x.note}</Td></tr>)}{!rows.length&&<Empty colSpan={11}/>}</tbody></TableWrap>;
  }

  const rows=items;
  const headers=["#","Item Code","Item Name","Category","Warehouse","Unit","On Hand","Reorder Level","Unit Cost (ZMW)","Stock Value (ZMW)","Status","Last Updated"];
  return <TableWrap><thead><tr>{headers.map(h=><Th key={h}>{h}</Th>)}</tr></thead><tbody>{rows.map((x,i)=>{const s=statusFor(x);return <tr key={x.id}><Td>{i+1}</Td><Td mono>{x.sku||"—"}</Td><Td strong>{x.name}</Td><Td>{x.category||"Other"}</Td><Td>{warehouseMap.get(x.warehouse_id)||"Unassigned"}</Td><Td>{x.unit||"—"}</Td><Td right strong>{n(x.quantity_on_hand).toLocaleString()}</Td><Td right>{n(x.reorder_level).toLocaleString()}</Td><Td right>{money(x.cost_price)}</Td><Td right strong>{money(n(x.quantity_on_hand)*n(x.cost_price))}</Td><Td><Badge className={`border ${statusBadge(s)}`}>{s.replace("_"," ")}</Badge></Td><Td>{isoDay(x.updated_at||x.created_at)}</Td></tr>})}{!rows.length&&<Empty colSpan={12}/>}</tbody></TableWrap>;
}

function TableWrap({children}:{children:ReactNode}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-xs">{children}</table></div>;
}
function Th({children}:{children:ReactNode}) { return <th className="bg-[#073b38] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wide text-white">{children}</th>; }
function Td({children,right,strong,mono}:{children:ReactNode;right?:boolean;strong?:boolean;mono?:boolean}) { return <td className={cn("border-t px-3 py-2.5",right&&"text-right",strong&&"font-bold text-[#173b3a]",mono&&"font-mono text-[10px]")}>{children}</td>; }
function Empty({colSpan}:{colSpan:number}) { return <tr><td colSpan={colSpan} className="p-10 text-center text-slate-400">No records match the selected filters.</td></tr>; }

function PrintHeader({title,from,to,warehouse,category}:{title:string;from:string;to:string;warehouse:string;category:string}) {
  return <div className="mb-5 border-b-2 border-[#073b38] pb-3"><div className="flex items-start justify-between"><div><div className="text-2xl font-black text-[#073b38]">SifoBooks</div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#07834f]">Restaurant Inventory</div></div><div className="text-right"><div className="text-xl font-black text-[#173b3a]">{title}</div><div className="text-xs text-slate-500">{from} → {to}</div></div></div><div className="mt-3 grid grid-cols-3 gap-4 text-[10px] text-slate-600"><span>Warehouse: <b>{warehouse}</b></span><span>Category: <b>{category}</b></span><span>Generated: <b>{new Date().toLocaleString()}</b></span></div></div>;
}
