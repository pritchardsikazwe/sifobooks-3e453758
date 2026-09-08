/**
 * Single, guarded service-worker registrar.
 *
 * Refuses to register in dev, inside iframes and in every Lovable preview
 * context (a stale SW there would serve deleted chunks), and unregisters any
 * matching worker it finds in those contexts. Supports the `?sw=off`
 * kill switch.
 */

const SW_URL = "/sw.js";

export type SwUpdateState = {
  /** A new version is installed and waiting to take over. */
  waiting: ServiceWorker | null;
};

let listeners = new Set<(s: SwUpdateState) => void>();
let state: SwUpdateState = { waiting: null };

function emit(next: SwUpdateState) {
  state = next;
  listeners.forEach((l) => l(state));
}

export function subscribeSwUpdate(fn: (s: SwUpdateState) => void) {
  listeners.add(fn);
  fn(state);
  return () => {
    listeners.delete(fn);
  };
}

export function applySwUpdate() {
  const waiting = state.waiting;
  if (!waiting) return;
  waiting.postMessage({ type: "SKIP_WAITING" });
  // Reload once the new worker takes control. Pending offline transactions
  // live in IndexedDB, so they survive this reload untouched.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  }, { once: true });
}

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => (r.active?.scriptURL ?? r.waiting?.scriptURL ?? "").endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* non-fatal */
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    void unregisterMatching();
    return;
  }

  // A new build now activates immediately (skipWaiting). Reload once when it
  // takes control so installed apps never keep serving a stale build.
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });

      if (reg.waiting) emit({ waiting: reg.waiting });

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            emit({ waiting: installing });
          }
        });
      });

      // Automatic recovery: re-check for a fresh worker periodically and on focus.
      const check = () => { void reg.update().catch(() => {}); };
      window.addEventListener("focus", check);
      setInterval(check, 60 * 60 * 1000);
    } catch (err) {
      // Registration failures must never break the app; retry once later.
      console.warn("[pwa] service worker registration failed", err);
      setTimeout(() => {
        navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {});
      }, 30_000);
    }
  };

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}
