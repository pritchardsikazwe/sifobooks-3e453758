import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Menu, LayoutGrid, BarChart3, ShoppingBag, Archive, FileText, Settings, LifeBuoy,
  ChevronDown, Box, Layers, Warehouse, LogOut, Landmark, ShieldCheck, Package, Receipt,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Item = { label: string; to?: string; icon?: any; soon?: boolean };
type Group = { label: string; icon: any; items: Item[] };

const groups: (Group | Item)[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutGrid },
  {
    label: "Sales", icon: BarChart3, items: [
      { label: "Invoices", to: "/dashboard", icon: FileText },
      { label: "Compliance", to: "/compliance", icon: ShieldCheck },
      { label: "Quotes", soon: true },
      { label: "Customers", soon: true },
      { label: "Receipts", icon: Receipt, soon: true },
    ],
  },
  {
    label: "Purchases", icon: ShoppingBag, items: [
      { label: "Purchase Order", soon: true },
      { label: "Suppliers", soon: true },
      { label: "Suppliers Invoices", soon: true },
      { label: "Goods Receipts", soon: true },
      { label: "Payments", to: "/banking", icon: Landmark },
    ],
  },
  {
    label: "Inventory", icon: Archive, items: [
      { label: "Item/Service", to: "/stock", icon: Box },
      { label: "Lot/Batch Tracking", icon: Layers, soon: true },
      { label: "Warehouse", icon: Warehouse, soon: true },
    ],
  },
  { label: "Reports", to: "/dashboard", icon: FileText, soon: true },
  { label: "Admin", to: "/compliance", icon: Settings },
  { label: "Help & Support", icon: LifeBuoy, soon: true },
];

export function AppNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Menu className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] p-0 flex flex-col">
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarBody({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-orange-400" />
          <div className="text-lg font-bold tracking-tight">
            <span className="text-primary">Edge</span><span className="text-orange-500">Core</span>
          </div>
        </div>
        <div className="mt-4 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
          Sifonet Technologies LTD
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {groups.map((entry) =>
          "items" in entry ? (
            <GroupNode key={entry.label} group={entry} onNavigate={onNavigate} />
          ) : (
            <LeafNode key={entry.label} item={entry} onNavigate={onNavigate} />
          )
        )}
      </nav>

      <UserFooter />
    </div>
  );
}

function LeafNode({ item, onNavigate, indent }: { item: Item; onNavigate: () => void; indent?: boolean }) {
  const Icon = item.icon;
  const base = `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${indent ? "pl-11" : ""}`;
  const handleSoon = () => { toast.info(`${item.label} — coming soon`); onNavigate(); };

  if (item.to && !item.soon) {
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        activeProps={{ className: "bg-primary/10 text-primary" }}
        className={`${base} text-foreground hover:bg-muted`}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span>{item.label}</span>
      </Link>
    );
  }
  return (
    <button onClick={handleSoon} className={`${base} w-full text-left text-muted-foreground hover:bg-muted hover:text-foreground`}>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{item.label}</span>
    </button>
  );
}

function GroupNode({ group, onNavigate }: { group: Group; onNavigate: () => void }) {
  const Icon = group.icon;
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5 space-y-0.5">
        {group.items.map((it) => (
          <LeafNode key={it.label} item={it} onNavigate={onNavigate} indent />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function UserFooter() {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("Account");

  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setEmail(u.email ?? "");
        const n = (u.user_metadata as any)?.full_name ?? (u.user_metadata as any)?.name;
        setName(n || (u.email ?? "").split("@")[0]);
      }
    });
    return undefined as unknown as ReactNode;
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="border-t px-4 py-3 flex items-center gap-3">
      <div className="relative">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{name}</div>
        <div className="text-xs text-muted-foreground truncate">{email}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
