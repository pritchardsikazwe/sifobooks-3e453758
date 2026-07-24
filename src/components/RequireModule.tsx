import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { getModule } from "@/lib/modules";

export function RequireModule({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const { installed, loading } = useInstalledModules();
  if (loading) return null;
  if (installed.has(moduleKey)) return <>{children}</>;

  const m = getModule(moduleKey);
  return (
    <div className="max-w-lg mx-auto mt-16 p-8 border rounded-xl bg-card text-center">
      <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <h2 className="text-xl font-semibold">{m?.label ?? "Module"} is not installed</h2>
      <p className="text-sm text-muted-foreground mt-2">
        {m?.description ?? "Install this module to access these features."}
      </p>
      <Button asChild className="mt-4">
        <Link to="/modules">Go to Modules</Link>
      </Button>
    </div>
  );
}
