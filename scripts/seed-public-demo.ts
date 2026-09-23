/**
 * Provision the disposable SifoBooks Restaurant demo for a standalone database.
 *
 * Run with:
 *   SIFOBOOKS_DEMO=true bun run scripts/seed-public-demo.ts
 *
 * This is intentionally separate from normal customer onboarding. It creates
 * only synthetic demo data and demo-only credentials.
 */
import { getDb, generateUUID } from "../src/lib/db/database";
import { loadDemoData } from "../src/lib/demo-seed";

const DEMO_EMAIL_DOMAIN = "sifobooks.demo";
const PASSWORD = "Demo2026";

const DEMO_USERS = [
  { username: "SifoBooksdemo", fullName: "SifoBooks Demo Administrator", role: "owner" },
  { username: "accountant", fullName: "Demo Accountant", role: "accountant" },
  { username: "hr", fullName: "Demo HR / Payroll", role: "staff" },
  { username: "manager", fullName: "Demo Restaurant Manager", role: "manager" },
  { username: "cashier1", fullName: "Demo Cashier 1", role: "staff" },
  { username: "cashier2", fullName: "Demo Cashier 2", role: "staff" },
  { username: "waiter1", fullName: "Demo Waiter 1", role: "staff" },
  { username: "waiter2", fullName: "Demo Waiter 2", role: "staff" },
  { username: "kitchen", fullName: "Demo Kitchen", role: "staff" },
] as const;

function emailFor(username: string) {
  return username.toLowerCase() + "@" + DEMO_EMAIL_DOMAIN;
}

async function main() {
  if (String(process.env.SIFOBOOKS_DEMO || "").toLowerCase() !== "true") {
    throw new Error("Set SIFOBOOKS_DEMO=true to provision the disposable demo. This protects normal customer databases.");
  }

  const db = getDb();
  const ownerEmail = emailFor("SifoBooksdemo");
  const existing = db.prepare("SELECT id FROM auth_users WHERE email=? LIMIT 1").get(ownerEmail) as any;
  if (existing?.id) {
    console.log("SifoBooks demo already exists.");
    console.log("Username: SifoBooksdemo");
    console.log("Password: Demo2026");
    return;
  }

  const ownerId = generateUUID();
  const passwordHash = await Bun.password.hash(PASSWORD);
  const companyId = generateUUID();

  db.transaction(() => {
    db.prepare("INSERT INTO auth_users (id,email,password_hash,session_version,must_change_password,password_changed_at) VALUES (?,?,?,?,?,datetime('now'))")
      .run(ownerId, ownerEmail, passwordHash, 0, 0);

    db.prepare("INSERT INTO profiles (id,email,full_name,business_name,country,currency,industry,onboarded,vat_registered,active_company_id) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(ownerId, ownerEmail, "SifoBooks Demo Administrator", "SifoBooks Demo Restaurant", "Zambia", "ZMW", "restaurant", 1, 1, companyId);

    db.prepare("INSERT INTO companies (id,user_id,name,trading_name,country,city,base_currency,timezone,industry,workspace_mode,status,vat_registered,is_primary) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(companyId, ownerId, "SifoBooks Demo Restaurant Ltd", "SifoBooks Demo Restaurant", "Zambia", "Lusaka", "ZMW", "Africa/Lusaka", "restaurant", "restaurant", "active", 1, 1);

    db.prepare("INSERT INTO company_members (id,company_id,user_id,role) VALUES (?,?,?,?)")
      .run(generateUUID(), companyId, ownerId, "owner");

    db.prepare("INSERT INTO company_modules (id,user_id,company_id,module_key,config) VALUES (?,?,?,?,?)")
      .run(generateUUID(), ownerId, companyId, "public_demo", JSON.stringify({
        demo: true,
        edition: "restaurant",
        resettable: true,
        credentials: "DEMO_ONLY",
      }));
  })();

  const seeded = loadDemoData(ownerId);

  for (const demo of DEMO_USERS.slice(1)) {
    const id = generateUUID();
    const email = emailFor(demo.username);
    const hash = await Bun.password.hash(PASSWORD);

    db.transaction(() => {
      db.prepare("INSERT INTO auth_users (id,email,password_hash,session_version,must_change_password,password_changed_at) VALUES (?,?,?,?,?,datetime('now'))")
        .run(id, email, hash, 0, 0);
      db.prepare("INSERT INTO profiles (id,email,full_name,business_name,country,currency,industry,onboarded,vat_registered,active_company_id) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(id, email, demo.fullName, "SifoBooks Demo Restaurant", "Zambia", "ZMW", "restaurant", 1, 1, companyId);
      db.prepare("INSERT INTO company_members (id,company_id,user_id,role) VALUES (?,?,?,?)")
        .run(generateUUID(), companyId, id, demo.role);
    })();

    if (["cashier1", "cashier2"].includes(demo.username)) {
      db.prepare("INSERT INTO employee_pos_permissions (id,user_id,worker_user_id,company_id,full_name,pos_role,pin,allow,deny,is_active,pin_locked) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(), ownerId, id, companyId, demo.fullName, "cashier", demo.username === "cashier1" ? "1111" : "2222", JSON.stringify(["sell","hold","refund"]), JSON.stringify([]), 1, 0);
    }

    if (["waiter1", "waiter2"].includes(demo.username)) {
      db.prepare("INSERT INTO employee_pos_permissions (id,user_id,worker_user_id,company_id,full_name,pos_role,pin,allow,deny,is_active,pin_locked) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(generateUUID(), ownerId, id, companyId, demo.fullName, "waiter", demo.username === "waiter1" ? "3333" : "4444", JSON.stringify(["orders","tables"]), JSON.stringify(["refund"]), 1, 0);
    }
  }

  console.log("SifoBooks Demo Restaurant provisioned.");
  console.log("Company: SifoBooks Demo Restaurant Ltd");
  console.log("Username: SifoBooksdemo");
  console.log("Password: Demo2026");
  console.log("Seed counts:", seeded.counts);
  console.log("Role users:", DEMO_USERS.map((u) => u.username).join(", "));
}

await main();
