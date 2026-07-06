export const fmt = (n: number, ccy = "ZMW") =>
  new Intl.NumberFormat("en-ZM", { style: "currency", currency: ccy, maximumFractionDigits: 2 }).format(n || 0);

export const num = (n: any) => Number(n || 0);

export function ageBucket(dateStr: string | null | undefined): "current" | "1-30" | "31-60" | "61-90" | "90+" {
  if (!dateStr) return "current";
  const d = new Date(dateStr);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export const monthRange = (yyyyMm?: string) => {
  const now = new Date();
  const [y, m] = yyyyMm
    ? yyyyMm.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from, to, label: `${y}-${String(m).padStart(2, "0")}` };
};

export const exportCsv = (rows: Record<string, any>[], filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
