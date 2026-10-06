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
import { SifoBooksLogo } from "@/components/SifoBooksLogo";
import { hubsForMode, visibleHubGroups } from "@/lib/nav-hubs";
import { loadBusinessCapabilityState, getSolution, type BusinessCapabilityKey } from "@/lib/industry-solutions";


import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";
import { staffNav } from "@/lib/rbac";
import { SIFOBOOKS_EDITION, SIFOBOOKS_PRODUCT_NAME } from "@/lib/edition";

const LogOut = Icons.LogOut;
const GraduationCap = Icons.GraduationCap;
const STORAGE_KEY = "sifobooks.sidebar.groups";

/** Every sidebar section inherits a module identity colour. */
const CATEGORY_HUE: Record<string, { dot: string; text: string; soft: string }> = {
  "Core":               { dot: "bg-primary",           text: "text-primary",           soft: "bg-primary/10" },
  "Sales":              { dot: "bg-mod-sales",         text: "text-mod-sales",         soft: "bg-mod-sales/10" },
  "Purchases":          { dot: "bg-mod-purchases",     text: "text-mod-purchases",     soft: "bg-mod-purchases/10" },
  "Finance":            { dot: "bg-mod-accounting",    text: "text-mod-accounting",    soft: "bg-mod-accounting/10" },
  "Inventory":          { dot: "bg-mod-inventory",     text: "text-mod-inventory",     soft: "bg-mod-inventory/10" },
  "HR & Payroll":       { dot: "bg-mod-payroll",       text: "text-mod-payroll",       soft: "bg-mod-payroll/10" },
  "CRM":                { dot: "bg-mod-sales",         text: "text-mod-sales",         soft: "bg-mod-sales/10" },
  "Projects & Service": { dot: "bg-mod-banking",       text: "text-mod-banking",       soft: "bg-mod-banking/10" },
  "Reports":            { dot: "bg-mod-reports",       text: "text-mod-reports",       soft: "bg-mod-reports/10" },
  "School ERP":         { dot: "bg-mod-learning",      text: "text-mod-learning",      soft: "bg-mod-learning/10" },
  "NGO":                { dot: "bg-mod-learning",      text: "text-mod-learning",      soft: "bg-mod-learning/10" },
  "Mining":             { dot: "bg-mod-inventory",     text: "text-mod-inventory",     soft: "bg-mod-inventory/10" },
  "Help & Learning":    { dot: "bg-mod-learning",      text: "text-mod-learning",      soft: "bg-mod-learning/10" },
  "POS":                { dot: "bg-mod-sales",         text: "text-mod-sales",         soft: "bg-mod-sales/10" },
  "Restaurant":         { dot: "bg-mod-inventory",     text: "text-mod-inventory",     soft: "bg-mod-inventory/10" },
  "Administration":     { dot: "bg-mod-admin",         text: "text-mod-admin",         soft: "bg-mod-admin/10" },
  "Platform":           { dot: "bg-destructive",       text: "text-destructive",       soft: "bg-destructive/10" },
  // Workflow hub labels
  "Home":               { dot: "bg-primary",           text: "text-primary",           soft: "bg-primary/10" },
  "People":             { dot: "bg-mod-payroll",       text: "text-mod-payroll",       soft: "bg-mod-payroll/10" },
  "Point of Sale":      { dot: "bg-mod-sales",         text: "text-mod-sales",         soft: "bg-mod-sales/10" },
  "More":               { dot: "bg-mod-admin",         text: "text-mod-admin",         soft: "bg-mod-admin/10" },
  "Company Setup":      { dot: "bg-mod-admin",         text: "text-mod-admin",         soft: "bg-mod-admin/10" },
  "Sales & POS":        { dot: "bg-mod-sales",         text: "text-mod-sales",         soft: "bg-mod-sales/10" },
  "Accounting":         { dot: "bg-mod-accounting",    text: "text-mod-accounting",    soft: "bg-mod-accounting/10" },
  "Banking":            { dot: "bg-mod-banking",       text: "text-mod-banking",       soft: "bg-mod-banking/10" },
  "Tax & Compliance":   { dot: "bg-destructive",       text: "text-destructive",       soft: "bg-destructive/10" },
  "Business Modules":   { dot: "bg-mod-learning",      text: "text-mod-learning",      soft: "bg-mod-learning/10" },
  "Hotel":              { dot: "bg-emerald-600",       text: "text-emerald-700",       soft: "bg-emerald-50" },
  "School ERP":         { dot: "bg-teal-600",           text: "text-teal-700",           soft: "bg-teal-50" },
  "Property":           { dot: "bg-amber-500",          text: "text-amber-700",          soft: "bg-amber-50" },
  "Lending":            { dot: "bg-indigo-600",         text: "text-indigo-700",        soft: "bg-indigo-50" },
  "Restaurant":         { dot: "bg-orange-500",         text: "text-orange-700",        soft: "bg-orange-50" },
  "Boarding House":     { dot: "bg-violet-600",         text: "text-violet-700",        soft: "bg-violet-50" },
  "Butchery":           { dot: "bg-rose-600",           text: "text-rose-700",          soft: "bg-rose-50" },
  "Settings":           { dot: "bg-mod-admin",         text: "text-mod-admin",         soft: "bg-mod-admin/10" },
};

