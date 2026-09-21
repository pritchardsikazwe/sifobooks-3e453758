/**
 * Build the standalone SifoBooks Windows package.
 *
 * Output: desktop-dist/ with the executable, browser assets, schema,
 * one-click launcher and first-run instructions.
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, rmSync } from "fs";
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
    if (statSync(srcPath).isDirectory()) copyDir(srcPath, destPath);
    else copyFileSync(srcPath, destPath);
  }
}

console.log("\nStep 1/4: Building web application...\n");
await $`bun run build`;

console.log("\nStep 2/4: Compiling standalone Windows executable...\n");
mkdirSync(OUT_DIR, { recursive: true });
await $`bun build --compile --target=bun-windows-x64 src/desktop/server.ts --outfile ${join(OUT_DIR, "sifobooks.exe")}`;

console.log("\nStep 3/4: Copying application files...\n");
if (existsSync(CLIENT_DIR)) rmSync(CLIENT_DIR, { recursive: true, force: true });
copyDir("dist/client", CLIENT_DIR);
copyFileSync("src/lib/db/schema.sql", join(OUT_DIR, "schema.sql"));
copyDir("src/lib/db/migrations", join(OUT_DIR, "migrations"));
mkdirSync(join(OUT_DIR, "backups"), { recursive: true });
if (existsSync("public/favicon.ico")) copyFileSync("public/favicon.ico", join(OUT_DIR, "SifoBooks.ico"));

writeFileSync(join(OUT_DIR, ".env.example"), [
  "# Optional desktop configuration",
  "DATABASE_PATH=data/sifobooks.db",
  "PORT=3000",
  "",
].join("\n"));

writeFileSync(join(OUT_DIR, "Create-SifoBooks-Shortcut.bat"), [
  "@echo off",
  "setlocal",
  "set "APPDIR=%~dp0"",
  "powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\\SifoBooks.lnk'); $s.TargetPath = (Join-Path $env:APPDIR 'start-sifobooks.bat'); $s.WorkingDirectory = $env:APPDIR; $s.IconLocation = (Join-Path $env:APPDIR 'SifoBooks.ico') + ',0'; $s.Description = 'SifoBooks Accounting ERP'; $s.Save()"",
  "echo.",
  "echo SifoBooks desktop shortcut created.",
  "pause",
  "",
].join("\r\n"));

writeFileSync(join(OUT_DIR, "start-sifobooks.bat"), [
  "@echo off",
  "cd /d \"%~dp0\"",
  "start \"\" sifobooks.exe",
  "",
].join("\r\n"));

writeFileSync(join(OUT_DIR, "README-FIRST.txt"), [
  "SIFOBOOKS - STANDALONE WINDOWS EDITION",
  "",
  "1. Keep this entire folder together.",
  "2. Double-click start-sifobooks.bat.",
  "3. SifoBooks starts a local server and opens your browser.",
  "4. The application runs at http://localhost:3000.",
  "5. Your SQLite database is created at data\\sifobooks.db.",
  "6. Do not delete the data folder - it contains company data.",
  "7. To move SifoBooks to another PC, copy the entire folder including data.",
  "8. Run Create-SifoBooks-Shortcut.bat once to create a desktop shortcut with the SifoBooks icon.",
  "9. Backups are stored automatically in the backups\\ folder.",
  "10. No Base44, GitHub, Namecheap, Contabo, WAMP or internet is required.",
  "",
  "IMPORTANT: Keep the data folder when moving an existing installation.",
  "",
].join("\r\n"));

console.log("\nStep 4/4: Standalone package ready.");
console.log("Copy the complete desktop-dist/ folder to a Windows PC.");
console.log("Run start-sifobooks.bat or sifobooks.exe.");
console.log("SifoBooks opens at http://localhost:3000.");