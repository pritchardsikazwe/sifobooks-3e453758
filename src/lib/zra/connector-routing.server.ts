// @ts-nocheck — untyped VSDC JSON; see AGENTS.md ts-nocheck rule.
// SERVER-ONLY. Routes hosted ZRA requests for Local VSDC devices through the
// customer's Windows SifoBooks VSDC Connector (zra_connector_commands queue).
// The hosted server must never call a loopback/private VSDC address itself.
// Never log or return TPINs, tokens or connector credentials from here.
import { getConnectorDb } from "./connector.server";

export type ZraLayer = "SifoBooks" | "Connector" | "Local VSDC" | "ZRA";
export type RoutedResult = {
  state: "success" | "pending" | "failed";
  layer?: ZraLayer;
  message: string;
  route: "connector" | "direct";
  commandId?: string;
  resultCd?: string | null;
  resultMsg?: string | null;
  connector?: { status: "online" | "offline" | "not_registered"; name?: string | null; lastSeenAt?: string | null };
  health?: Record<string, unknown>;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const WAIT_MS = 25 * 1000;

export function requiresConnector(cfg: any): boolean {
  const mode = String(cfg?.deployment_mode || "local").toLowerCase();
  const url = String(cfg?.vsdc_endpoint || "");
  let host = "";
  try { host = new URL(url).hostname; } catch { /* empty or invalid → connector */ }
  const privateHost = !host || /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i.test(host);
  return mode === "local" || mode === "cloud" || mode === "hybrid" || privateHost;
}

export async function findConnector(userId: string, deviceId?: string | null) {
  const db = getConnectorDb();
  let q = db.from("zra_connector_credentials")
    .select("connector_id,device_id,display_name,last_seen_at,status")
    .eq("user_id", userId).eq("status", "active")
    .order("last_seen_at", { ascending: false, nullsFirst: false }).limit(10);
  const { data, error } = await q;
  if (error) throw new Error("SIFOBOOKS_CONNECTOR_LOOKUP_FAILED");
  const rows = (data || []).filter((r: any) => !deviceId || !r.device_id || r.device_id === deviceId);
  const row = rows[0];
  if (!row) return { status: "not_registered" as const, row: null };
  const seen = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
  const online = seen > 0 && Date.now() - seen <= ONLINE_WINDOW_MS;
  return { status: online ? ("online" as const) : ("offline" as const), row };
}

function connectorSummary(found: any) {
  return { status: found.status, name: found.row?.display_name ?? found.row?.connector_id ?? null, lastSeenAt: found.row?.last_seen_at ?? null };
}

function connectorUnavailable(found: any, route: "connector" = "connector"): RoutedResult {
  const connector = connectorSummary(found);
  const message = found.status === "not_registered"
    ? "No SifoBooks VSDC Connector is registered for this device. Register and start the connector on the Windows PC that runs the VSDC."
    : `The SifoBooks VSDC Connector is offline (last check-in: ${connector.lastSeenAt ?? "never"}). Start the connector on the Windows PC and try again.`;
  return { state: "failed", layer: "Connector", message, route, connector };
}

async function enqueue(userId: string, connectorId: string, deviceId: string | null, commandType: string, payload: any) {
  const db = getConnectorDb();
  const id = crypto.randomUUID();
  const { error } = await db.from("zra_connector_commands").insert({
    id, user_id: userId, connector_id: connectorId, device_id: deviceId,
    command_type: commandType, payload: JSON.stringify(payload || {}), status: "queued",
  });
  if (error) throw new Error("SIFOBOOKS_COMMAND_QUEUE_FAILED");
  return id;
}

async function readCommand(userId: string, commandId: string) {
  const db = getConnectorDb();
  const { data, error } = await db.from("zra_connector_commands")
    .select("id,command_type,status,response,error_message,device_id,connector_id,created_at")
    .eq("id", commandId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("SIFOBOOKS_COMMAND_READ_FAILED");
  return data;
}

async function waitForCommand(userId: string, commandId: string, ms = WAIT_MS) {
  const until = Date.now() + ms;
  let row = await readCommand(userId, commandId);
  while (row && (row.status === "queued" || row.status === "delivered") && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 2000));
    row = await readCommand(userId, commandId);
  }
  return row;
}

