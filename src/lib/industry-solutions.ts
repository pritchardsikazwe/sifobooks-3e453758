// Industry Solutions registry.
//
// Architecture:
//   BUSINESS TYPE   -> chosen once during onboarding
//   INDUSTRY PRESET -> configuration template (sidebar, CoA, workflows, terminology)
//   BUSINESS SUITES -> permanent SifoBooks capabilities (never installed/uninstalled)
//   INDUSTRY FEATURES -> ON/OFF switches inside a solution
//
// Industry solutions are NOT plugins. Nothing is ever deleted when switching:
// switching an industry only re-stamps the preset and seeds missing accounts.

import { supabase } from "@/integrations/supabase/client";
import { getIndustry, type CoASeed } from "@/lib/industries";

export type SolutionStatus = "available" | "coming_soon";

export type IndustryFeature = {
  key: string;          // stored as feature:<key> in company_modules
  label: string;
  defaultOn: boolean;
};

export type IndustrySolution = {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  status: SolutionStatus;
  /** Permanent business suites highlighted for this industry. */
  suites: string[];
  /** ON/OFF switches specific to this industry. */
  features: IndustryFeature[];
  /** Areas the solution covers (used for the Coming Soon roadmap list). */
  areas: string[];
  /** Where the workspace should land after onboarding. */
  landing: string;
  /** Industry preset id in src/lib/industries.ts used for chart-of-accounts seeding. */
  presetId?: string;
};

const F = (key: string, label: string, defaultOn = true): IndustryFeature => ({ key, label, defaultOn });

const CORE_SUITES = [
  "Sales", "Purchases", "Inventory", "Finance & Accounting", "HR & Payroll", "Reports", "Administration",
];

