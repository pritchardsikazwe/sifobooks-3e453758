import type { IndustryEdition } from "./industry-starters";

export type ComplianceRule = {
  code: string;
  moduleKeys: string[];
  why: string;
  setupFields: string[];
};

export const ZAMBIA_MODULE_COMPLIANCE: Record<IndustryEdition, ComplianceRule[]> = {
  accounting: [
    { code: "ZRA", moduleKeys: ["accounting", "tax", "sales", "purchasing"], why: "Tax records, invoices, purchases and accounting should map consistently to the applicable ZRA obligations.", setupFields: ["TPIN", "tax types", "tax period"] },
    { code: "SMART_INVOICE", moduleKeys: ["sales", "inventory"], why: "Sales items and tax codes need a controlled path to Smart Invoice when the taxpayer is within scope.", setupFields: ["Smart Invoice status", "device/connector", "item/tax mapping"] },
    { code: "NAPSA", moduleKeys: ["payroll"], why: "Payroll must retain employee and employer contribution records for eligible staff.", setupFields: ["employer number", "employee SSN", "contribution settings"] },
    { code: "NHIMA", moduleKeys: ["payroll"], why: "Payroll should retain health-insurance contribution records for eligible employees.", setupFields: ["employer registration", "employee records"] },
    { code: "PACRA", moduleKeys: ["company"], why: "Company master data should preserve registration and ownership records.", setupFields: ["PACRA number", "annual return status"] },
  ],
  retail: [
    { code: "ZRA", moduleKeys: ["butchery"], why: "Weighted meat sales and stock movements must use the configured applicable tax treatment.", setupFields: ["TPIN", "VAT status", "tax types"] },
    { code: "SMART_INVOICE", moduleKeys: ["butchery"], why: "Applicable fiscalised weighted sales require controlled item, unit and tax mapping.", setupFields: ["item mapping", "unit code", "device/connector"] },
    { code: "ZRA", moduleKeys: ["sales", "pos", "inventory", "purchasing", "accounting"], why: "Retail transactions need consistent tax and accounting treatment.", setupFields: ["TPIN", "tax types", "VAT status"] },
    { code: "SMART_INVOICE", moduleKeys: ["pos", "sales", "inventory"], why: "POS item and tax mapping must support the applicable Smart Invoice workflow.", setupFields: ["item mapping", "device", "VSDC status"] },
    { code: "PACRA", moduleKeys: ["company"], why: "Company registration records belong in the company compliance profile.", setupFields: ["PACRA number", "annual return status"] },
    { code: "NAPSA", moduleKeys: ["payroll"], why: "Cashiers and other eligible employees require payroll contribution records.", setupFields: ["employer number", "employee SSN"] },
    { code: "NHIMA", moduleKeys: ["payroll"], why: "Eligible employees require contribution records.", setupFields: ["employer registration", "employee records"] },
  ],
  restaurant: [
    { code: "ZRA", moduleKeys: ["sales", "pos", "inventory", "purchasing", "accounting"], why: "Restaurant sales, purchases, stock and accounting must use a consistent tax configuration.", setupFields: ["TPIN", "VAT status", "tax types"] },
    { code: "SMART_INVOICE", moduleKeys: ["pos", "sales", "inventory"], why: "Fiscalised sales require controlled item, tax and device mapping where applicable.", setupFields: ["Smart Invoice status", "device/connector", "item mapping"] },
    { code: "NAPSA", moduleKeys: ["payroll"], why: "Restaurant employees such as cashiers, waiters and kitchen staff need statutory payroll records when eligible.", setupFields: ["employer number", "employee SSN"] },
    { code: "NHIMA", moduleKeys: ["payroll"], why: "Eligible employees require contribution records.", setupFields: ["employer registration", "employee records"] },
    { code: "WCF", moduleKeys: ["payroll", "hr"], why: "Employer workers' compensation records should be maintained where applicable.", setupFields: ["employer record", "assessment", "renewal"] },
    { code: "COUNCIL", moduleKeys: ["company", "restaurant"], why: "Local authority requirements can apply to premises, health, fire and business activities.", setupFields: ["licence/levy", "issue date", "expiry date"] },
    { code: "TOURISM", moduleKeys: ["restaurant"], why: "Certain hospitality activities may require tourism licensing or related records.", setupFields: ["licence number", "issue date", "expiry date"] },
  ],
  hotel: [
    { code: "ZRA", moduleKeys: ["sales", "pos", "inventory", "accounting", "rooms", "folios"], why: "Accommodation and outlet transactions require consistent tax and accounting configuration.", setupFields: ["TPIN", "VAT status", "tax types"] },
    { code: "SMART_INVOICE", moduleKeys: ["pos", "sales", "folios"], why: "Applicable fiscalised invoices should be linked to controlled outlet and folio transactions.", setupFields: ["Smart Invoice status", "device/connector"] },
    { code: "NAPSA", moduleKeys: ["payroll"], why: "Hotel employees require statutory payroll records when eligible.", setupFields: ["employer number", "employee SSN"] },
    { code: "NHIMA", moduleKeys: ["payroll"], why: "Eligible employees require contribution records.", setupFields: ["employer registration", "employee records"] },
    { code: "TOURISM", moduleKeys: ["rooms", "reservations"], why: "Accommodation operations should maintain applicable tourism licensing records.", setupFields: ["licence number", "expiry date"] },
    { code: "COUNCIL", moduleKeys: ["company", "rooms"], why: "Premises may be subject to local authority requirements.", setupFields: ["licence/levy", "expiry date"] },
  ],
  school: [
    { code: "ZRA", moduleKeys: ["accounting", "sales", "fees", "purchasing"], why: "Tax applicability must be configured based on the school's activities and tax status.", setupFields: ["TPIN", "tax types"] },
    { code: "PACRA", moduleKeys: ["company"], why: "School company/trust registration information should be maintained where applicable.", setupFields: ["registration number", "annual return status"] },
    { code: "NAPSA", moduleKeys: ["payroll"], why: "Eligible teaching and support staff require payroll contribution records.", setupFields: ["employer number", "employee SSN"] },
    { code: "NHIMA", moduleKeys: ["payroll"], why: "Eligible employees require contribution records.", setupFields: ["employer registration", "employee records"] },
    { code: "TEVETA", moduleKeys: ["payroll"], why: "Configure the Skills Development Levy when the employer falls within its scope.", setupFields: ["TEVETA status", "levy records"] },
    { code: "COUNCIL", moduleKeys: ["company"], why: "Maintain applicable premises, fire, health and local-authority records.", setupFields: ["licence/levy", "expiry date"] },
  ],
  property: [
    { code: "ZRA", moduleKeys: ["accounting", "sales", "rent"], why: "Rent, service charges and property costs require the applicable tax treatment.", setupFields: ["TPIN", "tax types", "VAT status"] },
    { code: "SMART_INVOICE", moduleKeys: ["sales", "rent"], why: "Applicable invoices should be mapped to the Smart Invoice workflow.", setupFields: ["Smart Invoice status", "item/service mapping"] },
    { code: "PACRA", moduleKeys: ["company"], why: "Property management company records should remain current.", setupFields: ["PACRA number", "annual return status"] },
    { code: "COUNCIL", moduleKeys: ["properties"], why: "Property and premises can have local authority rates or licences.", setupFields: ["property/levy records", "expiry date"] },
  ],
  lending: [
    { code: "PACRA", moduleKeys: ["company", "borrowers"], why: "Maintain company and borrower verification records appropriate to the institution.", setupFields: ["PACRA number", "registration status"] },
    { code: "ZRA", moduleKeys: ["accounting"], why: "Configure the tax treatment applicable to lending and other activities.", setupFields: ["TPIN", "tax types"] },
    { code: "BOZ", moduleKeys: ["borrowers", "loans", "repayments"], why: "Financial-sector licensing and reporting depend on the institution and activities; configure applicable requirements before production.", setupFields: ["licence category", "regulatory status"] },
    { code: "NAPSA", moduleKeys: ["payroll"], why: "Eligible employees require payroll contribution records.", setupFields: ["employer number", "employee SSN"] },
    { code: "NHIMA", moduleKeys: ["payroll"], why: "Eligible employees require contribution records.", setupFields: ["employer registration", "employee records"] },
  ],
  enterprise: [
    { code: "PACRA", moduleKeys: ["company"], why: "Maintain corporate registration and ownership records.", setupFields: ["PACRA number", "annual return status"] },
    { code: "ZRA", moduleKeys: ["accounting", "tax", "sales", "purchasing", "inventory"], why: "Enterprise transactions should share a single controlled tax configuration and audit trail.", setupFields: ["TPIN", "tax types", "tax periods"] },
    { code: "SMART_INVOICE", moduleKeys: ["sales", "inventory", "pos"], why: "Applicable fiscalised transactions require item, tax and device controls.", setupFields: ["Smart Invoice status", "device/connector", "item mapping"] },
    { code: "NAPSA", moduleKeys: ["payroll"], why: "Eligible employees require contribution records.", setupFields: ["employer number", "employee SSN"] },
    { code: "NHIMA", moduleKeys: ["payroll"], why: "Eligible employees require contribution records.", setupFields: ["employer registration", "employee records"] },
    { code: "WCF", moduleKeys: ["hr", "payroll"], why: "Maintain workers' compensation records where applicable.", setupFields: ["employer record", "assessment"] },
    { code: "ZEMA", moduleKeys: ["company"], why: "Configure environmental obligations where the enterprise activity requires them.", setupFields: ["licence/approval", "expiry date"] },
    { code: "ZPPA", moduleKeys: ["purchasing"], why: "Configure procurement-related records where public procurement participation applies.", setupFields: ["supplier registration", "renewal date"] },
  ],
};

export function getModuleCompliance(edition: IndustryEdition, moduleKey: string): ComplianceRule[] {
  return ZAMBIA_MODULE_COMPLIANCE[edition].filter((rule) => rule.moduleKeys.includes(moduleKey));
}
