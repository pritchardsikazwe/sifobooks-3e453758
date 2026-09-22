# SifoBooks Cloud Offline Sync Engine

This layer provides the transport protocol between offline/local SifoBooks installations and the cloud PostgreSQL tenant.

## Guarantees

- Device registration is tenant-scoped.
- Push batches are limited to 500 events.
- Idempotency keys prevent duplicate cloud events.
- Entity versions detect stale writes.
- Conflicts are persisted rather than silently overwritten.
- Pull uses a server cursor and excludes events originated by the requesting device.
- Acknowledgement is explicit.
- Sync metadata is tenant-isolated by PostgreSQL RLS.

## Important boundary

The sync event is the transport/audit envelope. Financial posting remains the atomic accounting transaction service. A future sync applier must map approved events into the same accounting services rather than directly mutating journals, stock balances, VAT records, or fiscalized transactions.

## Modes

Offline: SQLite is authoritative until connectivity returns.

Hybrid: SQLite remains the operational cache/POS database while approved changes are synchronized to PostgreSQL.

Cloud: PostgreSQL is authoritative and browser clients normally operate online.

## Conflict policy

The first protocol-level conflict currently handled is STALE_VERSION. It is stored in cloud_sync_conflicts for explicit resolution. Financial conflicts must never be resolved by silently overwriting a posted accounting or fiscal transaction.
