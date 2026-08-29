/**
 * Central print queue.
 *
 * A completed sale must never fail because a printer is offline, so every job
 * is recorded locally first, mirrored to `print_jobs`, retried automatically
 * when the agent comes back, and de-duplicated by a stable job id.
 */
import { getDeviceId, getTerminalInfo } from "./printTerminal";
import type { PrintJobType } from "./printRouting";

export type PrintJobStatus = "queued" | "printing" | "printed" | "failed" | "retrying" | "cancelled";

export interface QueuedPrintJob {
  /** Stable job id — also the de-duplication key. */
  id: string;
  type: string;
  jobType?: PrintJobType;
  printer?: string;
  copies?: number;
  title?: string;
  /** SifoBooks document this job belongs to (sale id, invoice id, order id). */
  reference?: string;
  saleId?: string;
  orderId?: string;
  status: PrintJobStatus;
  attempts: number;
  error?: string;
  createdAt: string;
  printedAt?: string;
  /** Job body kept so a retry re-prints the same document, never a new one. */
  payload?: any;
  synced?: boolean;
}

const KEY = "sifobooks_print_queue";
const MAX_ATTEMPTS = 5;

type Dispatcher = (job: QueuedPrintJob) => Promise<void>;
let dispatcher: Dispatcher | null = null;

/** universalPrintService registers the real transport here (avoids a cycle). */
export function setQueueDispatcher(fn: Dispatcher) {
  dispatcher = fn;
}

const listeners = new Set<() => void>();
export function subscribeToQueue(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((l) => {
    try { l(); } catch { /* listener errors never break printing */ }
  });
}

function read(): QueuedPrintJob[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(jobs: QueuedPrintJob[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(jobs.slice(-300)));
  emit();
}

export function getPrintQueue(): QueuedPrintJob[] {
  return read();
}

export function getJob(id: string) {
  return read().find((j) => j.id === id);
}

export function newJobId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `job_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  }
}

/** Record a job. Returns the existing job when the id was already seen. */
export function recordJob(job: Partial<QueuedPrintJob> & { id: string; type: string }): QueuedPrintJob {
  const jobs = read();
  const existing = jobs.find((j) => j.id === job.id);
  if (existing) return existing;
  const created: QueuedPrintJob = {
    status: "queued",
    attempts: 0,
    createdAt: new Date().toISOString(),
    ...job,
  } as QueuedPrintJob;
  jobs.push(created);
  write(jobs);
  return created;
}

export function updatePrintQueueJob(id: string, patch: Partial<QueuedPrintJob>) {
  write(read().map((j) => (j.id === id ? { ...j, ...patch } : j)));
  void syncPrintQueueToCloud();
}

export function removePrintQueueJob(id: string) {
  write(read().filter((j) => j.id !== id));
}

export function cancelPrintJob(id: string) {
  updatePrintQueueJob(id, { status: "cancelled" });
}

export function clearPrintQueue() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
  emit();
}

/** Legacy helper kept for existing callers. */
export async function savePrintQueueJob(job: Omit<QueuedPrintJob, "id" | "createdAt" | "attempts"> & { attempts?: number }) {
  recordJob({ ...job, attempts: job.attempts ?? 0, id: newJobId() } as any);
  void syncPrintQueueToCloud();
}

/* ------------------------------------------------------------------ */
/* Retry                                                               */
/* ------------------------------------------------------------------ */

export async function retryJob(id: string) {
  const job = getJob(id);
  if (!job || !dispatcher) return false;
  if (job.status === "printed") return true;
  updatePrintQueueJob(id, { status: "retrying", attempts: job.attempts + 1, error: undefined });
  try {
    await dispatcher({ ...job, attempts: job.attempts + 1 });
    updatePrintQueueJob(id, { status: "printed", printedAt: new Date().toISOString(), error: undefined });
    return true;
  } catch (e: any) {
    const attempts = job.attempts + 1;
    updatePrintQueueJob(id, {
      status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
      error: String(e?.message ?? e),
    });
    return false;
  }
}

/** Print everything pending — called when the agent reconnects. */
export async function flushPrintQueue() {
  if (!dispatcher) return { printed: 0, failed: 0 };
  let printed = 0;
  let failed = 0;
  for (const job of read()) {
    if (job.status !== "queued" && job.status !== "retrying") continue;
    if (job.attempts >= MAX_ATTEMPTS) continue;
    // eslint-disable-next-line no-await-in-loop
    (await retryJob(job.id)) ? printed++ : failed++;
  }
  void syncPrintQueueToCloud();
  return { printed, failed };
}

/* ------------------------------------------------------------------ */
/* Cloud mirror — best effort, never blocks a sale                     */
/* ------------------------------------------------------------------ */

export async function syncPrintQueueToCloud() {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const jobs = read().filter((j) => j.status !== "cancelled");
    if (!jobs.length) return;
    const info = getTerminalInfo();
    const { error } = await supabase.from("print_jobs").upsert(
      jobs.map((j) => ({
        user_id: u.user!.id,
        job_key: j.id,
        device_id: getDeviceId(),
        terminal_name: info.terminal_name ?? null,
        company_id: info.company_id ?? null,
        branch_id: info.branch_id ?? null,
        job_type: j.jobType ?? j.type,
        title: j.title ?? null,
        printer_name: j.printer ?? null,
        copies: j.copies ?? 1,
        reference_id: j.reference ?? j.saleId ?? j.orderId ?? null,
        status: j.status,
        attempt_count: j.attempts,
        printed_at: j.printedAt ?? null,
        error: j.error ?? null,
      })) as any,
      { onConflict: "user_id,job_key" },
    );
    if (error) return;
    write(read().map((j) => ({ ...j, synced: true })));
  } catch {
    /* offline — retry on next sync */
  }
}

/** Jobs recorded by every terminal on this account (admin view). */
export async function fetchCloudPrintQueue(statuses: PrintJobStatus[] = ["queued", "retrying", "printing", "failed"]) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("print_jobs")
      .select("id, job_key, job_type, title, status, error, created_at, printed_at, device_id, terminal_name, printer_name, attempt_count")
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  } catch {
    return [];
  }
}
