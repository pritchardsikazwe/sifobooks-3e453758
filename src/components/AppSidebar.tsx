import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home, Users, FileText, ReceiptText, CreditCard, Undo2,
  Truck, ShoppingCart, FileBox, Wallet,
  Landmark, BookOpen, BookText, PiggyBank,
  Boxes, BarChart3, ShieldCheck, Warehouse, ClipboardEdit,
  UserSquare, CalendarCheck, CalendarDays, Banknote,
  Settings, UserCog, Building2, Bell, LogOut, Sparkles, ShieldAlert, Inbox,
  UserPlus, Target, Megaphone, MessageSquareWarning, Star,
  Briefcase, ListChecks, Clock, LifeBuoy, Wrench, CalendarClock, Scale, Tags,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Item = { title: string; url?: string; icon: any };
type Section = { label: string; items: Item[] };

const sections: Section[] = [
  { label: "Home", items: [
    { title: "Summary", url: "/dashboard", icon: Home },
  ]},
  { label: "Sales", items: [
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Quotes", url: "/quotes", icon: FileText },
    { title: "Sales Invoices", url: "/invoices", icon: ReceiptText },
    { title: "Credit Notes", url: "/credit-notes", icon: Undo2 },
    { title: "Receive Payments", url: "/receipts", icon: CreditCard },
  ]},
  { label: "Purchases", items: [
    { title: "Suppliers", url: "/suppliers", icon: Truck },
    { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart },
    { title: "Bills", url: "/bills", icon: FileBox },
    { title: "Supplier Payments", url: "/bill-payments", icon: Wallet },
    { title: "Expense Categories", url: "/expense-rules", icon: Tags },
  ]},
  { label: "Finance", items: [
    { title: "Banking", url: "/banking", icon: Landmark },
    { title: "Reconciliation", url: "/reconciliation", icon: Scale },
    { title: "Chart of Accounts", url: "/chart-of-accounts", icon: BookOpen },
    { title: "Journal Entries", url: "/journal-entries", icon: BookText },
    { title: "Budgets", url: "/budgets", icon: PiggyBank },
    { title: "Period Close", url: "/period-close", icon: CalendarClock },
  ]},
  { label: "Inventory", items: [
    { title: "Items", url: "/stock", icon: Boxes },
    { title: "Warehouses", url: "/warehouses", icon: Warehouse },
    { title: "Stock Adjustments", url: "/stock-adjustments", icon: ClipboardEdit },
  ]},
  { label: "HR & Payroll", items: [
    { title: "Employees", url: "/employees", icon: UserSquare },
    { title: "Attendance", url: "/attendance", icon: CalendarCheck },
    { title: "Leave", url: "/leave", icon: CalendarDays },
    { title: "Payroll", url: "/payroll", icon: Banknote },
  ]},
  { label: "CRM", items: [
    { title: "Leads", url: "/leads", icon: UserPlus },
    { title: "Opportunities", url: "/opportunities", icon: Target },
    { title: "Campaigns", url: "/campaigns", icon: Megaphone },
    { title: "Complaints", url: "/complaints", icon: MessageSquareWarning },
    { title: "CSAT", url: "/csat", icon: Star },
  ]},
  { label: "Projects & Service", items: [
    { title: "Projects", url: "/projects", icon: Briefcase },
    { title: "Project Tasks", url: "/project-tasks", icon: ListChecks },
    { title: "Time Entries", url: "/time-entries", icon: Clock },
    { title: "Service Tickets", url: "/service-tickets", icon: LifeBuoy },
    { title: "Job Cards", url: "/job-cards", icon: Wrench },
  ]},
  { label: "Reports", items: [
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Compliance", url: "/compliance", icon: ShieldCheck },
  ]},
  { label: "Admin", items: [
    { title: "Admin Home", url: "/admin", icon: UserCog },
    { title: "Approvals", url: "/approvals", icon: Inbox },
    { title: "Super Admin", url: "/super-admin", icon: ShieldAlert },
    { title: "Company Setup", url: "/setup", icon: Building2 },
    { title: "Subscription", url: "/subscription", icon: Sparkles },
    { title: "Audit Logs", url: "/audit-logs", icon: ShieldCheck },
    { title: "Notifications", url: "/notifications", icon: Bell },
    { title: "Settings", url: "/setup", icon: Settings },
  ]},
];

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

  const soon = (t: string) => toast.info(`${t} — coming soon`);

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
                  const active = item.url && currentPath === item.url;
                  const baseCls = "text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-300 data-[active=true]:font-semibold";
                  if (item.url) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={!!active} className={baseCls} tooltip={item.title}>
                          <Link to={item.url}>
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton onClick={() => soon(item.title)} className={`${baseCls} text-white/50`} tooltip={item.title}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
