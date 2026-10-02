# First-run setup, modules, demo and billing — fill the gaps only

Most of your document already exists in SifoBooks: the setup wizard (welcome, business profile, tax, modules, branch/warehouse, accounting, administrator, backup, devices), automatic modules per business type, hiding modules that are off, company switching, the Demo pages with a "sample data only" banner, and the Subscription page. Nothing will be rebuilt. Only the missing pieces below are added, reusing the existing pages.

## What is missing today, and what will be added

1. **Welcome step buttons** — the wizard's first step has no "Explore Demo". Add `[Start Setup]` and `[Explore Demo]` there, plus the five-line "what you'll do" list from your document.
2. **Windows vs Cloud explanation** — add a small panel to the welcome step showing the two paths (Windows: local data, works offline, optional cloud sync / Cloud: many users and branches, access anywhere), and that you can start on Windows and add Cloud later.
3. **Wizard order** — reorder the existing steps to match your flow: Welcome → Administrator → Business profile (country, currency, VAT, financial year, business type) → Modules → Branch/Location → Tax → Accounting → Backup → Devices → Finish. A short "Add users" and "Import data" note goes on the Finish screen with links to the existing Users and Import pages (no new pages).
4. **"Start with Sample Data"** — on the Finish screen, a button that opens the matching demo instead of filling the real company. Demo data never goes into the real company.
5. **Demo Center inside the app** — the Help (?) button in the top bar becomes a small menu with "Demo Center", opening the existing demo list. Demo pages get an "Exit Demo — back to My Company" button for signed-in users. The sign-in page gets a "Try SifoBooks Demo" link.
6. **Demo list** — show every demo that already exists (Hotel, School, Restaurant, Payroll, Property). Retail, Microfinance and Accounting are listed as "Coming soon" — no fake demo data is invented.
7. **Subscription & Billing — Add modules** — below the current plans, an "Available modules" list (Hotel, Restaurant, School, Microfinance, Property, Payroll, Retail POS) with `[View Details]` and `[Add Module]`. "View Details" lists what the module turns on (e.g. Hotel: Rooms, Reservations, Guests, Front Desk, Check-in/out, Hotel billing, Hotel reports). "Add Module" switches it on through the existing business-features setting, so the menu updates immediately with no reinstall. Prices show as "Price on request" until you give me the real amounts.
8. **Demo / Trial / Paid label** — the Subscription page shows which of the three the company is on, using the existing subscription status (trial vs active).

## Not changed

Accounting, POS, invoices, ZRA/VSDC, the Windows database, sign-in, permissions, the menus' structure, and the database. No new tables. No payments are taken — "Add Module" activates directly, as the current plans already do.

## Technical details

- `src/components/company/CompanyOnboardingWizard.tsx`: reorder `steps` + `canContinue` + `renderStep` cases; welcome buttons (Explore Demo → `/demo`); finish-screen links and sample-data button (→ `/demo/$industry` for the chosen business type).
- `src/routes/_authenticated/route.tsx`: Help icon → DropdownMenu with Demo Center link.
- `src/components/demo/DemoShell.tsx` / `src/routes/demo.index.tsx`: Exit Demo (when a session exists), coming-soon tiles.
- `src/routes/auth.tsx`: "Try SifoBooks Demo" link.
- `src/routes/_authenticated/subscription.tsx`: Available modules section; activation via existing `setFeature` / `setBusinessCapability` from `src/lib/industry-solutions.ts`; module→feature map in a small `src/lib/module-catalog.ts`.
