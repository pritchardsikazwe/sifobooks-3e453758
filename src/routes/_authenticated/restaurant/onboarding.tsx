import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, ArrowRight, RefreshCw, Store, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureRegister } from "@/lib/pos";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/restaurant/onboarding")({
  head: () => ({ meta: [{ title: "Restaurant Onboarding — SifoBooks" }] }),
  component: RestaurantOnboarding,
});

type Step = { key: string; title: string; description: string; href: string };

const STEPS: Step[] = [
  { key: "location", title: "Selling location", description: "Create the branch, store, kitchen or bar location used by the POS.", href: "/inventory/locations" },
  { key: "register", title: "Register / till", description: "Create or connect the restaurant till to a selling location.", href: "/restaurant/registers" },
  { key: "cashier", title: "Cashier & shift", description: "Assign a cashier and open today's restaurant shift.", href: "/restaurant/shifts" },
  { key: "drawer", title: "Cash drawer", description: "Open the drawer before accepting cash payments.", href: "/restaurant/cash-drawers" },
  { key: "menu", title: "Menu", description: "Add menu items, prices, stations and modifiers.", href: "/restaurant/menu" },
  { key: "tables", title: "Tables", description: "Set up dine-in tables and service areas.", href: "/restaurant/tables" },
  { key: "kitchen", title: "Kitchen routing", description: "Configure kitchen/bar stations and printing.", href: "/restaurant/kitchen" },
];

function RestaurantOnboarding() {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [register, setRegister] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const uid = u.user.id;
    const [loc, menu, tables, shift, drawer] = await Promise.all([
      supabase.from("inventory_locations").select("id").eq("user_id", uid).eq("is_active", true).limit(1),
      supabase.from("restaurant_menu_items").select("id").eq("user_id", uid).eq("active", true).limit(1),
      supabase.from("restaurant_tables").select("id").eq("user_id", uid).limit(1),
      supabase.from("restaurant_shifts").select("id").eq("user_id", uid).eq("business_date", new Date().toISOString().slice(0,10)).is("clock_out", null).limit(1),
      supabase.from("restaurant_cash_drawers").select("id").eq("user_id", uid).eq("business_date", new Date().toISOString().slice(0,10)).eq("status", "open").limit(1),
    ]);
    const reg = await ensureRegister();
    setRegister(reg);
    setState({
      location: Boolean(loc.data?.length),
      register: Boolean(reg?.id),
      cashier: Boolean(shift.data?.length),
      drawer: Boolean(drawer.data?.length),
      menu: Boolean(menu.data?.length),
      tables: Boolean(tables.data?.length),
      kitchen: Boolean(menu.data?.length),
    });
  };

  useEffect(() => { void load(); }, []);

  const setupRegister = async () => {
    setBusy(true);
    try {
      const reg = await ensureRegister();
      if (!reg) throw new Error("Register could not be created.");
      setRegister(reg);
      toast.success(`Register ready: ${reg.name}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not create the restaurant register.");
    } finally { setBusy(false); }
  };

  const complete = Object.values(state).filter(Boolean).length;
  const total = STEPS.length;
  const readyForPos = state.register && state.cashier && state.drawer && state.menu;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-3xl bg-[#073b38] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5b83f] text-[#173b3a]"><UtensilsCrossed className="h-7 w-7" /></div>
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[.2em] text-[#e5b83f]">SifoBooks Restaurant</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Restaurant onboarding</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">Set up the operational chain once, then open POS. Register, cashier, shift, drawer, menu and stock all stay connected.</p>
          </div>
          <Link to="/restaurant/pos"><Button className="bg-[#07834f] font-black hover:bg-[#07965a]">Open POS <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-[#e5b83f] transition-all" style={{ width: `${Math.round((complete / total) * 100)}%` }} /></div>
          <span className="text-xs font-black">{complete}/{total} ready</span>
        </div>
      </div>

      {register && (
        <Card className="rounded-2xl border-[#cfe0db] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Store className="h-5 w-5 text-[#07834f]" />
            <div className="mr-auto"><div className="text-xs font-black uppercase tracking-wider text-[#07834f]">Active register</div><div className="font-bold">{register.name}</div><div className="text-xs text-muted-foreground">{register.branch || "Main"} {register.location_name ? `• ${register.location_name}` : "• Location not assigned"}</div></div>
            <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {STEPS.map((step, i) => {
          const done = state[step.key];
          return <Card key={step.key} className={`rounded-2xl p-4 transition ${done ? "border-emerald-200 bg-emerald-50/40" : "border-[#d7e4e0]"}`}>
            <div className="flex gap-3">
              {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}
              <div className="min-w-0 flex-1"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Step {i + 1}</div><div className="font-bold">{step.title}</div><p className="mt-1 text-xs text-muted-foreground">{step.description}</p></div>
              <Link to={step.href as never}><Button variant="outline" size="sm">{done ? "Open" : "Set up"} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
            </div>
          </Card>;
        })}
      </div>

      <Card className={`rounded-2xl p-5 ${readyForPos ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto"><div className="font-black">{readyForPos ? "Restaurant POS is ready to operate" : "POS readiness check"}</div><p className="text-xs text-muted-foreground">{readyForPos ? "The core till, cashier, drawer and menu prerequisites are present. Test a table order and payment next." : "Complete the register, cashier/shift, drawer and menu steps before taking a live payment."}</p></div>
          {!state.register && <Button onClick={() => void setupRegister()} disabled={busy} className="bg-[#07834f] hover:bg-[#07965a]">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create restaurant register</Button>}
          {readyForPos && <Link to="/restaurant/pos"><Button className="bg-[#07834f] hover:bg-[#07965a]">Test POS now <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>}
        </div>
      </Card>
    </div>
  );
}
