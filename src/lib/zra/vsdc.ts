/**
 * ZRA Smart Invoice VSDC client.
 *
 * SifoBooks talks to the locally hosted ZRA VSDC over REST/JSON.
 * The VSDC WAR/JAR remains a separate Java/Tomcat component supplied by ZRA.
 *
 * VSDC authentication keys are obtained by the VSDC during device
 * initialization; SifoBooks deliberately does not implement ZRA cryptography.
 */

export type VsdcResponse<T = unknown> = {
  resultCd?: string;
  resultMsg?: string;
  resultDt?: string;
  data?: T;
  [key: string]: unknown;
};

export type VsdcConfig = {
  baseUrl: string;
  timeoutMs?: number;
  paths?: Partial<typeof DEFAULT_PATHS>;
};

export const DEFAULT_PATHS = {
  testEcho: "/test/echo",
  initialize: "/initializer/selectInitInfo",
  serverTime: "/serverTime/selectServerTime",
  taxpayerInfo: "/taxpayerInfo/selectTaxpayerInfo",
  codes: "/code/search/selectCodeList",
  itemClasses: "/item/class/search/selectItemClsList",
  saveItem: "/item/base/saveItem",
  selectItems: "/item/base/search/selectItemList",
  saveSales: "/trns/sales/base/saveTrnsSalesVsdc",
  selectInvoice: "/trns/sales/base/search/selectTrnsInvoiceVsdc",
  saveStockItems: "/stock/io/saveStockIO",
  saveStockMaster: "/stockMaster/saveStockMasterList",
} as const;

function normaliseBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function getConfig(config?: Partial<VsdcConfig>): VsdcConfig {
  const baseUrl = config?.baseUrl || process.env.ZRA_VSDC_URL;
  if (!baseUrl) {
    throw new Error("ZRA_VSDC_URL is not configured. Deploy the ZRA VSDC WAR/JAR first.");
  }
  return {
    baseUrl: normaliseBaseUrl(baseUrl),
    timeoutMs: config?.timeoutMs ?? Number(process.env.ZRA_VSDC_TIMEOUT_MS || 15000),
    paths: { ...DEFAULT_PATHS, ...(config?.paths || {}) },
  };
}

export async function vsdcPost<T = unknown>(
  path: string,
  payload: Record<string, unknown>,
  config?: Partial<VsdcConfig>,
): Promise<VsdcResponse<T>> {
  const cfg = getConfig(config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const response = await fetch(cfg.baseUrl + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const raw = await response.text();
    let body: VsdcResponse<T>;
    try {
      body = JSON.parse(raw) as VsdcResponse<T>;
    } catch {
      throw new Error("VSDC returned HTTP " + response.status + " with non-JSON response: " + raw.slice(0, 500));
    }

    if (!response.ok) {
      throw new Error("VSDC HTTP " + response.status + ": " + (body.resultMsg || "Request failed"));
    }

    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function initializeDevice(payload: { tpin: string; bhfId: string; dvcSrlNo: string }, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.initialize, payload, config);
}

export async function getStandardCodes(payload: { tpin: string; bhfId: string; lastReqDt: string }, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.codes, payload, config);
}

export async function getItemClasses(payload: { tpin: string; bhfId: string; lastReqDt: string }, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.itemClasses, payload, config);
}

export async function saveItem(payload: Record<string, unknown>, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.saveItem, payload, config);
}

export async function saveSales(payload: Record<string, unknown>, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.saveSales, payload, config);
}

export async function selectInvoice(payload: Record<string, unknown>, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.selectInvoice, payload, config);
}

export async function saveStockItems(payload: Record<string, unknown>, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.saveStockItems, payload, config);
}

export async function saveStockMaster(payload: Record<string, unknown>, config?: Partial<VsdcConfig>) {
  return vsdcPost(DEFAULT_PATHS.saveStockMaster, payload, config);
}

export function isSuccessfulVsdcResponse(response: VsdcResponse): boolean {
  return response.resultCd === "000";
}