const hueFor = (c: string) => CATEGORY_HUE[c] ?? CATEGORY_HUE["Core"];

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
  const [workspaceMode, setWorkspaceModeState] = useState<string | null>(null);
  const [workspaceIndustry, setWorkspaceIndustry] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [capabilities, setCapabilities] = useState<Record<BusinessCapabilityKey, boolean>>({ inventory: true, retail_pos: false, restaurant: false, hr_payroll: true });

  useEffect(() => { setOpenState(loadOpenState()); }, []);

  const loadWorkspace = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setEmail(u.user.email ?? "");
    const n = (u.user.user_metadata as any)?.full_name ?? (u.user.user_metadata as any)?.name;
    setName(n || (u.user.email ?? "").split("@")[0]);
    const { data: p } = await supabase.from("profiles").select("active_company_id").eq("id", u.user.id).maybeSingle();
    let cid = (p?.active_company_id as string | null) ?? null;
    if (!cid) {
      const { data: cs0 } = await supabase.from("companies").select("id").eq("user_id", u.user.id).order("created_at").limit(1);
      cid = cs0?.[0]?.id ?? null;
    }
    if (!cid) {
      const { data: cm } = await supabase.from("company_members").select("company_id").eq("user_id", u.user.id).order("created_at").limit(1);
      cid = (cm?.[0]?.company_id as string | undefined) ?? null;
    }
    if (cid) {
      const { data: c } = await supabase.from("companies").select("name, trading_name, base_currency, workspace_mode, industry").eq("id", cid).maybeSingle();
      if (c) {
        setCompanyName(c.trading_name || c.name);
        const mode = (c as any).workspace_mode as string | null;
        setWorkspaceModeState(mode);
        const industry = (c as any).industry as string | null;
        setWorkspaceIndustry(industry);
        const { data: moduleRows } = await supabase.from("company_modules").select("module_key").eq("company_id", cid);
        setEnabledModules(new Set((moduleRows ?? []).map((r: any) => String(r.module_key)).filter((k: string) => !k.startsWith("__off__:")));
        const caps = await loadBusinessCapabilityState(cid, industry);
        // Items/Stock are core ERP menus: keep them unless the company has
        // explicitly switched Inventory off (unknown industries used to hide them).
        const { data: off } = await supabase.from("company_modules").select("module_key").eq("company_id", cid).eq("module_key", "__off__:inventory").limit(1);
        caps.inventory = !(off && off.length);
        setCapabilities(caps);
        setSubtitle(`${c.base_currency || "ZMW"} · ${mode === "payroll_only" ? "SifoPayroll" : SIFOBOOKS_EDITION === "enterprise" ? "Accounting ERP" : SIFOBOOKS_PRODUCT_NAME}`);
      }
    }
  };

  useEffect(() => {
    void loadWorkspace();
    const handler = () => { void loadWorkspace(); };
    if (typeof window !== "undefined") window.addEventListener("sifobooks:workspace-changed", handler);
    return () => { if (typeof window !== "undefined") window.removeEventListener("sifobooks:workspace-changed", handler); };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    // Hard reload to clear all in-memory query cache & route context
    window.location.assign("/auth");
  };


  const { installed } = useInstalledModules();
  const { canView, isSuperAdmin, isStaff, access, loading: permsLoading } = usePermissions();

  const sections = useMemo(() => {
    type NavItem = { title: string; url: string; icon: any; module?: string };

    if (permsLoading) return [];

    // Staff navigation remains permission-driven.
    if (isStaff) {
      return staffNav(access).map(g => ({
        label: g.label,
        items: g.items.map(i => ({ title: i.title, url: i.url, icon: iconFor(i.iconName) })),
      }));
    }

    // Build one clean, predictable navigation from the existing route registry.
    // The registry remains the source of truth; this only changes presentation.
    const collected: NavItem[] = [];
    const seen = new Set<string>();

    const activeIndustry = getSolution(workspaceIndustry)?.id ?? null;
    const industryModuleGroups: Record<string, string[]> = {
      hospitality: ["hotel_erp"],
      education: ["school_erp"],
      property: ["property_management"],
      restaurant: ["restaurant"],
      lending: ["loans", "borrowers", "repayments", "portfolio"],
      butchery: ["butchery"],
    };
    const activeIndustryModules = new Set(industryModuleGroups[activeIndustry ?? ""] ?? []);
    const verticalModules = new Set(["hotel_erp", "school_erp", "property_management", "restaurant", "loans", "borrowers", "repayments", "portfolio", "butchery"]);
    const verticalModuleAllowed = (module?: string) => {
      if (!module || !verticalModules.has(module)) return true;
      return activeIndustryModules.has(module) || enabledModules.has(module);
    };

    for (const hub of hubsForMode(workspaceMode, SIFOBOOKS_EDITION)) {
      for (const group of visibleHubGroups(hub, installed, canView)) {
        for (const item of group.items) {
          if ((item as any).superAdminOnly && !isSuperAdmin) continue;
          // Optional industry modules must be explicitly activated or selected by
          // the company's industry. defaultInstalled alone is not enough.
          if (!verticalModuleAllowed(item.module)) continue;

          const capabilityByModule: Record<string, BusinessCapabilityKey | undefined> = {
            inventory: "inventory",
            retail_pos: "retail_pos",
            restaurant: "restaurant",
            hr_payroll: "hr_payroll",
          };
          const cap = capabilityByModule[item.module];
          // Inventory and Retail POS are core operational modules. They must
          // remain visible even when a company is still classified as
          // "general" or has not completed industry setup. Restaurant is also
          // kept discoverable so an installed till cannot disappear from the
          // sidebar because of an incomplete industry profile.
          if (cap && !capabilities[cap] && !["inventory", "retail_pos", "restaurant"].includes(item.module)) continue;

          if (seen.has(item.url)) continue;
          seen.add(item.url);
          collected.push({
            title: item.title,
            url: item.url,
            icon: iconFor(item.iconName),
            module: item.module,
          });
        }
      }
    }

    const byUrl = (patterns: string[], titles: string[] = []) =>
      collected.filter(i =>
        patterns.some(p => i.url === p || i.url.startsWith(p + "/")) ||
        titles.some(t => i.title.toLowerCase() === t.toLowerCase())
      );

    const used = new Set<string>();
    const make = (label: string, items: NavItem[]) => {
      const unique = items.filter(i => {
        if (used.has(i.url)) return false;
        used.add(i.url);
        return true;
      });
      return unique.length ? { label, items: unique } : null;
    };

    // Explicit industry navigation for deep operational routes that are not
    // represented completely by the central module registry.
    const industryRouteGroup: Record<string, string> = {
      hotel: "hotel_erp",
      school: "school_erp",
      property: "property_management",
      lending: "loans",
      restaurant: "restaurant",
      boarding: "school_erp",
      butchery: "butchery",
    };
    const showIndustryRoute = (url: string) => {
      const group =
        url.startsWith("/hotel") ? "hotel" :
        url.startsWith("/school") || url.startsWith("/boarding-") ? "school" :
        url.startsWith("/property") ? "property" :
        url.startsWith("/lending") ? "lending" :
        url.startsWith("/restaurant") ? "restaurant" :
        url.startsWith("/retail/butchery") || url.startsWith("/retail.butchery-") ? "butchery" :
        null;
      if (!group) return false;
      const module = industryRouteGroup[group];
      return activeIndustry === ({hotel_erp:"hospitality",school_erp:"education",property_management:"property",loans:"lending",restaurant:"restaurant",butchery:"butchery"} as Record<string,string>)[module] || enabledModules.has(module);
    };

    const industryItems: Array<[string,string,string]> = [
      ["Hotel Dashboard","/hotel","Hotel"],["Front Desk","/hotel/front-desk","LayoutDashboard"],["Reservations","/hotel/reservations","CalendarCheck"],["Booking Engine","/hotel/booking","CalendarRange"],["Room Rack","/hotel/room-rack","BedDouble"],["Rooms","/hotel/rooms","DoorOpen"],["Rates","/hotel/rates","Tag"],["Channels","/hotel/channels","Globe2"],["Guests","/hotel/guests","Users"],["Pre-arrival","/hotel/pre-arrival","ClipboardCheck"],["Check In / Out","/hotel/check-in-out","DoorOpen"],["Housekeeping","/hotel/housekeeping","Sparkles"],["Folios","/hotel/folios","ReceiptText"],["Payments","/hotel/payments","CreditCard"],["Hotel POS","/hotel/pos","UtensilsCrossed"],["Restaurant","/hotel/restaurant","Utensils"],["Events","/hotel/events","PartyPopper"],["Maintenance","/hotel/maintenance","Wrench"],["Inventory","/hotel/inventory","Boxes"],["Night Audit","/hotel/night-audit","Moon"],["Accounting","/hotel/accounting","Wallet"],["Reports","/hotel/reports","BarChart3"],["Compliance","/hotel/compliance","ShieldCheck"],["Guest Portal","/hotel/guest-portal","ExternalLink"],["Hotel Settings","/hotel/settings","Settings"],
      ["School Dashboard","/school","School"],["Preschool","/school/preschool","Baby"],["Admissions","/school/admissions","UserPlus"],["Students","/school/students","GraduationCap"],["Student Profile","/school/student-profile","UserRound"],["Parents","/school/parents","Users"],["Academics","/school/academics","BookOpen"],["Timetable","/school/timetable","CalendarDays"],["Attendance","/school/attendance","ClipboardCheck"],["Exams","/school/exams","FileQuestion"],["Report Cards","/school/report-cards","FileText"],["Fees & Billing","/school/fees-billing","Receipt"],["Fees","/school/fees","BadgeDollarSign"],["Payments","/school/payments","CreditCard"],["Scholarships","/school/scholarships","Award"],["Boarding","/school/boarding","BedDouble"],["Transport","/school/transport","Bus"],["Library","/school/library","Library"],["Meals","/school/meals","Utensils"],["Discipline","/school/discipline","ShieldAlert"],["Health","/school/health","HeartPulse"],["Communications","/school/communications","MessageSquare"],["Staff","/school/staff","UsersRound"],["Parent Portal","/school/parent-portal","ExternalLink"],["Student Portal","/school/student-portal","ExternalLink"],["School Reports","/school/reports","BarChart3"],["Compliance","/school/compliance","ShieldCheck"],["School Settings","/school/settings","Settings"],
      ["Property Dashboard","/property","Building2"],["Tenants","/property/tenants","Users"],["Leases","/property/leases","FileText"],["Collections","/property/collections","Wallet"],["Maintenance","/property/maintenance","Wrench"],["Property Reports","/property/reports","BarChart3"],
      ["Lending Dashboard","/lending","Landmark"],["Borrowers","/lending/borrowers","Users"],["Applications","/lending/applications","FileText"],["Credit Assessment","/lending/credit-assessment","ShieldCheck"],["Loan Products","/lending/products","Package"],["Portfolio","/lending/portfolio","PieChart"],["Disbursements","/lending/disbursements","Send"],["Repayments","/lending/repayments","CreditCard"],["Collections","/lending/collections","Wallet"],["Field Collections","/lending/field-collections","MapPin"],["Arrears","/lending/arrears","AlertTriangle"],["Promises","/lending/promises","Handshake"],["Guarantors","/lending/guarantors","UsersRound"],["Collateral","/lending/collateral","LockKeyhole"],["Group Lending","/lending/group-lending","Users"],["Savings","/lending/savings","PiggyBank"],["Investors","/lending/investors","Landmark"],["Mobile Money","/lending/mobile-money","Smartphone"],["Restructuring","/lending/restructuring","RefreshCw"],["Write-offs","/lending/writeoffs","Archive"],["Risk & Fraud","/lending/risk-fraud","ShieldAlert"],["Communications","/lending/communications","MessageSquare"],["Documents","/lending/documents","FileText"],["Customer Portal","/lending/customer-portal","ExternalLink"],["Investor Portal","/lending/investor-portal","ExternalLink"],["Lending Accounting","/lending/accounting","BookOpen"],["Lending Reports","/lending/reports","BarChart3"],["Lending Compliance","/lending/compliance","ShieldCheck"],["Branches","/lending/branches","GitBranch"],["Lending Settings","/lending/settings","Settings"],
      ["Boarding House Dashboard","/boarding-house","Home"],["Boarding Houses","/boarding-houses","Building2"],["Boarding Rooms","/boarding-rooms","BedDouble"],["Boarding Students","/boarding-students","GraduationCap"],["Boarding Fees","/boarding-fees","Wallet"],["Boarding Attendance","/boarding-attendance","CalendarCheck"],["Boarding Leave","/boarding-leave","LogOut"],["Boarding Maintenance","/boarding-maintenance","Wrench"],["Boarding Discipline","/boarding-discipline","ShieldAlert"],["Boarding Visitors","/boarding-visitors","Users"],["Boarding Meals","/boarding-meals","Utensils"],["Boarding Reports","/boarding-reports","FileBarChart"],      ["Restaurant","/restaurant","Utensils"],["Restaurant Onboarding","/restaurant/onboarding","Rocket"],["Registers","/restaurant/registers","Monitor"],["Restaurant POS","/restaurant/pos","ShoppingBag"],["Orders","/restaurant/orders","ClipboardList"],
      ["Butchery Dashboard","/retail/butchery","Beef"],["Butchery POS","/retail/butchery-pos","ShoppingBag"],["Products & Cuts","/retail.butchery-products","Beef"],["Receiving","/retail.butchery-receiving","PackagePlus"],["Processing & Yield","/retail.butchery-processing","Scissors"],["Scale","/retail.butchery-scale","Scale"],["Labels","/retail.butchery-labels","Tags"],["Prices","/retail.butchery-prices","Tag"],["Inventory","/retail.butchery-inventory","Boxes"],["Sales","/retail.butchery-sales","Receipt"],["Reports","/retail.butchery-reports","BarChart3"],["Invoice","/retail.butchery-invoice","FileText"],
    ];
    for (const [title,url,icon] of industryItems) {
      if (!showIndustryRoute(url)) continue;
      if (!seen.has(url)) {
        seen.add(url);
        collected.push({title,url,icon:iconFor(icon)});
      }
    }

    const groups = [
      make("Home", byUrl(["/dashboard", "/approvals", "/notifications", "/industry"])),
      make("Company Setup", byUrl(
        ["/setup", "/warehouses", "/roles", "/admin", "/documents-branding", "/audit-logs"],
        ["Company Setup", "Branches & Warehouses", "Users & Roles", "Administration", "Documents & Branding", "Audit Logs"]
      )),
      make("Sales & POS", byUrl(
        ["/pos", "/pos-sales", "/invoices", "/quotes", "/customers", "/receipts", "/credit-notes", "/returns"],
        ["Retail POS", "POS Sales History", "Invoices", "Quotes", "Customers", "Receive Payments", "Credit Notes", "Returns"]
      )),
      make("Purchases", byUrl(
        ["/bills", "/purchase-orders", "/suppliers", "/expenses", "/bill-payments", "/goods-receipts", "/quotation-comparison", "/expense-rules"],
        ["Bills", "Purchase Orders", "Suppliers", "Expenses", "Supplier Payments", "Goods Receipts"]
      )),
      make("Inventory", byUrl(
        ["/inventory", "/stock", "/inventory/transfers", "/stock-counts", "/inventory/reconciliation", "/inventory-control-centre", "/inventory/stock-card", "/stock-adjustments", "/inventory/locations", "/stock-batches", "/stock-serials", "/inventory/production", "/inventory/cashier-records", "/inventory-sheets"],
        ["Items", "Items & Stock", "Transfers", "Stock Counts", "Control Center", "Stock Card / History", "Stock Adjustments", "Locations", "Warehouses", "Batches & Expiry", "Serial Numbers"]
      )),
      make("Accounting", byUrl(
        ["/chart-of-accounts", "/journal-entries", "/opening-balances", "/period-close", "/fixed-assets", "/budgets", "/fx-rates", "/posting-wizard"],
        ["Chart of Accounts", "Journal Entries", "Opening Balances", "Period Close", "Fixed Assets", "Budgets", "Exchange Rates", "Smart Posting Wizard"]
      )),
      make("Banking", byUrl(
        ["/banking", "/bank-accounts", "/bank-rules", "/reconciliation", "/reconciliation-sessions", "/cashbook"],
        ["Banking", "Bank Accounts", "Bank Rules", "Recon Sessions", "Cashbook", "Reconciliation"]
      )),
      make("Payroll", byUrl(
        ["/payroll", "/employees", "/attendance", "/timesheet", "/payroll-dashboard", "/payroll-review", "/payroll-payments", "/payroll-statutory", "/payroll-rules", "/payroll-setup", "/payroll-transactions", "/payroll-tools", "/leave", "/jobs", "/hr-compliance", "/hr360"],
        ["Payroll", "Employees", "Attendance", "Timesheet", "Leave", "Jobs & Recruitment"]
      )),
      make("Tax & Compliance", byUrl(
        ["/compliance", "/compliance-centre", "/zra-smart-invoice", "/reports/vat-return", "/reports/income-tax", "/reports/turnover-tax"],
        ["Compliance", "Government Compliance", "ZRA Smart Invoice", "ZRA Item Mapping", "Submission Queue", "Audit Trail"]
      )),
      make("Reports", byUrl(
        ["/reports"],
        ["Reports Centre", "Trial Balance", "Annual Financial Statements", "Customer Statement", "Supplier Statement", "Inventory Flow & Audit"]
      )),
      make("Hotel", byUrl(["/hotel"])),
      make("School ERP", byUrl(["/school"])),
      make("Property", byUrl(["/property"])),
      make("Lending", byUrl(["/lending"])),
      make("Restaurant", byUrl(["/restaurant"])),
      make("Boarding House", byUrl(["/boarding-house", "/boarding-houses", "/boarding-rooms", "/boarding-students", "/boarding-fees", "/boarding-attendance", "/boarding-leave", "/boarding-maintenance", "/boarding-discipline", "/boarding-visitors", "/boarding-meals", "/boarding-reports"])),
      make("Butchery", byUrl(["/retail/butchery", "/retail/butchery-pos", "/retail.butchery-"])),
      make("Settings", byUrl(
        ["/modules", "/subscription", "/learn"],
        ["Settings", "Modules", "Subscription", "Learn Centre", "New Company Setup", "Accounting Basics"]
      )),
    ];

    return groups.filter(Boolean) as { label: string; items: NavItem[] }[];
  }, [installed, canView, isSuperAdmin, isStaff, access, permsLoading, workspaceMode, workspaceIndustry, enabledModules, capabilities]);


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
      className="border-r border-[#DDEBE6] bg-[#F7FBF9] text-[#173B3A] shadow-[4px_0_24px_rgba(23,59,58,.035)] [&_[data-sidebar=sidebar]]:bg-[#F7FBF9] [&_[data-sidebar=sidebar]]:w-[278px]"
    >
      <SidebarHeader className="border-b border-[#E3EEE9] bg-gradient-to-b from-white via-[#FAFCFB] to-[#F2F9F6] px-3 py-3">
        <SifoBooksLogo showWordmark={!collapsed} className="w-full" markClassName="h-9 w-9" />
        {!collapsed && <div className="mt-1 px-0.5 text-[10px] text-muted-foreground truncate">{subtitle}</div>}
        {!collapsed && (
          <div className="mt-3 rounded-2xl border border-[#DDEBE6] bg-white px-3 py-2.5 text-xs font-semibold text-[#173B3A] shadow-[0_4px_16px_rgba(23,59,58,.045)] truncate">
            {companyName}
            {isStaff && access?.role_name && (
              <div className="text-[10px] font-medium text-muted-foreground truncate">
                {access.role_name}{access.branch_name ? ` · ${access.branch_name}` : ""}
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-[#F7FBF9] px-2 py-1 [&_[data-sidebar=content]]:bg-[#F7FBF9] scrollbar-thin">
        {sections.map(section => {
          const open = isOpen(section.label);
          if (collapsed) {
            // In collapsed mode, don't use Collapsible — just render items with tooltips
            return (
              <SidebarGroup key={section.label} className="py-1.5">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const active = currentPath === item.url || currentPath.startsWith(item.url + "/");
                      const hue = hueFor(section.label);
                      return (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            className="mx-1 my-0.5 min-h-10 rounded-xl text-[#526B65] transition-all duration-200 hover:bg-white hover:text-[#07834F] data-[active=true]:bg-white data-[active=true]:font-bold data-[active=true]:text-[#07834F] data-[active=true]:shadow-[0_4px_14px_rgba(7,131,79,.07)]"
                            tooltip={item.title}
                          >
                            <button
                              type="button"
                              onClick={() => navigate({ to: item.url as never })}
                              className="flex w-full items-center gap-2"
                            >
                              <Icon className="h-[17px] w-[17px] shrink-0 stroke-[1.8]" />
                              <span>{item.title}</span>
                            </button>
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
                  <SidebarGroupLabel className="group/label mx-1 flex items-center justify-between rounded-lg px-2.5 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.12em] text-[#718A84] font-extrabold cursor-pointer hover:text-[#07834F] transition-colors select-none">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${hueFor(section.label).dot}`} />
                      {section.label}
                    </span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map(item => {
                        const Icon = item.icon;
                        const active = currentPath === item.url || currentPath.startsWith(item.url + "/");
                        const hue = hueFor(section.label);
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton
                              asChild
                              isActive={active}
                              className={`group relative mx-1 my-0.5 min-h-10 rounded-xl text-[#526B65] transition-all duration-200 hover:translate-x-0.5 hover:bg-white hover:text-[#07834F] hover:shadow-[0_3px_12px_rgba(23,59,58,.045)] data-[active=true]:font-bold data-[active=true]:bg-white data-[active=true]:text-[#07834F] data-[active=true]:shadow-[0_4px_14px_rgba(7,131,79,.07)] data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-2 data-[active=true]:before:bottom-2 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-[#07834F]`}
                              tooltip={item.title}
                            >
                              <button
                                type="button"
                                onClick={() => navigate({ to: item.url as never })}
                                className="flex w-full items-center gap-2"
                              >
                                <Icon className="h-[17px] w-[17px] shrink-0 stroke-[1.8]" />
                                <span>{item.title}</span>
                              </button>
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

      <SidebarFooter className="border-t border-[#E3EEE9] bg-white/80 p-2.5 space-y-2 backdrop-blur-sm">
        <Link
          to="/learn"
          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
            currentPath.startsWith("/learn")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title="Learn Centre"
        >
          <GraduationCap className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Learn Centre</span>}
        </Link>
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
