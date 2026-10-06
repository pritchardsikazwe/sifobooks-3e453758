# SifoBooks PR Checklist

## Source of truth
- [ ] GitHub `main` remains the source of truth.
- [ ] Existing implementation was inspected before changes.
- [ ] No Lovable branch was merged wholesale.
- [ ] If Lovable supplied a fix, only the missing/relevant changes were ported.

## Database
- [ ] Existing migrations/schema were checked.
- [ ] No unnecessary duplicate or parallel tables were introduced.
- [ ] Existing data, RLS, accounting logic and audit trails are preserved.

## Architecture
- [ ] Local/offline SQLite and hosted/cloud paths remain separate.
- [ ] Hosted code does not call a customer's localhost/127.0.0.1 VSDC endpoint.
- [ ] ZRA queues, retries, fiscalization, connector check-ins and audit trails are preserved.
- [ ] Authentication/backend selection was not changed unintentionally.

## Validation
- [ ] Build/type checks pass.
- [ ] Relevant tests pass.
- [ ] The affected route/module was verified.

## Notes
<!-- Test results, migration notes, deployment notes, known limitations. -->
