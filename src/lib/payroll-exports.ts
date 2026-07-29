// Statutory & bank/mobile-money exports for Zambian payroll runs.
// Every exporter returns a CSV string ready to save.

export type PayrollExportRow = {
  employee_code?: string | null;
  first_name: string;
  last_name: string;
  national_id?: string | null;
  tpin?: string | null;
  napsa_number?: string | null;
  nhima_number?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account?: string | null;
  mobile_money_provider?: string | null; // 'mtn' | 'airtel' | 'zamtel'
  mobile_money_number?: string | null;
  basic: number;
  gross: number;
  taxable: number;
  paye: number;
  napsa: number;
  nhima: number;
  net: number;
};

function csv(rows: (string | number)[][]): string {
  return rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
function money(n: number) { return (Math.round(n * 100) / 100).toFixed(2); }

/** ZRA PAYE (ITX schedule) — Excel/CSV expected by the TaxOnline template. */
export function exportZraPaye(rows: PayrollExportRow[], period: string): string {
  return csv([
    ["TPIN", "NRC", "Employee Name", "Period", "Taxable Pay", "PAYE"],
    ...rows.map(r => [
      r.tpin ?? "",
      r.national_id ?? "",
      `${r.first_name} ${r.last_name}`,
      period,
      money(r.taxable),
      money(r.paye),
    ]),
  ]);
}

/** NAPSA iCare bulk contributions upload. */
export function exportNapsaICare(rows: PayrollExportRow[], period: string): string {
  return csv([
    ["SSN", "NRC", "Surname", "Firstname", "Period", "Basic", "Employee 5%", "Employer 5%", "Total"],
    ...rows.map(r => [
      r.napsa_number ?? "",
      r.national_id ?? "",
      r.last_name, r.first_name,
      period,
      money(r.basic),
      money(r.napsa),
      money(r.napsa),
      money(r.napsa * 2),
    ]),
  ]);
}

/** NHIMA schedule. */
export function exportNhima(rows: PayrollExportRow[], period: string): string {
  return csv([
    ["NHIMA #", "NRC", "Member Name", "Period", "Basic", "Employee 1%", "Employer 1%"],
    ...rows.map(r => [
      r.nhima_number ?? "",
      r.national_id ?? "",
      `${r.first_name} ${r.last_name}`,
      period,
      money(r.basic),
      money(r.nhima),
      money(r.nhima),
    ]),
  ]);
}

/** Generic bank payment schedule (ZANACO PayFlexi / Stanbic / FNB / ABSA). */
export function exportBankSchedule(
  rows: PayrollExportRow[],
  opts: { format: "zanaco" | "stanbic" | "fnb" | "absa" | "generic"; valueDate: string; narration?: string }
): string {
  const narr = opts.narration ?? "SALARY";
  const only = rows.filter(r => r.bank_account && r.net > 0);
  switch (opts.format) {
    case "zanaco":
      return csv([
        ["BeneficiaryName", "AccountNumber", "Branch", "Amount", "Currency", "ValueDate", "Narration"],
        ...only.map(r => [`${r.first_name} ${r.last_name}`, r.bank_account!, r.bank_branch ?? "", money(r.net), "ZMW", opts.valueDate, narr]),
      ]);
    case "stanbic":
      return csv([
        ["Beneficiary", "Bank", "Branch", "AccountNo", "Amount", "Reference"],
        ...only.map(r => [`${r.first_name} ${r.last_name}`, r.bank_name ?? "STANBIC", r.bank_branch ?? "", r.bank_account!, money(r.net), narr]),
      ]);
    case "fnb":
      return csv([
        ["RecipientName", "BankCode", "AccountNumber", "Amount", "MyReference", "TheirReference"],
        ...only.map(r => [`${r.first_name} ${r.last_name}`, r.bank_name ?? "FNB", r.bank_account!, money(r.net), narr, `${narr} ${r.employee_code ?? ""}`.trim()]),
      ]);
    case "absa":
      return csv([
        ["Beneficiary Name", "Beneficiary Bank", "Beneficiary Branch", "Account Number", "Amount", "Reference"],
        ...only.map(r => [`${r.first_name} ${r.last_name}`, r.bank_name ?? "ABSA", r.bank_branch ?? "", r.bank_account!, money(r.net), narr]),
      ]);
    default:
      return csv([
        ["Name", "Bank", "Branch", "Account", "Amount", "Currency", "Reference"],
        ...only.map(r => [`${r.first_name} ${r.last_name}`, r.bank_name ?? "", r.bank_branch ?? "", r.bank_account!, money(r.net), "ZMW", narr]),
      ]);
  }
}

/** Mobile money bulk pay (MTN MoMo / Airtel Money / Zamtel Kwacha). */
export function exportMobileMoney(
  rows: PayrollExportRow[],
  opts: { provider: "mtn" | "airtel" | "zamtel"; reference?: string }
): string {
  const ref = opts.reference ?? "SALARY";
  const only = rows.filter(r => r.mobile_money_number && r.net > 0 &&
    (!opts.provider || (r.mobile_money_provider ?? "").toLowerCase() === opts.provider));
  return csv([
    ["MSISDN", "RecipientName", "Amount", "Currency", "Reference"],
    ...only.map(r => [r.mobile_money_number!, `${r.first_name} ${r.last_name}`, money(r.net), "ZMW", ref]),
  ]);
}

/** Year-end P9-equivalent: certificate of earnings & taxes deducted (per employee, all periods). */
export function exportP9(rowsByEmployee: Record<string, PayrollExportRow[]>, year: number): string {
  const rows: (string | number)[][] = [["Year", "Employee", "TPIN", "NRC", "Total Taxable", "Total PAYE", "Total NAPSA", "Total NHIMA", "Total Net"]];
  for (const [_id, slips] of Object.entries(rowsByEmployee)) {
    if (!slips.length) continue;
    const e = slips[0];
    const t = slips.reduce((s, r) => ({
      taxable: s.taxable + r.taxable, paye: s.paye + r.paye,
      napsa: s.napsa + r.napsa, nhima: s.nhima + r.nhima, net: s.net + r.net,
    }), { taxable: 0, paye: 0, napsa: 0, nhima: 0, net: 0 });
    rows.push([year, `${e.first_name} ${e.last_name}`, e.tpin ?? "", e.national_id ?? "",
      money(t.taxable), money(t.paye), money(t.napsa), money(t.nhima), money(t.net)]);
  }
  return csv(rows);
}

export function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
