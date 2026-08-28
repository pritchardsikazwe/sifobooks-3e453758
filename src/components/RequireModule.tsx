import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PackageOpen, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";
import { getModule } from "@/lib/modules";

export function RequireModule({
  moduleKey,
  requireManage,
  children,
}: {
  moduleKey: string;
  /** If true, also require manage permission (edit/create). */
  requireManage?: boolean;
  children: ReactNode;
}) {
  const { installed, loading: instLoading } = useInstalledModules();
  const { canView, canManage, loading: permLoading } = usePermissions();
  if (instLoading || permLoading) return null;

  const m = getModule(moduleKey);

  if (!installed.has(moduleKey)) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 border rounded-xl bg-card text-center">
        <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-xl font-semibold">{m?.label ?? "Module"} is not enabled</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {m?.description ?? "Enable this area from Industry & Business to access these features."}
        </p>
        <Button asChild className="mt-4">
          <Link to="/industry">Industry & Business</Link>
        </Button>
      </div>
    );
  }

  const allowed = requireManage ? canManage(moduleKey) : canView(moduleKey);
  if (!allowed) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 border rounded-xl bg-card text-center">
        <ShieldOff className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-xl font-semibold">You don't have access to {m?.label ?? "this module"}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Ask an administrator to grant your role {requireManage ? "manage" : "view"} permission
          for this module.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/roles">Manage roles</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
