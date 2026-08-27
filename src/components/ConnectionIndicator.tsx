import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { syncNow } from "@/lib/network-status";
import { discardQueued, listQueue, retryQueued, subscribeQueue, type QueuedItem } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function fmt(ts: number | null) {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Header connectivity pill + synchronisation dashboard.
 * Online / Offline Mode / Synchronising / All changes synchronised.
 */
export function ConnectionIndicator() {
  const net = useNetworkStatus();
  const [items, setItems] = useState<QueuedItem[]>([]);

  useEffect(() => {
    const refresh = () => { void listQueue().then(setItems); };
    refresh();
    return subscribeQueue(refresh);
  }, []);

  const tone =
    net.state === "offline"
      ? "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : net.state === "syncing"
        ? "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30"
        : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

  const label =
    net.state === "offline"
      ? "Offline Mode"
      : net.state === "syncing"
        ? "Synchronising…"
        : net.state === "synced"
          ? "All changes synchronised"
          : "Online";

  const Icon = net.state === "offline" ? CloudOff : net.state === "syncing" ? RefreshCw : net.state === "synced" ? CheckCircle2 : Cloud;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title={`${label}${net.pending ? ` — ${net.pending} pending` : ""}`}
          aria-label={label}
          className={cn(
            "flex items-center gap-1.5 h-8 rounded-full border px-2.5 text-[11px] font-medium transition",
            tone,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full",
            net.state === "offline" ? "bg-amber-500" : net.state === "syncing" ? "bg-sky-500 animate-pulse" : "bg-emerald-500")} />
          <Icon className={cn("h-3.5 w-3.5", net.state === "syncing" && "animate-spin")} />
          <span className="hidden lg:inline">{label}</span>
          {net.pending > 0 && (
            <span className="ml-0.5 rounded-full bg-background/70 px-1.5 py-px text-[10px] font-semibold">
              {net.pending}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">SifoBooks Sync</span>
            <span className={cn("text-[11px] font-medium", net.state === "offline" ? "text-amber-600" : "text-emerald-600")}>
              {label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Last sync: {fmt(net.lastSyncAt)}
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
          <div className="px-2 py-3">
            <div className="text-lg font-semibold">{net.pending}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</div>
          </div>
          <div className="px-2 py-3">
            <div className="text-lg font-semibold text-destructive">{net.failed}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Failed</div>
          </div>
          <div className="px-2 py-3">
            <div className="text-lg font-semibold">{net.backendReachable ? "OK" : "—"}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Backend</div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="max-h-52 overflow-auto divide-y divide-border">
            {items.map((it) => (
              <div key={it.id} className="px-3 py-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{it.table}</span>
                  <span className={cn(
                    "shrink-0 rounded px-1.5 py-px text-[10px]",
                    it.status === "failed" || it.status === "conflict"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {it.status}{it.attempts ? ` · ${it.attempts} tries` : ""}
                  </span>
                </div>
                {it.lastError && (
                  <p className="mt-1 flex items-start gap-1 text-[10px] text-destructive">
                    <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">{it.lastError}</span>
                  </p>
                )}
                {(it.status === "failed" || it.status === "conflict") && it.id != null && (
                  <div className="mt-1.5 flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                      onClick={() => retryQueued(it.id!)}>
                      <RefreshCw className="mr-1 h-3 w-3" /> Retry
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-destructive"
                      onClick={() => { void discardQueued(it).then(() => toast.info("Kept in conflict log")); }}>
                      <Trash2 className="mr-1 h-3 w-3" /> Discard
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-3">
          <Button
            size="sm"
            className="w-full"
            disabled={net.state === "offline" || net.syncing}
            onClick={async () => {
              const res = await syncNow();
              if (res.ok) toast.success(`${res.ok} record${res.ok === 1 ? "" : "s"} synchronised`);
              else if (res.failed) toast.error(`${res.failed} still pending — will retry`);
              else toast.info("Nothing to sync");
            }}
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", net.syncing && "animate-spin")} />
            Sync Now
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
