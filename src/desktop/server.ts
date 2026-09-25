/**
 * SifoBooks Desktop Server
 *
 * Standalone Windows server for SifoBooks local and LAN deployments.
 * In network mode the same central SQLite database is served to POS clients
 * over the local network. POS client PCs do not create separate databases.
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, statSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { join, dirname, extname, normalize } from "path";
import os from "os";
import { licenseStatus, storeLicense } from "../lib/licensing";

function findBaseDir(): string {
  const candidates = [
    process.env.BUN_COMPILED_BIN ? dirname(process.env.BUN_COMPILED_BIN) : null,
    process.argv[0] ? dirname(process.argv[0]) : null,
    process.cwd(),
    dirname(process.execPath),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (existsSync(join(dir, "client")) || existsSync(join(dir, "schema.sql"))) return dir;
  }
  return process.cwd();
}

const baseDir = findBaseDir();
const clientDir = join(baseDir, "client");
const dataDir = join(baseDir, "data");
const backupsDir = join(baseDir, "backups");
const networkConfigPath = join(baseDir, "config", "network.json");
const serverIdentityPath = join(baseDir, "config", "server-identity.json");
const networkDevicesPath = join(baseDir, "config", "network-devices.json");

function getOrCreateServerIdentity() {
  try {
    if (existsSync(serverIdentityPath)) {
      const existing = JSON.parse(readFileSync(serverIdentityPath, "utf8"));
      if (existing?.server_id) return existing;
    }
  } catch {}
  const identity = {
    server_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    hostname: os.hostname(),
  };
  try {
    writeFileSync(serverIdentityPath, JSON.stringify(identity, null, 2));
  } catch {}
  return identity;
}

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses: Array<{ address: string; family: string; interface: string }> = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (!entry.internal && entry.family === "IPv4") {
        addresses.push({ address: entry.address, family: "IPv4", interface: name });
      }
    }
  }
  return addresses;
}

function readNetworkDevices(): Record<string, any> {
  try {
    if (!existsSync(networkDevicesPath)) return {};
    const value = JSON.parse(readFileSync(networkDevicesPath, "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeNetworkDevices(devices: Record<string, any>) {
  mkdirSync(dirname(networkDevicesPath), { recursive: true });
  writeFileSync(networkDevicesPath, JSON.stringify(devices, null, 2));
}

const serverIdentity = getOrCreateServerIdentity();

function readNetworkConfig(): any | null {
  try {
    if (!existsSync(networkConfigPath)) return null;
    return JSON.parse(readFileSync(networkConfigPath, "utf8"));
  } catch (error) {
    console.error("[network] Invalid config/network.json:", error);
    return null;
  }
}

const networkConfig = readNetworkConfig();
const configuredMode = String(process.env.SIFOBOOKS_MODE || networkConfig?.mode || "offline").toLowerCase();
const isNetworkServer = configuredMode === "network" || configuredMode === "server";
const isPosClient = configuredMode === "pos";
const configuredServerUrl = String(process.env.SIFOBOOKS_SERVER_URL || networkConfig?.client?.server_url || "").trim().replace(/\/$/, "");

mkdirSync(dataDir, { recursive: true });
mkdirSync(backupsDir, { recursive: true });
mkdirSync(join(baseDir, "config"), { recursive: true });

if (!existsSync(networkConfigPath)) {
  writeFileSync(networkConfigPath, JSON.stringify({
    mode: "offline",
    server: { host: "127.0.0.1", port: 3000, display_name: "SifoBooks Server" },
    client: { server_url: "http://127.0.0.1:3000", station_code: "", station_name: "", station_type: "pos", assigned_role: "cashier" },
    zra: { environment: "production", branch_code: "", device_id: "", sdc_id: "", device_serial: "", vsdc_endpoint: "http://127.0.0.1:8080" }
  }, null, 2));
}

function createStartupBackup() {
  const dbPath = process.env.DATABASE_PATH || join(dataDir, "sifobooks.db");
  if (!existsSync(dbPath)) return;
  try {
    const db = new Database(dbPath);
    try { db.exec("PRAGMA wal_checkpoint(TRUNCATE);"); } finally { db.close(); }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const destination = join(backupsDir, `sifobooks-${stamp}.db`);
    writeFileSync(destination, readFileSync(dbPath));
    const backups = readdirSync(backupsDir)
      .filter((name) => /^sifobooks-.*\\.db$/.test(name))
      .sort()
      .reverse();
    for (const old of backups.slice(30)) {
      try { unlinkSync(join(backupsDir, old)); } catch {}
    }
    console.log(`[backup] Created ${destination}`);
  } catch (error) {
    console.error("[backup] Startup backup failed:", error);
  }
}

if (!process.env.DATABASE_PATH) process.env.DATABASE_PATH = join(dataDir, "sifobooks.db");

if (!process.env.JWT_SECRET) {
  const secretPath = join(dataDir, ".jwt-secret");
  if (existsSync(secretPath)) {
    process.env.JWT_SECRET = readFileSync(secretPath, "utf8").trim();
  } else {
    process.env.JWT_SECRET = crypto.randomUUID() + crypto.randomUUID();
    writeFileSync(secretPath, process.env.JWT_SECRET, { mode: 0o600 });
  }
}

process.chdir(baseDir);

const tanstackServer = (await import("../../dist/server/server.js")).default as {
  fetch: (req: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type ScaleSession = { port: string; baudRate: number; latestRaw: string; openedAt: string; lastReadAt: string };
const scaleSessions = new Map<string, ScaleSession>();
const scaleSessionKey = (port: string, baudRate: number) => port + ":" + baudRate;
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function serveStatic(pathname: string): Response | null {
  const safePath = normalize(pathname).replace(/^(\\.\\.[/\\])+/, "");
  const filePath = join(clientDir, safePath);
  if (pathname === "/" || pathname.endsWith("/")) return null;
  if (!existsSync(filePath)) return null;
  const stat = statSync(filePath);
  if (stat.isDirectory()) return null;

  const file = Bun.file(filePath);
  const ext = extname(filePath);
  return new Response(file, {
    headers: {
      "content-type": MIME_TYPES[ext] ?? "application/octet-stream",
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    },
  });
}

async function proxyToNetworkServer(request: Request): Promise<Response> {
  if (!configuredServerUrl) {
    return Response.json({
      error: "SifoBooks POS client is not configured.",
      message: "Set client.server_url in config/network.json or SIFOBOOKS_SERVER_URL.",
    }, { status: 503 });
  }

  try {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, configuredServerUrl);
    const headers = new Headers(request.headers);
    headers.set("x-sifobooks-client", "lan-pos");
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
    headers.delete("host");

    const method = request.method.toUpperCase();
    const response = await fetch(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    writeStartupLog(`LAN CLIENT PROXY ERROR: ${error instanceof Error ? error.stack || error.message : String(error)}`);
    return Response.json({
      error: "SifoBooks LAN server unavailable.",
      serverUrl: configuredServerUrl,
      message: "Check that the SifoBooks server PC is running and reachable on the local network.",
    }, { status: 503 });
  }
}


async function runPowerShell(script: string, timeoutMs = 8000): Promise<{ code: number; stdout: string; stderr: string }> {
  if (process.platform !== "win32") throw new Error("Windows hardware bridge is only available on Windows Desktop.");
  const child = Bun.spawn(["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], { stdout: "pipe", stderr: "pipe" });
  const timeout = setTimeout(() => { try { child.kill(); } catch {} }, timeoutMs);
  try { const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]); return { code, stdout, stderr }; }
  finally { clearTimeout(timeout); }
}
function psQuote(value: string) { return "'" + String(value ?? "").replace(/'/g, "''") + "'"; }
function escposText(value: string) { return new TextEncoder().encode(String(value ?? "").replace(/[^\\x20-\\x7E]/g, "?")); }
function buildEscPosLabel(body: { name: string; weightKg: number; pricePerKg: number; total: number; barcode?: string; footer?: string }) {
  const chunks: Uint8Array[] = []; const push = (...bytes: number[]) => chunks.push(new Uint8Array(bytes)); const text = (value: string) => chunks.push(escposText(value));
  push(0x1b,0x40); push(0x1b,0x61,0x01); push(0x1b,0x45,0x01); text(body.name + "\\n"); push(0x1b,0x45,0x00);
  text("SifoBooks Butchery\\n"); push(0x1b,0x61,0x00); text("--------------------------------\\n");
  text("Weight:    " + body.weightKg.toFixed(3) + " kg\\n"); text("Price/kg:  K" + body.pricePerKg.toFixed(2) + "\\n");
  push(0x1b,0x45,0x01); text("TOTAL:     K" + body.total.toFixed(2) + "\\n"); push(0x1b,0x45,0x00);
  if (body.barcode) { push(0x1d,0x68,0x50); push(0x1d,0x77,0x02); push(0x1d,0x48,0x02); const b = body.barcode.replace(/[^0-9A-Za-z]/g,"").slice(0,24); if (b) { push(0x1d,0x6b,0x04,b.length); chunks.push(new TextEncoder().encode(b)); } text("\\n"); }
  text(body.footer || "Keep refrigerated\\n"); push(0x0a,0x0a,0x0a,0x1d,0x56,0x00);
  const len = chunks.reduce((n, x) => n + x.length, 0); const out = new Uint8Array(len); let offset = 0; for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; } return Buffer.from(out).toString("base64");
}
function buildZplLabel(body: { name: string; weightKg: number; pricePerKg: number; total: number; barcode?: string; footer?: string }) {
  const safe = (v: string) => String(v || "").replace(/[^\\x20-\\x7E]/g, "?").replace(/[\\^~]/g, " ");
  const barcode = safe(body.barcode || "").slice(0,24);
  const zpl = [
    "^XA","^CI28","^PW640","^LL400","^LH20,20",
    "^CF0,42","^FO20,20^FD" + safe(body.name).slice(0,32) + "^FS",
    "^CF0,25","^FO20,75^FDSifoBooks Butchery^FS",
    "^FO20,115^FDWeight: " + body.weightKg.toFixed(3) + " kg^FS",
    "^FO20,150^FDPrice/kg: K" + body.pricePerKg.toFixed(2) + "^FS",
    "^CF0,40","^FO20,195^FDTOTAL: K" + body.total.toFixed(2) + "^FS",
    barcode ? "^BY2,3,70^FO20,250^BCN,70,Y,N,N^FD" + barcode + "^FS" : "",
    "^CF0,20","^FO20,350^FD" + safe(body.footer || "Keep refrigerated").slice(0,50) + "^FS",
    "^XZ"
  ].filter(Boolean).join("\\n");
  return Buffer.from(zpl, "ascii").toString("base64");
}
function buildTsplLabel(body: { name: string; weightKg: number; pricePerKg: number; total: number; barcode?: string; footer?: string }) {
  const safe = (v: string) => String(v || "").replace(/[\\\r\\n"]/g, " ").slice(0,60);
  const barcode = safe(body.barcode || "").replace(/[^0-9A-Za-z]/g, "").slice(0,24);
  const lines = [
    "SIZE 80 mm,50 mm","GAP 3 mm,0","DIRECTION 1","CLS",
    "TEXT 30,30,0,3,1,1," + JSON.stringify(safe(body.name)),
    "TEXT 30,85,0,2,1,1," + JSON.stringify("SifoBooks Butchery"),
    "TEXT 30,125,0,2,1,1," + JSON.stringify("Weight: " + body.weightKg.toFixed(3) + " kg"),
    "TEXT 30,160,0,2,1,1," + JSON.stringify("Price/kg: K" + body.pricePerKg.toFixed(2)),
    "TEXT 30,200,0,3,1,1," + JSON.stringify("TOTAL: K" + body.total.toFixed(2)),
    barcode ? "BARCODE 30,260,128,70,1,0,2,4," + JSON.stringify(barcode) : "",
    "TEXT 30,410,0,1,1,1," + JSON.stringify(safe(body.footer || "Keep refrigerated")),
    "PRINT 1,1"
  ].filter(Boolean).join("\\r\\n");
  return Buffer.from(lines, "ascii").toString("base64");
}
function chooseLabelProtocol(printer: any, requested?: string) {
  const explicit = String(requested || "").toLowerCase();
  if (["escpos","zpl","tspl"].includes(explicit)) return explicit;
  const text = [printer?.Name, printer?.DriverName, printer?.PortName].filter(Boolean).join(" ").toLowerCase();
  if (/zebra|zdesigner|zpl/.test(text)) return "zpl";
  if (/tsc|tspl|te200|te210|tx200|tx210/.test(text)) return "tspl";
  return "escpos";
}
async function printRawWindows(printerName: string, base64: string) {
  const prefix = "\n$ErrorActionPreference='Stop'\nAdd-Type @'\nusing System; using System.Runtime.InteropServices;\npublic class SifoRawPrinter {\n[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }\n[DllImport(\"winspool.drv\", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);\n[DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool ClosePrinter(IntPtr hPrinter);\n[DllImport(\"winspool.drv\", CharSet=CharSet.Unicode, SetLastError=true)] public static extern int StartDocPrinter(IntPtr hPrinter, int level, DOCINFO di);\n[DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr hPrinter);\n[DllImport(\"winspool.drv\", SetLastError=true)] public static extern int StartPagePrinter(IntPtr hPrinter);\n[DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr hPrinter);\n[DllImport(\"winspool.drv\", SetLastError=true)] public static extern bool WritePrinter(IntPtr hPrinter, byte[] data, int count, out int written);\npublic static void Print(string name, byte[] data) { IntPtr h; if(!OpenPrinter(name,out h,IntPtr.Zero)) throw new Exception(\"OpenPrinter failed: \"+Marshal.GetLastWin32Error()); try { var di=new DOCINFO(); di.pDocName=\"SifoBooks Label\"; di.pDataType=\"RAW\"; if(StartDocPrinter(h,1,di)==0) throw new Exception(\"StartDocPrinter failed: \"+Marshal.GetLastWin32Error()); try { if(StartPagePrinter(h)==0) throw new Exception(\"StartPagePrinter failed: \"+Marshal.GetLastWin32Error()); try { int w; if(!WritePrinter(h,data,data.Length,out w) || w!=data.Length) throw new Exception(\"WritePrinter failed: \"+Marshal.GetLastWin32Error()); } finally { EndPagePrinter(h); } } finally { EndDocPrinter(h); } } finally { ClosePrinter(h); } }\n}\n'@\n$data=[Convert]::FromBase64String('__BASE64__')\n[SifoRawPrinter]::Print('__PRINTER__', $data)\nWrite-Output \"OK\"";
  const script = prefix.replace("__BASE64__", base64).replace("__PRINTER__", printerName.replace(/'/g, "''"));
  const result = await runPowerShell(script, 12000); if (result.code !== 0 || !result.stdout.includes("OK")) throw new Error(result.stderr || result.stdout || "Raw printer failed");
}
async function listWindowsHardware() {
  if (process.platform !== "win32") return { platform: process.platform, printers: [], serialPorts: [] };
  const printers = await runPowerShell("Get-Printer | Select-Object Name,PrinterStatus,PortName,DriverName | ConvertTo-Json -Compress");
  const ports = await runPowerShell("Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Description,ProviderType | ConvertTo-Json -Compress");
  const parse = (s: string) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : [v]; } catch { return []; } };
  return { platform: "win32", printers: parse(printers.stdout), serialPorts: parse(ports.stdout) };
}
function openBrowser(url: string) {
  try {
    if (process.platform === "win32") Bun.spawn(["cmd", "/c", "start", "", url], { stdio: ["ignore", "ignore", "ignore"] });
    else if (process.platform === "darwin") Bun.spawn(["open", url], { stdio: ["ignore", "ignore", "ignore"] });
    else Bun.spawn(["xdg-open", url], { stdio: ["ignore", "ignore", "ignore"] });
  } catch {}
}

const configuredPort = parseInt(process.env.PORT || String(networkConfig?.server?.port || "3000"), 10);
const STARTUP_LOG = join(dataDir, "desktop-startup.log");

function writeStartupLog(message: string) {
  try {
    writeFileSync(STARTUP_LOG, `[${new Date().toISOString()}] ${message}\\r\\n`, { flag: "a" });
  } catch {}
}

process.on("uncaughtException", (error) => {
  writeStartupLog(`UNCAUGHT EXCEPTION: ${error instanceof Error ? error.stack || error.message : String(error)}`);
});
process.on("unhandledRejection", (error) => {
  writeStartupLog(`UNHANDLED REJECTION: ${error instanceof Error ? error.stack || error.message : String(error)}`);
});
const HOST = process.env.SIFOBOOKS_HOST || (isNetworkServer ? String(networkConfig?.server?.host || "0.0.0.0") : "127.0.0.1");
const LICENSE_ENFORCEMENT = String(process.env.SIFOBOOKS_LICENSE_ENFORCEMENT || "false").toLowerCase() === "true" || existsSync(join(baseDir, "config", "license-public-key.pem"));

let PORT = configuredPort;
let server: ReturnType<typeof Bun.serve>;

function startServer() {
  const attempts = isNetworkServer ? [configuredPort] : Array.from({ length: 11 }, (_, index) => configuredPort + index);
  let lastError: unknown = null;
  for (const candidatePort of attempts) {
    try {
      server = Bun.serve({
        port: candidatePort,
        host: HOST,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const hardwareEndpoint = url.pathname.startsWith("/api/hardware/");
    if (hardwareEndpoint && isNetworkServer) return Response.json({ error: "Direct hardware endpoints are available only on the local Windows Desktop/terminal." }, { status: 403 });

    if (url.pathname === "/api/hardware/info" && request.method === "GET") {
      try { return Response.json(await listWindowsHardware()); } catch (error: any) { return Response.json({ error: error?.message || "Hardware discovery failed" }, { status: 500 }); }
    }
    if (url.pathname === "/api/hardware/scale/read" && request.method === "POST") {
      try {
        const body = await request.json(); const port = String(body?.port || "").trim().toUpperCase(); const baud = Number(body?.baudRate || 9600);
        if (!/^COM\d+$/.test(port)) return Response.json({ error: "A Windows COM port such as COM3 is required." }, { status: 400 });
        if (![2400,4800,9600,19200,38400,57600,115200].includes(baud)) return Response.json({ error: "Unsupported baud rate." }, { status: 400 });
        const prefix = "\n$ErrorActionPreference='Stop'\n$p=New-Object System.IO.Ports.SerialPort('__PORT__',__BAUD__,'None',8,'One')\n$p.ReadTimeout=500\n$p.Open()\ntry { $deadline=(Get-Date).AddMilliseconds(650); $all=''; while((Get-Date) -lt $deadline) { try { $all += $p.ReadExisting() } catch {}; Start-Sleep -Milliseconds 40 }; Write-Output $all } finally { $p.Close() }";
        const script = prefix.replace("__PORT__", port).replace("__BAUD__", String(baud));
        const result = await runPowerShell(script, 2500); if (result.code !== 0) throw new Error(result.stderr || "Scale read failed");
        return Response.json({ ok: true, raw: result.stdout.trim(), port, baudRate: baud });
      } catch (error: any) { return Response.json({ ok: false, error: error?.message || "Scale read failed" }, { status: 500 }); }
    }
    if (url.pathname === "/api/hardware/scale/disconnect" && request.method === "POST") {
      try {
        const body = await request.json(); const port = String(body?.port || "").trim().toUpperCase();
        for (const [key, session] of scaleSessions) if (session.port === port) scaleSessions.delete(key);
        return Response.json({ ok: true, port });
      } catch (error: any) { return Response.json({ ok: false, error: error?.message || "Scale disconnect failed" }, { status: 500 }); }
    }
    if (url.pathname === "/api/hardware/label/print" && request.method === "POST") {
      try {
        const body = await request.json(); const printer = String(body?.printer || "").trim();
        if (!printer) return Response.json({ error: "Label printer is required." }, { status: 400 });
        const requestedProtocol = String(body?.protocol || "").toLowerCase();
        const hardware = await listWindowsHardware();
        const printerInfo = hardware.printers.find((item: any) => String(item?.Name || "") === printer);
        if (!printerInfo) return Response.json({ error: "Selected Windows printer was not found." }, { status: 404 });
        const protocol = chooseLabelProtocol(printerInfo, requestedProtocol);
        const label = { name: String(body?.name || "Butchery Item").slice(0, 60), weightKg: Math.max(0, Number(body?.weightKg || 0)), pricePerKg: Math.max(0, Number(body?.pricePerKg || 0)), total: Math.max(0, Number(body?.total || 0)), barcode: String(body?.barcode || "").slice(0, 40), footer: String(body?.footer || "Keep refrigerated").slice(0, 80) };
        const copies = Math.min(20, Math.max(1, Number(body?.copies || 1)));
        const payload = protocol === "zpl" ? buildZplLabel(label) : protocol === "tspl" ? buildTsplLabel(label) : buildEscPosLabel(label);
        await printRawWindows(printer, payload);
        return Response.json({ ok: true, printer, protocol, transport: "windows-raw" });
      } catch (error: any) { return Response.json({ ok: false, error: error?.message || "Label print failed" }, { status: 500 }); }
    }
    if (isPosClient) {
      const staticResponse = serveStatic(url.pathname);
      if (staticResponse) return staticResponse;
      return proxyToNetworkServer(request);
    }


    if (url.pathname === "/api/license/status" && request.method === "GET") {
      return Response.json({ ...licenseStatus(), enforcement: LICENSE_ENFORCEMENT });
    }

    if (url.pathname === "/api/license/activate" && request.method === "POST") {
      try {
        const body = await request.json();
        const token = String(body?.token || "").trim();
        if (!token) return Response.json({ error: "Licence key is required" }, { status: 400 });
        storeLicense(token);
        return Response.json(licenseStatus());
      } catch (error: any) {
        return Response.json({ error: error?.message || "Licence activation failed" }, { status: 400 });
      }
    }

    if (url.pathname === "/api/desktop/diagnostics" && request.method === "GET") {
      const dbPath = process.env.DATABASE_PATH || join(dataDir, "sifobooks.db");
      let database = { status: "missing", path: dbPath, sizeBytes: 0 };
      try {
        if (existsSync(dbPath)) {
          const db = new Database(dbPath);
          const row = db.query("PRAGMA quick_check").get() as { quick_check?: string } | null;
          db.close();
          database = {
            status: row?.quick_check === "ok" ? "healthy" : "check_failed",
            path: dbPath,
            sizeBytes: statSync(dbPath).size,
          };
        }
      } catch (error) {
        database = { status: "error", path: dbPath, sizeBytes: existsSync(dbPath) ? statSync(dbPath).size : 0 };
        writeStartupLog(`DIAGNOSTIC DATABASE ERROR: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      }
      return Response.json({
        ok: database.status === "healthy",
        product: "SifoBooks",
        edition: process.env.VITE_SIFOBOOKS_EDITION || null,
        mode: isNetworkServer ? "server" : isPosClient ? "pos" : "standalone",
        host: HOST,
        port: PORT,
        accessUrl: `http://localhost:${PORT}`,
        lanAddresses: getLanAddresses(),
        configuredPort,
        configuredServerUrl: configuredServerUrl || null,
        baseDir,
        clientDirExists: existsSync(clientDir),
        serverBundleEmbedded: true,
        database,
        licenseEnforcement: LICENSE_ENFORCEMENT,
        logFile: STARTUP_LOG,
        nodePlatform: process.platform,
        bunVersion: Bun.version,
      });
    }

    if (url.pathname === "/api/network/info" && request.method === "GET") {
      const cfg = readNetworkConfig();
      const lanAddresses = getLanAddresses();
      const serverAddress = lanAddresses.find((item) => item.address.startsWith("192.168."))?.address
        || lanAddresses.find((item) => item.address.startsWith("10."))?.address
        || lanAddresses[0]?.address
        || null;
      return Response.json({
        mode: isNetworkServer ? "server" : isPosClient ? "pos" : "standalone",
        serverId: serverIdentity.server_id,
        serverName: cfg?.server?.display_name || "SifoBooks Server",
        hostname: os.hostname(),
        host: HOST,
        port: PORT,
        lanAddresses,
        serverAddress,
        accessUrl: serverAddress ? `http://${serverAddress}:${PORT}` : `http://localhost:${PORT}`,
        upstreamServerUrl: isPosClient ? configuredServerUrl : null,
        client: cfg?.client || null,
        zra: cfg?.zra ? {
          environment: cfg.zra.environment || "production",
          branchCode: cfg.zra.branch_code || "",
          deviceId: cfg.zra.device_id || "",
          sdcId: cfg.zra.sdc_id || "",
          deviceSerial: cfg.zra.device_serial || "",
          vsdcEndpoint: cfg.zra.vsdc_endpoint || ""
        } : null
      });
    }

    if (url.pathname === "/api/network/health" && request.method === "GET") {
      const dbPath = process.env.DATABASE_PATH || join(dataDir, "sifobooks.db");
      let database = { status: "missing", sizeBytes: 0 };
      try {
        const db = new Database(dbPath);
        const row = db.query("PRAGMA quick_check").get() as { quick_check?: string } | null;
        db.close();
        database = {
          status: row?.quick_check === "ok" ? "healthy" : "check_failed",
          sizeBytes: existsSync(dbPath) ? statSync(dbPath).size : 0,
        };
      } catch {
        database = { status: "error", sizeBytes: existsSync(dbPath) ? statSync(dbPath).size : 0 };
      }
      const devices = readNetworkDevices();
      return Response.json({
        ok: database.status === "healthy",
        mode: isNetworkServer ? "server" : isPosClient ? "pos" : "standalone",
        serverId: serverIdentity.server_id,
        hostname: os.hostname(),
        uptimeSeconds: Math.floor(process.uptime()),
        database,
        connectedDevices: Object.values(devices).filter((device: any) => {
          const heartbeat = Date.parse(String(device.last_seen || ""));
          return Number.isFinite(heartbeat) && Date.now() - heartbeat < 90_000;
        }).length,
        totalDevices: Object.keys(devices).length,
      });
    }

    if (url.pathname === "/api/network/devices" && request.method === "GET") {
      if (!isNetworkServer) return Response.json({ error: "Device registry is available on the SifoBooks network server." }, { status: 403 });
      return Response.json({ ok: true, devices: Object.values(readNetworkDevices()) });
    }

    if (url.pathname === "/api/network/devices/register" && request.method === "POST") {
      if (!isNetworkServer) return Response.json({ error: "Device registration is available on the SifoBooks network server." }, { status: 403 });
      try {
        const body = await request.json();
        const deviceId = String(body?.device_id || "").trim().slice(0, 100);
        if (!deviceId) return Response.json({ error: "device_id is required" }, { status: 400 });
        const devices = readNetworkDevices();
        const now = new Date().toISOString();
        devices[deviceId] = {
          ...(devices[deviceId] || {}),
          device_id: deviceId,
          name: String(body?.name || deviceId).trim().slice(0, 100),
          type: String(body?.type || "workstation").trim().slice(0, 40),
          branch: String(body?.branch || "").trim().slice(0, 100),
          role: String(body?.role || "").trim().slice(0, 60),
          ip: String(body?.ip || "").trim().slice(0, 64),
          first_seen: devices[deviceId]?.first_seen || now,
          last_seen: now,
        };
        writeNetworkDevices(devices);
        return Response.json({ ok: true, serverId: serverIdentity.server_id, device: devices[deviceId] });
      } catch (error: any) {
        return Response.json({ error: error?.message || "Device registration failed" }, { status: 400 });
      }
    }

    if (url.pathname === "/api/network/devices/heartbeat" && request.method === "POST") {
      if (!isNetworkServer) return Response.json({ error: "Device heartbeat is available on the SifoBooks network server." }, { status: 403 });
      try {
        const body = await request.json();
        const deviceId = String(body?.device_id || "").trim().slice(0, 100);
        if (!deviceId) return Response.json({ error: "device_id is required" }, { status: 400 });
        const devices = readNetworkDevices();
        const now = new Date().toISOString();
        devices[deviceId] = {
          ...(devices[deviceId] || { device_id: deviceId, first_seen: now }),
          last_seen: now,
          ip: String(body?.ip || devices[deviceId]?.ip || "").trim().slice(0, 64),
          status: "online",
        };
        writeNetworkDevices(devices);
        return Response.json({ ok: true, serverId: serverIdentity.server_id, lastSeen: now });
      } catch (error: any) {
        return Response.json({ error: error?.message || "Device heartbeat failed" }, { status: 400 });
      }
    }

    if (url.pathname === "/api/network/config" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!body || !["network", "pos", "offline"].includes(String(body.mode))) {
          return Response.json({ error: "Invalid deployment mode" }, { status: 400 });
        }
        const cfg = {
          mode: String(body.mode),
          server: {
            host: String(body.server?.host || "127.0.0.1"),
            port: Number(body.server?.port || 3000),
            display_name: String(body.server?.display_name || "SifoBooks Server"),
          },
          client: {
            server_url: String(body.client?.server_url || ""),
            station_code: String(body.client?.station_code || "").toUpperCase(),
            station_name: String(body.client?.station_name || ""),
            station_type: String(body.client?.station_type || "pos"),
            assigned_role: String(body.client?.assigned_role || "cashier"),
          },
          zra: {
            environment: String(body.zra?.environment || "production"),
            branch_code: String(body.zra?.branch_code || ""),
            device_id: String(body.zra?.device_id || ""),
            sdc_id: String(body.zra?.sdc_id || ""),
            device_serial: String(body.zra?.device_serial || ""),
            vsdc_endpoint: String(body.zra?.vsdc_endpoint || ""),
          },
        };
        mkdirSync(dirname(networkConfigPath), { recursive: true });
        writeFileSync(networkConfigPath, JSON.stringify(cfg, null, 2));
        return Response.json({ ok: true, config: cfg, restartRequired: true });
      } catch (error: any) {
        return Response.json({ error: error?.message || "Could not save configuration" }, { status: 400 });
      }
    }

    const isLicenseRoute = url.pathname === "/license" || url.pathname.startsWith("/api/license/");
    const isPublicStatic = url.pathname.startsWith("/assets/") || url.pathname === "/favicon.ico" || url.pathname === "/sifobooks-logo.svg" || url.pathname === "/manifest.webmanifest";
    if (LICENSE_ENFORCEMENT && !isLicenseRoute && !isPublicStatic) {
      const current = licenseStatus();
      if (current.status !== "active" && current.status !== "trial") {
        return new Response("SifoBooks licence required. Open /license to activate.", {
          status: 402,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
    }

    const staticResponse = serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

    try {
      const response = await tanstackServer.fetch(request, {}, {});
      if (response.status === 404) {
        const shell = serveStatic("/_shell.html");
        if (shell) return shell;
      }
      return response;
    } catch (error) {
      console.error("[desktop] Server error:", error);
      writeStartupLog(`REQUEST ERROR: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
      });
      PORT = candidatePort;
      writeStartupLog(`SifoBooks server started at http://${HOST}:${PORT} (configured port ${configuredPort}, mode ${isNetworkServer ? "server" : isPosClient ? "pos" : "standalone"})`);
try { writeFileSync(join(dataDir, "desktop-port.txt"), String(PORT), "utf8"); } catch (error) { writeStartupLog(`PORT FILE ERROR: ${error instanceof Error ? error.message : String(error)}`); }
      return server;
    } catch (error) {
      lastError = error;
      writeStartupLog(`PORT ${candidatePort} FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to start SifoBooks server");
}

let serverInstance: ReturnType<typeof Bun.serve>;
try {
  serverInstance = startServer();
} catch (error) {
  writeStartupLog(`FATAL STARTUP ERROR: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  throw error;
}

console.log("");
console.log("  ╔══════════════════════════════════════════╗");
console.log("  ║  SifoBooks Desktop / Network Server       ║");
console.log(`  ║  Running at http://${HOST}:${PORT}       ║`);
console.log(`  ║  Mode: ${isNetworkServer ? "NETWORK SERVER" : "STANDALONE"}              ║`);
console.log(`  ║  Licence enforcement: ${LICENSE_ENFORCEMENT ? "ON" : "OFF"}          ║`);
console.log("  ╚══════════════════════════════════════════╝");
console.log("");

setTimeout(() => createStartupBackup(), 2500);

if (HOST === "127.0.0.1" || HOST === "localhost") {
  const browserUrl = `http://localhost:${PORT}`;
  setTimeout(async () => {
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const response = await fetch(browserUrl, { signal: AbortSignal.timeout(1000) });
        if (response.ok || response.status < 500) {
          openBrowser(browserUrl);
          writeStartupLog(`Browser opened: ${browserUrl} (HTTP ${response.status}); diagnostics: ${browserUrl}/api/desktop/diagnostics`);
          return;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    writeStartupLog(`Browser launch skipped: SifoBooks did not respond at ${browserUrl}; check ${STARTUP_LOG}`);
    openBrowser(browserUrl);
  }, 500);
}

process.on("SIGINT", () => {
  console.log("\n  Shutting down SifoBooks...");
  serverInstance.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});
