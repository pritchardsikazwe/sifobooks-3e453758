# SifoBooks — ZRA Smart Invoice / VSDC Integration

## Architecture

SifoBooks remains a Bun/React application. It does not become a Java application.

On Windows Server the components run side-by-side:

- SifoBooks: local ERP/POS application.
- Java 8 + Apache Tomcat 9.x: hosts the ZRA VSDC WAR supplied through the ZRA Smart Invoice process.
- SifoBooks calls the VSDC using local REST/JSON.
- VSDC handles ZRA authentication/signing and communicates with ZRA over HTTPS.

## ZRA onboarding

SifoBooks cannot invent or bypass ZRA device credentials. The taxpayer must register for Smart Invoice/VSDC and complete ZRA's approval/certification process.

After approval, the VSDC package is obtained from the ZRA Device Management area and deployed locally. Device initialization uses TPIN, branch ID and device serial number.

## Server configuration

Set these on the Windows Server environment and never commit real credentials:

    ZRA_VSDC_URL=http://127.0.0.1:8080/zrasmartinvoice
    ZRA_VSDC_TIMEOUT_MS=15000

The exact context path is whatever is produced by the ZRA WAR deployment. Do not assume the WAR filename or context path until the supplied package is installed.

## Implemented VSDC client

src/lib/zra/vsdc.ts provides:

- device initialization
- standard code synchronization
- item classification synchronization
- item registration
- sales submission
- invoice lookup
- stock-item updates
- stock-master updates
- timeout and JSON/error handling

Primary paths:

- /initializer/selectInitInfo
- /code/selectCodes
- /itemClass/selectItemsClass
- /items/saveItem
- /trnsSales/saveSales
- /trnsSales/selectInvoice
- /stock/saveStockItems
- /stockMaster/saveStockMaster

## Sales flow

    SifoBooks POS
       |
       +-- save sale locally
       |
       +-- create ZRA queue record
       |
       +-- POST /trnsSales/saveSales
       |
       +-- receive rcptNo / intrlData / rcptSign / sdcId / qrCodeUrl
       |
       +-- save ZRA metadata
       |
       +-- print receipt with ZRA receipt number
       |
       +-- POST stock updates

The ZRA receipt metadata is persisted in zra_invoice_queue.

## Important compliance boundary

The connector is an integration layer, not ZRA certification. SifoBooks should remain in TEST/UAT until ZRA approves/certifies the integration for production.

Do not store VSDC security keys in the browser or in Git.

## Windows Server target

    C:\SifoBooks\
      app\
      data\
      logs\

    C:\Program Files\Apache Software Foundation\Tomcat 9.x\
      webapps\
        <ZRA VSDC WAR>

Keep SifoBooks and the VSDC separate. This makes it possible to replace the VSDC package or move the ERP later without rewriting the ERP in Java.
