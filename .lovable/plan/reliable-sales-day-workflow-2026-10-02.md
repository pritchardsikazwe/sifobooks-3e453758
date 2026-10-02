# Reliable sales-day workflow

## Goal
Make the established workflow complete reliably without redesigning accounting or ZRA/VSDC:

Create Item → Opening Stock → POS Shift → POS Sale → Invoice → Accounting → ZRA/VSDC → Shift Close → End of Day

## Implementation
1. Trace the exact live failures from POS and invoice posting, retaining transaction rollback so failed attempts post nothing.
2. Correct only the shared posting defects found in the existing database functions and client payloads. Preserve stock/service classification, unit checks, location fallback, VAT, discounts, change, accounts and balancing.
3. Keep POS sale and sales invoice as distinct documents while ensuring each successful posting reaches inventory, accounting and the existing fiscal queue/connector path as applicable.
4. Make every failure actionable on screen (shift, till, location, stock, cost, unit, permission, totals, accounting or fiscal layer) instead of the generic retry message.
5. Verify the existing shift submission and end-of-day screens consume the posted sales and payments correctly; do not create a second close mechanism.
6. Add regression coverage for stock and service lines, opening stock, exact/over payment, balanced journals, inventory movements, invoice posting, shift cash-up and failed-post rollback.

## Safety
- Use throwaway/test-company records only for end-to-end checks.
- No changes to connector credentials, ZRA device registration, routing, tax rules, account mapping, customer data or production publishing.
- No fake locations; stock sales must resolve a real authorized location, while service-only sales remain location-free.
