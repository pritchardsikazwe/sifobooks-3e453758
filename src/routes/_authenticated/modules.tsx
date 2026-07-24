import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Check, PackageOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { MODULES, CATEGORY_ORDER, type ModuleDef } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/modules")({
  head: () => ({ meta: [
    { title: "Modules — SifoBooks" },
    { name: "description", content: "Install or uninstall SifoBooks modules for this company." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ModulesPage,
});

function ModulesPage() {
  const { installed, companyId, refresh, loading } = useInstalledModules();
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (m: ModuleDef) => {
    if (m.core) return;
    if (!companyId) { toast.error("No company found"); return; }
    setBusy(m.key);
    try {
      const isOn = installed.has(m.key);
      if (isOn) {
        // Uninstall: delete company_modules row. If defaultInstalled, we can't hide it without a suppression flag.
        // For now, defaultInstalled modules can be re-hidden by inserting an "off" flag in config.
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");
        // Delete any existing on-row
        await supabase.from("company_modules")
          .delete().eq("company_id", companyId).eq("module_key", m.key);
        // If default-on, mark suppressed
        if (m.defaultInstalled) {
          await supabase.from("company_modules").insert({
            user_id: u.user.id, company_id: companyId,
            module_key: `__off__:${m.key}`, config: {},
          });
        }
        toast.success(`${m.label} uninstalled`);
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");
        // Remove suppression flag if present
        await supabase.from("company_modules")
          .delete().eq("company_id", companyId).eq("module_key", `__off__:${m.key}`);
        await supabase.from("company_modules").upsert({
          user_id: u.user.id, company_id: companyId,
          module_key: m.key, config: {},
        }, { onConflict: "company_id,module_key" });
        toast.success(`${m.label} installed`);
      }
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const byCat = CATEGORY_ORDER.map(cat => ({
    cat, mods: MODULES.filter(m => m.category === cat),
  })).filter(g => g.mods.length > 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Modules</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Turn features on or off for this company. Uninstalled modules are hidden from the sidebar.
        </p>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {byCat.map(g => (
        <section key={g.cat}>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{g.cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.mods.map(m => {
              const on = installed.has(m.key);
              const isBusy = busy === m.key;
              return (
                <div key={m.key}
                  className={`p-4 rounded-lg border bg-card ${on ? "ring-1 ring-emerald-500/40" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">{m.label}</div>
                        {m.core && <span className="text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded">core</span>}
                        {on && !m.core && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                      <div className="text-[11px] text-muted-foreground mt-2">
                        {m.routes.length} page{m.routes.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {m.core ? (
                        <span className="text-xs text-muted-foreground">Always on</span>
                      ) : (
                        <Button
                          size="sm"
                          variant={on ? "outline" : "default"}
                          onClick={() => toggle(m)}
                          disabled={isBusy}
                        >
                          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : on ? "Uninstall" : "Install"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
