# SifoBooks Payroll Workflow Standard

## Purpose

Define the controlled lifecycle for monthly payroll runs without changing the existing payroll calculation, statutory export, payslip, or ledger-posting engines.

## Run lifecycle

```text
Draft
  ↓
Calculated
  ↓
Reviewed
  ↓
Approved
  ↓
Posted
  ↓
Paid
  ↓
Locked
```

`Reversed` is an exception state reached from a posted, paid, or locked run when an authorised reversal is required.

## Allowed transitions

| From | Allowed next states |
|---|---|
| Draft | Calculated |
| Calculated | Reviewed, Draft |
| Reviewed | Approved, Calculated |
| Approved | Posted, Reviewed |
| Posted | Paid, Reversed |
| Paid | Locked, Reversed |
| Locked | Reversed |
| Reversed | None |

The UI must not offer arbitrary status changes. Database/RPC enforcement must ultimately make the same transition rules authoritative.

## Maker-checker

Controlled states require an accountable approval trail. The intended audit record should capture:

- payroll run
- previous status
- new status
- actor
- timestamp
- reason/comment where required
- creator versus approving/posting actor where applicable

Approval, posting, payment confirmation, locking, and reversal should not silently overwrite the previous state.

## Recalculation control

Recalculation after review or approval must visibly warn the user that calculated totals may change and require the run to move back through the appropriate review stage.

A locked run is immutable except through an authorised reversal workflow.

## Statutory reconciliation

Before approval/posting, the run should provide reconciliation visibility for:

- gross payroll
- PAYE
- NAPSA
- NHIMA
- other deductions
- net payroll
- employee count

Before payment confirmation, bank/mobile-money schedules should reconcile to the payroll net total and employee-level payment rows.

## Posting and reversal

Posting must remain linked to the existing payroll ledger posting engine. Reversal must use the existing controlled payroll reversal engine rather than deleting or silently editing posted journals.

## Audit implementation note

The application currently contains substantial payroll calculation, payslip, statutory export, posting, and reversal functionality. This document and `src/lib/payroll-workflow.ts` establish the client-side workflow contract first.

The authoritative database audit/RPC layer should be enabled only after the connected Supabase project permits the required migration/write operation. No assumed permission name or unverified RPC should be introduced into the application.
