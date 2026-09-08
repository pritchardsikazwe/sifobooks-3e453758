import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, ClipboardCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { fmtMoney } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/inventory/end-of-day")({
  head: () => ({ meta: [{ title: "End of Day & Cash Declaration — SifoBooks" }] }),
  component: EndOfDayPage,
});

const DENOMS = [200, 100, 50, 20, 10, 5, 2, 1];

type Shift = { id: string; register_id: string | null; cashier_name: string | null; opening_float: number; opened_at: string; status: string };
type Register = { id: string; name: string; location_id: string | null };
type Location = { id: string; name: string };
type Eod = { id: string; shift_id: string | null; business_date: string; location_id: string; register_id: string | null; cashier_name: string | null; opening_float: number; cash_sales: number; card_sales: number; mobile_money_sales: number; other_sales: number; payouts: number; refunds: number; expected_cash: number; declared_cash: number | null; cash_variance: number; status: string };

function EndOfDayPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [eods, setEods] = useState<Eod[]>([]);
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedEod, setSelectedEod] = useState("");
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [payouts, setPayouts] = useState("0");
  const [refunds, setRefunds] = useState("0");
  const [denoms, setDenoms] = useState<Record<number, number>>(() => Object.fromEntries(DENOMS.map((d) => [d, 0])));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ls, rs, ss, es] = await Promise.all([
        supabase.from("inventory_locations").select("id,name").eq("is_active", true).order("name"),
        supabase.from("pos_registers").select("id,name,location_id").eq("is_active", true).order("name"),
        supabase.from("pos_shifts").select("id,register_id,cashier_name,opening_float,opened_at,status").in("status", ["open", "closed"]).order("opened_at", { ascending: false }).limit(100),
        supabase.from("pos_end_of_day").select("*").order("business_date", { ascending: false }).limit(100),
      ]);
      if (ls.error) throw ls.error; if (rs.error) throw rs.error; if (ss.error) throw ss.error; if (es.error) throw es.error;
      setLocations((ls.data ?? []) as Location[]); setRegisters((rs.data ?? []) as Register[]); setShifts((ss.data ?? []) as Shift[]); setEods((es.data ?? []) as Eod[]);
    } catch (e: any) { toast.error(e.message ?? "Could not load end-of-day records"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const shift = shifts.find((s) => s.id === selectedShift) ?? null;
  const register = registers.find((r) => r.id === shift?.register_id) ?? null;
  const location = locations.find((l) => l.id === register?.location_id) ?? null;
  const existing = eods.find((e) => e.shift_id === selectedShift) ?? null;

  const [sales, setSales] = useState({ cash: 0, card: 0, mobile: 0, other: 0 });
  const refreshSales = useCallback(async () => {
    if (!selectedShift) { setSales({ cash: 0, card: 0, mobile: 0, other: 0 }); return; }
    const { data, error } = await supabase.from("pos_sales").select("id,status").eq("shift_id", selectedShift);
    if (error) return;
    const completed = (data ?? []).filter((s: any) => s.status === "completed");
    if (!completed.length) { setSales({ cash: 0, card: 0, mobile: 0, other: 0 }); return; }
    const { data: pays } = await supabase.from("pos_payments").select("method,amount,sale_id").in("sale_id", completed.map((s: any) => s.id));
    const out = { cash: 0, card: 0, mobile: 0, other: 0 };
    (pays ?? []).forEach((p: any) => {
      const m = String(p.method ?? "other").toLowerCase();
      if (m === "cash") out.cash += Number(p.amount ?? 0);
      else if (["card", "visa", "mastercard", "bank_card"].includes(m)) out.card += Number(p.amount ?? 0);
      else if (["mobile money", "mobile_money", "momo", "airtel_money", "mtn_momo"].includes(m)) out.mobile += Number(p.amount ?? 0);
      else out.other += Number(p.amount ?? 0);
    });
    setSales(out);
  }, [selectedShift]);
  useEffect(() => { void refreshSales(); }, [refreshSales]);

  const expectedCash = useMemo(() => Number(shift?.opening_float ?? 0) + sales.cash - Number(refunds || 0) - Number(payouts || 0), [shift, sales.cash, refunds, payouts]);
  const declaredCash = useMemo(() => DENOMS.reduce((sum, d) => sum + d * Number(denoms[d] || 0), 0), [denoms]);
  const variance = declaredCash - expectedCash;

  const openEod = async () => {
    if (!shift || !register?.location_id) return toast.error("Select a shift with a register assigned to a location");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("pos_end_of_day").upsert({
        user_id: u.user?.id, business_date: businessDate, location_id: register.location_id,
        register_id: register.id, shift_id: shift.id, cashier_name: shift.cashier_name,
        opening_float: Number(shift.opening_float ?? 0), cash_sales: sales.cash, card_sales: sales.card,
        mobile_money_sales: sales.mobile, other_sales: sales.other, refunds: Number(refunds || 0), payouts: Number(payouts || 0),
        expected_cash: expectedCash, status: "open", created_by: u.user?.id,
      } as any, { onConflict: "shift_id" }).select().single();
      if (error) throw error;
      setSelectedEod((data as any).id); toast.success("End-of-day opened"); await load();
    } catch (e: any) { toast.error(e.message ?? "Could not open end-of-day"); }
    finally { setBusy(false); }
  };

  const saveDeclaration = async () => {
    const id = selectedEod || existing?.id;
    if (!id) return toast.error("Open the end-of-day first");
    setBusy(true);
    try {
      const rows = DENOMS.map((d) => ({ end_of_day_id: id, denomination: d, quantity: Number(denoms[d] || 0) }));
      const { error: de } = await supabase.from("pos_cash_declarations").upsert(rows as any, { onConflict: "end_of_day_id,denomination" });
      if (de) throw de;
      const { error } = await supabase.from("pos_end_of_day").update({
        cash_sales: sales.cash, card_sales: sales.card, mobile_money_sales: sales.mobile, other_sales: sales.other,
        refunds: Number(refunds || 0), payouts: Number(payouts || 0), expected_cash: expectedCash,
        declared_cash: declaredCash, status: "submitted", submitted_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
      toast.success("Cash declaration submitted"); await load();
    } catch (e: any) { toast.error(e.message ?? "Could not save declaration"); }
    finally { setBusy(false); }
  };

  const closeEod = async () => {
    const id = selectedEod || existing?.id;
    if (!id) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("pos_end_of_day").update({ status: "closed", closed_at: new Date().toISOString() } as any).eq("id", id).eq("status", "submitted");
      if (error) throw error;
      if (shift) await supabase.from("pos_shifts").update({ status: "closed", closed_at: new Date().toISOString(), actual_cash: declaredCash, expected_cash: expectedCash, variance } as any).eq("id", shift.id);
      toast.success("End-of-day closed"); await load();
    } catch (e: any) { toast.error(e.message ?? "Could not close end-of-day"); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (existing) {
      setSelectedEod(existing.id);
      setBusinessDate(existing.business_date);
      setPayouts(String(existing.payouts ?? 0)); setRefunds(String(existing.refunds ?? 0));
    }
  }, [existing]);

  return <div className="space-y-4">
    <SifoModuleHeader module="inventory" title="End of Day & Cash Declaration" description="Reconcile posted POS activity and physically declared cash without changing the inventory or accounting engine." icon={ClipboardCheck} actions={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />

    <Card><CardHeader><CardTitle className="text-base">1. Select cashier shift</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2"><Label>Shift</Label><Select value={selectedShift} onValueChange={setSelectedShift}><SelectTrigger><SelectValue placeholder="Choose shift" /></SelectTrigger><SelectContent>{shifts.map((s) => <SelectItem key={s.id} value={s.id}>{s.cashier_name || "Cashier"} — {new Date(s.opened_at).toLocaleString()}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Register / location</Label><div className="rounded-md border px-3 py-2 text-sm">{register?.name ?? "—"} / {location?.name ?? "Not assigned"}</div></div>
      <div className="space-y-2"><Label>Business date</Label><Input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} /></div>
    </CardContent></Card>

    <div className="grid gap-4 md:grid-cols-4">
      {[['Cash sales', sales.cash], ['Card sales', sales.card], ['Mobile money', sales.mobile], ['Other sales', sales.other]].map(([label, value]) => <Card key={String(label)}><CardContent className="pt-5"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{fmtMoney(Number(value))}</div></CardContent></Card>)}
    </div>

    <Card><CardHeader><CardTitle className="text-base">2. Cash reconciliation</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div><Label>Opening float</Label><div className="mt-2 font-semibold">{fmtMoney(Number(shift?.opening_float ?? 0))}</div></div>
        <div><Label>Refunds</Label><Input type="number" min="0" value={refunds} onChange={(e) => setRefunds(e.target.value)} /></div>
        <div><Label>Payouts</Label><Input type="number" min="0" value={payouts} onChange={(e) => setPayouts(e.target.value)} /></div>
        <div><Label>Expected cash</Label><div className="mt-2 text-lg font-semibold">{fmtMoney(expectedCash)}</div></div>
      </div>
      <Button onClick={openEod} disabled={busy || !selectedShift}>{existing ? "Update End of Day" : "Open End of Day"}</Button>
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">3. Cash declaration</CardTitle></CardHeader><CardContent>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">{DENOMS.map((d) => <div key={d} className="grid grid-cols-[1fr_100px] items-center gap-2"><Label>K{d}</Label><Input type="number" min="0" step="1" value={denoms[d] || 0} onChange={(e) => setDenoms((x) => ({ ...x, [d]: Number(e.target.value || 0) }))} /></div>)}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-3 rounded-lg border p-4"><div><div className="text-xs text-muted-foreground">Declared cash</div><div className="text-xl font-bold">{fmtMoney(declaredCash)}</div></div><div><div className="text-xs text-muted-foreground">Expected cash</div><div className="text-xl font-bold">{fmtMoney(expectedCash)}</div></div><div><div className="text-xs text-muted-foreground">Variance</div><div className={variance === 0 ? "text-xl font-bold text-emerald-600" : "text-xl font-bold text-destructive"}>{fmtMoney(variance)}</div></div></div>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={saveDeclaration} disabled={busy || !(selectedEod || existing?.id)}><Calculator className="mr-2 h-4 w-4" />Submit declaration</Button><Button variant="outline" onClick={closeEod} disabled={busy || !(selectedEod || existing?.id) || (existing?.status !== "submitted" && selectedEod === "") }><CheckCircle2 className="mr-2 h-4 w-4" />Close Day</Button></div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">Recent end-of-day records</CardTitle></CardHeader><CardContent>{loading ? "Loading…" : <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Date</th><th className="p-2">Cashier</th><th className="p-2">Expected</th><th className="p-2">Declared</th><th className="p-2">Variance</th><th className="p-2">Status</th></tr></thead><tbody>{eods.map((e) => <tr key={e.id} className="border-b"><td className="p-2">{e.business_date}</td><td className="p-2">{e.cashier_name ?? "—"}</td><td className="p-2">{fmtMoney(e.expected_cash)}</td><td className="p-2">{e.declared_cash == null ? "—" : fmtMoney(e.declared_cash)}</td><td className="p-2">{fmtMoney(e.cash_variance)}</td><td className="p-2">{e.status}</td></tr>)}</tbody></table></div>}</CardContent></Card>
  </div>;
}
