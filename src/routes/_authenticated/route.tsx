import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, Bell, HelpCircle, Settings as SettingsIcon, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

function Shell() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full bg-slate-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-white flex items-center gap-3 px-4 sticky top-0 z-10">
            <SidebarTrigger className="text-slate-600" />
            <div className="hidden md:flex flex-1 max-w-xl relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search transactions, invoices, contacts…" className="pl-9 h-9 bg-slate-50 border-slate-200" />
            </div>
            <div className="flex-1 md:hidden" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9"><Bell className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9"><HelpCircle className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" asChild><Link to="/setup"><SettingsIcon className="h-4 w-4" /></Link></Button>
              <Button size="icon" className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link to="/invoices/new" aria-label="Quick create"><Plus className="h-4 w-4" /></Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
