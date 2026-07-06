// Lightweight parser for CSV and OFX/QFX bank statements.
// Returns rows normalised to { txn_date, description, amount, balance?, reference? }.

export type ParsedTxn = {
  txn_date: string; // yyyy-mm-dd
  description: string;
  amount: number;
  balance?: number | null;
  reference?: string | null;
};

const toISODate = (raw: string): string | null => {
  const s = raw.trim().replace(/^"|"$/g, "");
  if (!s) return null;
  // OFX YYYYMMDD or YYYYMMDDHHMMSS
  const ofx = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${y}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
};

const toNumber = (raw: string | undefined | null): number | null => {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[",\s]/g, "").replace(/\((.*)\)/, "-$1");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// naive CSV row splitter that respects quoted commas
const splitCsv = (line: string): string[] => {
  const out: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export function parseCsv(text: string): ParsedTxn[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsv(lines[0]).map(norm);

  const dateIdx = headers.findIndex(h => ["date", "txndate", "transactiondate", "posteddate", "postingdate"].includes(h));
  const descIdx = headers.findIndex(h => ["description", "narration", "details", "memo", "particulars", "narrative"].includes(h));
  const amtIdx  = headers.findIndex(h => ["amount", "value"].includes(h));
  const debIdx  = headers.findIndex(h => ["debit", "withdrawal", "moneyout"].includes(h));
  const crdIdx  = headers.findIndex(h => ["credit", "deposit", "moneyin"].includes(h));
  const balIdx  = headers.findIndex(h => ["balance", "runningbalance", "closingbalance"].includes(h));
  const refIdx  = headers.findIndex(h => ["reference", "ref", "chequeno", "chequenumber"].includes(h));

  const rows: ParsedTxn[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsv(lines[i]);
    const date = toISODate(cols[dateIdx] ?? "");
    if (!date) continue;
    let amount: number | null = null;
    if (amtIdx >= 0) amount = toNumber(cols[amtIdx]);
    if (amount == null) {
      const dr = toNumber(cols[debIdx]); const cr = toNumber(cols[crdIdx]);
      if (cr != null) amount = cr;
      else if (dr != null) amount = -Math.abs(dr);
    }
    if (amount == null) continue;
    rows.push({
      txn_date: date,
      description: (cols[descIdx] ?? "").trim() || "(no description)",
      amount,
      balance: balIdx >= 0 ? toNumber(cols[balIdx]) : null,
      reference: refIdx >= 0 ? (cols[refIdx] ?? "").trim() || null : null,
    });
  }
  return rows;
}

export function parseOfx(text: string): ParsedTxn[] {
  const rows: ParsedTxn[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/STMTTRN>/i)[0];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
      return m ? m[1].trim() : "";
    };
    const date = toISODate(get("DTPOSTED"));
    const amount = toNumber(get("TRNAMT"));
    if (!date || amount == null) continue;
    rows.push({
      txn_date: date,
      description: get("NAME") || get("MEMO") || "(no description)",
      amount,
      balance: null,
      reference: get("FITID") || get("CHECKNUM") || null,
    });
  }
  return rows;
}

export function parseStatement(filename: string, text: string): ParsedTxn[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx") || /<OFX>/i.test(text)) return parseOfx(text);
  return parseCsv(text);
}
