// Hosted/Lovable Cloud ZRA adapter.
// Uses the authenticated Supabase session for data access. Windows/local mode
// continues to use src/lib/zra/server.ts's SQLite implementation.
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  getItemClasses,
  getStandardCodes,
  initializeDevice,
  isSuccessfulVsdcResponse,
  saveItem,
} from "./vsdc";

function cloudClient() {
  const token = (getRequestHeader("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token) throw new Error("NOT_AUTHENTICATED");
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser() {
  const db = cloudClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error("NOT_AUTHENTICATED");
  return { db, userId: data.user.id };
}

function vsdcUrl(config: any) {
  const url = config?.vsdc_endpoint || process.env.ZRA_VSDC_URL;
  if (!url) throw new Error("ZRA VSDC endpoint is not configured.");
  return url;
}

async function configFor(db: any, userId: string, branchId?: string | null, deviceId?: string | null) {
  if (deviceId) {
    const { data } = await db.from("zra_devices").select("*").eq("id", deviceId).eq("user_id", userId).maybeSingle();
    if (data) return {
      ...data,
      mode: data.environment === "production" ? "production" : (data.initialization_status === "initialized" ? "initialized" : "test"),
      device_id: data.id,
      branch_code: data.branch_code,
    };
  }
  const { data, error } = await db.from("zra_smart_invoice_config").select("*")
    .eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function cloudListDevices(data: { userId: string; branchId?: string | null }) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  let q = db.from("zra_devices").select("*").eq("user_id", userId).order("is_active", { ascending: false }).order("device_name");
  if (data.branchId) q = q.eq("branch_id", data.branchId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudSaveDevice(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const { data: existing } = data.deviceId
    ? await db.from("zra_devices").select("id").eq("id", data.deviceId).eq("user_id", userId).maybeSingle()
    : await db.from("zra_devices").select("id").eq("user_id", userId).eq("device_serial", data.deviceSerial).maybeSingle();
  const row = {
    id: existing?.id ?? crypto.randomUUID(),
    user_id: userId,
    company_id: data.companyId ?? null,
    branch_id: data.branchId ?? null,
    device_name: data.deviceName,
    device_type: data.deviceType ?? "desktop",
    terminal_id: data.terminalId ?? null,
    deployment_mode: data.deploymentMode ?? "local",
    environment: data.environment ?? "test",
    tpin: data.tpin ?? null,
    branch_code: data.branchCode,
    device_serial: data.deviceSerial,
    vsdc_endpoint: data.vsdcEndpoint ?? null,
    connector_endpoint: data.connectorEndpoint ?? null,
    taxpayer_name: data.taxpayerName ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await db.from("zra_devices").upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw new Error(error.message);
  return { data: saved };
}

export async function cloudGetConfig(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  return { data: await configFor(db, userId, data.branchId, data.deviceId), error: null };
}

export async function cloudSaveConfig(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const row = {
    id: data.id ?? crypto.randomUUID(),
    user_id: userId,
    branch_id: data.branchId ?? null,
    mode: data.mode ?? "test",
    taxpayer_name: data.taxpayerName ?? null,
    tpin: data.tpin ?? null,
    branch_code: data.branchCode ?? null,
    device_serial: data.deviceSerial ?? null,
    vsdc_endpoint: data.vsdcEndpoint ?? null,
    notes: data.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await db.from("zra_smart_invoice_config").upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw new Error(error.message);
  if (data.deviceSerial && data.branchCode) {
    await cloudSaveDevice({
      userId, branchId: data.branchId, deviceId: data.deviceId, companyId: data.companyId,
      deviceName: data.deviceName ?? `SifoBooks ${data.deviceSerial}`,
      deviceType: data.deviceType ?? "desktop", terminalId: data.terminalId,
      deploymentMode: data.deploymentMode ?? "local", environment: data.mode === "production" ? "production" : "test",
      tpin: data.tpin, branchCode: data.branchCode, deviceSerial: data.deviceSerial,
      vsdcEndpoint: data.vsdcEndpoint, connectorEndpoint: data.connectorEndpoint, taxpayerName: data.taxpayerName,
    });
  }
  return { data: saved, error: null };
}

export async function cloudInitializeDevice(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId, data.deviceId);
  if (!cfg) throw new Error("ZRA_DEVICE_NOT_CONFIGURED");
  const response: any = await initializeDevice(
    { tpin: data.tpin, bhfId: data.bhfId, dvcSrlNo: data.dvcSrlNo },
    { baseUrl: vsdcUrl(cfg) },
  );
  const success = isSuccessfulVsdcResponse(response);
  if (cfg.device_id) {
    await db.from("zra_devices").update({
      tpin: data.tpin, branch_code: data.bhfId, device_serial: data.dvcSrlNo,
      initialization_status: success ? "initialized" : "not_initialized",
      status: success ? "initialized" : "error",
      taxpayer_name: response?.data?.taxprNm ?? response?.data?.info?.taxprNm ?? cfg.taxpayer_name ?? null,
      last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", cfg.device_id).eq("user_id", userId);
    await db.from("zra_device_events").insert({
      id: crypto.randomUUID(), zra_device_id: cfg.device_id, user_id: userId,
      event_type: "INITIALIZE", status: success ? "success" : "error",
      message: response?.resultMsg ?? null, response_code: response?.resultCd ?? null,
      response_json: JSON.stringify(response),
    });
  }
  return response;
}

export async function cloudGetStandardCodes(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId);
  return getStandardCodes({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
}

export async function cloudGetItemClasses(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId);
  return getItemClasses({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
}

export async function cloudSyncCatalog(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, data.branchId);
  const codes: any = await getStandardCodes({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
  let classes: any = await getItemClasses({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: data.lastReqDt }, { baseUrl: vsdcUrl(cfg) });
  const classResponses = [classes];
  let previousDt = data.lastReqDt;
  for (let page = 1; page < 20 && isSuccessfulVsdcResponse(classes); page++) {
    const batch = Array.isArray(classes?.data?.itemClsList) ? classes.data.itemClsList : [];
    const nextDt = String(classes.resultDt ?? "");
    if (batch.length < 1000 || !nextDt || nextDt === previousDt) break;
    previousDt = nextDt;
    classes = await getItemClasses({ tpin: data.tpin, bhfId: data.bhfId, lastReqDt: nextDt }, { baseUrl: vsdcUrl(cfg) });
    classResponses.push(classes);
  }
  if (isSuccessfulVsdcResponse(codes)) {
    for (const cls of (codes.data?.clsList ?? [])) {
      for (const item of (cls.dtlList ?? [])) {
        await db.from("zra_standard_codes").upsert({
          id: crypto.randomUUID(), user_id: userId, branch_id: data.branchId ?? null,
          code_class: String(cls.cdCls ?? ""), code_class_name: cls.cdClsNm ?? null,
          code: String(item.cd ?? ""), name: item.cdNm ?? null,
          description: item.userDfnNm1 ?? null, raw_data: JSON.stringify(item),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,branch_id,code_class,code" });
      }
    }
  }
  if (classResponses.some(isSuccessfulVsdcResponse)) {
    for (const response of classResponses) {
      const rows = Array.isArray(response?.data?.itemClsList) ? response.data.itemClsList : [];
      for (const item of rows) {
        await db.from("zra_item_classes").upsert({
          id: crypto.randomUUID(), user_id: userId, branch_id: data.branchId ?? null,
          item_cls_cd: String(item.itemClsCd ?? ""), item_cls_nm: item.itemClsNm ?? null,
          item_cls_lvl: item.itemClsLvl == null ? null : Number(item.itemClsLvl),
          tax_ty_cd: item.taxTyCd ?? null, use_yn: item.useYn ?? null,
          raw_data: JSON.stringify(item), updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,branch_id,item_cls_cd" });
      }
    }
  }
  const { count: codeCount } = await db.from("zra_standard_codes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("branch_id", data.branchId ?? null);
  const { count: classCount } = await db.from("zra_item_classes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("branch_id", data.branchId ?? null);
  return { codes, classes, classResponses, classCountFromResponses: classResponses.length, codeCount: codeCount ?? 0, classCount: classCount ?? 0 };
}

export async function cloudListInventory(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const limit = Math.min(Math.max(Number(data.limit ?? 100), 1), 500);
  let q = db.from("stock_items").select("*").eq("user_id", userId).order("name").limit(limit);
  if ((data.search ?? "").trim()) {
    const s = data.search.trim();
    q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`);
  }
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudSearchItemClasses(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const limit = Math.min(Math.max(Number(data.limit ?? 50), 1), 200);
  let q = db.from("zra_item_classes").select("*").eq("user_id", userId).order("item_cls_lvl", { ascending: false }).order("item_cls_nm").limit(limit);
  if (data.branchId) q = q.eq("branch_id", data.branchId);
  if ((data.search ?? "").trim()) {
    const s = data.search.trim();
    q = q.or(`item_cls_cd.ilike.%${s}%,item_cls_nm.ilike.%${s}%`);
  }
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudListStandardCodes(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  let q = db.from("zra_standard_codes").select("*").eq("user_id", userId).order("code_class").order("name").limit(Math.min(Math.max(Number(data.limit ?? 200), 1), 1000));
  if (data.className) q = q.or(`code_class.eq.${data.className},name.ilike.%${data.className}%`);
  if (data.search) q = q.or(`code.ilike.%${data.search}%,name.ilike.%${data.search}%`);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { data: rows ?? [] };
}

export async function cloudMapInventoryItem(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const { data: cls } = await db.from("zra_item_classes").select("*").eq("user_id", userId).eq("item_cls_cd", data.itemClassCode).limit(1).maybeSingle();
  if (!cls) throw new Error("ZRA classification code was not found in the synchronized VSDC dictionary.");
  const { data: row, error } = await db.from("stock_items").select("*").eq("id", data.itemId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Inventory item not found.");
  const patch = {
    zra_item_code: row.sku || row.barcode || row.id,
    zra_item_class_code: data.itemClassCode,
    zra_item_type_code: data.itemTypeCode ?? null,
    zra_origin_country_code: data.originCountryCode ?? null,
    zra_pkg_unit_code: data.pkgUnitCode,
    zra_qty_unit_code: data.qtyUnitCode,
    zra_vat_category_code: data.vatCategoryCode,
    zra_tax_rate: data.taxRate == null ? row.vat_rate : Number(data.taxRate),
    zra_sync_status: "mapped",
    zra_last_sync_at: new Date().toISOString(),
    zra_raw_data: JSON.stringify({ classification: cls }),
  };
  const { data: saved, error: saveError } = await db.from("stock_items").update(patch).eq("id", data.itemId).eq("user_id", userId).select("*").single();
  if (saveError) throw new Error(saveError.message);
  return { data: saved };
}

export async function cloudRegisterInventoryItem(data: any) {
  const { db, userId } = await requireUser();
  if (userId !== data.userId) throw new Error("USER_CONTEXT_MISMATCH");
  const cfg = await configFor(db, userId, null);
  const { data: item, error } = await db.from("stock_items").select("*").eq("id", data.itemId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!item) throw new Error("Inventory item not found.");
  if (!cfg?.tpin || !cfg?.branch_code) throw new Error("ZRA_NOT_CONFIGURED: Configure TPIN and Branch ID first.");
  if (!item.zra_item_class_code || !item.zra_item_type_code || !item.zra_origin_country_code || !item.zra_pkg_unit_code || !item.zra_qty_unit_code || !item.zra_vat_category_code)
    throw new Error("ZRA_ITEM_NOT_MAPPED: Complete classification, product type, origin, packaging, quantity and VAT mapping before registering this item.");
  const payload = {
    tpin: cfg.tpin, bhfId: cfg.branch_code, itemCd: item.zra_item_code || item.sku || item.barcode || item.id,
    itemClsCd: item.zra_item_class_code, itemTyCd: item.zra_item_type_code, itemNm: item.name,
    itemStdNm: item.name, orgnNatCd: item.zra_origin_country_code, pkgUnitCd: item.zra_pkg_unit_code,
    qtyUnitCd: item.zra_qty_unit_code, rrp: Number(item.sell_price || 0), useYn: "Y",
    vatCatCd: item.zra_vat_category_code, regrId: data.regrId || userId, regrNm: data.regrNm || userId,
  };
  const response: any = await saveItem(payload, { baseUrl: vsdcUrl(cfg) });
  if (isSuccessfulVsdcResponse(response)) {
    await db.from("stock_items").update({
      zra_sync_status: "registered", zra_last_sync_at: new Date().toISOString(),
      zra_raw_data: JSON.stringify({ registration: response, payload }),
    }).eq("id", data.itemId).eq("user_id", userId);
  }
  const { data: saved } = await db.from("stock_items").select("*").eq("id", data.itemId).eq("user_id", userId).maybeSingle();
  return { response, payload, data: saved };
}