export const INDUSTRY_SOLUTIONS: IndustrySolution[] = [
  {
    id: "general", label: "General Business", emoji: "🏢", status: "available",
    tagline: "Standard accounting for services, trading and consultancies.",
    suites: CORE_SUITES,
    features: [
      F("general.projects", "Projects & Jobs", false),
      F("general.crm", "CRM & Leads", false),
      F("general.assets", "Fixed Assets"),
    ],
    areas: ["Sales", "Purchases", "Inventory", "Finance", "Payroll", "Reports"],
    landing: "/dashboard", presetId: "general",
  },
  {
    id: "retail", label: "Retail", emoji: "🛍️", status: "available",
    tagline: "Fast scan-to-pay retail POS with stock control.",
    suites: ["Retail POS", ...CORE_SUITES],
    features: [
      F("retail.barcode", "Barcode Scanning"),
      F("retail.favorites", "Favourites Grid"),
      F("retail.split_tender", "Split Tender"),
      F("retail.loyalty", "Loyalty", false),
      F("retail.gift_cards", "Gift Cards", false),
      F("retail.offline", "Offline Mode"),
    ],
    areas: ["Retail POS", "Inventory", "Sales", "Purchases", "Finance", "Reports"],
    landing: "/pos", presetId: "retail",
  },
  {
    id: "restaurant", label: "Restaurant", emoji: "🍽️", status: "available",
    tagline: "Table service, kitchen display, delivery and bar operations.",
    suites: ["Restaurant POS", ...CORE_SUITES],
    features: [
      F("restaurant.tables", "Tables"),
      F("restaurant.floor_plans", "Floor Plans"),
      F("restaurant.reservations", "Reservations"),
      F("restaurant.kitchen", "Kitchen Display"),
      F("restaurant.modifiers", "Modifiers"),
      F("restaurant.delivery", "Delivery"),
      F("restaurant.bar", "Bar"),
      F("restaurant.gift_cards", "Gift Cards", false),
      F("restaurant.loyalty", "Loyalty", false),
      F("restaurant.call_center", "Call Center", false),
      F("restaurant.online_ordering", "Online Ordering", false),
    ],
    areas: ["Restaurant POS", "Inventory", "Sales", "Purchases", "Finance & Accounting", "HR & Payroll", "Reports"],
    landing: "/restaurant", presetId: "restaurant",
  },
  {
    id: "pos_accounting", label: "POS + Accounting", emoji: "🧾", status: "available",
    tagline: "Point of sale first, with the full accounting engine available.",
    suites: ["Retail POS", ...CORE_SUITES],
    features: [
      F("retail.barcode", "Barcode Scanning"),
      F("retail.split_tender", "Split Tender"),
      F("general.assets", "Fixed Assets", false),
    ],
    areas: ["POS", "Sales", "Inventory", "Finance", "Reports"],
    landing: "/pos", presetId: "retail",
  },
  {
    id: "wholesale", label: "Wholesale", emoji: "📦", status: "available",
    tagline: "Bulk trading, price tiers, warehouses and credit customers.",
    suites: CORE_SUITES,
    features: [
      F("wholesale.price_tiers", "Price Tiers"),
      F("wholesale.warehouses", "Multi-Warehouse"),
      F("wholesale.credit_limits", "Customer Credit Limits"),
    ],
    areas: ["Sales", "Purchases", "Inventory", "Finance", "Reports"],
    landing: "/dashboard", presetId: "general",
  },
  {
    id: "professional_services", label: "Professional Services", emoji: "💼", status: "available",
    tagline: "Clients, engagements, timesheets and billing.",
    suites: ["Projects & Service", ...CORE_SUITES],
    features: [
      F("services.timesheets", "Timesheets"),
      F("services.retainers", "Retainers", false),
      F("services.job_cards", "Job Cards"),
    ],
    areas: ["Clients", "Projects", "Timesheets", "Billing", "Finance", "Reports"],
    landing: "/dashboard", presetId: "general",
  },
  {
    id: "hospitality", label: "Hospitality", emoji: "🏨", status: "coming_soon",
    tagline: "Rooms, bookings, folios and guest billing.",
    suites: CORE_SUITES,
    features: [],
    areas: ["Dashboard", "Rooms", "Bookings", "Guests", "Folios", "Housekeeping", "Restaurant", "Billing", "Reports", "Finance", "Payroll"],
    landing: "/dashboard",
  },
  {
    id: "education", label: "Education", emoji: "🎓", status: "coming_soon",
    tagline: "Students, classes, exams, fees and school finance.",
    suites: CORE_SUITES,
    features: [],
    areas: ["Dashboard", "Students", "Admissions", "Classes", "Teachers", "Subjects", "Exams", "Attendance", "Fees", "Student Statements", "Transport", "Library", "Reports", "Finance", "Payroll", "Administration"],
    landing: "/dashboard", presetId: "school",
  },
  {
    id: "ngo", label: "NGO / Non-Profit", emoji: "🤝", status: "coming_soon",
    tagline: "Donors, grants, restricted funds and programme reporting.",
    suites: CORE_SUITES,
    features: [],
    areas: ["Dashboard", "Donors", "Donations", "Pledges", "Fundraising", "Grants", "Restricted Funds", "Projects", "Programs", "Beneficiaries", "Budgets", "Expenditure", "Reports", "Finance", "Compliance"],
    landing: "/dashboard", presetId: "ngo",
  },
  {
    id: "mining", label: "Mining", emoji: "⛏️", status: "coming_soon",
    tagline: "Sites, licences, production, royalties and cost control.",
    suites: CORE_SUITES,
    features: [],
    areas: ["Dashboard", "Mining Sites", "Licences", "Claims", "Production", "Minerals", "Stock", "Equipment", "Contractors", "Purchasing", "Sales", "Customers", "Suppliers", "Logistics", "Royalties", "Production Costs", "Reports", "Finance", "Compliance"],
    landing: "/dashboard", presetId: "mining",
  },
  {
    id: "healthcare", label: "Healthcare", emoji: "🏥", status: "coming_soon",
    tagline: "Patients, appointments, wards, pharmacy and claims.",
    suites: CORE_SUITES,
    features: [],
    areas: ["Dashboard", "Patients", "Appointments", "Doctors", "Departments", "Wards", "Billing", "Pharmacy", "Inventory", "Insurance", "Reports", "Finance", "Payroll"],
    landing: "/dashboard", presetId: "hospital",
  },
  {
    id: "manufacturing", label: "Manufacturing", emoji: "🏭", status: "coming_soon",
    tagline: "BOM, production orders, work centres and costing.",
    suites: CORE_SUITES,
    features: [],
    areas: ["Products", "Bill of Materials", "Raw Materials", "Production Orders", "Work Centres", "Production Planning", "Stock", "Quality Control", "Waste", "Purchasing", "Sales", "Costing", "Reports", "Finance"],
    landing: "/dashboard", presetId: "manufacturing",
  },
  {
    id: "other", label: "Other", emoji: "✳️", status: "available",
    tagline: "Not listed? Start on General Business and configure as you go.",
    suites: CORE_SUITES,
    features: [],
    areas: ["Sales", "Purchases", "Finance", "Reports"],
    landing: "/dashboard", presetId: "general",
  },
];

