/* ------------------------------------------------------------------ *
 * Documents & Branding — one source of truth for every printed page.
 * ------------------------------------------------------------------ *
 * Every SifoBooks document (invoice, quote, receipt, statement, payslip,
 * folio, expense report, remittance advice) is printed on the ACTIVE
 * TENANT's identity: their legal name, logo, colours and tax numbers.
 * SifoBooks never presents itself as the customer's business.
 *
 * Reads merge two rows: the company record (already captured during setup)
 * and the optional document_branding record (design + document policy).
 * Nothing here rewrites a document that was already issued — branding is
 * applied at render time only.
 * ------------------------------------------------------------------ */

import { supabase } from "@/integrations/supabase/client";
import { getActiveCompanyId } from "@/lib/workspace";

const db: any = supabase;

export type BankDetail = { bank?: string; branch?: string; account_name?: string; account_number?: string; swift?: string; sort_code?: string };
export type TermsEntry = { key: string; label: string; body: string };

export type ThemeKey = "corporate" | "modern" | "classic" | "minimal";
export const THEME_KEYS: ThemeKey[] = ["corporate", "modern", "classic", "minimal"];

export type DocumentBranding = {
  id?: string;
  companyId: string | null;
  legalName: string;
  tradingName: string;
  tagline: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  tpin: string;
  vatNumber: string;
  registrationNumber: string;
  currency: string;
  locale: string;
  logoUrl: string | null;
  secondaryLogoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  theme: ThemeKey;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: "helvetica" | "times" | "courier";
  headerNote: string;
  footerNote: string;
  paymentInstructions: string;
  defaultNotes: string;
  termsLibrary: TermsEntry[];
  signatoryName: string;
  signatoryTitle: string;
  bankDetails: BankDetail[];
  paymentMethods: string[];
  socialLinks: Record<string, string>;
  documentPrefixes: Record<string, string>;
  templates: Record<string, ThemeKey>;
  showProviderCredit: boolean;
  industry: string | null;
};

/* ------------------------------------------------------------------ *
 * Themes — established accounting-document looks, not generic gradients.
 * ------------------------------------------------------------------ */

export type ThemeStyle = {
  label: string;
  description: string;
  /** Solid brand band across the top of page one. */
  headerBand: boolean;
  /** Thin brand rule under the header instead of a band. */
  headerRule: boolean;
  /** Vertical brand sidebar down the left edge. */
  sidebar: boolean;
  uppercaseTitle: boolean;
  tableHeadFilled: boolean;
  zebra: boolean;
  serif: boolean;
};

export const THEMES: Record<ThemeKey, ThemeStyle> = {
  corporate: {
    label: "Corporate",
    description: "Deep brand band, filled table headers — the familiar ERP letterhead.",
    headerBand: true, headerRule: false, sidebar: false, uppercaseTitle: true, tableHeadFilled: true, zebra: true, serif: false,
  },
  modern: {
    label: "Modern",
    description: "Brand sidebar, airy type, light table rules.",
    headerBand: false, headerRule: true, sidebar: true, uppercaseTitle: false, tableHeadFilled: true, zebra: false, serif: false,
  },
  classic: {
    label: "Classic",
    description: "Serif letterhead with a ruled header — traditional accounting stationery.",
    headerBand: false, headerRule: true, sidebar: false, uppercaseTitle: true, tableHeadFilled: false, zebra: false, serif: true,
  },
  minimal: {
    label: "Minimal",
    description: "No band, no fills — just clean type and hairline rules.",
    headerBand: false, headerRule: true, sidebar: false, uppercaseTitle: false, tableHeadFilled: false, zebra: false, serif: false,
  },
};

/** Industry accents used when a tenant has not chosen its own colours. */
export const INDUSTRY_PALETTES: Record<string, { primary: string; accent: string }> = {
  hotel: { primary: "#123a5c", accent: "#c9a84c" },
  hospitality: { primary: "#123a5c", accent: "#c9a84c" },
  restaurant: { primary: "#7a2418", accent: "#d98324" },
  school: { primary: "#1f3a8a", accent: "#e0a800" },
  education: { primary: "#1f3a8a", accent: "#e0a800" },
  mining: { primary: "#3f3a2f", accent: "#b8860b" },
  ngo: { primary: "#0b5d51", accent: "#8ab17d" },
  construction: { primary: "#1f3a5f", accent: "#d97706" },
};

