export interface PrinterConfiguration {
  defaultPrinter?: string;
  receiptPrinter?: string;
  accountingPrinter?: string;
  kitchenPrinter?: string;
  barPrinter?: string;
  labelPrinter?: string;
  terminalName?: string;
}

const STORAGE_KEY = "sifobooks_printer_configuration";

export function getPrinterConfiguration(): PrinterConfiguration {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function savePrinterConfiguration(configuration: PrinterConfiguration) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration));
}

export function getPrinterForType(
  type: "receipt" | "pdf" | "kitchen" | "bar" | "label",
): string | undefined {
  const config = getPrinterConfiguration();
  switch (type) {
    case "receipt": return config.receiptPrinter || config.defaultPrinter;
    case "pdf": return config.accountingPrinter || config.defaultPrinter;
    case "kitchen": return config.kitchenPrinter || config.defaultPrinter;
    case "bar": return config.barPrinter || config.defaultPrinter;
    case "label": return config.labelPrinter || config.defaultPrinter;
    default: return config.defaultPrinter;
  }
}
