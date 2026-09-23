export type ScaleReading = { weight: number; stable: boolean; raw: string; unit: string };

export type ScaleConfig = {
  unit?: string;
  decimalPlaces?: number;
};

/**
 * Parse common serial scale output. This deliberately supports simple
 * whitespace-delimited streams first; manufacturer-specific protocols can be
 * added as adapters without changing the POS.
 */
export function parseScaleReading(raw: string, config: ScaleConfig = {}): ScaleReading | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const match = text.match(/([+-]?\d+(?:[.,]\d+)?)\s*(kg|kgs|g|lb|lbs)?/i);
  if (!match) return null;
  const rawNumber = Number(match[1].replace(",", "."));
  if (!Number.isFinite(rawNumber) || rawNumber < 0) return null;
  const unit = (match[2] || config.unit || "kg").toLowerCase();
  const stable = /stable|st|\bS\b/i.test(text);
  let weight = rawNumber;
  if (unit === "g") weight = rawNumber / 1000;
  if (unit === "lb" || unit === "lbs") weight = rawNumber * 0.45359237;
  return { weight, stable, raw: text, unit: "kg" };
}

export async function openWebSerialScale(onReading: (reading: ScaleReading) => void, baudRate = 9600) {
  const serial = (navigator as any).serial;
  if (!serial?.requestPort) throw new Error("WEB_SERIAL_UNAVAILABLE");
  const port = await serial.requestPort();
  await port.open({ baudRate });
  const decoder = new TextDecoderStream();
  const pipe = port.readable?.pipeTo(decoder.writable);
  const reader = decoder.readable.getReader();
  let buffer = "";
  const loop = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value || "";
      const parts = buffer.split(/[\r\n]+/);
      buffer = parts.pop() || "";
      for (const part of parts) {
        const parsed = parseScaleReading(part);
        if (parsed) onReading(parsed);
      }
    }
  })();
  return {
    port,
    reader,
    pipe,
    stop: async () => {
      try { await reader.cancel(); } catch {}
      try { await port.close(); } catch {}
      try { await loop; } catch {}
    },
  };
}

export function calculateYield(inputKg: number, saleableKg: number, wasteKg: number) {
  const input = Math.max(0, Number(inputKg) || 0);
  const saleable = Math.max(0, Number(saleableKg) || 0);
  const waste = Math.max(0, Number(wasteKg) || 0);
  return {
    saleablePercent: input ? (saleable / input) * 100 : 0,
    wastePercent: input ? (waste / input) * 100 : 0,
    balanceKg: input - saleable - waste,
  };
}

export function weightedCostPerKg(totalCost: number, saleableKg: number) {
  const cost = Number(totalCost) || 0;
  const qty = Number(saleableKg) || 0;
  return qty > 0 ? cost / qty : 0;
}
