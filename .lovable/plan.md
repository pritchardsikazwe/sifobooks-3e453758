## Goal
Under `elvissikazwe52@gmail.com`, create a new **Luansobe Secondary School** tenant, upgrade the School Grants and Budgets modules to match the Zambian Ministry-of-Education templates in the attached Excel files, and post every transaction from those workbooks into the new tenant.

## What the attached files show

**MANO_SEC_BUDGET_2026** — 2026 Q1 budget for Luansobe Secondary using the Ministry programme structure:
- Programme (e.g. `5503 Secondary Education`) → Sub-programme (e.g. `3003 Curriculum and Materials Development`) → line items
- Allocation formula: Secondary Grant K10,912.61 + Free-Ed Grant K91,162.50 = K102,075.11, split 50/50 across two programme groups then apportioned by fixed percentages (0.05–0.6)
- 8 programme groups with sub-programme codes 3001–3006, 9001–9006

**Copy_of_EXPENDITURE_RETURN_1-2** — Q1+Q2 2025 income & expenditure statement with school metadata (name, code 5526, location Mufulira), 6 income charge codes (10001–10004), 24 expense charge codes (20001–20030), petty-cash / imprest / stores tabs

**Copy_of_CASH_BOOK_LUANSOBE_APRIL_2025** — 14 monthly cashbook sheets (Jan–Jul 2025) with cheque-based bank register: date, payee, description, cheque #, charge code, receipts, payments, running balance

## Plan

### 1 · School Grants module upgrade (works for every tenant)
Add Ministry-of-Education taxonomy to `school_grants`:
- `programme_code` / `programme_name` (e.g. `5503 Secondary Education`)
- `sub_programme_code` / `sub_programme_name` (e.g. `3003 Curriculum & Materials Development`)
- `charge_code` (income codes 10001–10004)
- `allocation_percentage`, `allocation_source` ("Secondary Grant" / "Free Ed Grant" / "OVC")
- `quarter`, `fiscal_year` for quarterly reporting

New reference tables (shared across tenants, seeded once):
- `moe_programmes` — programme + sub-programme catalogue with codes and default percentages
- `moe_charge_codes` — income (100xx) and expenditure (200xx) charge codes with descriptions

Redesign `/school-grants` route into 3 tabs:
- **Grants Received** — with programme/sub-programme, charge code, quarter breakdown
- **Allocation Formula** — enter total grant, auto-split by percentages
- **Expenditure Return** — matches the Excel report shape (charge code, Q1, Q2, Q3, Q4, funding sources, total)

### 2 · Budgets module upgrade (works for every tenant)
Add Ministry taxonomy to `budgets`:
- `programme_code`, `sub_programme_code`, `charge_code`
- `quarter` (Q1–Q4)
- `allocation_percentage`
- `funding_source` (grant / fundraising / donation / fees / other)

UI enhancements on `/budgets`:
- Group rows by Programme → Sub-programme with subtotals
- "Import from Allocation Formula" action that pulls percentages from `moe_programmes`
- Variance column (Budget − Actual) with colour coding

### 3 · Create Luansobe Secondary tenant for elvissikazwe52@gmail.com
- Insert `companies` row: name "Luansobe Secondary School", code 5526, location Mufulira, type Secondary, base_currency ZMW
- Link to existing user via `company_members` (owner) and set `profiles.active_company_id`
- Enable modules: core, sales, purchases, finance, fixed_assets, budgets, multi_currency, inventory, hr_payroll, reports, compliance, school_erp, learning, admin
- Bank account: **LUANSOBE SECONDARY SCHOOL** / 5786225300117
- Seed COA (school template — cash, bank, grant income, expense accounts keyed to 200xx codes)

### 4 · Post the Excel data into the new tenant
- **Budget**: 2026 Q1 Luansobe budget (K102,075.11) with all 8 programmes and sub-programme allocations from the ALLOCATION sheet
- **Grants received**: Secondary Grant K10,912.61 + Free-Ed Grant K91,162.50
- **Cashbook**: every dated row from JAN–JUL 2025 sheets posted as journal entries against Bank + expense/income accounts using charge codes when present (cheque # → reference, payee → description)
- **Expenditure Return**: Q1+Q2 2025 totals recorded as `school_grants` line items and matched to journal entries
- Bank charges (K100/month) posted separately

Everything posts through existing `journal_entries` + `journal_lines` so Trial Balance, Cashbook, P&L, and General Ledger update automatically.

### Technical details (for reference)
- Migrations add nullable columns → no breaking changes to other tenants
- Reference tables use `GRANT SELECT TO authenticated` (read-only, no user_id — Ministry catalogue is global)
- Existing `school_grants` and `budgets` UIs continue to work with the new optional fields
- Data posting uses one SQL migration with literal INSERTs so rows show on first load
- No changes to auth, RLS on tenant-scoped tables, or the posting engine — we just feed it new rows

## Out of scope (ask if you want them)
- Petty-cash, employee-imprest, and stores-taking sub-registers from the expenditure return (I'll post totals only unless you want each line)
- Historical reprint of the Ministry F1/F2 forms as PDF — the data will be in the system; PDF templates can come next

Reply **go** and I'll ship it.
