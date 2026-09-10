/**
 * SifoBooks Universal Silent Printing — dispatcher.
 *
 * Every print in the application goes through here:
 *   printPdf() · printReceipt() · printKitchenOrder() · printBarOrder() · printLabel()
 *
 * Dispatch order (never a manual URL as the primary experience):
 *   1. Discovered SifoPrint agent   (Windows 17890 / Android bridge 17891)
 *   2. Cloud / network gateway      (/api/printing/jobs)
 *   3. Browser system default       (only when the terminal chose it)
 *   4. Offline queue + automatic retry
 *
 * Only an agent- or gateway-confirmed acceptance counts as printed.
 */
import {
  discoverAgent,
  agentFetch,
  discoverPrinters,
  fetchSystemDefaultPrinter,
  detectDevice,
  BROWSER_PRINTER,
  type AgentState,
  type DeviceType,
  type DiscoveredPrinter,
} from "./printDiscovery";
import {
  printerForJob,
  copiesForJob,
  getPreferences,
  type PrintJobType as RoutedJobType,
} from "./printRouting";
import { getDeviceId, getTerminalInfo, registerTerminal } from "./printTerminal";
import {
  recordJob,
  updatePrintQueueJob,
  newJobId,
  setQueueDispatcher,
  flushPrintQueue,
  type QueuedPrintJob,
} from "./printQueue";

export type { DeviceType };
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

/**
 * Stable fingerprint of a kitchen/bar ticket's contents.
 *
 * Ticket job ids must stay deduplicated for a genuine duplicate fire (double
 * tap, retry) but MUST change when a recalled check gains items — otherwise
 * dispatch() short-circuits on the already-printed job and the kitchen never
 * sees the additions.
 */
