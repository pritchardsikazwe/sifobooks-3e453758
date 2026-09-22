# SifoBooks Cloud VSDC Connector

The cloud connector is a customer-controlled bridge between SifoBooks Cloud and the customer's local ZRA VSDC.

Architecture:

SifoBooks Cloud -> encrypted connector session -> customer connector -> local VSDC -> ZRA

The VSDC endpoint is never exposed as a public SifoBooks endpoint.

The control plane provides:
- connector registration
- one-time connector credential issuance
- credential hashing at rest
- heartbeat
- capability reporting
- command polling
- connector event history
- tenant isolation with PostgreSQL RLS

The connector credential authenticates the connector only. ZRA TPIN, device serial, VSDC credentials and other sensitive taxpayer/device data must remain on the customer's controlled connector/VSDC side unless the certified ZRA integration specifically requires otherwise.

This is an integration foundation, not a claim of ZRA certification. UAT and formal certification remain required.
