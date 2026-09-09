# SifoBooks Settings & Administration Audit Standard

## Objective

Settings and Administration is the control plane for each company/workspace. Configuration must be tenant-aware, permission-controlled, auditable, and safe for accounting data.

## Control areas

| Area | Required controls | Priority |
|---|---|---|
| Company profile | Legal name, trading name, TPIN, VAT, address, contacts, logo, timezone, base currency, branding | High |
| Branches | Code, name, active status, address, manager, default warehouse/register, branch restrictions | High |
| Users | Invitation, activation/deactivation, role, branch, last activity, access status | Critical |
| Roles | System/custom roles, clone, description, protected system roles | Critical |
| Permissions | Grouped permissions, least privilege, role matrix, explicit admin controls | Critical |
| Numbering | Per-document sequences, prefix, fiscal-year reset, padding, next number, duplicate/concurrency protection | Critical |
| Tax configuration | VAT/tax schemes, rates, effective dates, inclusive/exclusive rules, exemptions, WHT and statutory mappings | Critical |
| Document templates | Invoice/quote/receipt/credit note/PO/GRN/payslip layouts, logo, footer, signatures, print/PDF settings | High |
| Currency | Base currency, enabled currencies, decimal precision, exchange-rate source/date, FX gain/loss accounts | High |
| Fiscal periods | Fiscal-year definition, open/closed periods, close/reopen controls, lock enforcement | Critical |
| Audit logs | Actor, timestamp, company, branch, action, entity, before/after, reason, source/IP where supported | Critical |
| Integrations | Provider, connection status, credentials references, scopes, last sync, errors, retry/disconnect | Critical |
| Subscription/modules | Plan, status, limits, enabled modules, entitlement enforcement, renewal/cancellation | High |

## Existing implementation observations

The current Company Setup already provides profile, companies, branches, departments, cost centres, financial year, tax, positions, roles and approval configuration. It also uses the active company context. fileciteturn286file0

The dedicated Team & Roles area is stronger than the legacy Admin member editor: it already supports staff, roles and permissions, branch assignment, activation, invitation through a server function, access matrix, and least-privilege controls. fileciteturn287file0

The current Audit Logs page displays recent activity in a reusable data table, but it should be extended with tenant/branch filters, date range, action/entity filters, detail inspection, export, and server-side access control. fileciteturn285file0

The current Subscription page can activate a plan directly and currently describes billing integration as forthcoming. This should become an entitlement-controlled subscription workflow rather than a simple client-side activation. fileciteturn284file0

## Required improvements

### 1. Company and workspace context

- Every settings read/write must resolve the active company/tenant server-side.
- Never rely only on a client-supplied company ID for authorization.
- Show company name, branch and active workspace context in settings headers.
- Prevent accidental cross-company edits.

### 2. Users and roles

- Use the existing Team & Roles/RBAC system as the primary access-management surface.
- Remove or deprecate duplicate legacy member-management paths that can bypass the stronger RBAC flow.
- Owner/admin operations must be permission checked server-side.
- Protect the last owner from deletion/demotion.
- Require confirmation for deactivation, removal and privilege escalation.
- Record role, branch and activation changes in the audit trail.

### 3. Numbering control

Create a central numbering configuration for every transactional document:

`Invoice, Quote, Credit Note, Receipt, PO, GRN, Bill, Payment, Journal, Stock Adjustment, Stock Take, Payroll Run, POS Sale and other controlled documents.`

Required fields:

- document type
- prefix
- sequence number
- padding
- fiscal-year behavior
- branch-specific sequence option
- preview
- active/inactive

Numbers must be generated transactionally. Client-side `count + 1` or random numbering must not be used for controlled documents.

### 4. Tax configuration

Tax configuration should support effective-dated rates and schemes. Changes to tax rates must not silently rewrite historical documents. Posted documents retain their original tax treatment.

### 5. Document templates

Templates should be centralized and reusable across sales, purchases, inventory and payroll. Each template should support company branding, document number/status, tax breakdown, totals, signatures/approval, QR/reference information where applicable, and print-safe A4/POS formats.

### 6. Currency and FX

- Base currency is company-level configuration.
- Foreign currencies must have explicit enabled/disabled state.
- Exchange rates need source, effective date and rate.
- Historical transactions retain their transaction rate.
- FX gain/loss treatment must be configurable and auditable.

### 7. Fiscal periods

Fiscal periods must integrate with the existing Period Close controls. A closed period must reject creation/editing/posting of accounting-impacting transactions, not merely hide UI buttons. Reopening requires elevated permission, reason and audit record.

### 8. Audit logs

Audit records should be immutable and capture:

`company → branch → actor → timestamp → action → entity → record ID → before → after → reason → source`

High-risk events include:

- role/permission changes
- company profile changes
- tax changes
- numbering changes
- period close/reopen
- document void/reversal
- subscription/module changes
- integration connect/disconnect
- user activation/removal
- payroll approval/posting/reversal

### 9. Integrations

Create a centralized integration registry with connection health, provider, enabled status, last successful sync, last error, retry, disconnect and credential-reference metadata. Secrets must never be displayed or stored in ordinary configuration tables.

### 10. Subscription and modules

Subscription should control entitlements centrally:

`plan → modules → limits → company entitlement → user access`

Module access must be checked server-side as well as in navigation/UI. Subscription changes should be auditable. Billing status should be separate from module configuration so a failed payment cannot accidentally create inconsistent entitlements.

## Administration UI standard

All Settings pages should use:

- SifoModuleHeader
- consistent section cards
- responsive two-column forms
- searchable data tables
- status badges
- unsaved-change protection
- confirmation dialogs for destructive/control actions
- clear Save/Cancel actions
- loading, empty and error states
- audit/history panel for sensitive settings
- print/export where configuration records benefit from it

## Implementation order

1. Central Settings/Administration landing page
2. Company/workspace context hardening
3. Users/Roles/Permissions consolidation
4. Numbering engine
5. Tax configuration
6. Document templates
7. Currency/FX settings
8. Fiscal period integration
9. Audit log hardening
10. Integration registry
11. Subscription/module entitlement engine
12. Cross-module security regression tests

## Safety rule

Database/RPC enforcement must be the final authority for security-sensitive administration operations. Client-side checks improve UX but must never be treated as authorization.