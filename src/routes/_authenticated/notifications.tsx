import { createFileRoute } from "@tanstack/react-router";
import { Bell, RefreshCw, CheckCheck } from "lucide-react";
import { useState } from "react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function Actions() {
  const [busy, setBusy] = useState<string | null>(null);

  async function runScans() {
    setBusy("scan");
    const { data, error } = await supabase.rpc("run_notification_scans");
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Scan complete (${(data as any)?.notifications_considered ?? 0} checked)`);
    setTimeout(() => window.location.reload(), 400);
  }

  async function markAllRead() {
    setBusy("mark");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(null); return; }
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", u.user.id).eq("read", false);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("All marked read");
    setTimeout(() => window.location.reload(), 300);
  }

  return (
    <div className="flex gap-2 mb-4">
      <Button variant="outline" size="sm" onClick={runScans} disabled={busy !== null}>
        <RefreshCw className={`h-4 w-4 mr-2 ${busy === "scan" ? "animate-spin" : ""}`} />
        Run scans now
      </Button>
      <Button variant="outline" size="sm" onClick={markAllRead} disabled={busy !== null}>
        <CheckCheck className="h-4 w-4 mr-2" />
        Mark all read
      </Button>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div>
      <Actions />
      <SimpleCrud
        title="Notifications"
        icon={Bell}
        table="notifications"
        orderBy={{ column: "created_at", ascending: false }}
        searchKeys={["title", "message"]}
        columns={[
          { key: "title", header: "Title" },
          { key: "type", header: "Type" },
          { key: "message", header: "Message" },
          { key: "read", header: "Read", render: r => (r.read ? "Yes" : "No") },
        ]}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "type", label: "Type", type: "select", defaultValue: "info",
            options: [{value:"info",label:"Info"},{value:"warning",label:"Warning"},{value:"success",label:"Success"},{value:"error",label:"Error"}] },
          { name: "message", label: "Message", type: "textarea" },
          { name: "link", label: "Link" },
        ]}
      />
    </div>
  ),
});
