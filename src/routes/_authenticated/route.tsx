import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SifoBooksLogo } from "@/components/SifoBooksLogo";
import { TopNavigation } from "@/components/TopNavigation";
import { Search, Bell, HelpCircle, Settings as SettingsIcon, Command, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { SifoAssistantButton } from "@/components/SifoAssistantPanel";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { QuickCreate } from "@/components/QuickCreate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { SifoMobileNav } from "@/components/sifo/SifoMobileNav";
import { WorkspaceSwitch } from "@/components/WorkspaceSwitch";
import { loadAccess, canAccessPath, landingFor, hasPerm, clearAccessCache, type Access } from "@/lib/rbac";
import { toast } from "sonner";

/** Staff may only open routes their permissions allow — typed URLs included. */
async function enforceRoute(pathname: string) {
  let access: Access | null = null;
  try { access = await loadAccess(); } catch { access = null; }
  if (!access) return { access };
  if (canAccessPath(access, pathname)) return { access };
  const landing = landingFor(access);
  if (typeof window !== "undefined") {
    setTimeout(() => toast.error("You don't have permission to open that page"), 50);
  }
  throw redirect({ to: landing === pathname ? "/dashboard" : landing, replace: true });
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Offline: keep the user inside the app on the current route. A network
    // failure is NOT a logout — only a real auth failure sends them to /auth.
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return { user: data.session.user, ...(await enforceRoute(location.pathname)) };
      throw redirect({ to: "/auth" });
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) return { user: data.user, ...(await enforceRoute(location.pathname)) };
      // Distinguish an auth rejection from a transport failure.
      const msg = error?.message ?? "";
      if (/fetch|network|timeout|Failed to fetch|NetworkError/i.test(msg)) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) return { user: s.session.user, ...(await enforceRoute(location.pathname)) };
      }
      throw redirect({ to: "/auth" });
    } catch (e: any) {
      if (e?.isRedirect || e?.to) throw e;
      const { data: s } = await supabase.auth.getSession();
      if (s.session) return { user: s.session.user, ...(await enforceRoute(location.pathname)) };
      throw redirect({ to: "/auth" });
    }
  },
  component: Shell,
});

function Shell() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const pageKey = useRouterState({ select: r => r.location.pathname });
  const { access } = Route.useRouteContext() as { access?: Access | null };
  const isStaff = Boolean(access && !access.is_owner && !access.is_super_admin);
  const canSettings = !isStaff || hasPerm(access, "settings.manage");
  const canCreate = !isStaff || hasPerm(access, "accounting.manage");
  const canSwitchCompany = !isStaff;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ""));
  }, []);

  const handleSignOut = async () => {
    // Clear cached business data on logout (pending offline writes are kept so
    // no captured transaction is ever silently lost).
    try {
      const { clearCachedBusinessData } = await import("@/lib/offline-db");
      await clearCachedBusinessData();
    } catch (e) { console.error(e); }
    clearAccessCache();
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
      <div className="sifobooks-2026-app min-h-screen flex w-full bg-background text-foreground">
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 w-full border-b border-[#DDEBE6] bg-white/95 backdrop-blur-xl shadow-[0_1px_0_rgba(23,59,58,0.04)]">
            <div className="mx-auto flex h-16 max-w-[1800px] min-w-0 items-center gap-2 px-3 sm:gap-4 sm:px-5">
              <Link to="/dashboard" className="shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/30" aria-label="SifoBooks home">
                <SifoBooksLogo markClassName="h-9 w-9 sm:h-10 sm:w-10" />
              </Link>
              {canSwitchCompany ? (
                <div className="hidden min-w-0 items-center gap-1 rounded-xl border border-[#E4EEE9] bg-[#F7FBF9] p-1 lg:flex">
                  <CompanySwitcher />
                  <WorkspaceSwitch />
                </div>
              ) : (
                <div className="hidden max-w-[180px] truncate rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground lg:block">
                  {access?.role_name}{access?.branch_name ? ` · ${access.branch_name}` : ""}
                </div>
              )}
              <button
                onClick={() => setCmdOpen(true)}
                className="ml-1 hidden h-10 min-w-0 max-w-2xl flex-1 items-center gap-2 rounded-xl border border-[#E1ECE7] bg-[#F7FBF9] px-3 text-left text-sm text-muted-foreground transition hover:border-[#07834F]/30 hover:bg-white md:flex"
                aria-label="Search SifoBooks"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Search transactions, customers, suppliers, products…</span>
                <kbd className="hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground lg:inline-flex"><Command className="h-3 w-3" />K</kbd>
              </button>
              <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
                <ConnectionIndicator />
                <div className="hidden items-center gap-1 sm:flex">
                  <SifoAssistantButton />
                  <ThemeToggle />
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground" title="Notifications"><Bell className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="hidden h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex" title="Help"><HelpCircle className="h-4 w-4" /></Button>
                  {canSettings && <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground" asChild title="Settings"><Link to="/setup"><SettingsIcon className="h-4 w-4" /></Link></Button>}
                </div>
                {canCreate && <QuickCreate />}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground" title="Account">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-xl">
                    <DropdownMenuLabel className="truncate">{userEmail || "Signed in"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">
                      {access?.role_name || "Workspace"}
                    </div>
                    {canSettings && <DropdownMenuItem asChild><Link to="/setup"><SettingsIcon className="mr-2 h-4 w-4" /> Settings</Link></DropdownMenuItem>}
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <TopNavigation />
          </header>



          <OfflineBanner />
          <main className="flex-1 min-w-0 pb-24 md:pb-0">
            <div key={pageKey} className="page-enter sifobooks-2026-page">
              <Outlet />
            </div>
          </main>
          <SifoMobileNav />
        </div>

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      </div>
  );
}
