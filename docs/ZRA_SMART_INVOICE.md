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

    ZRA_VSDC_URL=http://127.0.0.1:8085
    ZRA_VSDC_TIMEOUT_MS=15000

The supplied sandboxvsdc1.0.11.4.war is a Spring Boot 2.7.18 WAR built with JDK 1.8. Its bundled application.properties sets server.port=8085 and vsdc.profile=UAT, and it uses an embedded SQLite database. The package can therefore be tested as a standalone Java application with java -jar; if deploying it into Tomcat 9, use the WAR deployment model required by your ZRA environment and verify the resulting context path.

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


## Supplied VSDC package inspection

The uploaded package was inspected before wiring SifoBooks. It contains `ebm.vsdc.Application` as the Spring Boot start class and includes the VSDC controllers/models. The local API paths wired into SifoBooks were derived from the WAR constants, including `/initializer/selectInitVsdcInfo`, `/code/search/selectCodeList`, `/item/class/search/selectItemClsList`, `/item/base/saveItem`, `/trns/sales/base/saveTrnsSalesVsdc`, `/trns/sales/base/search/selectTrnsInvoiceVsdc`, `/stock/io/saveStockIO`, and `/stockMaster/saveStockMasterList`.

The WAR's default UAT endpoint is `https://sandboxapi.zra.org.zm`. Production must not be assumed until ZRA provides/authorizes the production configuration.
