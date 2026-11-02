export type SifoBooksEdition = "enterprise" | "accounting" | "retail" | "restaurant" | "hotel" | "school" | "property" | "lending" | "payroll";

const raw = String((import.meta as any).env?.VITE_SIFOBOOKS_EDITION || "accounting").toLowerCase();

export const SIFOBOOKS_EDITION: SifoBooksEdition =
  raw === "accounting" ? "accounting" : "accounting";

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

export const SIFOBOOKS_PRODUCT_NAME = "SifoBooks";
