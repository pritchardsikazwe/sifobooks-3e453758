import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, Bell, HelpCircle, Settings as SettingsIcon, Plus, Command, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { MODULES } from "@/lib/modules";
import { SifoAssistantButton } from "@/components/SifoAssistantPanel";
import { CompanySwitcher } from "@/components/CompanySwitcher";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

function useBreadcrumb() {
  const path = useRouterState({ select: r => r.location.pathname });
  return useMemo(() => {
    const seg = path.split("/").filter(Boolean);
    if (!seg.length) return "Dashboard";
    return seg[0].replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }, [path]);
}

function Shell() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const navigate = useNavigate();
  const crumb = useBreadcrumb();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allRoutes = useMemo(() => {
    const items: { title: string; url: string; group: string }[] = [];
    for (const m of MODULES) for (const r of m.routes) items.push({ title: r.title, url: r.url, group: m.category });
    return items;
  }, []);

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3.25rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full bg-slate-50 text-slate-900">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-slate-200 bg-white/90 backdrop-blur-xl flex items-center gap-3 px-3 sm:px-5 sticky top-0 z-20 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
            <SidebarTrigger className="text-slate-500 hover:text-slate-900" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">SifoBooks</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">{crumb}</span>
            </div>
            <div className="ml-1"><CompanySwitcher /></div>
            <button
              onClick={() => setCmdOpen(true)}
              className="ml-2 hidden md:flex flex-1 max-w-xl items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition text-left text-sm text-slate-500"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span className="flex-1 truncate">Search transactions, reports, contacts…</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-mono text-slate-500">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
            <div className="flex-1 md:hidden" />
            <div className="flex items-center gap-1">
              <SifoAssistantButton />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100"><Bell className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100"><HelpCircle className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100" asChild><Link to="/setup"><SettingsIcon className="h-4 w-4" /></Link></Button>
              <Button size="sm" className="h-9 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" asChild>
                <Link to="/invoices/new"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span></Link>
              </Button>
            </div>
          </header>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>

        <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
          <CommandInput placeholder="Jump to a page, report, or module…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => { setCmdOpen(false); navigate({ to: "/invoices/new" }); }}>
                <Plus className="h-4 w-4 mr-2" /> New invoice
              </CommandItem>
              <CommandItem onSelect={() => { setCmdOpen(false); navigate({ to: "/quotes/new" }); }}>
                <Plus className="h-4 w-4 mr-2" /> New quote
              </CommandItem>
              <CommandItem onSelect={() => { setCmdOpen(false); navigate({ to: "/dashboard" }); }}>
                <Sparkles className="h-4 w-4 mr-2" /> Dashboard
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Navigate">
              {allRoutes.map(r => (
                <CommandItem key={r.url} value={`${r.title} ${r.group}`} onSelect={() => { setCmdOpen(false); navigate({ to: r.url as any }); }}>
                  <span className="text-slate-500 text-xs mr-2">{r.group}</span>
                  <span className="font-medium">{r.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </SidebarProvider>
  );
}
