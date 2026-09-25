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
await $`bun run build`;

console.log("\\nStep 2/4: Preparing native SifoBooks Windows icon and compiling executable...\\n");
mkdirSync(OUT_DIR, { recursive: true });
const iconSource = "public/sifobooks-logo.svg";
const iconOutput = join(OUT_DIR, "SifoBooks.ico");
if (!existsSync(iconSource)) throw new Error("SifoBooks logo source not found: public/sifobooks-logo.svg");
try {
  await $`magick ${iconSource} -background none -define icon:auto-resize=16,24,32,48,64,128,256 ${iconOutput}`;
} catch {
  throw new Error("ImageMagick is required to create the native SifoBooks Windows icon. Install ImageMagick and retry.");
}
const serverExeName = exeName.replace(/\.exe$/i, "-server.exe");
await $`bun build --compile --target=bun-windows-x64 --windows-icon=${iconOutput} --windows-hide-console src/desktop/server.ts --outfile ${join(OUT_DIR, serverExeName)}`;

console.log("\nStep 2b/4: Building native Windows WebView2 host...\n");
if (process.platform !== "win32") throw new Error("The Windows desktop build must run on a Windows build runner for the native WebView2 host.");
await $`dotnet publish desktop/native/SifoBooksDesktop.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ${join(OUT_DIR, "native-host")}`;
const nativeExe = join(OUT_DIR, "native-host", "SifoBooksDesktop.exe");
if (!existsSync(nativeExe)) throw new Error("Native WebView2 host was not produced.");
copyFileSync(nativeExe, join(OUT_DIR, exeName));
rmSync(join(OUT_DIR, "native-host"), { recursive: true, force: true });

console.log("\\nStep 3/4: Copying application files...\\n");
if (existsSync(CLIENT_DIR)) rmSync(CLIENT_DIR, { recursive: true, force: true });
copyDir("dist/client", CLIENT_DIR);
// Protected distribution: compile the server into the EXE and ship database metadata
// in compressed binary form instead of exposing raw SQL/source files to customers.
const protectedSchema = gzipSync(readFileSync("src/lib/db/schema.sql"));
writeFileSync(join(OUT_DIR, ".sifobooks-schema.bin"), protectedSchema);
const migrationFiles = existsSync("src/lib/db/migrations")
  ? readdirSync("src/lib/db/migrations").filter((name) => /^\\d+_.*\\.sql$/.test(name)).sort()
  : [];
const migrationBundle = migrationFiles.map((name) => ({ name, sql: readFileSync(join("src/lib/db/migrations", name), "utf8") }));
writeFileSync(join(OUT_DIR, ".sifobooks-migrations.bin"), gzipSync(Buffer.from(JSON.stringify(migrationBundle), "utf8")));
mkdirSync(join(OUT_DIR, "backups"), { recursive: true });
if (existsSync("config/license-public-key.pem")) {
  mkdirSync(join(OUT_DIR, "config"), { recursive: true });
  copyFileSync("config/license-public-key.pem", join(OUT_DIR, "config/license-public-key.pem"));
}
if (!existsSync(join(OUT_DIR, "SifoBooks.ico"))) throw new Error("Native SifoBooks.ico was not generated.");
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
  "Dim shell, fso, appDir, exePath",
  "Set shell = CreateObject(\"WScript.Shell\")",
  "Set fso = CreateObject(\"Scripting.FileSystemObject\")",
  "appDir = fso.GetParentFolderName(WScript.ScriptFullName)",
  `exePath = fso.BuildPath(appDir, "${exeName}")`,
  "If fso.FileExists(exePath) Then",
  "  shell.CurrentDirectory = appDir",
  "  shell.Run Chr(34) & exePath & Chr(34), 0, False",
  "End If",
  "Set fso = Nothing",
  "Set shell = Nothing",
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
  "SIFOBOOKS - STANDALONE WINDOWS EDITION",
  `EDITION: ${productName}`,
  "",
  "1. Keep this entire folder together.",
  `3. Double-click the SifoBooks Windows executable to launch the native SifoBooks desktop window powered by Microsoft Edge WebView2, or start-sifobooks.bat for troubleshooting.`,
  `4. ${productName} starts a local server and opens inside the native WebView2 desktop window; no Chrome installation is required.`,
  "4. The application runs locally at http://localhost:3000 and does not require internet access for normal offline operation.",
  "5. Your SQLite database is created at data\\\\sifobooks.db.",
  "6. Do not delete the data folder - it contains company data.",
  `7. To move ${productName} to another PC, copy the entire folder including data.`,
  "8. Run Create-SifoBooks-Shortcut.bat once to create both a desktop shortcut and automatic startup shortcut.",
  "9. Backups are stored automatically in the backups\\\\ folder.",
  "10. No Base44, GitHub, Namecheap, Contabo, WAMP or internet is required for normal offline operation.",
  "11. Licensing is verified locally using the signed licence in data\\\\license.json.",
  "12. Keep config\\\\license-public-key.pem with the application; NEVER ship the private signing key.",
  "13. Protected distribution: do not redistribute application internals or submit them to AI ingestion/training services.",
  `14. Edition: ${editionSlug}. Upgrade to another licensed edition without deleting the data folder.`,
  "",
  "IMPORTANT: Keep the data folder when moving an existing installation.",
  "PROTECTED FILES: .sifobooks-schema.bin and .sifobooks-migrations.bin are application internals. Do not edit, copy, redistribute or upload them to AI services.",
  "",
].join("\r\n"));

console.log("\\nStep 4/4: Standalone package ready.");
console.log(`Edition: ${productName}`);
console.log("Copy the complete desktop-dist/ folder to a Windows PC.");
console.log(`Run start-sifobooks.bat or ${exeName}.`);
console.log("SifoBooks opens at http://localhost:3000.");
