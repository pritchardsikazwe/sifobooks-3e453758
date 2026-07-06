export const fmtMoney = (n: number, currency = "ZMW") =>
  `${currency} ${Number(n || 0).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtCompact = (n: number, currency = "ZMW") => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${currency} ${(n / 1_000).toFixed(1)}K`;
  return `${currency} ${n.toFixed(0)}`;
};

export const monthName = (m: number) =>
  ["January","February","March","April","May","June","July","August","September","October","November","December"][m - 1] ?? "January";
