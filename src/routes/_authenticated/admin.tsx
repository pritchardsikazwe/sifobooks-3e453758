import { createFileRoute, Link } from "@tanstack/react-router";
import { UserCog, ShieldCheck, Bell, Building2, Users2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Company Setup", desc: "Profile, branches, tax settings", icon: Building2, to: "/setup" },
          { title: "Employees", desc: "HR master data", icon: Users2, to: "/employees" },
          { title: "Audit Logs", desc: "All system activity", icon: ShieldCheck, to: "/audit-logs" },
          { title: "Notifications", desc: "System notices", icon: Bell, to: "/notifications" },
          { title: "Compliance", desc: "ZRA, NAPSA, NHIMA obligations", icon: ShieldCheck, to: "/compliance" },
        ].map(x => (
          <Link key={x.title} to={x.to as any} className="block">
            <Card className="p-5 hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer h-full">
              <x.icon className="h-8 w-8 text-emerald-600 mb-3" />
              <div className="font-semibold">{x.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{x.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  ),
});
