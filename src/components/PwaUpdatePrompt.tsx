import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applySwUpdate, subscribeSwUpdate } from "@/lib/pwa/register-sw";

/**
 * Notifies the user when a new SifoBooks build is waiting.
 * Pending offline transactions live in IndexedDB and survive the update.
 */
export function PwaUpdatePrompt() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const off = subscribeSwUpdate((s) => setReady(!!s.waiting));
    return () => { off(); };
  }, []);

  if (!ready) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-4 shadow-elevated backdrop-blur-xl md:bottom-4"
    >
      <div className="text-sm font-semibold text-foreground">New SifoBooks version available.</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Your pending offline transactions are kept safely and will still sync after updating.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={applySwUpdate}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Update now
        </Button>
        <Button size="sm" variant="outline" onClick={() => setReady(false)}>
          Later
        </Button>
      </div>
    </div>
  );
}
