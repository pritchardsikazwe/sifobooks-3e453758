// Zambia tax compliance engine — shared by VAT reports, compliance dashboard and Windows/web.
// This module prepares/reconciles tax data; it never claims a government submission succeeded.

export type TaxAdjustmentType = "credit_note" | "debit_note" | "bad_debt_relief" | "import_vat" | "other";
export type TaxAdjustmentDirection = "issued" | "received";
export type TaxAdjustmentStatus = "draft" | "posted" | "voided";

export type TaxAdjustment = {
  id?: string;
  user_id?: string;
  company_id?: string | null;
  document_type: TaxAdjustmentType;
  direction: TaxAdjustmentDirection;
  original_invoice_id?: string | null;
  original_bill_id?: string | null;
  reference: string;
  adjustment_date: string;
  reason: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  status?: TaxAdjustmentStatus;
  zra_reference?: string | null;
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r2 = (v: number) => Math.round(v * 100) / 100;

export function adjustmentSign(a: Pick<TaxAdjustment, "document_type" | "direction">) {
  // Credit notes and bad-debt relief reduce the affected tax side; debit notes increase it.
  return a.document_type === "credit_note" || a.document_type === "bad_debt_relief" ? -1 : 1;
}

export function applyVatAdjustments(
  adjustments: TaxAdjustment[],
  from: string,
  to: string,
) {
  let outputVat = 0;
  let inputVat = 0;
  let outputNet = 0;
  let inputNet = 0;

  for (const a of adjustments ?? []) {
    if (a.status === "voided" || a.status === "draft") continue;
    if (a.adjustment_date < from || a.adjustment_date > to) continue;
    const sign = adjustmentSign(a);
    if (a.direction === "issued") {
      outputNet += sign * n(a.subtotal);
      outputVat += sign * n(a.vat_amount);
    } else {
      inputNet += sign * n(a.subtotal);
      inputVat += sign * n(a.vat_amount);
    }
  }

  return {
    outputNet: r2(outputNet),
    outputVat: r2(outputVat),
    inputNet: r2(inputNet),
    inputVat: r2(inputVat),
  };
}

export type InputVatDecision = {
  claimable: boolean;
  reason: string;
  sourceVat: number;
  claimableVat: number;
  businessUsePercent: number;
  ageDays: number | null;
};

export function evaluateInputVat(opts: {
  taxAmount?: number | null;
  importVat?: number | null;
  vatDate?: string | null;
  returnEnd?: string;
  businessUsePercent?: number | null;
  vatEvidenceType?: string | null;
  status?: string | null;
}) : InputVatDecision {
  const sourceVat = r2(n(opts.importVat) > 0 ? opts.importVat : opts.taxAmount);
  const businessUsePercent = Math.max(0, Math.min(100, n(opts.businessUsePercent ?? 100)));
  const returnEnd = opts.returnEnd ? new Date(opts.returnEnd) : null;
  const vatDate = opts.vatDate ? new Date(opts.vatDate) : null;
  const ageDays = returnEnd && vatDate ? Math.floor((returnEnd.getTime() - vatDate.getTime()) / 86400000) : null;

  if (String(opts.status ?? "").toLowerCase() === "cancelled")
    return { claimable: false, reason: "Cancelled supplier bill.", sourceVat, claimableVat: 0, businessUsePercent, ageDays };
  if (sourceVat <= 0)
    return { claimable: false, reason: "No VAT amount recorded.", sourceVat, claimableVat: 0, businessUsePercent, ageDays };
  if (!opts.vatEvidenceType)
    return { claimable: false, reason: "Valid VAT evidence has not been recorded.", sourceVat, claimableVat: 0, businessUsePercent, ageDays };
  if (returnEnd && vatDate) {
    if (vatDate > returnEnd)
      return { claimable: false, reason: "VAT date is after the return period.", sourceVat, claimableVat: 0, businessUsePercent, ageDays };
    const deadline = new Date(vatDate.getTime());
    deadline.setMonth(deadline.getMonth() + 3);
    if (returnEnd > deadline)
      return { claimable: false, reason: "Input VAT is outside the configured three-month claim window.", sourceVat, claimableVat: 0, businessUsePercent, ageDays };
  }
  if (businessUsePercent <= 0)
    return { claimable: false, reason: "Business-use percentage is zero.", sourceVat, claimableVat: 0, businessUsePercent, ageDays };

  return {
    claimable: true,
    reason: businessUsePercent < 100 ? "Claim apportioned to taxable business use." : "Eligible input VAT.",
    sourceVat,
    claimableVat: r2(sourceVat * businessUsePercent / 100),
    businessUsePercent,
    ageDays,
  };
}

export type VatReconciliation = {
  sourceOutputVat: number;
  sourceInputVat: number;
  adjustmentsOutputVat: number;
  adjustmentsInputVat: number;
  returnOutputVat: number;
  returnInputVat: number;
  outputDifference: number;
  inputDifference: number;
  netDifference: number;
  reconciled: boolean;
};

export function reconcileVat(
  source: { outputVat: number; inputVat: number },
  adjustments: { outputVat: number; inputVat: number },
  reported: { outputVat: number; inputVat: number },
): VatReconciliation {
  const expectedOutput = r2(n(source.outputVat) + n(adjustments.outputVat));
  const expectedInput = r2(n(source.inputVat) + n(adjustments.inputVat));
  const outputDifference = r2(expectedOutput - n(reported.outputVat));
  const inputDifference = r2(expectedInput - n(reported.inputVat));
  return {
    sourceOutputVat: r2(n(source.outputVat)),
    sourceInputVat: r2(n(source.inputVat)),
    adjustmentsOutputVat: r2(n(adjustments.outputVat)),
    adjustmentsInputVat: r2(n(adjustments.inputVat)),
    returnOutputVat: r2(n(reported.outputVat)),
    returnInputVat: r2(n(reported.inputVat)),
    outputDifference,
    inputDifference,
    netDifference: r2(outputDifference - inputDifference),
    reconciled: Math.abs(outputDifference) < 0.01 && Math.abs(inputDifference) < 0.01,
  };
}

export type Vat3Row = { box: string; description: string; amount: number };

export function buildVat3Rows(t: {
  salesStandardNet: number;
  salesStandardVat: number;
  salesZeroRatedNet: number;
  purchasesNet: number;
  purchasesVat: number;
  adjustments?: ReturnType<typeof applyVatAdjustments>;
}) : Vat3Row[] {
  const a = t.adjustments ?? { outputNet: 0, outputVat: 0, inputNet: 0, inputVat: 0 };
  const outputVat = r2(t.salesStandardVat + a.outputVat);
  const inputVat = r2(t.purchasesVat + a.inputVat);
  const netVat = r2(outputVat - inputVat);
  return [
    { box: "1", description: "Standard-rated supplies (net)", amount: r2(t.salesStandardNet + a.outputNet) },
    { box: "2", description: "Output VAT", amount: outputVat },
    { box: "3", description: "Zero-rated / export supplies (net)", amount: r2(t.salesZeroRatedNet) },
    { box: "4", description: "Taxable purchases (net)", amount: r2(t.purchasesNet + a.inputNet) },
    { box: "5", description: "Input VAT", amount: inputVat },
    { box: "6", description: netVat >= 0 ? "VAT payable" : "VAT credit/refund", amount: Math.abs(netVat) },
  ];
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportVat3Csv(rows: Vat3Row[], period: string) {
  return [
    ["SifoBooks", "ZRA VAT 3 preparation", period],
    ["Box", "Description", "Amount (ZMW)"],
    ...rows.map(r => [r.box, r.description, r.amount.toFixed(2)]),
  ].map(r => r.map(csvCell).join(",")).join("\n");
}

export function exportVatRegisterCsv(rows: Array<{
  date: string; reference: string; party: string; net: number; vat: number; total: number; taxType: string;
}>) {
  return [
    ["Date", "Reference", "Party", "Tax Type", "Net", "VAT", "Total"],
    ...rows.map(r => [r.date, r.reference, r.party, r.taxType, r.net.toFixed(2), r.vat.toFixed(2), r.total.toFixed(2)]),
  ].map(r => r.map(csvCell).join(",")).join("\n");
}

export type FilingKind = "VAT" | "PAYE" | "NAPSA" | "NHIMA" | "WHT" | "TOT" | "SDL";

export function filingDueDate(kind: FilingKind, period: string) {
  const [y, m] = period.split("-").map(Number);
  const next = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
  const day = kind === "VAT" ? 18 : kind === "WHT" || kind === "TOT" ? 14 : 10;
  return `${next.year}-${String(next.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function downloadTaxCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
