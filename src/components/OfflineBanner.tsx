import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countQueue, drainQueue, subscribeQueue } from "@/lib/offline-queue";
import { toast } from "sonner";

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setOnline(navigator.onLine);
      setPending(await countQueue());
    };
    refresh();
    const off = subscribeQueue(refresh);
    return off;
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { ok, failed } = await drainQueue();
      if (ok) toast.success(`${ok} record${ok === 1 ? "" : "s"} synced`);
      if (failed) toast.error(`${failed} still pending — will retry`);
      if (!ok && !failed) toast.info("Nothing to sync");
    } finally {
      setSyncing(false);
    }
  };

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className={`flex items-center gap-3 px-4 py-2 text-sm border-b
        ${online
          ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
          : "bg-destructive/10 border-destructive/30 text-destructive"}`}
    >
      {online ? <CloudUpload className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <span className="flex-1 min-w-0 truncate">
        {online
          ? `${pending} record${pending === 1 ? "" : "s"} saved offline — waiting to sync.`
          : `You're offline. New invoices, receipts, expenses and payments are being saved on this device.${pending ? ` ${pending} waiting to sync.` : ""}`}
      </span>
      {pending > 0 && online ? (
        <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing} className="h-7">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
          Sync now
        </Button>
      ) : null}
    </div>
  );
}