function parseJson(v: any) { if (!v) return null; if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return null; } }

/** Classify a connector-side failure message into the failing layer. */
export function classifyFailure(msg: string): { layer: ZraLayer; message: string } {
  const m = String(msg || "").slice(0, 300);
  if (/UNSUPPORTED_VSDC_COMMAND/i.test(m)) return { layer: "Connector", message: "This connector version does not support that request. Update the SifoBooks VSDC Connector." };
  if (/VSDC (returned )?HTTP|non-JSON|ECONNREFUSED|Unable to connect|fetch failed|abort|timed? ?out|ZRA_VSDC_URL/i.test(m)) return { layer: "Local VSDC", message: `The connector could not get a valid answer from the local VSDC: ${m}` };
  return { layer: "Connector", message: `The connector reported an error: ${m}` };
}

// ---------------------------------------------------------------- initialize

export async function routeInitialize(ctx: { db: any; userId: string; cfg: any; payload: { tpin: string; bhfId: string; dvcSrlNo: string } }): Promise<RoutedResult> {
  const found = await findConnector(ctx.userId, ctx.cfg?.device_id);
  if (found.status !== "online") return connectorUnavailable(found);
  const commandId = await enqueue(ctx.userId, found.row.connector_id, ctx.cfg?.device_id ?? null, "initialize", ctx.payload);
  console.info("[zra] initialize queued for connector", { commandId, connector: found.row.connector_id });
  const row = await waitForCommand(ctx.userId, commandId);
  return finalizeInitialize(ctx, row, connectorSummary(found));
}

