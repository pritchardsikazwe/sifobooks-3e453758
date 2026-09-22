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
  "SIFOBOOKS_MODE=offline",
  "SIFOBOOKS_DATABASE=sqlite",
  "SIFOBOOKS_HOST=127.0.0.1",
  "SIFOBOOKS_OFFLINE_ENABLED=true",
  "SIFOBOOKS_SYNC_ENABLED=false",
  "SIFOBOOKS_PWA_ENABLED=true",
  "SIFOBOOKS_PRINTING=system",
  "",
].join("\n"));

writeFileSync(join(OUT_DIR, "Start-SifoBooks.vbs"), [
  'Option Explicit',
  'Dim shell, fso, appDir, exePath',
  'Set shell = CreateObject("WScript.Shell")',
  'Set fso = CreateObject("Scripting.FileSystemObject")',
  'appDir = fso.GetParentFolderName(WScript.ScriptFullName)',
  'exePath = fso.BuildPath(appDir, "sifobooks.exe")',
  'If fso.FileExists(exePath) Then',
  '  shell.CurrentDirectory = appDir',
  '  shell.Run Chr(34) & exePath & Chr(34), 0, False',
  'End If',
  'Set fso = Nothing',
  'Set shell = Nothing',
].join("\r\n"));

writeFileSync(join(OUT_DIR, "Create-SifoBooks-Shortcut.ps1"), [
  "$ErrorActionPreference = 'Stop'",
  "$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path",
  "$desktop = [Environment]::GetFolderPath('Desktop')",
  "$startup = [Environment]::GetFolderPath('Startup')",
  "$wscript = Join-Path $env:WINDIR 'System32\\wscript.exe'",
  "$vbs = Join-Path $appDir 'Start-SifoBooks.vbs'",
  "$icon = Join-Path $appDir 'SifoBooks.ico'",
  "function New-SifoBooksShortcut([string]$path) {",
  "  $ws = New-Object -ComObject WScript.Shell",
  "  $s = $ws.CreateShortcut($path)",
  "  $s.TargetPath = $wscript",
  "  $s.Arguments = ('\"{0}\"' -f $vbs)",
  "  $s.WorkingDirectory = $appDir",
  "  if (Test-Path $icon) { $s.IconLocation = $icon + ',0' }",
  "  $s.Description = 'SifoBooks Accounting ERP'",
  "  $s.Save()",
  "}",
  "New-SifoBooksShortcut (Join-Path $desktop 'SifoBooks.lnk')",
  "New-SifoBooksShortcut (Join-Path $startup 'SifoBooks.lnk')",
  "Write-Host 'SifoBooks desktop and startup shortcuts created.'",
  "",
].join("\r\n"));

writeFileSync(join(OUT_DIR, "Create-SifoBooks-Shortcut.bat"), [
  "@echo off",
  "powershell -NoProfile -ExecutionPolicy Bypass -File \"%~dp0Create-SifoBooks-Shortcut.ps1\"",
  "if errorlevel 1 (",
  "  echo.",
  "  echo Failed to create SifoBooks shortcuts.",
  "  pause",
  "  exit /b 1",
  ")",
  "echo.",
  "echo SifoBooks desktop + startup shortcuts created.",
  "echo The app will start automatically after the next Windows sign-in.",
  "pause",
  "",
].join("\r\n"));

writeFileSync(join(OUT_DIR, "start-sifobooks-network.bat"), [
  "@echo off",
  "cd /d \"%~dp0\"",
  "set SIFOBOOKS_MODE=network",
  "set SIFOBOOKS_DATABASE=postgres",
  "set SIFOBOOKS_HOST=0.0.0.0",
  "set SIFOBOOKS_OFFLINE_ENABLED=false",
  "set SIFOBOOKS_SYNC_ENABLED=true",
  "start \"\" sifobooks.exe",
  "",
].join("\r\n"));

writeFileSync(join(OUT_DIR, "start-sifobooks.bat"), [
  "@echo off",
  "cd /d \"%~dp0\"",
  "start \"\" wscript.exe \"%~dp0Start-SifoBooks.vbs\"",
  "exit /b 0",
  "",
].join("\r\n"));

writeFileSync(join(OUT_DIR, "README-FIRST.txt"), [
  "SIFOBOOKS - STANDALONE WINDOWS EDITION",
  "",
  "1. Keep this entire folder together.",
  "2. Double-click Start-SifoBooks.vbs for a silent launch, or start-sifobooks.bat for troubleshooting.",
  "3. SifoBooks starts a local server and opens your browser.",
  "4. The application runs at http://localhost:3000.",
  "5. Your SQLite database is created at data\\sifobooks.db.",
  "6. Do not delete the data folder - it contains company data.",
  "7. To move SifoBooks to another PC, copy the entire folder including data.",
  "8. Run Create-SifoBooks-Shortcut.bat once to create both a desktop shortcut and automatic startup shortcut.",
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