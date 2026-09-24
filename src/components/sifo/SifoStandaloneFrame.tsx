import { Link } from "@tanstack/react-router";
import { Bell, HelpCircle, Search, Settings2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export type StandaloneNavItem = { label: string; to: string; active?: boolean };

export function SifoStandaloneFrame({
  product,
  title,
  subtitle,
  nav = [],
  actions,
  children,
  className,
}: {
  product: string;
  title: string;
  subtitle?: string;
  nav?: StandaloneNavItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-[#F5FAF8] text-[#173B3A]", className)}>
      <header className="sticky top-0 z-30 border-b border-[#DCE9E5] bg-white/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#07834F] text-white shadow-sm">S</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-tight">SifoBooks {product}</div>
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#78908B]">Business Edition</div>
            </div>
          </div>
          <div className="mx-auto hidden max-w-xl flex-1 md:block">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-[#DCE9E5] bg-[#F8FBFA] px-3 text-sm text-[#78908B]">
              <Search className="h-4 w-4" /> Search anything… invoices, customers, transactions
              <span className="ml-auto rounded-md border bg-white px-1.5 py-0.5 text-[10px]">Ctrl K</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 sm:flex"><Wifi className="h-3.5 w-3.5" /> Online</span>
            <button className="grid h-9 w-9 place-items-center rounded-lg border bg-white text-[#5F7772] hover:bg-[#F5FAF8]" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
            <button className="grid h-9 w-9 place-items-center rounded-lg border bg-white text-[#5F7772] hover:bg-[#F5FAF8]" aria-label="Help"><HelpCircle className="h-4 w-4" /></button>
            <button className="grid h-9 w-9 place-items-center rounded-lg border bg-white text-[#5F7772] hover:bg-[#F5FAF8]" aria-label="Settings"><Settings2 className="h-4 w-4" /></button>
          </div>
        </div>
        {nav.length > 0 && (
          <nav className="flex gap-1 overflow-x-auto border-t border-[#EEF4F2] px-4 py-2 sm:px-6">
            {nav.map((n) => (
              <Link key={n.to} to={n.to as never} className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                n.active ? "bg-[#07834F] text-white shadow-sm" : "text-[#58716B] hover:bg-[#EAF5F1] hover:text-[#07834F]",
              )}>{n.label}</Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1680px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#07834F]">{product} · Standalone workspace</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm text-[#657A75]">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