export const DEFAULT_BRANDING: DocumentBranding = {
  companyId: null,
  legalName: "Your Company",
  tradingName: "",
  tagline: "",
  address: "", city: "", country: "Zambia",
  phone: "", email: "", website: "",
  tpin: "", vatNumber: "", registrationNumber: "",
  currency: "ZMW", locale: "en-ZM",
  logoUrl: null, secondaryLogoUrl: null, signatureUrl: null, stampUrl: null,
  theme: "corporate",
  primaryColor: "#0f4c3a", secondaryColor: "#0f172a", accentColor: "#c9a84c",
  fontFamily: "helvetica",
  headerNote: "", footerNote: "", paymentInstructions: "", defaultNotes: "",
  termsLibrary: [],
  signatoryName: "", signatoryTitle: "",
  bankDetails: [], paymentMethods: [], socialLinks: {}, documentPrefixes: {}, templates: {},
  showProviderCredit: false,
  industry: null,
};

const asArray = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asObject = (v: any): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const str = (v: any, fallback = "") => (v == null ? fallback : String(v));

/** Merge the company record and the branding record into one render input. */
export function mergeBranding(company: any, branding: any): DocumentBranding {
  const industry = str(company?.industry, "").toLowerCase();
  const palette = INDUSTRY_PALETTES[industry];
  return {
    id: branding?.id,
    companyId: company?.id ?? branding?.company_id ?? null,
    legalName: str(branding?.legal_name) || str(company?.name) || DEFAULT_BRANDING.legalName,
    tradingName: str(branding?.trading_name) || str(company?.trading_name),
    tagline: str(branding?.tagline),
    address: str(branding?.address) || str(company?.address),
    city: str(branding?.city) || str(company?.city),
    country: str(branding?.country) || str(company?.country, "Zambia"),
    phone: str(branding?.phone) || str(company?.phone),
    email: str(branding?.email) || str(company?.email),
    website: str(branding?.website) || str(company?.website),
    tpin: str(branding?.tpin) || str(company?.tpin),
    vatNumber: str(branding?.vat_number) || str(company?.vat_number),
    registrationNumber: str(branding?.registration_number),
    currency: str(branding?.currency) || str(company?.base_currency, "ZMW"),
    locale: str(branding?.locale, "en-ZM"),
    logoUrl: branding?.logo_url ?? company?.logo_url ?? null,
    secondaryLogoUrl: branding?.secondary_logo_url ?? null,
    signatureUrl: branding?.signature_url ?? null,
    stampUrl: branding?.stamp_url ?? null,
    theme: (THEME_KEYS.includes(branding?.theme) ? branding.theme : "corporate") as ThemeKey,
    primaryColor: str(branding?.primary_color) || palette?.primary || DEFAULT_BRANDING.primaryColor,
    secondaryColor: str(branding?.secondary_color) || DEFAULT_BRANDING.secondaryColor,
    accentColor: str(branding?.accent_color) || palette?.accent || DEFAULT_BRANDING.accentColor,
    fontFamily: (["helvetica", "times", "courier"].includes(branding?.font_family) ? branding.font_family : "helvetica"),
    headerNote: str(branding?.header_note),
    footerNote: str(branding?.footer_note),
    paymentInstructions: str(branding?.payment_instructions),
    defaultNotes: str(branding?.default_notes),
    termsLibrary: asArray<TermsEntry>(branding?.terms_library),
    signatoryName: str(branding?.signatory_name),
    signatoryTitle: str(branding?.signatory_title),
    bankDetails: asArray<BankDetail>(branding?.bank_details),
    paymentMethods: asArray<string>(branding?.payment_methods),
    socialLinks: asObject(branding?.social_links),
    documentPrefixes: asObject(branding?.document_prefixes),
    templates: asObject(branding?.templates) as Record<string, ThemeKey>,
    showProviderCredit: Boolean(branding?.show_provider_credit),
    industry: company?.industry ?? null,
  };
}

let cache: { at: number; value: DocumentBranding } | null = null;

