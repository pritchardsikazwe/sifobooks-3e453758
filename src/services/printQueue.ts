export interface QueuedPrintJob {
  id: string;
  type: string;
  saleId?: string;
  orderId?: string;
  title?: string;
  status: "queued" | "printing" | "printed" | "failed";
  error?: string;
  createdAt: string;
  /** true once mirrored to the backend queue */
  synced?: boolean;
}

const KEY = "sifobooks_print_queue";

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
  localStorage.setItem(KEY, JSON.stringify(jobs.slice(-200)));
}

export async function savePrintQueueJob(job: Omit<QueuedPrintJob, "id" | "createdAt">) {
  const existing = read();
  existing.push({ ...job, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write(existing);
  void syncPrintQueueToCloud();
}

export function getPrintQueue(): QueuedPrintJob[] {
  return read();
}

export function updatePrintQueueJob(id: string, patch: Partial<QueuedPrintJob>) {
  write(read().map((j) => (j.id === id ? { ...j, ...patch } : j)));
}

export function removePrintQueueJob(id: string) {
  write(read().filter((j) => j.id !== id));
}

export function clearPrintQueue() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}

/* ------------------------------------------------------------------
 * Cloud mirror — the authoritative queue lives in the backend so a
 * different terminal can recover pending jobs. Always best-effort:
 * a failure here must never affect a sale.
 * ---------------------------------------------------------------- */

export async function syncPrintQueueToCloud() {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { getDeviceId } = await import("./universalPrintService");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const pending = read().filter((j) => j.status === "queued" && !j.synced);
    if (!pending.length) return;
    const { error } = await supabase.from("print_jobs").insert(
      pending.map((j) => ({
        user_id: u.user!.id,
        device_id: getDeviceId(),
        job_type: j.type,
        title: j.title ?? null,
        reference_id: j.saleId ?? j.orderId ?? null,
        status: "queued",
        error: j.error ?? null,
      })) as any,
    );
    if (error) return;
    write(read().map((j) => (pending.some((p) => p.id === j.id) ? { ...j, synced: true } : j)));
  } catch {
    /* offline — retry on next sync */
  }
}

/** Pending jobs recorded by any terminal on this account. */
export async function fetchCloudPrintQueue() {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("print_jobs")
      .select("id, job_type, title, status, error, created_at, device_id")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  } catch {
    return [];
  }
}
