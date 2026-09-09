import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";
import { getHub, visibleHubGroups, type HubItem } from "@/lib/nav-hubs";
import { cn } from "@/lib/utils";

/**
 * Compact tab strip for a workspace hub (Inventory, Finance, …).
 *
 * Every tab is an existing route — this only changes how the routes are
 * reached, never what they do. Items the user cannot see are filtered out
 * by module install state and permissions, exactly as the sidebar does.
 */
export function SifoHubTabs({ hub: hubKey, active }: { hub: string; active?: string }) {
  const hub = getHub(hubKey);
  const { installed } = useInstalledModules();
  const { canView } = usePermissions();
  if (!hub) return null;

  const groups = visibleHubGroups(hub, installed, canView);
  const primary: HubItem[] = groups.flatMap((g) => g.items).filter((i) => i.primary);
  if (primary.length === 0) return null;

  return (
    <nav
      aria-label={`${hub.label} sections`}
      className="-mx-1 flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card/60 p-1"
    >
      {primary.map((item) => {
        const Icon = ((item.iconName && (Icons as any)[item.iconName]) || Icons.Circle) as any;
        const isActive = active === item.url;
        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.title}
          </Link>
        );
      })}
      <Link
        to="/hub/$hub"
        params={{ hub: hub.key }}
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Icons.MoreHorizontal className="h-3.5 w-3.5" />
        More
      </Link>
    </nav>
  );
}
