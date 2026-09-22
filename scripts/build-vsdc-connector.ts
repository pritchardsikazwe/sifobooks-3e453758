import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const OUT="vsdc-connector-dist";
if(existsSync(OUT)) rmSync(OUT,{recursive:true,force:true});
mkdirSync(OUT,{recursive:true});
console.log("Building SifoBooks VSDC Connector for Windows...");
const result=spawnSync("bun",["build","--compile","--target=bun-windows-x64","scripts/vsdc-connector-agent.ts","--outfile",join(OUT,"sifobooks-vsdc-connector.exe")],{stdio:"inherit"});
if(result.status!==0) process.exit(result.status||1);
copyFileSync("connector.example.json",join(OUT,"connector.example.json"));
writeFileSync(join(OUT,"start-vsdc-connector.bat"),[
 "@echo off","cd /d \"%~dp0\"","if not exist connector.json (",
 "  echo Create connector.json from connector.example.json first.",
 "  pause","  exit /b 1",")",
 "sifobooks-vsdc-connector.exe","pause",""
].join("\r\n"));
writeFileSync(join(OUT,"README-FIRST.txt"),[
 "SIFOBOOKS ZRA VSDC CONNECTOR",
 "","1. Copy connector.example.json to connector.json.",
 "2. Enter the Cloud URL, connector ID, one-time connector credential and local VSDC URL.",
 "3. Keep connector.json private.",
 "4. Run start-vsdc-connector.bat.",
 "5. The connector sends heartbeat and polls Cloud for approved VSDC commands.",
 "6. The connector talks to the customer's local VSDC; it does not expose VSDC to the internet.",
 "","The connector does not contain ZRA credentials in the executable.",
 "Use TEST first. Production use requires the customer's approved ZRA configuration and applicable UAT/certification."
].join("\r\n"));
console.log("Connector package ready:",OUT);
