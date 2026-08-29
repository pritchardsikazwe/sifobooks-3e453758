/**
 * SifoPrint agent discovery.
 *
 * The user must never have to type an agent URL to print. Discovery order:
 *   1. Secure local agent endpoint      (https://127.0.0.1:<port>)
 *   2. Known local agent port           (http://127.0.0.1:<port>, http://localhost:<port>)
 *   3. Configured network print server  (Advanced settings)
 *   4. Cloud / network print gateway    (/api/printing/jobs)
 *   5. Offline print queue
 *
 * Nothing here fabricates printers: a printer only appears when an agent,
 * a configured network device, or the browser itself really provides it.
 */

export type DeviceType = "windows" | "android" | "ios" | "web";

export type PrinterType = "receipt" | "kitchen" | "bar" | "document" | "label" | "browser";

export type PrinterSource = "agent" | "network" | "browser";

export interface DiscoveredPrinter {
  name: string;
  label?: string;
  status: "ready" | "offline" | "error" | "unknown";
  isDefault: boolean;
  type: PrinterType;
  source: PrinterSource;
  paper?: string;
}

export type Transport = "agent" | "gateway" | "browser" | "offline";

export interface AgentState {
  online: boolean;
  transport: Transport;
  device: DeviceType;
  url: string | null;
  defaultPrinter?: string | null;
  version?: string;
  checkedAt: string;
}

/** The browser's own print path — resolves to the OS/browser default printer. */
export const BROWSER_PRINTER = "Browser (system default)";

const ADVANCED_KEY = "sifobooks_print_advanced";
const TOKEN_KEY = "sifobooks_print_agent_token";

export interface AdvancedPrintSettings {
  /** Manual override — Advanced only, never the primary experience. */
  windowsAgentUrl?: string;
  androidAgentUrl?: string;
  /** Network print server base URL (e.g. a shared Windows till running the agent). */
  networkServerUrl?: string;
  /** Allow the browser dialog as a printer target. */
  allowBrowserPrinter?: boolean;
}

export function getAdvancedSettings(): AdvancedPrintSettings {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ADVANCED_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveAdvancedSettings(next: AdvancedPrintSettings) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ADVANCED_KEY, JSON.stringify(next));
  cached = null;
}

/** Local API token issued by the agent pairing handshake (never sent to third parties). */
export function getAgentToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAgentToken(token: string | null) {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function detectDevice(): DeviceType {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("windows")) return "windows";
  return "web";
}

const WINDOWS_PORT = 17890;
const ANDROID_PORT = 17891;

/** Candidate agent base URLs, in discovery priority order. */
export function candidateAgentUrls(device = detectDevice()): string[] {
  const adv = getAdvancedSettings();
  const list: string[] = [];
  const manual = device === "android" ? adv.androidAgentUrl : adv.windowsAgentUrl;
  if (manual) list.push(manual.replace(/\/+$/, ""));

  // On Android, 127.0.0.1 is the tablet itself — that is the SifoPrint Bridge,
  // never the Windows till, so the ports differ per device class.
  const port = device === "android" ? ANDROID_PORT : WINDOWS_PORT;
  if (device === "windows" || device === "android") {
    list.push(`https://127.0.0.1:${port}`);
    list.push(`http://127.0.0.1:${port}`);
    list.push(`http://localhost:${port}`);
  }
  if (adv.networkServerUrl) list.push(adv.networkServerUrl.replace(/\/+$/, ""));
  return [...new Set(list)];
}

