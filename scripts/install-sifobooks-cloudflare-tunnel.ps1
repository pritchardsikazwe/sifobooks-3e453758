param(
    [Parameter(Mandatory = $true)]
    [string]$TunnelToken,
    [string]$ServiceName = "SifoBooksCloudflareTunnel"
)

$ErrorActionPreference = "Stop"

# cloudflared must be installed and available on PATH.
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    throw "cloudflared was not found on PATH. Install cloudflared for Windows first, then rerun this script."
}

if ([string]::IsNullOrWhiteSpace($TunnelToken)) {
    throw "A Cloudflare Tunnel token is required. Do not commit or place the token in the SifoBooks repository."
}

Write-Host "Installing SifoBooks Cloudflare Tunnel Windows service..." -ForegroundColor Cyan
& $cloudflared.Source service install $TunnelToken
if ($LASTEXITCODE -ne 0) {
    throw "cloudflared service installation failed with exit code $LASTEXITCODE."
}

Write-Host "Starting $ServiceName..." -ForegroundColor Cyan
Start-Service -Name $ServiceName -ErrorAction Stop

Write-Host "SifoBooks remote tunnel service is installed and running." -ForegroundColor Green
Write-Host "Origin: http://127.0.0.1:3000" -ForegroundColor Gray
Write-Host "Configure the public hostname and Cloudflare Access policy in Cloudflare Zero Trust." -ForegroundColor Gray
