import { describe, it, expect } from "vitest";
import {
  entitledProducts, authorizedProducts, effectiveModules, productLanding, resolveWorkspace,
  type ProductKey,
} from "@/lib/workspace-context";
import type { Access, PermissionKey } from "@/lib/rbac";

function staff(perms: PermissionKey[], extra: Partial<Access> = {}): Access {
  return {
    is_owner: false,
    is_super_admin: false,
    tenant_id: "tenant-1",
    role_key: "retail_cashier",
    role_name: "Cashier",
    pos_channel: "retail",
    branch_id: null,
    branch_name: null,
    permissions: perms,
    ...(extra as any),
  } as Access;
}

const owner = { is_owner: true, is_super_admin: false, permissions: [] } as unknown as Access;

const mods = (keys: string[]) => effectiveModules(keys.map((module_key) => ({ module_key })));

describe("company product entitlement", () => {
  it("gives a retail company Retail POS and never Restaurant", () => {
    const products = entitledProducts({ workspaceMode: "accounting", modules: mods([]), industry: "Farming" });
    expect(products).toContain("retail_pos");
    expect(products).not.toContain("restaurant");
  });

  it("only entitles Restaurant when explicitly enabled", () => {
    expect(entitledProducts({ workspaceMode: "restaurant", modules: mods([]), industry: null })).toContain("restaurant");
    expect(entitledProducts({ workspaceMode: "accounting", modules: mods(["restaurant"]), industry: null })).toContain("restaurant");
  });

  it("keeps payroll-only and hotel-only companies focused", () => {
    expect(entitledProducts({ workspaceMode: "payroll_only", modules: mods(["retail_pos"]), industry: null })).toEqual(["payroll"]);
    expect(entitledProducts({ workspaceMode: "hotel_only", modules: mods(["retail_pos"]), industry: null })).toEqual(["hotel"]);
  });

  it("honours an explicitly switched-off module", () => {
    const m = effectiveModules([{ module_key: "__off__:retail_pos" }]);
    expect(entitledProducts({ workspaceMode: "accounting", modules: m, industry: null })).not.toContain("retail_pos");
  });
});

describe("user authorisation within a company", () => {
  const entitled: ProductKey[] = ["retail_pos", "restaurant", "accounting"];

  it("never offers Restaurant to a retail-channel cashier", () => {
    const list = authorizedProducts(entitled, staff(["pos.retail.access"]));
    expect(list).toEqual(["retail_pos"]);
  });

  it("never offers Retail POS to a restaurant-channel waiter", () => {
    const list = authorizedProducts(entitled, staff(["pos.restaurant.access"], { pos_channel: "restaurant", role_key: "waiter" }));
    expect(list).toEqual(["restaurant"]);
  });

  it("gives owners everything the company is entitled to", () => {
    expect(authorizedProducts(entitled, owner)).toEqual(entitled);
  });

  it("gives nothing when the user is not signed in", () => {
    expect(authorizedProducts(entitled, null)).toEqual([]);
  });
});

describe("workspace resolution", () => {
  it("MKP acceptance case: retail cashier lands on the Retail POS, not Restaurant", () => {
    const access = staff(["pos.retail.access", "pos.sales.create"]);
    const entitled = entitledProducts({ workspaceMode: "accounting", modules: mods([]), industry: "Farming" });
    const products = authorizedProducts(entitled, access);
    const r = resolveWorkspace({ products, access, companySelected: true });
    expect(r.product).toBe("retail_pos");
    expect(r.route).toBe("/pos");
    expect(r.chooser).toBe(false);
  });

  it("asks the user to choose when several workspaces are valid", () => {
    const r = resolveWorkspace({ products: ["retail_pos", "restaurant"], access: owner, companySelected: true });
    expect(r.chooser).toBe(true);
    expect(r.route).toBe("/workspace");
  });

  it("asks the user to choose a company first when several exist", () => {
    const r = resolveWorkspace({ products: ["retail_pos"], access: owner, multipleCompanies: true, companySelected: false });
    expect(r.route).toBe("/workspace");
  });

  it("uses a stored preference only when it is still entitled", () => {
    expect(resolveWorkspace({ products: ["retail_pos", "accounting"], preferred: "accounting", access: owner, companySelected: true }).route).toBe("/dashboard");
    // stale preference for a product that is no longer entitled must not be used
    const stale = resolveWorkspace({ products: ["retail_pos", "accounting"], preferred: "restaurant", access: owner, companySelected: true });
    expect(stale.chooser).toBe(true);
  });

  it("routes a payroll-only company to payroll", () => {
    const products = entitledProducts({ workspaceMode: "payroll_only", modules: mods([]), industry: null });
    expect(resolveWorkspace({ products, access: owner, companySelected: true }).route).toBe("/payroll-dashboard");
  });

  it("routes hotel front desk into the hotel shell", () => {
    const products = entitledProducts({ workspaceMode: "hotel_only", modules: mods([]), industry: null });
    const access = staff(["accounting.view"], { role_key: "front_desk", pos_channel: null as any });
    expect(resolveWorkspace({ products: authorizedProducts(products, access), access, companySelected: true }).route).toBe("/hotel");
  });

  it("falls back to the dashboard rather than guessing when nothing is authorised", () => {
    const r = resolveWorkspace({ products: [], access: staff([]), companySelected: true });
    expect(r.product).toBeNull();
    expect(r.route).toBe("/dashboard");
  });

  it("sends a kitchen-only user to the kitchen screen", () => {
    const access = staff(["kitchen.access"], { pos_channel: "restaurant", role_key: "kitchen" });
    expect(productLanding("restaurant", access)).toBe("/restaurant/kitchen");
  });
});
