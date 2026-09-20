import { createServerFn } from "@tanstack/react-start";
import { getDb, generateUUID } from "../db/database";
import {
  getItemClasses,
  getStandardCodes,
  initializeDevice,
  isSuccessfulVsdcResponse,
  saveItem,
  saveSales,
  saveStockItems,
  saveStockMaster,
  selectInvoice,
} from "./vsdc";

type ZraConfigInput = {
  userId: string;
  branchId?: string | null;
};

function getSavedConfig(userId: string, branchId?: string | null) {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM zra_smart_invoice_config WHERE user_id = ? AND (? IS NULL OR branch_id = ?) ORDER BY updated_at DESC LIMIT 1",
  ).get(userId, branchId ?? null, branchId ?? null) as any;
  return row;
}

function requireVsdcUrl(config?: any) {
  const url = config?.vsdc_endpoint || process.env.ZRA_VSDC_URL;
  if (!url) throw new Error("ZRA VSDC endpoint is not configured.");
  return url;
}

export const zraGetConfigFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as ZraConfigInput)
  .handler(async ({ data }) => {
    return { data: getSavedConfig(data.userId, data.branchId), error: null };
  });

export const zraSaveConfigFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string;
    branchId?: string | null;
    mode?: string;
    taxpayerName?: string | null;
    tpin?: string | null;
    branchCode?: string | null;
    deviceSerial?: string | null;
    vsdcEndpoint?: string | null;
    notes?: string | null;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const id = generateUUID();
    db.prepare(
      `INSERT INTO zra_smart_invoice_config
       (id,user_id,branch_id,mode,taxpayer_name,tpin,branch_code,device_serial,vsdc_endpoint,notes,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
    ).run(
      id,
      data.userId,
      data.branchId ?? null,
      data.mode ?? "test",
      data.taxpayerName ?? null,
      data.tpin ?? null,
      data.branchCode ?? null,
      data.deviceSerial ?? null,
      data.vsdcEndpoint ?? null,
      data.notes ?? null,
    );
    return { data: getSavedConfig(data.userId, data.branchId), error: null };
  });

export const zraInitializeDeviceFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string;
    branchId?: string | null;
    tpin: string;
    bhfId: string;
    dvcSrlNo: string;
  })
  .handler(async ({ data }) => {
    const cfg = getSavedConfig(data.userId, data.branchId);
    const response = await initializeDevice(
      { tpin: data.tpin, bhfId: data.bhfId, dvcSrlNo: data.dvcSrlNo },
      { baseUrl: requireVsdcUrl(cfg) },
    );

    const db = getDb();
    db.prepare(
      "UPDATE zra_smart_invoice_config SET mode=?,tpin=?,branch_code=?,device_serial=?,taxpayer_name=COALESCE(?,taxpayer_name),last_verified_at=datetime('now'),updated_at=datetime('now') WHERE id=?",
    ).run(
      isSuccessfulVsdcResponse(response) ? "initialized" : "test",
      data.tpin,
      data.bhfId,
      data.dvcSrlNo,
      (response as any).data?.info?.taxprNm ?? null,
      cfg?.id ?? "",
    );

    return response;
  });

export const zraGetStandardCodesFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string; branchId?: string | null; tpin: string; bhfId: string; lastReqDt: string;
  })
  .handler(async ({ data }) => {
    const cfg = getSavedConfig(data.userId, data.branchId);
    return getStandardCodes(
      { tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt },
      { baseUrl: requireVsdcUrl(cfg) },
    );
  });

export const zraGetItemClassesFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string; branchId?: string | null; tpin: string; bhfId: string; lastReqDt: string;
  })
  .handler(async ({ data }) => {
    const cfg = getSavedConfig(data.userId, data.branchId);
    return getItemClasses(
      { tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt },
      { baseUrl: requireVsdcUrl(cfg) },
    );
  });

export const zraSaveItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string; branchId?: string | null; payload: Record<string, unknown>;
  })
  .handler(async ({ data }) => {
    const cfg = getSavedConfig(data.userId, data.branchId);
    return saveItem(data.payload, { baseUrl: requireVsdcUrl(cfg) });
  });

export const zraSubmitSaleFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string;
    branchId?: string | null;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    total?: number;
    vatAmount?: number;
    levyAmount?: number;
    payload: Record<string, unknown>;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const queueId = generateUUID();
    db.prepare(
      `INSERT INTO zra_invoice_queue
       (id,user_id,source_type,source_id,invoice_number,total,vat_amount,levy_amount,status,payload,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
    ).run(
      queueId,
      data.userId,
      "invoice",
      data.invoiceId ?? null,
      data.invoiceNumber ?? null,
      data.total ?? Number(data.payload.totAmt ?? 0),
      data.vatAmount ?? Number(data.payload.totTaxAmt ?? 0),
      data.levyAmount ?? 0,
      "submitting",
      JSON.stringify(data.payload),
    );

    try {
      const cfg = getSavedConfig(data.userId, data.branchId);
      const response: any = await saveSales(
        data.payload,
        { baseUrl: requireVsdcUrl(cfg) },
      );

      const success = isSuccessfulVsdcResponse(response);
      const zraData = response.data ?? {};
      db.prepare(
        `UPDATE zra_invoice_queue SET status=?,submitted_at=CASE WHEN ? THEN datetime('now') ELSE submitted_at END,
         response_code=?,response_message=?,zra_receipt_number=?,zra_internal_data=?,zra_receipt_signature=?,zra_qr_url=?,updated_at=datetime('now')
         WHERE id=?`,
      ).run(
        success ? "submitted" : "failed",
        success ? 1 : 0,
        response.resultCd ?? null,
        response.resultMsg ?? null,
        zraData.rcptNo ?? null,
        zraData.intrlData ?? null,
        zraData.rcptSign ?? null,
        zraData.qrCodeUrl ?? null,
        queueId,
      );
      return { queueId, response };
    } catch (error: any) {
      db.prepare(
        "UPDATE zra_invoice_queue SET status='failed',response_message=?,updated_at=datetime('now') WHERE id=?",
      ).run(error?.message || "VSDC request failed", queueId);
      throw error;
    }
  });

export const zraSelectInvoiceFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string; branchId?: string | null; payload: Record<string, unknown>;
  })
  .handler(async ({ data }) => {
    const cfg = getSavedConfig(data.userId, data.branchId);
    return selectInvoice(data.payload, { baseUrl: requireVsdcUrl(cfg) });
  });

export const zraSaveStockItemsFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string; branchId?: string | null; payload: Record<string, unknown>;
  })
  .handler(async ({ data }) => {
    const cfg = getSavedConfig(data.userId, data.branchId);
    return saveStockItems(data.payload, { baseUrl: requireVsdcUrl(cfg) });
  });

export const zraSaveStockMasterFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => raw as {
    userId: string; branchId?: string | null; payload: Record<string, unknown>;
  })
  .handler(async ({ data }) => {
    const cfg = getSavedConfig(data.userId, data.branchId);
    return saveStockMaster(data.payload, { baseUrl: requireVsdcUrl(cfg) });
  });
