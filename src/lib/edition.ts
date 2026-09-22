export type SifoBooksEdition = "enterprise" | "accounting" | "retail" | "restaurant";

const raw = String((import.meta as any).env?.VITE_SIFOBOOKS_EDITION || "enterprise").toLowerCase();

export const SIFOBOOKS_EDITION: SifoBooksEdition =
  raw === "restaurant" || raw === "retail" || raw === "accounting" ? raw : "enterprise";

export const SIFOBOOKS_EDITION_LABEL: Record<SifoBooksEdition, string> = {
  enterprise: "Enterprise",
  accounting: "Accounting",
  retail: "Retail",
  restaurant: "Restaurant",
};

export const SIFOBOOKS_PRODUCT_NAME =
  SIFOBOOKS_EDITION === "enterprise"
    ? "SifoBooks"
    : `SifoBooks ${SIFOBOOKS_EDITION_LABEL[SIFOBOOKS_EDITION]}`;
