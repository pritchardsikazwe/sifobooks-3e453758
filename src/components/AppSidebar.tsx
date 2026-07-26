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
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200 bg-white text-slate-700 [&_[data-sidebar=sidebar]]:bg-white"
    >
      <SidebarHeader className="border-b border-slate-200 px-3 py-3 bg-white">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="SifoBooks" className="h-9 w-9 rounded-lg object-contain bg-emerald-50 p-1 ring-1 ring-emerald-100" width={36} height={36} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-emerald-700 leading-none">SifoBooks</div>
              <div className="text-[10px] text-slate-500 truncate mt-1">{subtitle}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 truncate">
            {companyName}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-white px-1 [&_[data-sidebar=content]]:bg-white">
        {sections.map(section => (
          <SidebarGroup key={section.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-slate-400 px-3 pt-2 pb-1 font-semibold">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = currentPath === item.url;
                  const cls = "relative text-slate-600 hover:bg-slate-100 hover:text-slate-900 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700 data-[active=true]:font-semibold data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-0.5 data-[active=true]:before:bg-emerald-600 data-[active=true]:before:rounded-r";
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} className={cls} tooltip={item.title}>
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

      <SidebarFooter className="border-t border-slate-200 bg-white p-2.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-100 grid place-items-center text-xs font-bold text-emerald-700">
            {name.slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">{name}</div>
                <div className="text-[10px] text-slate-500 truncate">{email}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-8 w-8" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
