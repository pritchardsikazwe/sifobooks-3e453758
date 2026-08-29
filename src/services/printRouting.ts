/**
 * Print routing — which printer handles which job type, per terminal.
 *
 * Routing is stored locally (so an offline till still knows where to print)
 * and mirrored to `print_routing` so a replacement terminal can recover it.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./printTerminal";

export type PrintJobType =
  | "pos_receipt"
  | "customer_copy"
  | "kitchen"
  | "bar"
  | "grill"
  | "dessert"
  | "invoice"
  | "a4_invoice"
  | "credit_note"
  | "quotation"
  | "purchase_order"
  | "report"
  | "end_of_day"
  | "label"
  | "cash_drawer";

export const JOB_TYPES: Array<{ key: PrintJobType; label: string; group: string }> = [
  { key: "pos_receipt", label: "POS receipt", group: "Point of sale" },
  { key: "customer_copy", label: "Customer copy", group: "Point of sale" },
  { key: "cash_drawer", label: "Cash drawer", group: "Point of sale" },
  { key: "kitchen", label: "Kitchen ticket", group: "Restaurant" },
  { key: "bar", label: "Bar ticket", group: "Restaurant" },
  { key: "grill", label: "Grill ticket", group: "Restaurant" },
  { key: "dessert", label: "Dessert ticket", group: "Restaurant" },
  { key: "invoice", label: "Customer invoice", group: "Documents" },
  { key: "a4_invoice", label: "A4 invoice", group: "Documents" },
  { key: "credit_note", label: "Credit note", group: "Documents" },
  { key: "quotation", label: "Quotation", group: "Documents" },
  { key: "purchase_order", label: "Purchase order", group: "Documents" },
  { key: "report", label: "Reports", group: "Documents" },
  { key: "end_of_day", label: "End of day", group: "Documents" },
  { key: "label", label: "Labels", group: "Documents" },
];

export interface RoutingEntry {
  printer?: string;
  copies?: number;
  enabled?: boolean;
}

export type RoutingMap = Partial<Record<PrintJobType, RoutingEntry>>;

export interface TerminalPrintPreferences {
  /** SifoBooks assigned printer, the Windows default, or ask each time. */
  defaultMode: "assigned" | "system" | "ask";
  assignedPrinter?: string;
  systemDefault?: string;
  autoPrintReceipt: boolean;
  autoPrintKitchen: boolean;
  queueWhenOffline: boolean;
  retryFailed: boolean;
  openCashDrawer: boolean;
}

const ROUTING_KEY = "sifobooks_print_routing";
const PREFS_KEY = "sifobooks_print_prefs";

export const DEFAULT_PREFERENCES: TerminalPrintPreferences = {
  defaultMode: "assigned",
  autoPrintReceipt: true,
  autoPrintKitchen: true,
  queueWhenOffline: true,
  retryFailed: true,
  openCashDrawer: true,
};

export function getRouting(): RoutingMap {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ROUTING_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveRouting(map: RoutingMap) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ROUTING_KEY, JSON.stringify(map));
}

export function getPreferences(): TerminalPrintPreferences {
  if (typeof localStorage === "undefined") return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Partial<TerminalPrintPreferences>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...getPreferences(), ...prefs }));
}

/** Resolve the printer for a job type: explicit route → assigned → system default. */
export function printerForJob(type: PrintJobType): string | undefined {
  const route = getRouting()[type];
  if (route?.enabled === false) return undefined;
  if (route?.printer) return route.printer;
  const prefs = getPreferences();
  if (prefs.defaultMode === "system") return prefs.systemDefault ?? prefs.assignedPrinter;
  return prefs.assignedPrinter ?? prefs.systemDefault;
}

export function copiesForJob(type: PrintJobType): number {
  return Math.max(1, getRouting()[type]?.copies ?? 1);
}

/* ---------------- cloud mirror ---------------- */

export async function pushRoutingToCloud(map: RoutingMap, scope: { company_id?: string | null; branch_id?: string | null } = {}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const rows = Object.entries(map)
      .filter(([, v]) => v?.printer)
      .map(([job_type, v]) => ({
        user_id: u.user!.id,
        device_id: getDeviceId(),
        job_type,
        printer_name: v!.printer!,
        copies: v!.copies ?? 1,
        enabled: v!.enabled !== false,
        company_id: scope.company_id ?? null,
        branch_id: scope.branch_id ?? null,
      }));
    if (!rows.length) return;
    await supabase.from("print_routing").upsert(rows as any, { onConflict: "user_id,device_id,job_type" });
  } catch {
    /* offline — local routing still applies */
  }
}

export async function pullRoutingFromCloud(): Promise<RoutingMap> {
  try {
    const { data } = await supabase
      .from("print_routing")
      .select("job_type, printer_name, copies, enabled")
      .eq("device_id", getDeviceId());
    const map: RoutingMap = {};
    for (const r of data ?? []) {
      map[(r as any).job_type as PrintJobType] = {
        printer: (r as any).printer_name ?? undefined,
        copies: (r as any).copies ?? 1,
        enabled: (r as any).enabled !== false,
      };
    }
    return map;
  } catch {
    return {};
  }
}