export async function finalizeInitialize(ctx: { db: any; userId: string; cfg: any; payload?: any }, row: any, connector?: any): Promise<RoutedResult> {
  if (!row) return { state: "failed", layer: "SifoBooks", message: "The initialization request could not be found.", route: "connector" };
  if (row.status === "queued" || row.status === "delivered") {
    return { state: "pending", route: "connector", commandId: row.id, connector,
      message: row.status === "queued" ? "Waiting for the connector to pick up the initialization request…" : "The connector is running the initialization against the local VSDC…" };
  }
  if (row.status === "failed") {
    const c = classifyFailure(row.error_message);
    await recordDeviceEvent(ctx, "error", null, c.message, null);
    return { state: "failed", ...c, route: "connector", commandId: row.id, connector };
  }
  const response = parseJson(row.response) || {};
  const success = response?.resultCd === "000";
  const deviceId = ctx.cfg?.device_id;
  if (deviceId) {
    const update: any = {
      initialization_status: success ? "initialized" : "not_initialized",
      status: success ? "initialized" : "error",
      last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (success) update.taxpayer_name = response?.data?.taxprNm ?? response?.data?.info?.taxprNm ?? ctx.cfg?.taxpayer_name ?? null;
    await ctx.db.from("zra_devices").update(update).eq("id", deviceId).eq("user_id", ctx.userId);
  }
  await recordDeviceEvent(ctx, success ? "success" : "error", response?.resultCd ?? null, response?.resultMsg ?? null, response);
  if (success) return { state: "success", route: "connector", commandId: row.id, connector, resultCd: "000", resultMsg: response?.resultMsg ?? null,
    message: "The local VSDC confirmed initialization (code 000) through the SifoBooks VSDC Connector." };
  return { state: "failed", layer: "ZRA", route: "connector", commandId: row.id, connector,
    resultCd: response?.resultCd ?? null, resultMsg: response?.resultMsg ?? null,
    message: `The VSDC/ZRA refused initialization${response?.resultCd ? ` (code ${response.resultCd})` : ""}: ${response?.resultMsg || "no message returned"}` };
}

async function recordDeviceEvent(ctx: any, status: string, code: string | null, message: string | null, response: any) {
  if (!ctx.cfg?.device_id) return;
  try {
    await ctx.db.from("zra_device_events").insert({
      id: crypto.randomUUID(), zra_device_id: ctx.cfg.device_id, user_id: ctx.userId,
      event_type: "INITIALIZE", status, message, response_code: code,
      response_json: response ? JSON.stringify(response) : null,
    });
  } catch { /* the event log must never block the result */ }
}

// ---------------------------------------------------------------- diagnostic

export async function routeHealth(ctx: { userId: string; cfg: any }): Promise<RoutedResult> {
  const found = await findConnector(ctx.userId, ctx.cfg?.device_id);
  if (found.status !== "online") return connectorUnavailable(found);
  const commandId = await enqueue(ctx.userId, found.row.connector_id, ctx.cfg?.device_id ?? null, "vsdc_health", {});
  const row = await waitForCommand(ctx.userId, commandId);
  return finalizeHealth(ctx, row, connectorSummary(found));
}

export async function finalizeHealth(ctx: { userId: string; cfg: any }, row: any, connector?: any): Promise<RoutedResult> {
  if (!row) return { state: "failed", layer: "SifoBooks", message: "The test request could not be found.", route: "connector" };
  if (row.status === "queued" || row.status === "delivered") return { state: "pending", route: "connector", commandId: row.id, connector, message: "Waiting for the connector to test the local VSDC…" };
  // Older connectors: fall back to the basic echo request they already support.
  if (row.status === "failed" && row.command_type === "vsdc_health" && /UNSUPPORTED_VSDC_COMMAND/i.test(row.error_message || "")) {
    const id = await enqueue(ctx.userId, row.connector_id, row.device_id ?? null, "test_connection", {});
    const next = await waitForCommand(ctx.userId, id, 15000);
    return finalizeHealth(ctx, next, connector);
  }
  if (row.command_type === "test_connection") {
    if (row.status === "completed") return { state: "success", route: "connector", commandId: row.id, connector,
      health: { reachable: true, httpStatus: 200, version: null, circuitBreaker: null, note: "Basic check only — update the connector for version and circuit-breaker details." },
      message: "The connector reached the local VSDC." };
    const msg = String(row.error_message || "");
    const http = msg.match(/HTTP (\d{3})/);
    if (http) return { state: "success", route: "connector", commandId: row.id, connector,
      health: { reachable: true, httpStatus: Number(http[1]), version: null, circuitBreaker: null, note: "Basic check only — update the connector for version and circuit-breaker details." },
      message: `The connector reached the local VSDC (HTTP ${http[1]}).` };
    const c = classifyFailure(msg);
    return { state: "failed", ...c, route: "connector", commandId: row.id, connector, health: { reachable: false } };
  }
  if (row.status === "failed") { const c = classifyFailure(row.error_message); return { state: "failed", ...c, route: "connector", commandId: row.id, connector }; }
  const r = parseJson(row.response) || {};
  // Whitelist only non-sensitive fields.
  const health = {
    reachable: !!r.reachable,
    httpStatus: typeof r.httpStatus === "number" ? r.httpStatus : null,
    version: r.version ? String(r.version).slice(0, 40) : null,
    healthy: typeof r.healthy === "boolean" ? r.healthy : null,
    circuitBreaker: r.circuitBreaker ? String(r.circuitBreaker).slice(0, 40) : null,
    tenants: typeof r.tenants === "number" ? r.tenants : null,
  };
  if (!health.reachable) return { state: "failed", layer: "Local VSDC", route: "connector", commandId: row.id, connector, health,
    message: `The connector is online but could not reach the local VSDC${r.error ? `: ${String(r.error).slice(0, 200)}` : "."}` };
  return { state: "success", route: "connector", commandId: row.id, connector, health, message: "The connector reached the local VSDC." };
}

export async function checkCommand(ctx: { db: any; userId: string; cfg: any }, commandId: string): Promise<RoutedResult> {
  const row = await readCommand(ctx.userId, commandId);
  if (!row) return { state: "failed", layer: "SifoBooks", message: "Request not found.", route: "connector" };
  if (row.command_type === "initialize") return finalizeInitialize(ctx, row);
  return finalizeHealth(ctx, row);
}
