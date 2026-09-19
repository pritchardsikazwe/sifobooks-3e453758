import { readdir } from "node:fs/promises";
import { join } from "node:path";

const roots = ["src", "scripts"];
const forbidden = [
  /base44/i,
  /base44\.app/i,
  /VITE_SUPABASE_/i,
  /SUPABASE_URL/i,
  /SUPABASE_ANON_KEY/i,
];

const allowedSupabasePaths = [
  "src/integrations/supabase/",
  "src/lib/db/",
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
    if (!/\.(ts|tsx|js|mjs|cjs|json|toml|yaml|yml)$/.test(file)) continue;
    const source = await Bun.file(file).text();

    for (const pattern of forbidden) {
      if (!pattern.test(source)) continue;

      const relative = file.replaceAll("\\\\", "/");
      const isAllowedCompatibility =
        pattern.source.includes("SUPABASE") &&
        allowedSupabasePaths.some((prefix) => relative.startsWith(prefix));

      if (!isAllowedCompatibility) {
        failures.push(relative + ": matched " + pattern);
      }
    }
  }
}

if (failures.length) {
  console.error("Standalone check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Standalone check passed.");
