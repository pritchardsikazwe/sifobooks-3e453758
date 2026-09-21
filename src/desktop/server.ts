/**
 * SifoBooks Desktop Server
 *
 * This is the entry point for the standalone Windows .exe build.
 * It serves static client assets from ./client/ and delegates API / SSR
 * requests to the built TanStack Start server bundle.
 *
 * Compile with:  bun run build:desktop
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, statSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { join, dirname, extname, normalize } from "path";

// ── Resolve the application base directory ────────────────────────────
// In a compiled Bun executable, process.execPath points to the embedded
// runtime, not the .exe itself. We try multiple strategies to find the
// folder that contains client/ and schema.sql.
function findBaseDir(): string {
  const candidates = [
    // 1. Directory of the compiled executable (Bun sets this in compiled mode)
    process.env.BUN_COMPILED_BIN ? dirname(process.env.BUN_COMPILED_BIN) : null,
    // 2. process.argv[0] — the path used to launch the program
    process.argv[0] ? dirname(process.argv[0]) : null,
    // 3. Current working directory (when launched from the app folder)
    process.cwd(),
    // 4. process.execPath fallback
    dirname(process.execPath),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (existsSync(join(dir, "client")) || existsSync(join(dir, "schema.sql"))) {
      return dir;
    }
  }
  // Fall back to cwd
  return process.cwd();
}

const baseDir = findBaseDir();
const clientDir = join(baseDir, "client");
const dataDir = join(baseDir, "data");
const backupsDir = join(baseDir, "backups");

mkdirSync(dataDir, { recursive: true });
mkdirSync(backupsDir, { recursive: true });

function createStartupBackup() {
  const dbPath = process.env.DATABASE_PATH || join(dataDir, "sifobooks.db");
  if (!existsSync(dbPath)) return;
  try {
    // SQLite WAL checkpoint makes the copied file self-contained and recoverable.
    const db = new Database(dbPath);
    try { db.exec("PRAGMA wal_checkpoint(TRUNCATE);"); } finally { db.close(); }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const destination = join(backupsDir, `sifobooks-${stamp}.db`);
    writeFileSync(destination, readFileSync(dbPath));
    const backups = readdirSync(backupsDir)
      .filter((name) => /^sifobooks-.*\.db$/.test(name))
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

// Set environment variables BEFORE the server module loads so that
// database.ts and auth.ts pick them up correctly.
if (!process.env.DATABASE_PATH) {
  process.env.DATABASE_PATH = join(dataDir, "sifobooks.db");
}
if (!process.env.JWT_SECRET) {
  // Persist a per-installation secret so desktop sessions survive restarts
  // without embedding a shared production credential in the executable.
  const secretPath = join(dataDir, ".jwt-secret");
  if (existsSync(secretPath)) {
    process.env.JWT_SECRET = readFileSync(secretPath, "utf8").trim();
  } else {
    process.env.JWT_SECRET = crypto.randomUUID() + crypto.randomUUID();
    writeFileSync(secretPath, process.env.JWT_SECRET, { mode: 0o600 });
  }
}

// Change working directory to the app folder so that all process.cwd()
// references (storage dir, schema.sql fallback, etc.) resolve correctly.
process.chdir(baseDir);

// ── Import the built TanStack server (after env is set up) ────────────
const tanstackServer = (await import("../../dist/server/server.js")).default as {
  fetch: (req: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// ── Static file serving ───────────────────────────────────────────────
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
  // Prevent path traversal attacks
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(clientDir, safePath);

  // Skip directory paths and the root — those are handled by the TanStack router
  if (pathname === "/" || pathname.endsWith("/")) return null;

  if (!existsSync(filePath)) return null;

  // Don't try to stream a directory
  const stat = statSync(filePath);
  if (stat.isDirectory()) return null;

  const file = Bun.file(filePath);
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  return new Response(file, {
    headers: {
      "content-type": contentType,
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    },
  });
}

// ── Open the default browser ──────────────────────────────────────────
function openBrowser(url: string) {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      Bun.spawn(["cmd", "/c", "start", "", url], { stdio: ["ignore", "ignore", "ignore"] });
    } else if (platform === "darwin") {
      Bun.spawn(["open", url], { stdio: ["ignore", "ignore", "ignore"] });
    } else {
      Bun.spawn(["xdg-open", url], { stdio: ["ignore", "ignore", "ignore"] });
    }
  } catch {
    // Non-critical: user can open the URL manually
  }
}

// ── Start the server ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000", 10);

const server = Bun.serve({
  port: PORT,
  host: "127.0.0.1",
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 1. Try serving a static file (JS, CSS, images, icons, etc.)
    const staticResponse = serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

    // 2. Delegate to the TanStack server (API routes, SSR/SPA rendering)
    try {
      const response = await tanstackServer.fetch(request, {}, {});

      // SPA fallback: if the server returns 404 for a page route,
      // serve the prerendered shell so client-side routing takes over.
      if (response.status === 404) {
        const shell = serveStatic("/_shell.html");
        if (shell) return shell;
      }

      return response;
    } catch (error) {
      console.error("[desktop] Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log("");
console.log("  ╔══════════════════════════════════════════╗");
console.log("  ║  SifoBooks Desktop                        ║");
console.log(`  ║  Running at http://localhost:${PORT}       ║`);
console.log("  ║  Press Ctrl+C to stop                     ║");
console.log("  ╚══════════════════════════════════════════╝");
console.log("");

// Create a safe local backup after the database has had a chance to initialise.
setTimeout(() => createStartupBackup(), 2500);

// Open the browser after a short delay to ensure the server is ready
setTimeout(() => openBrowser(`http://localhost:${PORT}`), 1000);

// ── Graceful shutdown ─────────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n  Shutting down SifoBooks...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});
