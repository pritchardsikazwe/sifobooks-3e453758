# SifoBooks ZRA Smart Invoice: Local, Network, Cloud and Hybrid Architecture

SifoBooks treats ZRA Smart Invoice as one compliance capability with different deployment paths.

## ZRA device identity

ZRA VSDC initialization uses the taxpayer TPIN, Branch ID and Device Serial Number. The device serial is an identifier supplied through ZRA Device Management and the initialization response is retained locally by the VSDC. SifoBooks therefore stores a separate `zra_devices` record for every registered computer/terminal.

A company with three ZRA-registered computers should have three SifoBooks ZRA device records. Do not copy one device's ZRA authentication material to another computer.

## Local

```
SifoBooks Desktop -> local VSDC -> ZRA Smart Invoice
```

SQLite remains local. Each terminal can have its own ZRA device record.

## Network

```
POS terminals -> SifoBooks network server -> customer VSDC -> ZRA
```

The server and terminals share business data, while ZRA device identity remains explicit per registered terminal.

## Cloud SaaS

```
Browser/POS -> SifoBooks Cloud -> customer connector -> customer VSDC -> ZRA
```

The cloud application must not expose a customer's VSDC directly to the public internet. A future connector/agent can make an outbound secure connection to the cloud and forward approved requests to the local VSDC.

## Hybrid

```
Local POS/cache <-> SifoBooks Cloud
       |
       +-> local/customer connector -> VSDC -> ZRA
```

This supports local POS operation with centralized cloud accounting and synchronization.

## Separation of concepts

- Company / taxpayer: SifoBooks company
- TPIN: ZRA taxpayer identity
- Branch ID: ZRA branch/store identity
- ZRA Device Serial: ZRA integration-device identity
- Terminal ID: SifoBooks operational terminal identity
- Installation ID: local SifoBooks installation identity
- Deployment mode: local, network, cloud or hybrid
- Environment: test/UAT or production

## Safety

SifoBooks must keep TEST/UAT and PRODUCTION separate. It must not claim ZRA certification until the formal ZRA certification/UAT process is completed. Credentials and VSDC authentication material must not be embedded in public source control.

## Certification boundary

ZRA's public guidance classifies Certified Invoicing Systems as accounting/ERP systems integrated with Smart Invoice through VSDC after certification. The implementation in this repository is an integration architecture and testable software layer; it is not itself a claim of certification.