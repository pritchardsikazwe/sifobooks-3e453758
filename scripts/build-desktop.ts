/**
 * Build a standalone SifoBooks Windows edition.
 *
 * SIFOBOOKS_EDITION: enterprise | accounting | retail | restaurant | hotel | school | property | lending | payroll
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { gzipSync } from "zlib";
import { $ } from "bun";

const OUT_DIR = "desktop-dist";
const CLIENT_DIR = join(OUT_DIR, "client");
const edition = String(process.env.SIFOBOOKS_EDITION || "enterprise").toLowerCase();
const editionSlug = ["enterprise", "accounting", "retail", "restaurant", "hotel", "school", "property", "lending", "payroll"].includes(edition) ? edition : "enterprise";
const editionDisplayNames: Record<string, string> = { enterprise: "SifoBooks", accounting: "SifoBooks-Accounting", retail: "SifoBooks-Retail", restaurant: "SifoBooks-Restaurant", hotel: "SifoBooks-Hotel", school: "SifoBooks-School", property: "SifoBooks-RealEstate", lending: "SifoBooks-Microfinance", payroll: "SifoBooks-Payroll" };
const productName = editionDisplayNames[editionSlug] || "SifoBooks";
const exeName = `${productName}.exe`;

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

console.log(`\\nStep 1/4: Building ${productName} web application...\\n`);
process.env.VITE_SIFOBOOKS_EDITION = editionSlug;
// Windows standalone uses local SQLite + local JWT auth (see src/lib/platform/backend-mode.ts).
process.env.VITE_SIFOBOOKS_BACKEND = "local";
await $`bun run build`;

console.log("\\nStep 2/4: Preparing native SifoBooks Windows icon and compiling executable...\\n");
mkdirSync(OUT_DIR, { recursive: true });
const iconSource = "public/sifobooks-logo.svg";
const iconOutput = join(OUT_DIR, "SifoBooks.ico");
if (!existsSync(iconSource)) throw new Error("SifoBooks logo source not found: public/sifobooks-logo.svg");
try {
  await $`magick ${iconSource} -background none -define icon:auto-resize=16,24,32,48,64,128,256 ${iconOutput}`;
} catch {
  throw new Error("ImageMagick is required to create the SifoBooks Windows icon. Install ImageMagick and retry.");
}
// Version/metadata. SIFOBOOKS_VERSION overrides (format YYYY.M.D or x.y.z).
const appVersion = String(process.env.SIFOBOOKS_VERSION || (() => { const d = new Date(); return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`; })());
const winVersion = (appVersion.split(".").map((n) => String(parseInt(n, 10) || 0)).concat(["0", "0", "0", "0"]).slice(0, 4)).join(".");
const exePath = join(OUT_DIR, exeName);
// Icon/metadata flags are only supported by Bun when compiling ON Windows.
if (process.platform === "win32") {
  await $`bun build --compile --target=bun-windows-x64 --windows-icon=${iconOutput} --windows-hide-console --windows-title=${productName} --windows-publisher=${"Sifonet Technologies"} --windows-version=${winVersion} --windows-description=${productName + " Enterprise (x64)"} --windows-copyright=${"Copyright (c) 2026 Sifonet Technologies"} src/desktop/server.ts --outfile ${exePath}`;
} else {
  console.warn("Cross-compiling from non-Windows host: icon/version resources are not embedded (shortcuts use SifoBooks.ico).");
  await $`bun build --compile --target=bun-windows-x64 src/desktop/server.ts --outfile ${exePath}`;
  // Hide the black console window: flip the PE optional-header Subsystem from
  // WINDOWS_CUI (3) to WINDOWS_GUI (2). Same effect as --windows-hide-console.
  // Set SIFOBOOKS_CONSOLE=1 to keep a visible console for debugging.
  if (process.env.SIFOBOOKS_CONSOLE !== "1") {
    const buf = readFileSync(exePath);
    const pe = buf.readUInt32LE(0x3c);
    if (buf.toString("latin1", pe, pe + 4) !== "PE\0\0") throw new Error("Unexpected EXE format; cannot hide console.");
    const subsystemOffset = pe + 24 + 68;
    const current = buf.readUInt16LE(subsystemOffset);
    if (current === 3) { buf.writeUInt16LE(2, subsystemOffset); writeFileSync(exePath, buf); console.log("Console window hidden (GUI subsystem)."); }
    else console.log(`EXE subsystem already ${current}; left unchanged.`);
  }
}
writeFileSync(join(OUT_DIR, "version.json"), JSON.stringify({ product: "SifoBooks", edition: editionSlug, version: appVersion, fileVersion: winVersion, arch: "x64", publisher: "Sifonet Technologies", builtAt: new Date().toISOString(), consoleHidden: process.platform === "win32" || process.env.SIFOBOOKS_CONSOLE !== "1" }, null, 2));

console.log("\nStep 2b/4: Preparing lightweight browser-based Windows launcher...\n");
console.log("\\nStep 3/4: Copying application files...\\n");
if (existsSync(CLIENT_DIR)) rmSync(CLIENT_DIR, { recursive: true, force: true });
copyDir("dist/client", CLIENT_DIR);
// Protected distribution: compile the server into the EXE and ship database metadata
// in compressed binary form instead of exposing raw SQL/source files to customers.
const protectedSchema = gzipSync(readFileSync("src/lib/db/schema.sql"));
writeFileSync(join(OUT_DIR, ".sifobooks-schema.bin"), protectedSchema);
const migrationFiles = existsSync("src/lib/db/migrations")
  ? readdirSync("src/lib/db/migrations").filter((name) => /^\d+_.*\.sql$/.test(name)).sort()
  : [];
const migrationBundle = migrationFiles.map((name) => ({ name, sql: readFileSync(join("src/lib/db/migrations", name), "utf8") }));
writeFileSync(join(OUT_DIR, ".sifobooks-migrations.bin"), gzipSync(Buffer.from(JSON.stringify(migrationBundle), "utf8")));
mkdirSync(join(OUT_DIR, "backups"), { recursive: true });

if (existsSync("config/license-public-key.pem")) {
  mkdirSync(join(OUT_DIR, "config"), { recursive: true });
  copyFileSync("config/license-public-key.pem", join(OUT_DIR, "config/license-public-key.pem"));
}
if (!existsSync(join(OUT_DIR, "SifoBooks.ico"))) throw new Error("SifoBooks.ico was not generated.");
writeFileSync(join(OUT_DIR, "edition.json"), JSON.stringify({ product: "SifoBooks", edition: editionSlug, productName }, null, 2));

writeFileSync(join(OUT_DIR, ".env.example"), [
  "# Optional desktop configuration",
  "DATABASE_PATH=data/sifobooks.db",
  "PORT=3000",
  "SIFOBOOKS_MODE=offline",
  "# LAN server: SIFOBOOKS_MODE=server and SIFOBOOKS_HOST=0.0.0.0",
  "# LAN POS client: SIFOBOOKS_MODE=pos and SIFOBOOKS_SERVER_URL=http://192.168.1.100:3000",
  "SIFOBOOKS_LICENSE_ENFORCEMENT=true",
  "SIFOBOOKS_DATABASE=sqlite",
  "SIFOBOOKS_HOST=127.0.0.1",
  "SIFOBOOKS_OFFLINE_ENABLED=true",
  "SIFOBOOKS_SYNC_ENABLED=false",
  "SIFOBOOKS_PWA_ENABLED=true",
  "SIFOBOOKS_PRINTING=system",
  "",
].join("\n"));

writeFileSync(join(OUT_DIR, "Start-SifoBooks.vbs"), [
  "Option Explicit",
  "On Error Resume Next",
  "Dim shell, fso, appDir, exePath",
  "Set shell = CreateObject(\"WScript.Shell\")",
  "Set fso = CreateObject(\"Scripting.FileSystemObject\")",
  "appDir = fso.GetParentFolderName(WScript.ScriptFullName)",
  "exePath = fso.BuildPath(appDir, \"" + exeName + "\")",
  "If fso.FileExists(exePath) Then",
  "  shell.CurrentDirectory = appDir",
  "  shell.Run Chr(34) & exePath & Chr(34), 0, False",
  "End If",
  "Set fso = Nothing",
  "Set shell = Nothing",
].join("\r\n"));
writeFileSync(join(OUT_DIR, "Stop-SifoBooks.ps1"), [
  "# Cleanly stops the local SifoBooks runtime (closes database, removes port file).",
  "$ErrorActionPreference = 'SilentlyContinue'",
  "$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path",
  "$dataDir = if ($env:SIFOBOOKS_DATA_DIR) { $env:SIFOBOOKS_DATA_DIR } elseif (Test-Path (Join-Path $appDir 'portable.flag')) { $appDir } else { Join-Path $env:ProgramData 'SifoBooks' }",
  "$dataDir = Join-Path $dataDir 'data'",
  "$portFile = Join-Path $dataDir 'desktop-port.txt'",
  "$tokenFile = Join-Path $dataDir 'desktop-shutdown.token'",
  "if ((Test-Path $portFile) -and (Test-Path $tokenFile)) {",
  "  $port = (Get-Content $portFile -Raw).Trim()",
  "  $token = (Get-Content $tokenFile -Raw).Trim()",
  "  try { Invoke-RestMethod -Method Post -Uri \"http://127.0.0.1:$port/api/desktop/shutdown\" -Headers @{ 'x-sifobooks-shutdown' = $token } -TimeoutSec 5 | Out-Null; Start-Sleep -Seconds 2 } catch {}",
  "}",
  `Get-Process -Name '${productName}' -ErrorAction SilentlyContinue | Stop-Process -ErrorAction SilentlyContinue`,
  "",
].join("\r\n"));
writeFileSync(join(OUT_DIR, "Create-SifoBooks-Shortcut.ps1"), [
  "$ErrorActionPreference = 'Stop'",
  "$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path",
  "$desktop = [Environment]::GetFolderPath('Desktop')",
  "$startup = [Environment]::GetFolderPath('Startup')",
  `"$exePath = Join-Path $appDir '${exeName}'",`,
  "$icon = Join-Path $appDir 'SifoBooks.ico'",
  "function New-SifoBooksShortcut([string]$path) {",
  "  $ws = New-Object -ComObject WScript.Shell",
  "  $s = $ws.CreateShortcut($path)",
  "  $s.TargetPath = $exePath",
  "  $s.Arguments = ''",
  "  $s.WorkingDirectory = $appDir",
  "  if (Test-Path $icon) { $s.IconLocation = $icon + ',0' }",
  `  $s.Description = '${productName}'`,
  "  $s.Save()",
  "}",
  "New-SifoBooksShortcut (Join-Path $desktop 'SifoBooks.lnk')",
  "New-SifoBooksShortcut (Join-Path $startup 'SifoBooks.lnk')",
  `Write-Host '${productName} desktop and startup shortcuts created.'`,
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
  `echo ${productName} desktop + startup shortcuts created.`,
  "echo The app will start automatically after the next Windows sign-in.",
  "pause",
  "",
].join("\r\n"));

mkdirSync(join(OUT_DIR, "config"), { recursive: true });
writeFileSync(join(OUT_DIR, "config", "network.example.json"), JSON.stringify({
  mode: "server",
  server: { host: "0.0.0.0", port: 3000, display_name: `${productName} Server` },
  client: { server_url: "http://192.168.1.100:3000", station_code: "POS-01", station_name: "Front Counter 1", station_type: "pos", assigned_role: "cashier" },
  zra: { environment: "production", branch_code: "", device_id: "", sdc_id: "", device_serial: "", vsdc_endpoint: "http://127.0.0.1:8080" }
}, null, 2));

writeFileSync(join(OUT_DIR, "start-sifobooks.bat"), [
  "@echo off",
  "cd /d \"%~dp0\"",
  `start "" "%WINDIR%\\System32\\wscript.exe" "%~dp0Start-SifoBooks.vbs"`,
  "exit /b 0",
  "",
].join("\n"));

writeFileSync(join(OUT_DIR, "PROTECTED-DISTRIBUTION.txt"), [
  "SIFOBOOKS PROTECTED DISTRIBUTION",
  "",
  "This customer package intentionally does not contain SifoBooks TypeScript source, raw SQL schema, raw SQL migrations, or JavaScript source maps.",
  "The application server is compiled into the Windows executable.",
  "Database schema and migrations are shipped in compressed application-binary form and are not intended for editing or redistribution.",
  "",
  "UNAUTHORISED copying, reverse engineering, modification, redistribution, resale, or submission of SifoBooks source/code/assets to AI training, code-generation, code-analysis or other automated ingestion services is prohibited by the applicable Sifonet Technologies licence and commercial terms.",
  "",
  "Technical protection is not absolute: a determined administrator can inspect software running on a computer. The package therefore combines compiled binaries, source minimisation, licence enforcement, device binding and integrity-oriented packaging rather than claiming unbreakable DRM.",
  "",
].join("\r\n"));

writeFileSync(join(OUT_DIR, "README-FIRST.txt"), [
  "SIFOBOOKS - LIGHTWEIGHT WINDOWS EDITION",
  "EDITION: " + productName,
  "",
  "1. Keep this entire folder together.",
  "2. Double-click the SifoBooks Windows executable or start-sifobooks.bat.",
  "3. SifoBooks starts its local server and opens in your normal Windows browser.",
  "4. Chrome, Edge, Firefox or another supported browser can be used.",
  "5. Server mode uses the central PC and can serve POS/client stations over the LAN.",
  "6. POS/client mode opens the configured central SifoBooks server URL and does not create a second database.",
  "7. Your SQLite database is created at data\\\\sifobooks.db when this PC is the local/offline/server installation.",
  "8. Do not delete the data folder - it contains company data.",
  "9. To move the installation to another PC, copy the entire folder including data.",
  "10. Backups are stored automatically in the backups\\\\ folder.",
  "11. Licensing is verified locally using the signed licence in data\\\\license.json.",
  "12. Keep config\\\\license-public-key.pem with the application; NEVER ship the private signing key.",
  "13. No WebView2 runtime is bundled. This lightweight build uses the existing Windows browser.",
  "14. Edition: " + editionSlug,
  "",
].join("\r\n"));
console.log("\\nStep 4/4: Standalone package ready.");

async function smokeTestWindowsExecutable() {
  if (process.platform !== "win32") return;

  console.log("\\nWindows runtime smoke test: starting compiled executable...\\n");
  // The smoke test runs with the packaged directory as its cwd. exePath is
  // relative to the repository root, so passing it directly to spawn would
  // resolve to desktop-dist\\desktop-dist\\<exe>.exe on Windows.
  const smokeData = join(process.cwd(), OUT_DIR, ".smoke-data");
  const executablePath = join(process.cwd(), exePath);
  if (!existsSync(executablePath)) {
    throw new Error("Compiled Windows executable was not found at " + executablePath);
  }
  rmSync(smokeData, { recursive: true, force: true });
  mkdirSync(smokeData, { recursive: true });

  const smokePort = "38123";
  const child = Bun.spawn([executablePath], {
    cwd: OUT_DIR,
    env: {
      ...process.env,
      SIFOBOOKS_DATA_DIR: smokeData,
      SIFOBOOKS_NO_BROWSER: "1",
      SIFOBOOKS_LICENSE_ENFORCEMENT: "false",
      SIFOBOOKS_MODE: "offline",
      SIFOBOOKS_HOST: "127.0.0.1",
      PORT: smokePort,
    },
    windowsHide: true,
    stdout: "ignore",
    stderr: "ignore",
  });

  const baseUrl = "http://127.0.0.1:" + smokePort;
  let healthy = false;

  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      await Bun.sleep(500);
      try {
        const response = await fetch(baseUrl + "/api/health", { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          const body = await response.json() as { ok?: boolean };
          if (body.ok) {
            healthy = true;
            break;
          }
        }
      } catch {}
    }

    if (!healthy) throw new Error("Compiled Windows executable did not become healthy within 30 seconds.");

    const diagnosticsResponse = await fetch(baseUrl + "/api/desktop/diagnostics", { signal: AbortSignal.timeout(3000) });
    if (!diagnosticsResponse.ok) throw new Error("Desktop diagnostics endpoint failed.");
    const diagnostics = await diagnosticsResponse.json() as {
      ok?: boolean;
      clientDirExists?: boolean;
      serverBundleEmbedded?: boolean;
    };
    if (!diagnostics.ok) throw new Error("Desktop diagnostics reported an unhealthy database.");
    if (!diagnostics.clientDirExists) throw new Error("Compiled desktop package cannot find client assets.");
    if (!diagnostics.serverBundleEmbedded) throw new Error("Compiled desktop server bundle is not available.");

    const rootResponse = await fetch(baseUrl + "/", { signal: AbortSignal.timeout(3000) });
    if (!rootResponse.ok) throw new Error("Compiled desktop root returned HTTP " + rootResponse.status + ".");

    const dbPath = join(smokeData, "data", "sifobooks.db");
    if (!existsSync(dbPath)) throw new Error("Compiled desktop did not create its SQLite database.");

    const tokenPath = join(smokeData, "data", "desktop-shutdown.token");
    if (existsSync(tokenPath)) {
      const token = readFileSync(tokenPath, "utf8").trim();
      await fetch(baseUrl + "/api/desktop/shutdown", {
        method: "POST",
        headers: { "x-sifobooks-shutdown": token },
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    }

    console.log("PASS: compiled EXE starts");
    console.log("PASS: local SQLite initializes");
    console.log("PASS: desktop diagnostics are healthy");
    console.log("PASS: client assets are served");
    console.log("PASS: root page responds");
    console.log("Windows runtime smoke test: PASSED");
  } finally {
    try { child.kill(); } catch {}
    await Bun.sleep(500);
    rmSync(smokeData, { recursive: true, force: true });
  }
}

await smokeTestWindowsExecutable();

console.log(`Edition: ${productName}`);
console.log("Copy the complete desktop-dist/ folder to a Windows PC.");
console.log(`Run start-sifobooks.bat or ${exeName}.`);
console.log("SifoBooks opens at http://localhost:3000.");
