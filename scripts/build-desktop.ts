/**
 * Build script for the SifoBooks desktop Windows .exe package.
 *
 * Usage:  bun run build:desktop
 *
 * Steps:
 *   1. Build the web app (vite build → dist/client + dist/server)
 *   2. Compile the desktop server to a standalone Windows .exe
 *   3. Copy client assets, schema.sql, and config to the output folder
 *
 * The resulting desktop-dist/ folder is fully portable — copy it to any
 * Windows machine and double-click sifobooks.exe to run.
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { $ } from "bun";

const OUT_DIR = "desktop-dist";
const CLIENT_DIR = join(OUT_DIR, "client");

function copyDir(src: string, dest: string) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// ── Step 1: Build the web app ─────────────────────────────────────────
console.log("\n📦 Step 1/4: Building web app (vite build)...\n");
await $`bun run build`;

// ── Step 2: Compile the desktop server ────────────────────────────────
console.log("\n📦 Step 2/4: Compiling desktop server to Windows .exe...\n");
mkdirSync(OUT_DIR, { recursive: true });
await $`bun build --compile --target=bun-windows-x64 src/desktop/server.ts --outfile ${join(OUT_DIR, "sifobooks.exe")}`;

// ── Step 3: Copy client assets ────────────────────────────────────────
console.log("\n📦 Step 3/4: Copying client assets...\n");
// Clean and copy
if (existsSync(CLIENT_DIR)) {
  await $`rm -rf ${CLIENT_DIR}`;
}
copyDir("dist/client", CLIENT_DIR);

// ── Step 4: Copy schema.sql and create config files ───────────────────
console.log("\n📦 Step 4/4: Copying schema and creating config...\n");
copyFileSync("src/lib/db/schema.sql", join(OUT_DIR, "schema.sql"));

// Safe desktop configuration. The executable creates a persistent local JWT
// secret in data/.jwt-secret on first launch, so no production secret is
// embedded in the package.
writeFileSync(
  join(OUT_DIR, ".env.example"),
  [
    "DATABASE_PATH=data/sifobooks.db",
    "PORT=3000",
    "",
  ].join("\n"),
);

// Windows launcher batch file
writeFileSync(
  join(OUT_DIR, "start-sifobooks.bat"),
  ["@echo off", "cd /d \"%~dp0\"", "start \"\" sifobooks.exe", ""].join("\r\n"),
);

// ── Done ──────────────────────────────────────────────────────────────
console.log("");
console.log("  ╔══════════════════════════════════════════════════╗");
console.log("  ║  ✅ Desktop package ready!                      ║");
console.log(`  ║  Output: ${OUT_DIR}/                              ║`);
console.log("  ╠══════════════════════════════════════════════════╣");
console.log(`  ║  ${OUT_DIR}/sifobooks.exe   ← double-click to run ║`);
console.log(`  ║  ${OUT_DIR}/client/         ← web assets          ║`);
console.log(`  ║  ${OUT_DIR}/schema.sql      ← database schema     ║`);
console.log(`  ║  ${OUT_DIR}/.env            ← configuration       ║`);
console.log("  ╚══════════════════════════════════════════════════╝");
console.log("");
console.log("  Copy the entire desktop-dist/ folder to your Windows");
console.log("  machine and run sifobooks.exe (or start-sifobooks.bat).");
console.log("  The app opens at http://localhost:3000 automatically.");
console.log("");
