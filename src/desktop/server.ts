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

    if (url.pathname === "/api/network/info" && request.method === "GET") {
      const cfg = readNetworkConfig();
      return Response.json({
        mode: isNetworkServer ? "server" : "standalone",
        serverName: cfg?.server?.display_name || "SifoBooks Server",
        host: HOST,
        port: PORT,
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
      writeStartupLog(`SifoBooks server started at http://${HOST}:${PORT} (configured port ${configuredPort})`);
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
          writeStartupLog(`Browser opened: ${browserUrl} (HTTP ${response.status})`);
          return;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    writeStartupLog(`Browser launch skipped: SifoBooks did not respond at ${browserUrl}`);
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