export function ticketRevision(order: KitchenOrder): string {
  const body = order.items
    .map((i) => `${i.quantity}x${i.name}|${(i.modifiers ?? []).join(",")}|${i.notes ?? ""}`)
    .join(";") + `#${order.notes ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < body.length; i += 1) hash = ((hash * 33) ^ body.charCodeAt(i)) >>> 0;
  return hash.toString(36);
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
  terminalName?: string;
  metadata?: Record<string, unknown>;
}

export interface PrintOptions {
  /** Routing key — decides which printer handles the job. */
  jobType?: RoutedJobType;
  /** Explicit printer overrides routing. */
  printer?: string;
  copies?: number;
  /** SifoBooks document reference so a retry re-prints the same document. */
  reference?: string;
  title?: string;
  /** Stable id — same id never prints twice. */
  jobId?: string;
  openCashDrawer?: boolean;
}

export interface PrintResult {
  ok: boolean;
  jobId: string;
  transport: "agent" | "gateway" | "browser" | "queued";
  printer?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Compatibility shims for existing callers                            */
/* ------------------------------------------------------------------ */

const AGENT_OVERRIDE_KEY = "sifobooks_print_advanced";

export function getAgentUrls() {
  if (typeof localStorage === "undefined") return { windows: "", android: "" };
  try {
    const adv = JSON.parse(localStorage.getItem(AGENT_OVERRIDE_KEY) || "{}");
    return { windows: adv.windowsAgentUrl ?? "", android: adv.androidAgentUrl ?? "" };
  } catch {
    return { windows: "", android: "" };
  }
}

export function setAgentUrls(next: { windows?: string; android?: string }) {
  if (typeof localStorage === "undefined") return;
  let adv: any = {};
  try {
    adv = JSON.parse(localStorage.getItem(AGENT_OVERRIDE_KEY) || "{}");
  } catch {
    adv = {};
  }
  localStorage.setItem(
    AGENT_OVERRIDE_KEY,
    JSON.stringify({ ...adv, windowsAgentUrl: next.windows || undefined, androidAgentUrl: next.android || undefined }),
  );
}

export function getDeviceType(): DeviceType {
  return detectDevice();
}

export { getDeviceId, BROWSER_PRINTER };

export async function getPrintStatus(): Promise<{ online: boolean; mode: string; agent?: string }> {
  const state = await discoverAgent(true);
  return { online: state.online, mode: state.online ? state.device : state.transport, agent: state.url ?? undefined };
}

export async function getPrinters(): Promise<{ printers: string[]; detailed: DiscoveredPrinter[] }> {
  const detailed = await discoverPrinters();
  return { printers: detailed.map((p) => p.name), detailed };
}

export { discoverAgent, discoverPrinters, fetchSystemDefaultPrinter };

/* ------------------------------------------------------------------ */
/* Transports                                                          */
/* ------------------------------------------------------------------ */

const ENDPOINTS: Record<PrintJobType, string> = {
  pdf: "/print/pdf",
  receipt: "/print/receipt",
  kitchen: "/print/kitchen",
  bar: "/print/bar",
  label: "/print/label",
};

async function sendToAgent(agent: AgentState, job: PrintJob) {
  if (!agent.url) throw new Error("No agent");
  const res: any = await agentFetch(agent.url, ENDPOINTS[job.type], {
    method: "POST",
    body: JSON.stringify(job),
    timeoutMs: 15000,
  });
  // Only an explicit acceptance counts as printed.
  if (res && res.ok === false) throw new Error(res.error || "Printer rejected the job");
  return res;
}

async function sendToGateway(job: PrintJob) {
  const res = await fetch("/api/printing/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error(`Print gateway responded ${res.status}`);
  const body: any = await res.json().catch(() => ({}));
  if (body && body.ok === false) throw new Error(body.error || "Print gateway rejected the job");
  return body;
}

/** Browser system default printer — used only when the terminal selects it. */
async function sendToBrowser(job: PrintJob): Promise<void> {
  if (typeof document === "undefined") throw new Error("No browser context");
  const html = renderJobHtml(job);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error("Browser printing unavailable");
  }
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((r) => setTimeout(r, 250));
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 2000);
}

function money(n?: number) {
  return (n ?? 0).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderJobHtml(job: PrintJob): string {
  const width = job.type === "pdf" ? "210mm" : "80mm";
  let body = "";

  if (job.type === "pdf" && job.pdfBase64) {
    body = `<embed style="width:100%;height:100vh" type="application/pdf" src="data:application/pdf;base64,${job.pdfBase64}" />`;
  } else if (job.receipt) {
    const r = job.receipt;
    body = `
      <div class="c b">${r.businessName}</div>
      ${r.branchName ? `<div class="c">${r.branchName}</div>` : ""}
      ${r.address ? `<div class="c">${r.address}</div>` : ""}
      ${r.phone ? `<div class="c">${r.phone}</div>` : ""}
      <hr/>
      <div>Receipt: ${r.receiptNumber}</div>
      <div>${r.date}</div>
      ${r.cashier ? `<div>Cashier: ${r.cashier}</div>` : ""}
      <hr/>
      ${r.items
        .map(
          (i) =>
            `<div class="row"><span>${i.quantity} x ${i.name}</span><span>${money(i.total ?? i.price * i.quantity)}</span></div>` +
            (i.modifiers?.length ? `<div class="sm">  + ${i.modifiers.join(", ")}</div>` : ""),
        )
        .join("")}
      <hr/>
      ${r.subtotal != null ? `<div class="row"><span>Subtotal</span><span>${money(r.subtotal)}</span></div>` : ""}
      ${r.discount ? `<div class="row"><span>Discount</span><span>-${money(r.discount)}</span></div>` : ""}
      ${r.tax != null ? `<div class="row"><span>Tax</span><span>${money(r.tax)}</span></div>` : ""}
      <div class="row b"><span>TOTAL</span><span>ZMW ${money(r.total)}</span></div>
      ${r.paymentMethod ? `<div class="row"><span>${r.paymentMethod}</span><span>${money(r.amountPaid)}</span></div>` : ""}
      ${r.change != null ? `<div class="row"><span>Change</span><span>${money(r.change)}</span></div>` : ""}
      <hr/>
      <div class="c sm">${r.footer ?? "Thank you"}</div>`;
  } else if (job.kitchenOrder) {
    const k = job.kitchenOrder;
    body = `
      <div class="c b">${job.type === "bar" ? "BAR" : "KITCHEN"} ORDER</div>
      <div class="c b">#${k.orderNumber}</div>
      ${k.tableNumber ? `<div>Table: ${k.tableNumber}</div>` : ""}
      ${k.orderType ? `<div>Type: ${k.orderType}</div>` : ""}
      ${k.waiter ? `<div>Waiter: ${k.waiter}</div>` : ""}
      <hr/>
      ${k.items
        .map(
          (i) =>
            `<div class="b">${i.quantity} x ${i.name}</div>` +
            (i.modifiers?.length ? `<div class="sm">  + ${i.modifiers.join(", ")}</div>` : "") +
            (i.notes ? `<div class="sm">  ${i.notes}</div>` : ""),
        )
        .join("")}
      ${k.notes ? `<hr/><div>${k.notes}</div>` : ""}`;
  } else {
    body = `<pre>${JSON.stringify(job.metadata ?? {}, null, 2)}</pre>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><title>${job.fileName ?? "SifoBooks"}</title>
  <style>
    @page { size: ${width} auto; margin: ${job.type === "pdf" ? "12mm" : "3mm"}; }
    body { font-family: ui-monospace, "Courier New", monospace; font-size: 12px; margin: 0; }
    .c { text-align: center } .b { font-weight: 700 } .sm { font-size: 10px }
    .row { display: flex; justify-content: space-between; gap: 8px }
    hr { border: 0; border-top: 1px dashed #000; margin: 4px 0 }
  </style></head><body>${body}</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Core dispatch                                                       */
/* ------------------------------------------------------------------ */

async function transportJob(job: PrintJob): Promise<{ transport: PrintResult["transport"] }> {
  if (job.printer === BROWSER_PRINTER) {
    await sendToBrowser(job);
    return { transport: "browser" };
  }
  const agent = await discoverAgent();
  if (agent.online && agent.url) {
    await sendToAgent(agent, job);
    return { transport: "agent" };
  }
  await sendToGateway(job);
  return { transport: "gateway" };
}

// The queue retries with the exact same payload — never a new document.
setQueueDispatcher(async (queued: QueuedPrintJob) => {
  const payload = queued.payload as PrintJob | undefined;
  if (!payload) throw new Error("Job payload missing");
  await transportJob({ ...payload, printer: queued.printer ?? payload.printer });
});

async function dispatch(
  type: PrintJobType,
  partial: Omit<PrintJob, "id" | "type">,
  options: PrintOptions = {},
): Promise<PrintResult> {
  const prefs = getPreferences();
  const routedType: RoutedJobType | undefined = options.jobType;
  const printer =
    options.printer ?? (routedType ? printerForJob(routedType) : undefined) ?? prefs.assignedPrinter ?? prefs.systemDefault;
  const copies = options.copies ?? (routedType ? copiesForJob(routedType) : 1);
  const id = options.jobId ?? newJobId();
  const terminal = getTerminalInfo();

  const job: PrintJob = {
    ...partial,
    id,
    type,
    printer,
    copies,
    deviceId: getDeviceId(),
    terminalName: terminal.terminal_name,
  };

  const existing = recordJob({
    id,
    type,
    jobType: routedType,
    printer,
    copies,
    title: options.title ?? partial.fileName ?? type,
    reference: options.reference,
    payload: job,
  });
  if (existing.status === "printed") {
    return { ok: true, jobId: id, transport: "agent", printer };
  }

  updatePrintQueueJob(id, { status: "printing", attempts: existing.attempts + 1 });

  try {
    const { transport } = await transportJob(job);
    updatePrintQueueJob(id, { status: "printed", printedAt: new Date().toISOString(), error: undefined });
    if (options.openCashDrawer && prefs.openCashDrawer) void openCashDrawer().catch(() => {});
    return { ok: true, jobId: id, transport, printer };
  } catch (error: any) {
    const message = String(error?.message ?? error);
    updatePrintQueueJob(id, { status: prefs.queueWhenOffline ? "queued" : "failed", error: message });
    return { ok: false, jobId: id, transport: "queued", printer, error: message };
  }
}

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

export async function printPdf(pdfBase64: string, printer?: string, copies = 1, fileName?: string) {
  const res = await dispatch("pdf", { pdfBase64, fileName }, { printer, copies, jobType: "report", title: fileName });
  if (!res.ok) throw new Error(res.error ?? "Print failed");
  return res;
}

export async function printReceipt(receipt: ReceiptData, printer?: string, copies = 1) {
  return dispatch(
    "receipt",
    { receipt },
    {
      printer,
      copies,
      jobType: "pos_receipt",
      title: `Receipt ${receipt.receiptNumber}`,
      reference: receipt.receiptNumber,
      jobId: `receipt:${receipt.receiptNumber}`,
      openCashDrawer: true,
    },
  );
}

export async function printKitchenOrder(order: KitchenOrder, printer?: string) {
  return dispatch(
    "kitchen",
    { kitchenOrder: order },
    { printer, jobType: "kitchen", title: `Kitchen ${order.orderNumber}`, reference: order.orderNumber, jobId: `kitchen:${order.orderNumber}:${ticketRevision(order)}` },
  );
}

export async function printBarOrder(order: KitchenOrder, printer?: string) {
  return dispatch(
    "bar",
    { kitchenOrder: order },
    { printer, jobType: "bar", title: `Bar ${order.orderNumber}`, reference: order.orderNumber, jobId: `bar:${order.orderNumber}:${ticketRevision(order)}` },
  );
}

export async function printLabel(metadata: Record<string, unknown>, printer?: string, copies = 1) {
  return dispatch("label", { metadata }, { printer, copies, jobType: "label", title: "Label" });
}

/** Kick the cash drawer through the agent (no-op without one). */
export async function openCashDrawer(printer?: string) {
  const agent = await discoverAgent();
  if (!agent.online || !agent.url) return false;
  try {
    await agentFetch(agent.url, "/drawer/open", {
      method: "POST",
      body: JSON.stringify({ printer: printer ?? printerForJob("cash_drawer") ?? getPreferences().assignedPrinter }),
      timeoutMs: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Send a small test page so an operator can confirm an assignment works. */
export async function printTestPage(printer: string) {
  return dispatch(
    "receipt",
    {
      receipt: {
        businessName: getTerminalInfo().company_name || "SifoBooks",
        branchName: getTerminalInfo().branch_name,
        receiptNumber: "TEST",
        date: new Date().toLocaleString(),
        items: [{ name: "Printer test", quantity: 1, price: 0, total: 0 }],
        total: 0,
        footer: `${printer} — test successful`,
      },
    },
    { printer, title: `Test page — ${printer}`, jobId: newJobId() },
  );
}

/**
 * Boot the print stack for this terminal: discover the agent, register the
 * terminal, then flush anything queued while the printer was away.
 */
export async function initPrinting() {
  const agent = await discoverAgent(true);
  void registerTerminal(agent, { preferences: getPreferences() });
  if (agent.online || agent.transport === "gateway") void flushPrintQueue();
  return agent;
}
