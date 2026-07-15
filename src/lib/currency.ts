// Currency helpers — ZMW (Kwacha) is the SifoBooks default base currency.

export const CURRENCIES = [
  { code: "ZMW", label: "Zambian Kwacha", symbol: "K" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { code: "TZS", label: "Tanzanian Shilling", symbol: "TSh" },
  { code: "MWK", label: "Malawian Kwacha", symbol: "MK" },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"] | string;

const SYMBOLS: Record<string, string> = Object.fromEntries(CURRENCIES.map(c => [c.code, c.symbol]));

export const currencySymbol = (code?: string | null) =>
  code ? SYMBOLS[code.toUpperCase()] ?? code.toUpperCase() : "K";

export const formatMoney = (n: number | null | undefined, code: string = "ZMW") => {
  const sym = currencySymbol(code);
  const v = Number(n ?? 0);
  return `${sym} ${v.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Convert an amount in `from` currency into `to` currency using a rate table lookup.
// Rate = units of `to` per 1 unit of `from`.
export const convert = (amount: number, rate: number) => Number(amount) * Number(rate || 1);
