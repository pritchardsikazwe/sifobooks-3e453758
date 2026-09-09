import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SifoWorkspaceShell } from "@/components/sifo/SifoWorkspaceShell";
import { SifoNextActionPanel } from "@/components/sifo/SifoNextActionPanel";
import { getHub, visibleHubGroups, type HubItem } from "@/lib/nav-hubs";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";
import { buildWorkQueue, loadWorkSnapshot, type WorkTask } from "@/lib/workflow-engine";

export const Route = createFileRoute("/_authenticated/hub/$hub")({
  head: () => ({ meta: [{ title: "Workspace — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: HubWorkspace,
});

function iconFor(name?: string) {
  return (name && (Icons as any)[name]) || Icons.Circle;
}

function HubWorkspace() {
  const { hub: hubKey } = Route.useParams();
  const hub = getHub(hubKey);
  const { installed } = useInstalledModules();
  const { canView } = usePermissions();
  const [q, setQ] = useState("");
  const [tasks, setTasks] = useState<WorkTask[]>([]);

  useEffect(() => {
    let alive = true;
    loadWorkSnapshot()
      .then((s) => { if (alive) setTasks(buildWorkQueue(s)); })
      .catch(() => { /* guidance is best-effort */ });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    if (!hub) return [];
    const visible = visibleHubGroups(hub, installed, canView);
    if (!q.trim()) return visible;
    const needle = q.trim().toLowerCase();
    return visible
      .map((g) => ({ label: g.label, items: g.items.filter((i) => i.title.toLowerCase().includes(needle) || (i.hint ?? "").toLowerCase().includes(needle)) }))
      .filter((g) => g.items.length > 0);
  }, [hub, installed, canView, q]);

  if (!hub) throw notFound();

  const HubIcon = iconFor(hub.iconName);
  const relevant = tasks.filter((t) => t.actionUrl.includes(hubKey) || hubKey === "home").slice(0, 3);

  return (
    <SifoWorkspaceShell
      title={hub.label}
      purpose={hub.purpose}
      icon={HubIcon}
      breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: hub.label }]}
      actions={
        <div className="relative w-full sm:w-64">
          <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${hub.label.toLowerCase()}…`} className="pl-8" />
        </div>
      }
    >
      <SifoNextActionPanel
        tasks={relevant.length ? relevant : tasks.slice(0, 3)}
        emptyText={`Nothing outstanding in ${hub.label.toLowerCase()} right now.`}
      />

      {groups.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Nothing here matches your search, or these features are not enabled for your company.{" "}
          <Link to="/modules" className="text-primary underline">Manage modules</Link>
        </Card>
      ) : (
        groups.map((g) => (
          <section key={g.label} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((item: HubItem) => {
                const Icon = iconFor(item.iconName);
                return (
                  <Link key={item.url} to={item.url} className="group">
                    <Card className="flex h-full items-start gap-3 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-primary/[0.03]">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{item.title}</div>
                        {item.hint && <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </SifoWorkspaceShell>
  );
}
