export interface QueuedPrintJob {
  id: string;
  type: string;
  saleId?: string;
  orderId?: string;
  title?: string;
  status: "queued" | "printing" | "printed" | "failed";
  error?: string;
  createdAt: string;
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
