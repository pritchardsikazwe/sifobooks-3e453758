import { createFileRoute, Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { WORKER_NAV, can } from "@/lib/pos-permissions";

export const Route = createFileRoute("/_worker/w/")({
  head: () => ({
    meta: [
      { title: "SifoBooks POS — Worker Terminal" },
      { name: "description", content: "Role-aware POS terminal for cashiers, waiters, supervisors, managers and kitchen staff." },
      { property: "og:title", content: "SifoBooks POS — Worker Terminal" },
      { property: "og:description", content: "Take orders, manage tables, run the kitchen and cash up — without touching accounting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerHome,
});

function WorkerHome() {
  const ctx = usePosContext();
  const tiles = WORKER_NAV.filter((n) => !n.feature || can(ctx, n.feature));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Welcome, {ctx?.displayName}</h1>
      <p className="text-slate-400 mt-1 text-sm">
        You are signed in as <span className="uppercase font-semibold text-emerald-400">{ctx?.role}</span>. Only the tools your role allows are shown.
      </p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const Icon = (Icons as any)[t.icon] ?? Icons.Circle;
          return (
            <Link key={t.to} to={t.to}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-emerald-500 hover:bg-slate-900 transition">
              <Icon className="h-7 w-7 text-emerald-400" />
              <div className="mt-3 text-lg font-semibold">{t.label}</div>
            </Link>
          );
        })}
      </div>

      {ctx?.isOwner && (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          You own these books — <a className="text-emerald-400 underline" href="/dashboard">return to SifoBooks accounting</a>.
        </div>
      )}
    </div>
  );
}
