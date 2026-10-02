param(
  [string]$Edition = "enterprise"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$desktop = Join-Path $root "desktop-dist"
$exe = Join-Path $desktop "SifoBooks.exe"
if ($Edition -ne "enterprise") {
  $candidate = Join-Path $desktop ("SifoBooks-" + $Edition + ".exe")
  if (Test-Path $candidate) { $exe = $candidate }
}
if (!(Test-Path $exe)) { throw "Desktop executable not found: $exe" }

$dataRoot = Join-Path $desktop "smoke-data"
if (Test-Path $dataRoot) { Remove-Item $dataRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null

$env:SIFOBOOKS_DATA_DIR = $dataRoot
$env:SIFOBOOKS_NO_BROWSER = "1"
$env:SIFOBOOKS_MODE = "offline"
$env:SIFOBOOKS_LICENSE_ENFORCEMENT = "false"
$env:SIFOBOOKS_HOST = "127.0.0.1"
$env:PORT = "3017"

Write-Host "Starting $exe"
$process = Start-Process -FilePath $exe -WorkingDirectory $desktop -PassThru

try {
  $portFile = Join-Path $dataRoot "data\desktop-port.txt"
  $health = $null
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Path $portFile) {
      $port = (Get-Content $portFile -Raw).Trim()
      if ($port -match '^\d+$') {
        try {
          $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 2
          if ($health.ok) { break }
        } catch {}
      }
    }
    if ($process.HasExited) {
      throw "SifoBooks exited during startup with code $($process.ExitCode)."
    }
  }

  if (!$health -or !$health.ok) { throw "SifoBooks did not become healthy within 30 seconds." }

  $diagnostics = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/desktop/diagnostics" -TimeoutSec 5
  if (!$diagnostics.ok) { throw "Desktop diagnostics reported unhealthy database." }
  if (!$diagnostics.clientDirExists) { throw "Desktop client assets were not found." }
  if (!$diagnostics.serverBundleEmbedded) { throw "Desktop server bundle was not embedded." }

  $rootResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -TimeoutSec 5
  if ($rootResponse.StatusCode -ne 200) { throw "Desktop root returned HTTP $($rootResponse.StatusCode)." }

  $dbFile = Join-Path $dataRoot "data\sifobooks.db"
  if (!(Test-Path $dbFile)) { throw "Local SQLite database was not created." }

  Write-Host "PASS health: $($health.ok)"
  Write-Host "PASS schema migrations applied: $($health.appliedMigrations)"
  Write-Host "PASS database: $($diagnostics.database.status)"
  Write-Host "PASS client assets present: $($diagnostics.clientDirExists)"
  Write-Host "PASS root HTTP status: $($rootResponse.StatusCode)"
  Write-Host "PASS SQLite file created: $dbFile"
  Write-Host "WINDOWS DESKTOP SMOKE TEST: PASSED"
}
finally {
  try {
    if ($port) {
      Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$port/api/desktop/shutdown" -Headers @{ "x-sifobooks-shutdown" = (Get-Content (Join-Path $dataRoot "data\desktop-shutdown.token") -Raw).Trim() } -TimeoutSec 5 | Out-Null
    }
  } catch {}
  Start-Sleep -Seconds 2
  if (!$process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
}
