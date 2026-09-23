# SifoBooks LAN Server Firewall Setup
# Run PowerShell as Administrator on the SifoBooks SERVER PC.
# This opens TCP 3000 only for the local/private network profile.

$ErrorActionPreference = "Stop"
$ruleName = "SifoBooks LAN Server TCP 3000"

Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue |
  Remove-NetFirewallRule -ErrorAction SilentlyContinue

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3000 `
  -Action Allow `
  -Profile Private `
  -Description "Allow SifoBooks POS and office clients to connect to the central LAN server on TCP 3000."

Write-Host ""
Write-Host "SifoBooks LAN firewall rule created for TCP 3000 (Private profile)." -ForegroundColor Green
Write-Host "Test from another PC with: http://SERVER-IP:3000"