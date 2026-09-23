# SifoBooks LAN Deployment

## Target architecture

```text
                 Wi-Fi / LAN
                     |
        +------------+------------+
        |                         |
  SifoBooks Server          Other computers
  192.168.1.100              POS 1
  Port 3000                  POS 2
  SQLite DB                  Manager
        |                         |
        +------ HTTP :3000 -------+
```

The **server PC owns the single company SQLite database**. POS and office PCs must not open or create separate company databases.

Bun supports binding an HTTP server to `0.0.0.0`, making it reachable on the LAN.

## Server PC

1. Install/copy the SifoBooks Windows package.
2. Set `config/network.json`:

```json
{
  "mode": "server",
  "server": {
    "host": "0.0.0.0",
    "port": 3000,
    "display_name": "SifoBooks Server"
  }
}
```

3. Run `Create-SifoBooks-Shortcut.bat` if you want automatic startup.
4. Run PowerShell as Administrator and execute `allow-sifobooks-lan.ps1`.
5. Find the server IPv4 address with `ipconfig`. Example: `192.168.1.100`.
6. Test locally: `http://localhost:3000/api/network/info`.
7. Test from another PC: `http://192.168.1.100:3000/api/network/info`.
8. Open the application from other PCs: `http://192.168.1.100:3000`.

## POS client PCs

A POS client should use **POS mode**, not a second SQLite company database.

Example `config/network.json`:

```json
{
  "mode": "pos",
  "server": {
    "host": "127.0.0.1",
    "port": 3000,
    "display_name": "POS Client"
  },
  "client": {
    "server_url": "http://192.168.1.100:3000",
    "station_code": "POS-01",
    "station_name": "Front Counter 1",
    "station_type": "pos",
    "assigned_role": "cashier"
  }
}
```

The POS client serves local browser assets but proxies application requests to the central server. Therefore:

- POS 1 sells against the central database.
- POS 2 sells against the same central database.
- Manager reports read the same live data.
- Inventory changes are shared.
- Cashier/shift/accounting rules remain on the central server.
- A POS client does not create a competing company SQLite database.

## Stations

Use unique station codes: `POS-01`, `POS-02`, `OFFICE-01`, `MANAGER-01`.

## Important

Do not point two computers directly at the same SQLite file over a Windows network share. Keep SQLite on the SifoBooks server and access it through the SifoBooks HTTP server.

## LAN test

From a client PC:

```powershell
.\scripts\test-sifobooks-lan.ps1 -ServerIp 192.168.1.100
```

Then open `http://192.168.1.100:3000`.

## Failure behavior

If the central server is down, POS client requests return a clear `503 SifoBooks LAN server unavailable` response rather than silently writing to a second company database.

True offline selling on a POS terminal is a separate sync workflow and should only be enabled once the offline queue/conflict/reconciliation process is validated.