export function getSolution(id?: string | null): IndustrySolution | undefined {
  if (!id) return undefined;
  const direct = INDUSTRY_SOLUTIONS.find(s => s.id === id);
  if (direct) return direct;
  // Legacy industry-preset ids stored on companies.industry map onto solutions.
  const legacy: Record<string, string> = {
    school: "education", college: "education", university: "education",
    hospital: "healthcare", pharmacy: "healthcare",
    hotel: "hospitality", lodge: "hospitality",
    shop: "retail", phone_shop: "retail",
    law: "professional_services", consulting: "professional_services",
  };
  return INDUSTRY_SOLUTIONS.find(s => s.id === legacy[id]);
}

export const FEATURE_PREFIX = "feature:";
export const featureRowKey = (k: string) => `${FEATURE_PREFIX}${k}`;

export type IndustryState = {
  companyId: string | null;
  userId: string | null;
  solutionId: string | null;
  /** Explicit ON/OFF overrides keyed by feature key. */
  overrides: Record<string, boolean>;
};

export async function loadIndustryState(): Promise<IndustryState> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? null;
  if (!userId) return { companyId: null, userId: null, solutionId: null, overrides: {} };

  const { data: p } = await supabase.from("profiles").select("active_company_id").eq("id", userId).maybeSingle();
  let companyId = (p?.active_company_id as string | null) ?? null;
  let solutionId: string | null = null;
  if (!companyId) {
    const { data: cs } = await supabase.from("companies").select("id, industry").eq("user_id", userId).order("created_at").limit(1);
    companyId = cs?.[0]?.id ?? null;
    solutionId = (cs?.[0]?.industry as string | null) ?? null;
  } else {
    const { data: c } = await supabase.from("companies").select("industry").eq("id", companyId).maybeSingle();
    solutionId = (c?.industry as string | null) ?? null;
  }

  const overrides: Record<string, boolean> = {};
  if (companyId) {
    const { data: rows } = await supabase.from("company_modules").select("module_key, config").eq("company_id", companyId);
    (rows ?? []).forEach((r: any) => {
      if (typeof r.module_key === "string" && r.module_key.startsWith(FEATURE_PREFIX)) {
        const key = r.module_key.slice(FEATURE_PREFIX.length);
        overrides[key] = r.config?.enabled !== false;
      }
    });
  }
  return { companyId, userId, solutionId, overrides };
}

export function isFeatureOn(solution: IndustrySolution | undefined, key: string, overrides: Record<string, boolean>): boolean {
  if (key in overrides) return overrides[key];
  const f = solution?.features.find(x => x.key === key);
  return f?.defaultOn ?? false;
}

/** Turn an industry feature ON or OFF. Never deletes data — only a config row. */
export async function setFeature(params: {
  userId: string; companyId: string; key: string; enabled: boolean;
}) {
  const { error } = await supabase.from("company_modules").upsert({
    user_id: params.userId,
    company_id: params.companyId,
    module_key: featureRowKey(params.key),
    config: { enabled: params.enabled },
  }, { onConflict: "company_id,module_key" });
  if (error) throw error;
}

/**
 * Apply an industry solution to a company.
 * Non-destructive: stamps companies.industry and seeds any missing
 * chart-of-accounts rows. Existing data, tables and routes are untouched.
 */
export async function applyIndustrySolution(params: {
  userId: string; companyId: string; solutionId: string;
}): Promise<{ coa_added: number }> {
  const sol = getSolution(params.solutionId);
  if (!sol) throw new Error(`Unknown industry solution: ${params.solutionId}`);

  const { error } = await supabase.from("companies").update({ industry: sol.id }).eq("id", params.companyId);
  if (error) throw error;

  let coaAdded = 0;
  const preset = sol.presetId ? getIndustry(sol.presetId) : undefined;
  const coa: CoASeed[] = preset?.coa ?? [];
  if (coa.length > 0) {
    const { data: existing } = await supabase.from("chart_of_accounts").select("account_code").eq("user_id", params.userId);
    const have = new Set((existing ?? []).map(r => r.account_code));
    const toInsert = coa.filter(a => !have.has(a.account_code)).map(a => ({
      user_id: params.userId,
      account_code: a.account_code,
      account_name: a.account_name,
      account_type: a.account_type,
      is_active: true,
    }));
    if (toInsert.length > 0) {
      const { error: e2 } = await supabase.from("chart_of_accounts").insert(toInsert);
      if (e2) throw e2;
      coaAdded = toInsert.length;
    }
  }
  return { coa_added: coaAdded };
}
