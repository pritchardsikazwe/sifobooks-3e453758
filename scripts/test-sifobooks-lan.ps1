param(
  [Parameter(Mandatory=$true)]
  [string]$ServerIp,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$url = "http://" + $ServerIp + ":" + $Port + "/api/network/info"

Write-Host "Testing SifoBooks LAN server: $url"
try {
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
  Write-Host "HTTP $($response.StatusCode)" -ForegroundColor Green
  Write-Host $response.Content
  Write-Host "SifoBooks LAN server is reachable." -ForegroundColor Green
} catch {
  Write-Host "SifoBooks LAN server is NOT reachable." -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}