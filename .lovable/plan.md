# Zambia-Focused Accounting OS — Phased Upgrade Plan

Scope is huge. SifoBooks already ships most of the engine (COA, journals, GL, TB, AFS, bank rec, payroll with PAYE/NAPSA/NHIMA/WCF/SDL, fixed assets w/ depreciation, month/year close, audit logs, RBAC, multi-company, PDF exports). This plan closes the gaps and repositions the product as a Zambia-focused **Accounting + Reporting + Compliance + Audit + Training** OS. No claim of ZICA certification — wording will read *"Zambia-focused accounting software aligned with applicable financial reporting frameworks and configurable statutory compliance rules."*

## Gap analysis vs. what already exists

Already in place: double-entry engine, journals + auto-posting triggers, GL/TB/AFS, bank rules + reconciliation sessions, expenses/bills/invoices/receipts, fixed assets w/ depreciation, payroll + Zambia statutory computations, period locks, audit logs, multi-tenant + roles, PDF exports.

Missing / thin:
1. Guided COA with per-account "what is this for" + Dr/Cr hints.
2. ZICA-aligned AFS pack — cover, directors' report, accounting policies, numbered notes, comparatives, disclosure checklist.
3. ZRA Compliance Centre — PAYE/VAT/TOT/WHT/NAPSA/NHIMA/WCF/SDL calendar, TPIN on documents, Smart Invoice export.
4. Accounting Training Engine — in-app lessons + contextual Dr/Cr tooltips on posting forms.
5. Source documents — attachments on bills/invoices/expenses/journals.
6. Audit Engine — immutable journal export, evidence pack ZIP, working-paper index.
7. PWA — installable + offline outbox that syncs on reconnect.

## Phased roadmap

```text
Phase 1  Foundations & positioning        (build this turn)
Phase 2  ZICA-aligned AFS pack + notes
Phase 3  ZRA Compliance Centre
Phase 4  Source documents + attachments
Phase 5  Accounting Training Engine
Phase 6  Audit Engine (evidence pack)
Phase 7  PWA install + offline queue
```

## Phase 1 — build this turn

Small, safe, high-visibility. No changes to posting logic, RLS, or existing routes' behavior.

1. **Compliant positioning** — replace hero/tagline copy on the homepage and AppShell with the approved Zambia-focused wording; remove any implicit certification claim.
2. **COA explanations** — migration adds nullable `purpose` and `normal_balance` (Dr/Cr) to `chart_of_accounts`; backfill standard Zambian COA codes (1000 Cash, 1100 AR, 1200 Imprest, 1590 Acc. Dep., 2100 AP, 2210 VAT Input, 3000 Capital, 3900 Retained Earnings, 4000 Sales, 4300 Tuckshop, 5000 COS, 5300 Workshops, 5400 Tuckshop Purchases, 5700 Depreciation …). COA page shows an inline "What is this used for? · Normal balance: Dr/Cr" panel.
3. **Accounting Basics primer** at `/learn/accounting-basics` — Dr/Cr rules, the 5 account types, a worked double-entry example, source-doc → journal flow. Linked from the sidebar under *Help*.
4. **Compliance Centre hub** at `/compliance` — tiles linking existing Tax, Payroll statutory, and Period-close modules, with placeholders for Phase 2/3 so the IA is set.

## Phases 2–7 (later turns, one at a time)

- **Phase 2** — `afs_reports` gains `policies_json`, `directors_report`, `notes_json`; new PDF template with cover page, directors' report, accounting policies, numbered notes (PP&E movement, receivables ageing, related parties, directors' emoluments from payroll), prior-year comparatives, ZICA disclosure checklist.
- **Phase 3** — extend `compliance_obligations` with calendar view + auto-generators for PAYE (14th), VAT (18th), NAPSA (10th), NHIMA (10th), WCF/SDL, TOT; TPIN field on companies/customers/suppliers/invoices; ZRA Smart Invoice JSON export.
- **Phase 4** — Storage bucket `documents` + polymorphic `attachments` table; drag-drop uploader reused across bill/invoice/expense/journal forms.
- **Phase 5** — `lessons` table + guided walkthroughs; contextual "?" popovers on every posting form explaining the Dr/Cr that will be generated.
- **Phase 6** — signed immutable journal export (CSV + SHA-256), working-paper index generator, evidence-pack ZIP; auditor role already exists.
- **Phase 7** — `vite-plugin-pwa` with the guarded wrapper from the PWA skill; IndexedDB outbox for offline invoice/receipt/expense capture; sync on reconnect.

## What I will NOT do

- No "ZICA certified/approved/endorsed" wording anywhere.
- No rewrite of the posting engine, RLS, or auto-post triggers.
- No PWA/service worker until Phase 7 (per PWA skill guardrails).
- No destructive schema changes.

## Confirm to proceed

Approve and I'll ship **Phase 1** immediately. After that, tell me which phase to build next (2 → 7 is the recommended order).