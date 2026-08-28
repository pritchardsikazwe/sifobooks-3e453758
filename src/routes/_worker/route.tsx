import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORKER_NAV, can, loadPosContext, type PosContext } from "@/lib/pos-permissions";
import { PosContextProvider } from "@/components/pos/PosContextProvider";

export const Route = createFileRoute("/_worker")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: WorkerShell,
});

function WorkerShell() {
  const [ctx, setCtx] = useState<PosContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState<any | null>(null);
  const [mode, setMode] = useState<"unlock" | "confirm" | "waiting">("unlock");
  const path = useRouterState({ select: (s) => s.location.pathname });

  const refresh = async () => {
    const c = await loadPosContext();
    setCtx(c);
    if (c && !c.isOwner) {
      const { data: r } = await supabase
        .from("pos_pin_resets")
        .select("*")
        .eq("worker_user_id", c.workerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setReset(r ?? null);
      if (c.pinLocked) {
        setLocked(true);
        setMode(r?.status === "approved" ? "confirm" : "waiting");
      } else if (c.pin) {
        setLocked(true);
        setMode("unlock");
      }
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const exit = async () => {
    if (ctx?.isOwner) { window.location.assign("/dashboard"); return; }
    await supabase.auth.signOut();
    window.location.assign("/auth");
  };

  const submit = async () => {
    setError(null);
    if (mode === "confirm") {
      const { data, error: err } = await supabase.rpc("confirm_pos_pin_reset", { _pin: pin });
      const res = data as any;
      if (err) return setError(err.message);
      if (!res?.ok) { setPin(""); return setError(res?.error ?? "PIN does not match"); }
      setPin(""); setLocked(false); setMode("unlock");
      await refresh();
      return;
    }
    if (mode === "waiting") return;
    if (ctx?.pin && pin === ctx.pin) { setPin(""); setLocked(false); return; }
    setPin(""); setError("Incorrect PIN");
  };

  const requestReset = async () => {
    const reason = window.prompt("Tell your manager why you need a new PIN (optional)") ?? "";
    const { error: err } = await supabase.rpc("request_pos_pin_reset", { _reason: reason });
    if (err) return setError(err.message);
    setPin(""); setError(null); setMode("waiting");
    await refresh();
  };

  if (loading) {
    return <div className="min-h-dvh grid place-items-center bg-slate-950 text-slate-300">Loading terminal…</div>;
  }

  if (locked) {
    const title = mode === "confirm" ? "Confirm your new PIN" : mode === "waiting" ? "PIN reset pending" : "Terminal locked";
    return (
      <div className="min-h-dvh grid place-items-center bg-slate-950 text-slate-100 p-6">
        <div className="w-full max-w-xs space-y-4 text-center">
          <Icons.Lock className="mx-auto h-10 w-10 text-emerald-400" />
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-slate-400">{ctx?.displayName}</div>

          {mode === "waiting" ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 space-y-2">
              <p>Your old PIN has been disabled. A manager must approve a new one before you can use this terminal.</p>
              {reset?.status === "denied" && <p className="text-rose-300">Declined{reset.denied_reason ? `: ${reset.denied_reason}` : ""}.</p>}
              {reset?.status === "voided" && <p className="text-rose-300">Too many wrong attempts — ask for a fresh PIN.</p>}
              <Button size="sm" variant="secondary" className="w-full" onClick={refresh}>Check again</Button>
            </div>
          ) : (
            <>
              {mode === "confirm" && (
                <p className="text-xs text-slate-400">Enter the new PIN your manager gave you to activate it.</p>
              )}
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                type="password"
                placeholder="Enter PIN"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-center text-2xl tracking-[0.4em]"
              />
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","C","0","↵"].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      if (k === "C") setPin("");
                      else if (k === "↵") submit();
                      else setPin((p) => (p + k).slice(0, 8));
                    }}
                    className="rounded-xl bg-slate-800 py-4 text-lg font-semibold active:bg-emerald-600"
                  >{k}</button>
                ))}
              </div>
            </>
          )}

          {error && <div className="text-sm text-rose-400">{error}</div>}

          {mode === "unlock" && (
            <Button variant="ghost" className="w-full text-amber-300" onClick={requestReset}>
              Forgot PIN — request reset
            </Button>
          )}
          <Button variant="ghost" className="w-full text-slate-400" onClick={exit}>Sign out</Button>
        </div>
      </div>
    );
  }


  const nav = WORKER_NAV.filter((n) => !n.feature || can(ctx, n.feature));

  return (
    <PosContextProvider value={ctx}>
      <div className="min-h-dvh flex flex-col bg-slate-950 text-slate-100">
        <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
          <Link to="/w" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-slate-950">S</span>
            <span className="hidden sm:inline">SifoBooks POS</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden md:inline text-slate-400">{ctx?.displayName}</span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold uppercase text-emerald-400">
              {ctx?.role}
            </span>
            <Button size="sm" variant="ghost" className="text-slate-300" onClick={() => setLocked(true)}>
              <Icons.Lock className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-300" onClick={exit}>
              <Icons.LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* POS-only rail — the accounting sidebar is never rendered here */}
          <nav className="hidden md:flex w-[92px] shrink-0 flex-col gap-1 border-r border-slate-800 bg-slate-900/50 p-2">
            {nav.map((n) => {
              const Icon = (Icons as any)[n.icon] ?? Icons.Circle;
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[11px] font-medium ${active ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
                >
                  <Icon className="h-5 w-5" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
            <Outlet />
          </main>
        </div>

        {/* Mobile / tablet bottom bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur">
          {nav.slice(0, 5).map((n) => {
            const Icon = (Icons as any)[n.icon] ?? Icons.Circle;
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex-1 py-2 text-center text-[10px] ${active ? "text-emerald-400" : "text-slate-400"}`}>
                <Icon className="mx-auto h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </PosContextProvider>
  );
}
