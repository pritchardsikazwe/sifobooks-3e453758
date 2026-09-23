import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { TABLE_STATUSES, statusTone, toneClass, uid } from "@/lib/restaurant";
import { StatGrid } from "@/components/industry/IndustryKit";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/tables")({
  head: () => ({
    meta: [
      { title: "Table & Floor Plan Management — SifoBooks" },
      { name: "description", content: "Visual restaurant floor plan: table status, guests, server, time occupied and the open check on every table." },
      { property: "og:title", content: "Table & Floor Plan Management — SifoBooks" },
      { property: "og:description", content: "Seat guests, transfer checks and clear tables from a live floor plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tables,
});

const db: any = supabase;

const LEGEND: { status: string; label: string }[] = [
  { status: "available", label: "Available" },
  { status: "occupied", label: "Occupied" },
  { status: "reserved", label: "Reserved" },
  { status: "payment pending", label: "Awaiting payment" },
  { status: "dirty", label: "Needs clearing" },
];

function Tables() {
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", area: "Main", seats: 4, shape: "square" });
  const [area, setArea] = useState("All");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const u = await uid();
    if (!u) return setLoading(false);
    const [t, o] = await Promise.all([
      db.from("restaurant_tables").select("*").eq("user_id", u).order("area").order("name"),
      db.from("restaurant_orders").select("*").eq("user_id", u).in("status", ["open", "held"]),
    ]);
    setTables(t.data ?? []);
    setOrders(o.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name.trim()) return toast.error("Give the table a name");
    const u = await uid();
    const { error } = await db.from("restaurant_tables").insert({ user_id: u, ...form, status: "available" });
    if (error) return toast.error(error.message);
    toast.success(`Table ${form.name} added`);
    setForm({ ...form, name: "" });
    setAddOpen(false);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "available") { patch.occupied_since = null; patch.current_order_id = null; patch.server_name = null; }
    if (status === "occupied") patch.occupied_since = new Date().toISOString();
    const { error } = await db.from("restaurant_tables").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setTables((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelected((s: any) => (s && s.id === id ? { ...s, ...patch } : s));
    toast.success(`Table marked ${status}`);
  };

  const remove = async (id: string) => {
    const { error } = await db.from("restaurant_tables").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTables((l) => l.filter((t) => t.id !== id));
    setSelected(null);
    toast.success("Table removed");
  };

  const areas = ["All", ...Array.from(new Set(tables.map((t) => t.area)))];
  const shown = tables.filter(
    (t) => (area === "All" || t.area === area) && `${t.name} ${t.area}`.toLowerCase().includes(q.toLowerCase()),
  );
  const orderFor = (t: any) => orders.find((o) => o.table_id === t.id);

  const counts = useMemo(() => {
    const by = (s: string) => tables.filter((t) => (t.status || "").toLowerCase() === s).length;
    return { occupied: by("occupied"), reserved: by("reserved"), free: by("available") };
  }, [tables]);
  const openValue = orders.reduce((s, o) => s + Number(o.total || 0), 0);

  const byArea = useMemo(() => {
    const m = new Map<string, any[]>();
    shown.forEach((t) => m.set(t.area ?? "Floor", [...(m.get(t.area ?? "Floor") ?? []), t]));
    return Array.from(m.entries());
  }, [shown]);

  const selectedOrder = selected ? orderFor(selected) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto"><div className="text-[11px] font-black uppercase tracking-[.18em] text-[#087b4b]">Floor control</div><h1 className="mt-1 text-2xl font-black text-[#173b3a]">Tables & Floor Plan</h1><p className="text-sm text-[#71817f]">Live table status, guest count and open checks.</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-[#dbe5e2] bg-white px-3 py-2 shadow-sm"><Search className="h-4 w-4 text-[#79908c]"/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search tables..." className="w-36 bg-transparent text-sm outline-none"/></div>
        <Button variant="outline" onClick={load} className="rounded-xl border-[#d5e2df] bg-white"><RefreshCw className="mr-1 h-4 w-4"/>Refresh</Button>
        <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button className="rounded-xl bg-[#07834f] font-bold"><Plus className="mr-1 h-4 w-4"/>Add table</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add table</DialogTitle></DialogHeader><div className="grid gap-3"><Input placeholder="Table name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><Input placeholder="Area" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/><Input type="number" placeholder="Seats" value={form.seats} onChange={e=>setForm({...form,seats:Number(e.target.value)})}/><Select value={form.shape} onValueChange={v=>setForm({...form,shape:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["square","round","booth","bar"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="ghost" onClick={()=>setAddOpen(false)}>Cancel</Button><Button onClick={add} className="bg-[#07834f]">Add table</Button></DialogFooter></DialogContent></Dialog>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Tables",tables.length],["Occupied",counts.occupied],["Reserved",counts.reserved],["Open check value",fmtMoney(openValue)]].map(([l,v])=><Card key={String(l)} className="rounded-2xl border-[#dbe5e2] bg-white shadow-sm"><CardContent className="p-4"><div className="text-xs font-bold uppercase tracking-wider text-[#7a8b89]">{l}</div><div className="mt-1 text-2xl font-black text-[#087b4b]">{v}</div></CardContent></Card>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">{areas.map(a=><button key={a} onClick={()=>setArea(a)} className={cn("rounded-full border px-4 py-2 text-xs font-bold",area===a?"border-[#07834f] bg-[#07834f] text-white":"border-[#d5e2df] bg-white text-[#536967]")}>{a}</button>)}<div className="ml-auto flex flex-wrap gap-2 text-[10px] font-bold">{LEGEND.map(l=><span key={l.status} className={cn("rounded-full border px-3 py-1",l.status==="available"?"border-emerald-200 bg-emerald-50 text-emerald-700":l.status==="occupied"?"border-red-200 bg-red-50 text-red-700":l.status==="reserved"?"border-blue-200 bg-blue-50 text-blue-700":"border-slate-200 bg-slate-50 text-slate-600")}>{l.label}</span>)}</div></div>
      {loading?<Card className="p-12 text-center">Loading floor plan…</Card>:shown.length===0?<Card className="rounded-2xl border-dashed p-12 text-center text-sm text-[#71817f]">No tables match your search.</Card>:<div className="space-y-6">{byArea.map(([areaName,list])=><section key={areaName}><div className="mb-3 flex items-center gap-3"><h2 className="text-sm font-black uppercase tracking-[.16em] text-[#365653]">{areaName}</h2><div className="h-px flex-1 bg-[#dce7e4]"/></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{list.map((t:any)=>{const o=orderFor(t);const mins=t.occupied_since?Math.round((Date.now()-new Date(t.occupied_since).getTime())/60000):null;const status=String(t.status||"available").toLowerCase();const cls=status==="occupied"?"border-red-300 bg-red-50":status==="reserved"?"border-blue-300 bg-blue-50":status==="dirty"?"border-slate-300 bg-slate-100":"border-emerald-300 bg-emerald-50";const tx=status==="occupied"?"text-red-700":status==="reserved"?"text-blue-700":status==="dirty"?"text-slate-600":"text-emerald-700";return <button key={t.id} onClick={()=>setSelected(t)} className={cn("min-h-[128px] rounded-2xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",cls)}><div className="flex items-start justify-between"><div><div className={cn("text-xl font-black",tx)}>{t.name}</div><div className="mt-1 text-[11px] text-[#70817f]">{t.seats} seats</div></div><span className={cn("rounded-full bg-white/70 px-2 py-1 text-[9px] font-black uppercase",tx)}>{status}</span></div>{o?<><div className="mt-5 text-sm font-black text-[#173b3a]">{fmtMoney(Number(o.total))}</div><div className="text-[10px] text-[#70817f]">{o.order_no}{mins!==null?" · "+mins+" min":""}</div></>:<div className={cn("mt-6 text-xs font-bold",tx)}>Available</div>}</button>})}</div></section>)}</div>}
      <Sheet open={!!selected} onOpenChange={v=>!v&&setSelected(null)}><SheetContent className="w-full border-l-[#d5e2df] bg-[#f7faf9] sm:max-w-md">{selected&&<><SheetHeader><SheetTitle className="text-xl font-black">Table {selected.name}</SheetTitle></SheetHeader><div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-3">{[["Area",selected.area],["Seats",selected.seats],["Shape",selected.shape],["Server",selected.server_name??"—"]].map(([a,v])=><div key={String(a)} className="rounded-xl border border-[#dce7e4] bg-white p-3"><div className="text-[10px] font-bold uppercase text-[#7b8d8a]">{a}</div><div className="mt-1 font-bold">{v}</div></div>)}</div>{selectedOrder?<Card className="rounded-xl border-[#dce7e4]"><CardContent className="p-4"><div className="text-xs text-[#7b8d8a]">OPEN CHECK</div><div className="mt-1 flex justify-between font-black"><span>{selectedOrder.order_no}</span><span>{fmtMoney(Number(selectedOrder.total))}</span></div><Link to="/restaurant/orders" className="mt-3 inline-block text-sm font-bold text-[#07834f]">Open order →</Link></CardContent></Card>:<div className="rounded-xl border border-dashed p-4 text-sm text-[#71817f]">No open check.</div>}<div><div className="mb-2 text-xs font-bold uppercase text-[#71817f]">Table status</div><Select value={selected.status} onValueChange={v=>setStatus(selected.id,v)}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent>{TABLE_STATUSES.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-2"><Link to="/restaurant/pos" className="rounded-xl bg-[#07834f] px-4 py-3 text-center text-sm font-black text-white">Take order</Link><Link to="/restaurant/reservations" className="rounded-xl border bg-white px-4 py-3 text-center text-sm font-bold">Reservations</Link></div><Button variant="destructive" className="w-full rounded-xl" onClick={()=>remove(selected.id)}><Trash2 className="mr-1 h-4 w-4"/>Remove table</Button></div></>}</SheetContent></Sheet>
    </div>
  );
}
