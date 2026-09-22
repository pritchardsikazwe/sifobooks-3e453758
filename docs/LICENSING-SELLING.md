# SifoBooks Commercial Licensing

## Product flow

1. Build the selected Windows edition.
2. Give the prospect the ZIP/package.
3. Ask for the device fingerprint from SifoBooks > Licence.
4. On the Sifonet licensing machine, issue a trial licence with scripts/license-issue.ts.
5. Customer pastes the signed licence into SifoBooks.
6. After payment, issue a paid licence using the same process.

## Recommended trial policy

- 14 days for normal evaluation.
- 30 days for prospects that need more time.
- Bind trial licences to the customer's device fingerprint.
- Paid licences can be 12 months, multi-year, or perpetual according to the commercial agreement.

## Security

The private Ed25519 signing key must never ship with SifoBooks Windows. The customer application contains only the public verification key. Signed licence payloads are verified locally, so normal accounting/POS operation does not require an internet connection. This follows the common signed-license/offline-validation model. See the project documentation for your final deployment configuration.

## Suggested commercial lifecycle

LEAD -> DEMO -> TRIAL -> PAID -> RENEWAL

For LAN installations, license the server installation as the primary entitlement and manage POS/device limits separately.

## Future central licence portal

The next commercial layer can expose:
- Sifonet customer records
- licence generation
- activation seats
- renewals
- revocation
- expiry alerts
- payment references
- installer downloads
- customer self-service activation

Until that portal is deployed, the issuer script is the controlled Sifonet back-office tool.
