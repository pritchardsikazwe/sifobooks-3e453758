// SifoBooks workspace mode.
//
// One accounting engine, several front-of-house experiences. The company's
// workspace_mode decides where a user lands after sign-in and which primary
// navigation is emphasised. It never enables or disables accounting logic.

import { supabase } from "@/integrations/supabase/client";
import { SIFOBOOKS_EDITION } from "@/lib/edition";

export type WorkspaceMode = "general_pos" | "restaurant" | "accounting" | "pos_accounting" | "payroll_only" | "hotel_only" | "school_only";

export const WORKSPACE_MODES: {
  id: WorkspaceMode;
  label: string;
  description: string;
  landing: string;
  emoji: string;
}[] = [
  {
    id: "general_pos",
    label: "General POS",
    description: "Fast retail / shop selling at the till.",
    landing: "/pos",
    emoji: "🛒",
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Restaurant POS, tables, kitchen, menu, reservations, delivery.",
    landing: "/restaurant",
    emoji: "🍽️",
  },
  {
    id: "hotel_only",
    label: "Hotel only",
    description: "SifoHotel on its own — reservations, front desk, housekeeping and folios.",
    landing: "/hotel",
    emoji: "🏨",
  },
  {
    id: "school_only",
    label: "School only",
    description: "SifoSchool on its own — admissions, learners, academics, fees and school operations.",
    landing: "/school",
    emoji: "🏫",
  },
  {
    id: "payroll_only",
    label: "Payroll only",
    description: "SifoPayroll on its own — employees, payslips and statutory returns.",
    landing: "/payroll-dashboard",
    emoji: "🧾",
  },
  {
    id: "accounting",
    label: "Accounting",
    description: "Full accounting ERP with ledgers, reporting and compliance.",
    landing: "/dashboard",
    emoji: "📊",
  },
  {
    id: "pos_accounting",
    label: "POS + Accounting",
    description: "Complete business management — selling and books together.",
    landing: "/dashboard",
    emoji: "🏢",
  },
];

export function getModeMeta(mode: string | null | undefined) {
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

export async function getWorkspaceMode(): Promise<{ companyId: string | null; mode: WorkspaceMode }> {
  const companyId = await getActiveCompanyId();
  if (!companyId) return { companyId: null, mode: "accounting" };
  const { data } = await supabase
    .from("companies")
    .select("workspace_mode")
    .eq("id", companyId)
    .maybeSingle();
  const configured = data?.workspace_mode as WorkspaceMode | null | undefined;
  if (configured) return { companyId, mode: configured };
  const editionDefault: WorkspaceMode =
    SIFOBOOKS_EDITION === "restaurant" ? "restaurant" :
    SIFOBOOKS_EDITION === "hotel" ? "hotel_only" :
    SIFOBOOKS_EDITION === "school" ? "school_only" :
    SIFOBOOKS_EDITION === "retail" ? "general_pos" :
    "accounting";
  return { companyId, mode: editionDefault };
}

export async function setWorkspaceMode(mode: WorkspaceMode, companyId?: string) {
  const id = companyId ?? (await getActiveCompanyId());
  if (!id) throw new Error("No active company");
  const { error } = await supabase.from("companies").update({ workspace_mode: mode }).eq("id", id);
  if (error) throw error;
  return id;
}
