import { Link } from "@tanstack/react-router";
import {
  Calculator, ReceiptText, ShoppingCart, Boxes, Landmark, Users, ShieldCheck, BarChart3,
} from "lucide-react";
import { MODULE_THEMES, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

const ORDER: ModuleKey[] = ["accounting", "sales", "purchases", "inventory", "banking", "payroll", "reports", "tax"];

const ICONS: Partial<Record<ModuleKey, any>> = {
  accounting: Calculator, sales: ReceiptText, purchases: ShoppingCart, inventory: Boxes,
  banking: Landmark, payroll: Users, reports: BarChart3, tax: ShieldCheck,
};

/**
 * Horizontal, colour-coded module navigation shown under the page header.
 * Pill design, scrolls horizontally on small screens, each entry carries its hue.
 */
export function SifoModuleStrip({ active, className }: { active?: ModuleKey; className?: string }) {
  return (
    <div className={cn("-mx-1 overflow-x-auto no-scrollbar", className)}>
      <div className="flex min-w-max items-center gap-2 px-1 py-1">
        {ORDER.map(key => {
          const m = MODULE_THEMES[key];
          const Icon = ICONS[key];
          const isActive = active === key;
          return (
            <Link
              key={key}
              to={m.to}
              className={cn(
                "group relative flex min-h-[42px] items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5",
                isActive
                  ? cn(m.soft, m.border, m.text, "shadow-sm")
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:shadow-sm",
                m.hoverBorder,
              )}
            >
              {Icon
                ? <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? m.text : "opacity-70")} />
                : <span className={cn("h-2 w-2 rounded-full", m.bar)} />}
              {m.label}
              {isActive && <span className={cn("absolute inset-x-4 -bottom-px h-[2px] rounded-full", m.bar)} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
