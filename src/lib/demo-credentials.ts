/**
 * Public demo credentials.
 *
 * These are intentionally non-secret sample credentials for a disposable
 * demonstration environment only. They must never be used as defaults for
 * customer companies or production tenants.
 */
export const SIFOBOOKS_DEMO_CREDENTIALS = {
  username: "SifoBooksdemo",
  password: "Demo2026",
  label: "SifoBooks Demo",
  environment: "DEMO ONLY",
} as const;

export const DEMO_ROLE_CREDENTIALS = [
  { username: "SifoBooksdemo", password: "Demo2026", role: "Owner / Administrator" },
  { username: "accountant", password: "Demo2026", role: "Accountant" },
  { username: "hr", password: "Demo2026", role: "HR / Payroll" },
  { username: "manager", password: "Demo2026", role: "Manager" },
  { username: "cashier1", password: "Demo2026", role: "Cashier" },
  { username: "cashier2", password: "Demo2026", role: "Cashier" },
  { username: "waiter1", password: "Demo2026", role: "Waiter" },
  { username: "waiter2", password: "Demo2026", role: "Waiter" },
  { username: "kitchen", password: "Demo2026", role: "Kitchen / KDS" },
] as const;
