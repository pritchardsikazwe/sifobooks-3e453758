import { readdir } from "node:fs/promises";
import { join } from "node:path";

const roots = ["src", "scripts"];
const forbiddenRuntimeMarkers = [
  /base44\.app/i,
  /https?:\/\/[^\s"'`]*base44/i,
  /@base44\//i,
  /from\s+["']@supabase\/supabase-js["']/i,
  /from\s+["']supabase["']/i,
  /VITE_SUPABASE_URL/i,
  /VITE_SUPABASE_ANON_KEY/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const failures: string[] = [];

for (const root of roots) {
  let files: string[] = [];
  try {
    files = await walk(root);
  } catch {
    continue;
  }

  for (const file of files) {
    if (file === join("scripts", "standalone-check.ts")) continue;
    if (!/\.(ts|tsx|js|mjs|cjs|json|toml|yaml|yml)$/.test(file)) continue;

    const source = await Bun.file(file).text();
    for (const pattern of forbiddenRuntimeMarkers) {
      if (pattern.test(source)) {
        failures.push(file.replaceAll("\\\\", "/") + ": matched " + pattern);
      }
    }
  }
}

if (failures.length) {
  console.error("Standalone check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Standalone check passed: no Base44 or external cloud-runtime dependency markers found.");
