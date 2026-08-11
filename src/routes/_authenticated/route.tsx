import { createFileRoute, Outlet, redirect, Link, useRouterState, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, Bell, HelpCircle, Settings as SettingsIcon, Command, ArrowLeft, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { SifoAssistantButton } from "@/components/SifoAssistantPanel";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { QuickCreate } from "@/components/QuickCreate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SifoMobileNav } from "@/components/sifo/SifoMobileNav";

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
  const [userEmail, setUserEmail] = useState<string>("");
  const crumb = useBreadcrumb();
  const pageKey = useRouterState({ select: r => r.location.pathname });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ""));
  }, []);

  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    window.location.assign("/auth");
  };


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

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3.25rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/90 backdrop-blur-xl flex items-center gap-3 px-3 sm:px-5 sticky top-0 z-20 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.history.back()}
              title="Back"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">SifoBooks</span>
              <span className="text-border">/</span>
              <span className="text-muted-foreground">{crumb}</span>
            </div>
            <div className="ml-1"><CompanySwitcher /></div>
            <button
              onClick={() => setCmdOpen(true)}
              className="ml-2 hidden md:flex flex-1 max-w-xl items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/50 hover:bg-card hover:border-primary/30 transition text-left text-sm text-muted-foreground"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">Search anything… invoices, customers, transactions</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-card text-[10px] font-mono text-muted-foreground">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
            <div className="flex-1 md:hidden" />
            <div className="flex items-center gap-1">
              <SifoAssistantButton />
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"><Bell className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted hidden sm:inline-flex"><HelpCircle className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted" asChild><Link to="/setup"><SettingsIcon className="h-4 w-4" /></Link></Button>
              <QuickCreate />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted" title="Account">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{userEmail || "Signed in"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/setup"><SettingsIcon className="h-4 w-4 mr-2" /> Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>



          <OfflineBanner />
          <main className="flex-1 min-w-0 pb-16 md:pb-0">
            <div key={pageKey} className="page-enter">
              <Outlet />
            </div>
          </main>
          <SifoMobileNav />
        </div>

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      </div>
    </SidebarProvider>
  );
}
