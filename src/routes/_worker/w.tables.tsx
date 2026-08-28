import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can } from "@/lib/pos-permissions";
import { fetchTables } from "@/lib/worker-pos";

export const Route = createFileRoute("/_worker/w/tables")({
  head: () => ({
    meta: [
      { title: "Table Floor Plan — SifoBooks Waiter" },
      { name: "description", content: "Live restaurant floor plan showing free, occupied, reserved and dirty tables for waiters." },
      { property: "og:title", content: "Table Floor Plan — SifoBooks Waiter" },
      { property: "og:description", content: "Tap a table to open a new order or view the running check." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerTables,
});

const tone = (s: string) =>
  s === "occupied" ? "bg-rose-500/15 border-rose-500 text-rose-300"
  : s === "reserved" ? "bg-amber-500/15 border-amber-500 text-amber-300"
  : s === "dirty" ? "bg-slate-600/20 border-slate-500 text-slate-300"
  : "bg-emerald-500/15 border-emerald-500 text-emerald-300";

function WorkerTables() {
  const ctx = usePosContext();
  const nav = useNavigate();
  const [tables, setTables] = useState<any[]>([]);

  useEffect(() => {
    if (!ctx?.tenantId) return;
    const load = () => fetchTables(ctx.tenantId).then(setTables);
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [ctx?.tenantId]);

  if (!can(ctx, "tables")) {
    return <div className="p-10 text-center text-slate-400">Table management is not available for your role.</div>;
  }

  const counts = tables.reduce<Record<string, number>>((a, t) => ({ ...a, [t.status]: (a[t.status] ?? 0) + 1 }), {});

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Table floor plan</h1>
        <div className="ml-auto flex gap-2 text-xs">
          {["available", "occupied", "reserved", "dirty"].map((s) => (
            <span key={s} className={`rounded-full border px-3 py-1 capitalize ${tone(s)}`}>{s} {counts[s] ?? 0}</span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables.map((t) => (
          <button key={t.id} onClick={() => nav({ to: "/w/pos" })}
            className={`aspect-square rounded-2xl border-2 p-3 flex flex-col items-center justify-center gap-1 ${tone(t.status)} active:scale-95 transition`}>
            <div className="text-lg font-bold">{t.name}</div>
            <div className="text-[11px] opacity-80">{t.seats ?? 0} seats</div>
            {t.server_name && <div className="text-[10px] opacity-70 truncate max-w-full">{t.server_name}</div>}
          </button>
        ))}
        {!tables.length && <div className="col-span-full text-slate-500 text-sm">No tables configured.</div>}
      </div>

      <button onClick={() => nav({ to: "/w/pos" })}
        className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-slate-950">+ New order</button>
    </div>
  );
}
