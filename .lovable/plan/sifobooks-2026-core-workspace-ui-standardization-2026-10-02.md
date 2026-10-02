# SifoBooks 2026 core workspace UI standardization

## Goal
Make the existing newer SifoBooks workspace styling the single visual source of truth, then apply it to the requested core workspace screens without changing behavior, data, routes, or protected business systems.

## Scope
- Dashboard
- Items / Products
- Inventory workspace and its existing core inventory views
- Customers
- Suppliers
- Sales history
- Invoices list and invoice editor

## Implementation
1. **Consolidate the existing 2026 workspace primitives**
   - Reuse the current semantic color and module tokens in the global stylesheet.
   - Standardize shared page shells and module headers, KPI cards, panels/cards, data tables, form sections and fields, status badges, detail drawers/dialogs, search/filter toolbars, empty/loading/error states, and spacing.
   - Add only small shared presentation components where the same visual pattern is currently repeated.

2. **Adopt the shared primitives on core screens**
   - Align page widths, page headers, action placement, KPI rows, filter bars, table containers, status displays, form layouts, and detail panels.
   - Replace one-off styling and raw status colors with the shared SifoBooks 2026 components.
   - Preserve all existing fields, actions, permissions, queries, workflows, links, and screen content.

3. **Preserve boundaries**
   - No changes to database schema or data.
   - No changes to authentication, accounting/posting, POS, tax, Smart Invoice, connector, or VSDC logic.
   - No route changes and no redesign of unrelated modules.

4. **Verification**
   - Check desktop and mobile presentation for the requested screens.
   - Exercise existing search, filters, drawers/dialogs, forms, and navigation without committing production transactions.
   - Confirm the preview builds cleanly and inspect runtime/console errors.
   - Confirm each touched content route retains complete route-specific metadata.

## Technical approach
- Treat `src/styles.css`, the `src/components/sifo/*` workspace primitives, shadcn controls, and `DataTable` as the canonical visual foundation.
- Prefer targeted composition updates over page rewrites.
- Record the shared-UI architecture rule in `AGENTS.md` while keeping its existing operational rules intact.
