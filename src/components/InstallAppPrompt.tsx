import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sifo-install-dismissed";
const DISMISS_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS
    (window.navigator as any).standalone === true
  );
}

function recentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const t = Number(v);
    return Date.now() - t < DISMISS_DAYS * 86400_000;
  } catch { return false; }
}

/**
 * Cross-platform install prompt.
 *  - Chrome/Edge/Android: uses beforeinstallprompt.
 *  - iOS Safari: shows manual "Add to Home Screen" instructions.
 * Dismissal is remembered for 14 days.
 */
export function InstallAppPrompt({ delayMs = 6000 }: { delayMs?: number }) {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || recentlyDismissed()) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), delayMs);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt: show the manual popup on delay.
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (ios) iosTimer = setTimeout(() => setVisible(true), delayMs);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [delayMs]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!evt) return;
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
      }
    } finally {
      setVisible(false);
      setEvt(null);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install SifoBooks"
      className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-4 w-[min(92vw,420px)]
                 rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-xl
                 shadow-[0_20px_60px_-20px_rgba(14,143,74,0.6)] p-4 animate-in fade-in slide-in-from-bottom-4"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-600/15 flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-foreground">Install SifoBooks</div>
          <p className="text-xs text-muted-foreground mt-1">
            Add SifoBooks to your home screen for one-tap access, offline data
            capture, and a full-screen app experience.
          </p>
          {isIOS ? (
            <p className="text-[11px] text-muted-foreground mt-2">
              On iPhone: tap <span className="font-medium">Share</span> then{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            {!isIOS && evt ? (
              <Button size="sm" onClick={install} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Install app
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
