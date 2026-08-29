/**
 * Terminal identity & registration.
 *
 * Every till has a stable device id and is registered against a company,
 * branch and terminal name so print jobs and printer assignments can never
 * leak between branches.
 */
import { supabase } from "@/integrations/supabase/client";
import { detectDevice, type AgentState } from "./printDiscovery";

const DEVICE_ID_KEY = "sifobooks_device_id";
const TERMINAL_KEY = "sifobooks_terminal";

export interface TerminalInfo {
  terminal_name?: string;
  branch_name?: string;
  company_name?: string;
  company_id?: string | null;
  branch_id?: string | null;
}

export function getDeviceId(): string {
  if (typeof localStorage === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getTerminalInfo(): TerminalInfo {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(TERMINAL_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveTerminalInfo(info: TerminalInfo) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TERMINAL_KEY, JSON.stringify({ ...getTerminalInfo(), ...info }));
}

/** Upsert this terminal and its live agent status into the backend. */
export async function registerTerminal(agent?: AgentState, printerConfig?: unknown) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const info = getTerminalInfo();
    await supabase.from("print_devices").upsert(
      {
        user_id: u.user.id,
        device_id: getDeviceId(),
        device_type: detectDevice(),
        terminal_name: info.terminal_name ?? null,
        branch_name: info.branch_name ?? null,
        company_name: info.company_name ?? null,
        company_id: info.company_id ?? null,
        branch_id: info.branch_id ?? null,
        agent_status: agent ? (agent.online ? "connected" : agent.transport) : "unknown",
        agent_url: agent?.url ?? null,
        agent_seen_at: agent?.online ? new Date().toISOString() : null,
        printer_config: (printerConfig ?? {}) as any,
        last_seen_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id,device_id" },
    );
  } catch {
    /* offline — registration retries on the next refresh */
  }
}

/** Every terminal registered on this account (admin view). */
export async function listTerminals() {
  const { data } = await supabase
    .from("print_devices")
    .select("*")
    .order("last_seen_at", { ascending: false });
  return data ?? [];
}
