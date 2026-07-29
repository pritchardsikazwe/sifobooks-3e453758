// Convert a number to English words (Kwacha / Ngwee) for payslips & cheques.
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigits(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + threeDigits(n % 100) : "");
}

function intToWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const scales = [
    { v: 1_000_000_000, name: "Billion" },
    { v: 1_000_000, name: "Million" },
    { v: 1_000, name: "Thousand" },
  ];
  for (const s of scales) {
    if (n >= s.v) {
      parts.push(threeDigits(Math.floor(n / s.v)) + " " + s.name);
      n %= s.v;
    }
  }
  if (n > 0) parts.push(threeDigits(n));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** "One Thousand Two Hundred Kwacha and Fifty Ngwee Only" */
export function amountInWords(amount: number, currency = "Kwacha", subUnit = "Ngwee"): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const wholeWords = intToWords(whole);
  const centWords = cents > 0 ? ` and ${intToWords(cents)} ${subUnit}` : "";
  return `${negative ? "Negative " : ""}${wholeWords} ${currency}${centWords} Only`;
}
