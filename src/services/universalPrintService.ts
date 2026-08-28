/**
 * SifoBooks Universal Silent Printing
 * ------------------------------------------------------------------
 * The ONLY printing entry points in the application:
 *   printPdf() · printReceipt() · printKitchenOrder() · printBarOrder() · printLabel()
 *
 * Windows  → SifoPrint Agent   (http://127.0.0.1:17890)
 * Android  → SifoPOS Bridge    (http://127.0.0.1:17891)
 * iOS/web  → cloud print gateway (/api/printing/jobs) → network / AirPrint
 *
 * The app must NEVER call window.print().
 */

export type DeviceType = "windows" | "android" | "ios" | "web";

export type PrintJobType = "pdf" | "receipt" | "kitchen" | "bar" | "label";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total?: number;
  modifiers?: string[];
}

export interface ReceiptData {
  businessName: string;
  branchName?: string;
  address?: string;
  phone?: string;
  receiptNumber: string;
  date: string;
  cashier?: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  footer?: string;
}

export interface KitchenOrder {
  orderNumber: string;
  tableNumber?: string;
  waiter?: string;
  orderType?: string;
  items: Array<{ name: string; quantity: number; modifiers?: string[]; notes?: string }>;
  notes?: string;
}

export interface PrintJob {
  id: string;
  type: PrintJobType;
  printer?: string;
  copies?: number;
  pdfBase64?: string;
  fileName?: string;
  receipt?: ReceiptData;
  kitchenOrder?: KitchenOrder;
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Agent endpoints — env configurable, overridable per terminal        */
/* ------------------------------------------------------------------ */

const AGENT_OVERRIDE_KEY = "sifobooks_print_agents";

const ENV_WINDOWS_AGENT =
  (import.meta.env['VITE_WINDOWS_PRINT_AGENT_URL'] as string | undefined) || "http://127.0.0.1:17890";

const ENV_ANDROID_AGENT =
  (import.meta.env['VITE_ANDROID_PRINT_AGENT_URL'] as string | undefined) || "http://127.0.0.1:17891";

function overrides(): { windows?: string; android?: string } {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(AGENT_OVERRIDE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getAgentUrls() {
  const o = overrides();
  return {
    windows: o.windows || ENV_WINDOWS_AGENT,
    android: o.android || ENV_ANDROID_AGENT,
  };
}

export function setAgentUrls(next: { windows?: string; android?: string }) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(AGENT_OVERRIDE_KEY, JSON.stringify(next));
}

/* ------------------------------------------------------------------ */
/* Device                                                              */
/* ------------------------------------------------------------------ */

function detectDevice(): DeviceType {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("windows")) return "windows";
  return "web";
}

export function getDeviceType(): DeviceType {
  return detectDevice();
}

const DEVICE_ID_KEY = "sifobooks_device_id";

export function getDeviceId(): string {
  if (typeof localStorage === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function newJobId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `job_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  }
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

async function request(baseUrl: string, endpoint: string, body?: unknown, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Print service returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function sendNetworkPrintJob(job: PrintJob) {
  const response = await fetch("/api/printing/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!response.ok) throw new Error("Cloud print service unavailable");
  return response.json();
}

function agentFor(device: DeviceType): string | null {
  const urls = getAgentUrls();
  if (device === "windows") return urls.windows;
  if (device === "android") return urls.android;
  return null;
}

async function dispatch(job: PrintJob, endpoint: string) {
  const device = detectDevice();
  const agent = agentFor(device);
  const payload: PrintJob = { ...job, deviceId: getDeviceId() };
  if (agent) return request(agent, endpoint, payload);
  return sendNetworkPrintJob(payload);
}

/* ------------------------------------------------------------------ */
/* Status / discovery                                                  */
/* ------------------------------------------------------------------ */

export async function getPrintStatus(): Promise<{ online: boolean; mode: string; agent?: string }> {
  const device = detectDevice();
  const agent = agentFor(device);
  try {
    if (agent) {
      const res = await request(agent, "/health", undefined, 3000);
      return { online: true, mode: device, agent, ...res };
    }
    if (device === "ios") return { online: true, mode: "network" };
    return { online: false, mode: "web" };
  } catch {
    return { online: false, mode: device, agent: agent ?? undefined };
  }
}

export async function getPrinters(): Promise<{ printers: string[] }> {
  const device = detectDevice();
  const agent = agentFor(device);
  if (!agent) return { printers: [] };
  try {
    const res = await request(agent, "/printers", undefined, 4000);
    const list = Array.isArray(res) ? res : res?.printers ?? [];
    return { printers: list.map((p: any) => (typeof p === "string" ? p : p?.name)).filter(Boolean) };
  } catch {
    return { printers: [] };
  }
}

/* ------------------------------------------------------------------ */
/* Print entry points                                                  */
/* ------------------------------------------------------------------ */

export async function printPdf(pdfBase64: string, printer?: string, copies = 1, fileName?: string) {
  return dispatch(
    { id: newJobId(), type: "pdf", pdfBase64, printer, copies, fileName },
    "/print/pdf",
  );
}

export async function printReceipt(receipt: ReceiptData, printer?: string, copies = 1) {
  return dispatch({ id: newJobId(), type: "receipt", printer, copies, receipt }, "/print/receipt");
}

export async function printKitchenOrder(order: KitchenOrder, printer?: string) {
  return dispatch({ id: newJobId(), type: "kitchen", printer, kitchenOrder: order }, "/print/kitchen");
}

export async function printBarOrder(order: KitchenOrder, printer?: string) {
  return dispatch({ id: newJobId(), type: "bar", printer, kitchenOrder: order }, "/print/bar");
}

export async function printLabel(metadata: Record<string, unknown>, printer?: string, copies = 1) {
  return dispatch({ id: newJobId(), type: "label", printer, copies, metadata }, "/print/label");
}
