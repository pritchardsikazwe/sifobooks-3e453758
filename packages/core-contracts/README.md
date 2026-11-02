# @sifonet/core-contracts

Provider-neutral TypeScript contracts for the Sifonet product family.

## Initial consumers

- SifoProperty
- SifoRestaurant
- SifoBoarding
- SifoButchery
- SifoLending

## Boundaries

This package contains types and deterministic validation helpers only. It does not connect to a database, call ZRA, submit payments, print documents, authenticate users or perform network sync.

Every service operation must be implemented server-side by a product backend or an explicitly deployed shared service. Implementations must enforce tenant/company/branch authorization on the server; a caller-supplied `CompanyScope` is context, not proof of permission.

Financial amounts use integer minor units. Journal posting must be idempotent and atomic. Fiscal submissions must preserve the environment and raw response evidence. Print jobs and offline mutations require stable idempotency keys.

## Integration status

This is the first contract baseline. Existing SifoBooks functions have not yet been replaced by these interfaces. Each adapter requires contract tests and a migration plan before production use.
