import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { ChevronDown } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/sifobooks-logo.png";
import { MODULES, CATEGORY_ORDER, type ModuleCategory } from "@/lib/modules";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";

const LogOut = Icons.LogOut;
const STORAGE_KEY = "sifobooks.sidebar.groups";

function iconFor(name?: string): any {
  if (!name) return Icons.Circle;
  return (Icons as any)[name] ?? (Icons as any)[name.replace("Icon", "")] ?? Icons.Circle;
}

function loadOpenState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: r => r.location.pathname });
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Your Company");
  const [subtitle, setSubtitle] = useState("Accounting ERP");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("Account");
  const [openState, setOpenState] = useState<Record<string, boolean>>({});

  useEffect(() => { setOpenState(loadOpenState()); }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const n = (u.user.user_metadata as any)?.full_name ?? (u.user.user_metadata as any)?.name;
      setName(n || (u.user.email ?? "").split("@")[0]);
      const { data: c } = await supabase.from("companies").select("name, trading_name, base_currency").eq("user_id", u.user.id).maybeSingle();
      if (c) {
        setCompanyName(c.trading_name || c.name);
        setSubtitle(`${c.base_currency || "ZMW"} · Accounting ERP`);
      }
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const { installed } = useInstalledModules();
  const { canView } = usePermissions();

  const sections = useMemo(() => {
    const groups: { label: ModuleCategory; items: { title: string; url: string; icon: any }[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items: { title: string; url: string; icon: any }[] = [];
      for (const m of MODULES) {
        if (m.category !== cat) continue;
        if (!installed.has(m.key)) continue;
        if (!canView(m.key)) continue;
        for (const r of m.routes) items.push({ title: r.title, url: r.url, icon: iconFor(r.iconName) });
      }
      if (items.length > 0) groups.push({ label: cat, items });
    }
    return groups;
  }, [installed, canView]);

  const isOpen = (label: string) => {
    // Default: open if it contains the active route, otherwise open unless user closed it
    if (openState[label] !== undefined) return openState[label];
    return sections.find(s => s.label === label)?.items.some(i => currentPath === i.url || currentPath.startsWith(i.url + "/")) ?? true;
  };

  const toggle = (label: string) => {
    const next = { ...openState, [label]: !isOpen(label) };
    setOpenState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-card text-card-foreground [&_[data-sidebar=sidebar]]:bg-card"
    >
      <SidebarHeader className="border-b border-border px-3 py-3 bg-card">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="SifoBooks" className="h-9 w-9 rounded-lg object-contain bg-primary/10 p-1 ring-1 ring-primary/15" width={36} height={36} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-primary leading-none">SifoBooks</div>
              <div className="text-[10px] text-muted-foreground truncate mt-1">{subtitle}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-semibold text-foreground truncate">
            {companyName}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-card px-1 [&_[data-sidebar=content]]:bg-card">
        {sections.map(section => {
          const open = isOpen(section.label);
          if (collapsed) {
            // In collapsed mode, don't use Collapsible — just render items with tooltips
            return (
              <SidebarGroup key={section.label} className="py-1">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const active = currentPath === item.url;
                      return (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
                            tooltip={item.title}
                          >
                            <Link to={item.url}>
                              <Icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }
          return (
            <Collapsible key={section.label} open={open} onOpenChange={() => toggle(section.label)}>
              <SidebarGroup className="py-1">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="group/label flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground px-3 pt-2 pb-1 font-semibold cursor-pointer hover:text-foreground transition-colors select-none">
                    <span>{section.label}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map(item => {
                        const Icon = item.icon;
                        const active = currentPath === item.url;
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton
                              asChild
                              isActive={active}
                              className="relative text-muted-foreground hover:bg-muted hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-0.5 data-[active=true]:before:bg-primary data-[active=true]:before:rounded-r"
                              tooltip={item.title}
                            >
                              <Link to={item.url}>
                                <Icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-card p-2.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 grid place-items-center text-xs font-bold text-primary">
            {name.slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{email}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
