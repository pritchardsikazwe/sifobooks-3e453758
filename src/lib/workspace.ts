// SifoBooks workspace configuration.
//
// One accounting engine, several business experiences. Workspace mode is a
// configuration choice for the active company; it does not create a separate
// accounting system or separate company.

import { supabase } from "@/integrations/supabase/client";

export type WorkspaceMode =
  | "general_pos"
  | "restaurant"
  | "accounting"
  | "pos_accounting"
  | "retail_basic_accounting"
  | "retail_full_accounting"
  | "hotel"
  | "ngo_donor";

export type WorkspaceMeta = {
  id: WorkspaceMode;
  label: string;
  description: string;
  landing: string;
  emoji: string;
  accounting: "basic" | "full";
  channel: "retail" | "restaurant" | "hotel" | "ngo" | "accounting";
};

export const WORKSPACE_MODES: WorkspaceMeta[] = [
  {
    id: "general_pos",
    label: "General POS",
    description: "Fast retail / shop selling at the till.",
    landing: "/pos",
    emoji: "🛒",
    accounting: "basic",
    channel: "retail",
  },
  {
    id: "retail_basic_accounting",
    label: "Retail POS + Basic Accounting",
    description: "Retail POS with essential customers, purchases, cashbook and bookkeeping.",
    landing: "/dashboard",
    emoji: "🏪",
    accounting: "basic",
    channel: "retail",
  },
  {
    id: "retail_full_accounting",
    label: "Retail POS + Full Accounting",
    description: "Complete retail operations with the full accounting, banking and reporting engine.",
    landing: "/dashboard",
    emoji: "🏢",
    accounting: "full",
    channel: "retail",
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Restaurant POS, tables, kitchen, menu, reservations and delivery.",
    landing: "/restaurant",
    emoji: "🍽️",
    accounting: "basic",
    channel: "restaurant",
  },
  {
    id: "hotel",
    label: "Hotel",
    description: "Hotel operations with rooms, reservations, restaurant/POS and accounting foundation.",
    landing: "/dashboard",
    emoji: "🏨",
    accounting: "full",
    channel: "hotel",
  },
  {
    id: "ngo_donor",
    label: "NGO / Donor",
    description: "Fund, grant, donor and programme-focused accounting and reporting.",
    landing: "/dashboard",
    emoji: "🤝",
    accounting: "full",
    channel: "ngo",
  },
  // Legacy configurations remain supported so existing companies do not break.
  {
    id: "accounting",
    label: "Accounting",
    description: "Full accounting ERP with ledgers, reporting and compliance.",
    landing: "/dashboard",
    emoji: "📊",
    accounting: "full",
    channel: "accounting",
  },
  {
    id: "pos_accounting",
    label: "POS + Accounting",
    description: "Legacy combined POS and full accounting configuration.",
    landing: "/dashboard",
    emoji: "💼",
    accounting: "full",
    channel: "retail",
  },
];

export function getModeMeta(mode: string | null | undefined): WorkspaceMeta {
  return WORKSPACE_MODES.find((m) => m.id === mode) ?? WORKSPACE_MODES.find((m) => m.id === "accounting")!;
}

export function landingFor(mode: string | null | undefined) {
  return getModeMeta(mode).landing;
}

/** Active company id for the signed-in user (falls back to their first company). */
export async function getActiveCompanyId(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("active_company_id")
    .eq("id", u.user.id)
    .maybeSingle();
  if (p?.active_company_id) return p.active_company_id as string;
  const { data: cs } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", u.user.id)
    .order("created_at")
    .limit(1);
  return cs?.[0]?.id ?? null;
}

export async function getActiveCompany() {
  const companyId = await getActiveCompanyId();
  if (!companyId) return null;
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,base_currency,country,workspace_mode")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWorkspaceMode(): Promise<{ companyId: string | null; mode: WorkspaceMode }> {
  const companyId = await getActiveCompanyId();
  if (!companyId) return { companyId: null, mode: "accounting" };
  const { data } = await supabase
    .from("companies")
    .select("workspace_mode")
    .eq("id", companyId)
    .maybeSingle();
  return { companyId, mode: (data?.workspace_mode as WorkspaceMode) ?? "accounting" };
}

export async function setWorkspaceMode(mode: WorkspaceMode, companyId?: string) {
  const id = companyId ?? (await getActiveCompanyId());
  if (!id) throw new Error("No active company");
  const { error } = await supabase.from("companies").update({ workspace_mode: mode }).eq("id", id);
  if (error) throw error;
  return id;
}
