export type SifoBooksEdition = "enterprise" | "accounting" | "retail" | "restaurant" | "hotel" | "school" | "property" | "lending" | "payroll";

const raw = String((import.meta as any).env?.VITE_SIFOBOOKS_EDITION || "enterprise").toLowerCase();

export const SIFOBOOKS_EDITION: SifoBooksEdition =
  (["enterprise", "accounting", "retail", "restaurant", "hotel", "school", "property", "lending", "payroll"] as const).includes(raw as SifoBooksEdition)
    ? raw as SifoBooksEdition
    : "enterprise";

export const SIFOBOOKS_EDITION_LABEL: Record<SifoBooksEdition, string> = {
  enterprise: "Enterprise",
  accounting: "Accounting",
  retail: "Retail",
  restaurant: "Restaurant",
  hotel: "Hotel",
  school: "School",
  property: "Property",
  lending: "Microfinance",
  payroll: "Payroll",
};

export const SIFOBOOKS_PRODUCT_NAME =
  SIFOBOOKS_EDITION === "enterprise"
    ? "SifoBooks"
    : `SifoBooks ${SIFOBOOKS_EDITION_LABEL[SIFOBOOKS_EDITION]}`;
