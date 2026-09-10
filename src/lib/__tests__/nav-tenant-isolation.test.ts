import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard: shared navigation/app-shell components must never contain
 * hard-coded tenant or company branding. Company identity always comes from the
 * authenticated user's active company (see src/lib/workspace.ts) so that one
 * tenant can never see another tenant's brand or menu.
 */
const FORBIDDEN = [/EdgeCore/i, /Sifonet\s+Technologies/i];

const SHARED_FILES = [
  "src/components/AppSidebar.tsx",
  "src/components/CompanySwitcher.tsx",
  "src/components/WorkspaceSwitch.tsx",
  "src/components/CommandPalette.tsx",
  "src/components/QuickCreate.tsx",
  "src/routes/_authenticated/route.tsx",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("tenant isolation in shared navigation", () => {
  it("has no hard-coded tenant branding in shell components", () => {
    for (const f of SHARED_FILES) {
      const src = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN) expect(src, `${f} contains ${rx}`).not.toMatch(rx);
    }
  });

  it("has no hard-coded tenant branding anywhere in src/components", () => {
    const offenders = walk("src/components").filter((p) => {
      const src = readFileSync(p, "utf8");
      return FORBIDDEN.some((rx) => rx.test(src));
    });
    expect(offenders).toEqual([]);
  });
});
