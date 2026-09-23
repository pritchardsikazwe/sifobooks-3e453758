param(
    [Parameter(Mandatory = $true)]
    [string]$Url
)

$ErrorActionPreference = "Stop"

$uri = $Url.TrimEnd('/') + "/api/network/info"
Write-Host "Testing SifoBooks remote endpoint: $uri" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 20
    Write-Host "HTTP $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Error "Remote SifoBooks endpoint is not reachable: $($_.Exception.Message)"
    exit 1
}
