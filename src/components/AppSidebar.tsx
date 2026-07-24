import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/sifobooks-logo.png";
import { MODULES, CATEGORY_ORDER, type ModuleCategory } from "@/lib/modules";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";

const LogOut = Icons.LogOut;

function iconFor(name?: string): any {
  if (!name) return Icons.Circle;
  return (Icons as any)[name] ?? (Icons as any)[name.replace("Icon", "")] ?? Icons.Circle;
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

  return (
    <Sidebar collapsible="icon" className="border-r bg-[oklch(0.16_0.02_220)] text-white [&_[data-sidebar=sidebar]]:bg-[oklch(0.16_0.02_220)]">
      <SidebarHeader className="border-b border-white/10 px-4 py-4 bg-[oklch(0.16_0.02_220)]">
        <div className="flex items-center gap-2">
          <img src={logo} alt="SifoBooks" className="h-8 w-8 rounded-md object-contain bg-white/95 p-0.5" width={32} height={32} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-lg font-bold tracking-tight text-emerald-400 leading-none">SifoBooks</div>
              <div className="text-[11px] text-white/60 truncate mt-0.5">{subtitle}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 rounded-md bg-white/5 px-2.5 py-1.5 text-xs font-medium truncate">
            {companyName}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-[oklch(0.16_0.02_220)] px-1">
        {sections.map(section => (
          <SidebarGroup key={section.label}>
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-white/40 px-3 pt-3">{section.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = currentPath === item.url;
                  const baseCls = "text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-300 data-[active=true]:font-semibold";
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} className={baseCls} tooltip={item.title}>
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
        ))}
      </SidebarContent>


      <SidebarFooter className="border-t border-white/10 bg-[oklch(0.16_0.02_220)] p-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-500/20 grid place-items-center text-sm font-semibold text-emerald-300">
            {name.slice(0,1).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{name}</div>
                <div className="text-[11px] text-white/50 truncate">{email}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
