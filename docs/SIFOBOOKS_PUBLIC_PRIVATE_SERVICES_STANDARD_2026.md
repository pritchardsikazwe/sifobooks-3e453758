# SifoBooks Public ↔ Private Services Standard — 2026

## Purpose
SifoBooks may expose controlled public forms and links while keeping each company's accounting and operational workspace private.

## Boundary

### Public
- Job listings and applications
- Supplier quotation submission
- RFQ / quotation request forms
- Customer service and maintenance requests
- Product catalogues and QR menus
- Secure invoice/document viewing
- Customer statement links
- Payment request links

### Private company workspace
- General ledger and journals
- Banking and reconciliation
- Payroll and employee records
- Inventory and costing
- Supplier/customer master records
- Procurement approvals and quotation analysis
- Recruitment screening and interview evaluations
- Compliance records
- Management reports
- Audit logs

### Platform
- Public-service configuration
- Tenant/service entitlements
- Subscription and usage controls
- Rate limits and abuse controls
- Integration health

## Security requirements
1. Every public resource must use an opaque, non-sequential token or slug that does not reveal a database ID.
2. Public endpoints must return only fields explicitly marked public.
3. Tenant identity must be resolved server-side from the public token; never trust a client-supplied tenant/company ID.
4. Public submissions must never create accounting, payroll, inventory or other financial effects directly.
5. Submissions enter a controlled inbox first; internal users review, approve and convert them into company records.
6. File uploads require type/size validation, malware scanning, private object storage and signed access URLs.
7. Public forms require rate limiting, abuse protection and idempotency protection.
8. Public links need publish/pause/expire controls and revocation support.
9. Sensitive candidate information must be minimized. Automated screening must use job-relevant criteria only and remain decision support, not automatic hiring.
10. Every internal conversion, approval, rejection, publication, pause and link revocation must be auditable.

## Recruitment flow
`Create Job → Publish → Public Application → Intake Queue → Recruiter Review → Explainable Score → Shortlist → Interview → Evaluation → Offer → Employee`

## Procurement flow
`Create RFQ → Publish Supplier Link → Supplier Submission → Intake Queue → Extract/Validate → Compare → Approval → Purchase Order → Goods Receipt → Supplier Bill`

## Important implementation note
The current GitHub implementation establishes the public UI and architecture boundary. Persistent public-service tables, secure token issuance and server-side submission endpoints must be enabled only after the production database schema and row-level security policies are available. Do not use browser local storage as a substitute for production persistence or tenant security.