export async function agentFetch(
  base: string,
  path: string,
  init?: RequestInit & { timeoutMs?: number },
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 6000);
  const token = getAgentToken();
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Agent responded ${res.status}`);
    return await res.json().catch(() => ({}));
  } finally {
    clearTimeout(timer);
  }
}

let cached: AgentState | null = null;

export function cachedAgentState(): AgentState | null {
  return cached;
}

/** Probe every candidate; the first agent that answers /health wins. */
export async function discoverAgent(force = false): Promise<AgentState> {
  const device = detectDevice();
  if (!force && cached && Date.now() - Date.parse(cached.checkedAt) < 15_000) return cached;

  for (const url of candidateAgentUrls(device)) {
    try {
      const health: any = await agentFetch(url, "/health", { timeoutMs: 2500 });
      cached = {
        online: true,
        transport: "agent",
        device,
        url,
        defaultPrinter: health?.defaultPrinter ?? null,
        version: health?.version,
        checkedAt: new Date().toISOString(),
      };
      return cached;
    } catch {
      /* try the next candidate */
    }
  }

  // No local agent — fall back to the cloud/network gateway, then offline queue.
  let gatewayUp = false;
  try {
    const res = await fetch("/api/printing/jobs", { method: "OPTIONS" });
    gatewayUp = res.status < 500;
  } catch {
    gatewayUp = false;
  }

  cached = {
    online: false,
    transport: gatewayUp ? "gateway" : typeof navigator !== "undefined" && navigator.onLine ? "gateway" : "offline",
    device,
    url: null,
    checkedAt: new Date().toISOString(),
  };
  return cached;
}

function classify(name: string, hinted?: string): PrinterType {
  if (hinted && ["receipt", "kitchen", "bar", "document", "label"].includes(hinted)) return hinted as PrinterType;
  const n = name.toLowerCase();
  if (/(kitchen|kot|grill|pizza|dessert)/.test(n)) return "kitchen";
  if (/\bbar\b/.test(n)) return "bar";
  if (/(label|dymo|zebra|zpl)/.test(n)) return "label";
  if (/(tm-t|tsp|thermal|receipt|pos-?\d|escpos|80mm|58mm|epson tm|star )/.test(n)) return "receipt";
  return "document";
}

/** Real printers only — from the agent, plus the browser path when enabled. */
export async function discoverPrinters(state?: AgentState): Promise<DiscoveredPrinter[]> {
  const agent = state ?? (await discoverAgent());
  const printers: DiscoveredPrinter[] = [];

  if (agent.online && agent.url) {
    try {
      const res: any = await agentFetch(agent.url, "/printers", { timeoutMs: 5000 });
      const raw: any[] = Array.isArray(res) ? res : res?.printers ?? [];
      for (const p of raw) {
        const name = typeof p === "string" ? p : p?.name;
        if (!name) continue;
        printers.push({
          name,
          status: (typeof p === "object" && p?.status) || "ready",
          isDefault: typeof p === "object" ? !!p.isDefault : name === agent.defaultPrinter,
          type: classify(name, typeof p === "object" ? p?.type : undefined),
          source: "agent",
          paper: typeof p === "object" ? p?.paper : undefined,
        });
      }
    } catch {
      /* agent went away mid-refresh */
    }
  }

  if (getAdvancedSettings().allowBrowserPrinter !== false && typeof window !== "undefined") {
    printers.push({
      name: BROWSER_PRINTER,
      status: "ready",
      isDefault: printers.length === 0,
      type: "browser",
      source: "browser",
      label: "Uses this browser and the operating-system default printer",
    });
  }

  return printers;
}

/** Ask the agent which printer Windows itself considers the default. */
export async function fetchSystemDefaultPrinter(state?: AgentState): Promise<string | null> {
  const agent = state ?? (await discoverAgent());
  if (!agent.online || !agent.url) return null;
  try {
    const res: any = await agentFetch(agent.url, "/printers/default", { timeoutMs: 3000 });
    return res?.name ?? res?.defaultPrinter ?? agent.defaultPrinter ?? null;
  } catch {
    return agent.defaultPrinter ?? null;
  }
}

/** Ask the agent to change the Windows default printer. */
export async function setSystemDefaultPrinter(name: string): Promise<boolean> {
  const agent = await discoverAgent();
  if (!agent.online || !agent.url) return false;
  try {
    await agentFetch(agent.url, "/printer/default", { method: "POST", body: JSON.stringify({ name }) });
    cached = { ...agent, defaultPrinter: name };
    return true;
  } catch {
    return false;
  }
}