/** Branding for the signed-in tenant's active company. Cached briefly. */
export async function loadBranding(opts?: { force?: boolean }): Promise<DocumentBranding> {
  if (!opts?.force && cache && Date.now() - cache.at < 60_000) return cache.value;
  try {
    const companyId = await getActiveCompanyId();
    const [{ data: company }, { data: branding }] = await Promise.all([
      companyId
        ? db.from("companies").select("*").eq("id", companyId).maybeSingle()
        : Promise.resolve({ data: null }),
      companyId
        ? db.from("document_branding").select("*").eq("company_id", companyId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const value = mergeBranding(company, branding);
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function clearBrandingCache() {
  cache = null;
}

/** Persist branding for the active company (RLS decides whether it is allowed). */
export async function saveBranding(patch: Record<string, any>) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  const companyId = await getActiveCompanyId();
  if (!userId || !companyId) throw new Error("No active company");
  const { data: existing } = await db.from("document_branding").select("id").eq("company_id", companyId).maybeSingle();
  if (existing?.id) {
    const { error } = await db.from("document_branding").update(patch).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await db.from("document_branding").insert({ ...patch, user_id: userId, company_id: companyId });
    if (error) throw error;
  }
  clearBrandingCache();
  return true;
}

/* ------------------------------------------------------------------ *
 * Assets
 * ------------------------------------------------------------------ */

const logoCache = new Map<string, string | null>();

/** Resolve a stored logo/signature/stamp reference into a data URL for PDF embedding. */
export async function resolveAssetDataUrl(ref?: string | null): Promise<string | null> {
  if (!ref) return null;
  if (logoCache.has(ref)) return logoCache.get(ref) ?? null;
  let url = ref;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) {
    try {
      const { data } = await supabase.storage.from("company-logos").createSignedUrl(url, 300);
      if (!data?.signedUrl) { logoCache.set(ref, null); return null; }
      url = data.signedUrl;
    } catch { logoCache.set(ref, null); return null; }
  }
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) { logoCache.set(ref, null); return null; }
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    logoCache.set(ref, dataUrl);
    return dataUrl;
  } catch {
    logoCache.set(ref, null);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Helpers shared by the renderer and the settings preview
 * ------------------------------------------------------------------ */

export const hexToRgb = (hex: string): [number, number, number] => {
  const clean = (hex || "").replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full || "0f4c3a", 16);
  if (Number.isNaN(n)) return [15, 76, 58];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const brandDisplayName = (b: DocumentBranding) => b.tradingName || b.legalName;

export const brandAddressLines = (b: DocumentBranding): string[] =>
  [
    b.address,
    [b.city, b.country].filter(Boolean).join(", "),
    [b.phone && `Tel ${b.phone}`, b.email].filter(Boolean).join("  ·  "),
    b.website,
    [b.tpin && `TPIN ${b.tpin}`, b.vatNumber && `VAT ${b.vatNumber}`, b.registrationNumber && `Reg ${b.registrationNumber}`]
      .filter(Boolean).join("  ·  "),
  ].filter((l) => Boolean(l && l.trim()));

/** Template chosen for one document type, falling back to the tenant theme. */
export const themeForDocument = (b: DocumentBranding, docType: string): ThemeKey => {
  const chosen = b.templates?.[docType];
  return chosen && THEME_KEYS.includes(chosen) ? chosen : b.theme;
};

/** Document types that can carry their own template choice. */
export const DOCUMENT_TYPES = [
  "invoice", "proforma", "quote", "sales_receipt", "credit_note", "debit_note",
  "purchase_order", "remittance", "customer_receipt", "customer_statement",
  "delivery_note", "grn", "expense_report", "supplier_payment_report",
  "payslip", "hotel_folio", "restaurant_bill", "school_fee_receipt", "mining_dispatch",
] as const;
export type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeKey, string> = {
  invoice: "Tax Invoice",
  proforma: "Pro-forma Invoice",
  quote: "Quotation",
  sales_receipt: "Sales Receipt",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  purchase_order: "Purchase Order",
  remittance: "Remittance Advice",
  customer_receipt: "Receipt",
  customer_statement: "Statement of Account",
  delivery_note: "Delivery Note",
  grn: "Goods Received Note",
  expense_report: "Expense Report",
  supplier_payment_report: "Supplier Payments Report",
  payslip: "Payslip",
  hotel_folio: "Guest Folio",
  restaurant_bill: "Bill",
  school_fee_receipt: "Fee Receipt",
  mining_dispatch: "Dispatch Note",
};
