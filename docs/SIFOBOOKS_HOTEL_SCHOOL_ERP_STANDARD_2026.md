# SifoBooks Hotel + School ERP Standard 2026

## Purpose

Extend SifoBooks into hospitality and education workspaces without creating a second accounting, inventory, POS, payroll, receipt or reporting engine.

## Architecture rule

Hotel and School are operational verticals. Financial transactions must reuse existing SifoBooks services and posting controls.

### Hotel lifecycle

Reservation → availability check → deposit → confirmation → check-in → room/folio charges → restaurant/POS charges → payment → check-out → invoice/receipt → night audit → reporting.

Room state lifecycle:

Available → Reserved → Occupied → Dirty → Cleaning → Inspected → Available.

Maintenance is an exception state and must block room sale until released.

### School lifecycle

Application → document checklist → assessment/interview → approval → enrolment → learner profile → class/subject allocation → attendance → assessment/marks → results/report card → fee invoice → collection/receipt → reporting.

## Shared services

- Accounting and general ledger: existing SifoBooks posting engine.
- Receivables/payments: existing invoice, receipt and payment services.
- POS: existing restaurant/retail POS engine.
- Inventory: existing locations, stock movements, transfers and stock-count controls.
- Payroll/HR: existing payroll and staff services.
- Reports: canonical SifoBooks Reports Centre.
- Permissions: existing role/permission framework.
- Printing: existing document layout and A4/receipt printing standards.

## Hotel modules

Reservations, Room Rack, Front Desk, Guests, Housekeeping, Maintenance, Check-in/Check-out, Folios, Payments/Deposits, Night Audit, Restaurant/Bar POS, Inventory/Purchasing, Hotel Accounting and Reports.

### Hotel controls

- Prevent double-booking for the same room/time window.
- Warn when room status is unavailable, dirty or under maintenance.
- Record deposits separately from final settlement.
- Support room moves and folio transfers with audit history.
- Post room and POS charges through existing ledger/POS services.
- Night audit must reconcile rooms, folios, payments and POS totals before close.

## School modules

Admissions, Students, Parents/Guardians, Academics, Timetable, Attendance, Examinations, Report Cards, Fees, Payments, Scholarships, Boarding, Transport, Staff/HR, Parent Portal, Student Portal and Reports.

### School controls

- Unique learner/student ID.
- Document checklist before final enrolment.
- Class capacity and duplicate-enrolment validation.
- Attendance corrections require an audit trail.
- Marks validation must respect configured grading rules.
- Published results/report cards should be versioned and auditable.
- Fee invoices, discounts, scholarships and collections must post through existing SifoBooks financial services.

## UI standard

Preserve SifoBooks navigation and enterprise visual language. Use light accounting/administrative screens, responsive tables, compact KPI cards, clear status badges and subtle 150–300ms interaction animations. Restaurant/POS screens may retain their existing touch-oriented dark teal experience.

## Data implementation status

The current Hotel and School operational screens use clearly labelled demo data while the sector database schema is unavailable. No destructive database migration is required. When persistence is enabled, connect these screens to sector tables and existing SifoBooks services rather than replacing the current engines.
