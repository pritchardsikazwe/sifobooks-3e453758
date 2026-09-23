param([string]$Edition = $env:SIFOBOOKS_EDITION)
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Edition)) { $Edition = "enterprise" }
$Edition = $Edition.ToLower()
$allowed = @("enterprise","accounting","retail","restaurant","hotel","school","property","lending")
if ($allowed -notcontains $Edition) { throw "Unsupported SifoBooks edition: $Edition" }

$root = Split-Path -Parent $PSScriptRoot
$desktop = Join-Path $root "desktop-dist"
if (!(Test-Path $desktop)) { throw "desktop-dist not found. Run bun run build:desktop first." }
$assetDir = Join-Path $PSScriptRoot "assets"
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null

$magick = Get-Command magick -ErrorAction SilentlyContinue
if (!$magick) { throw "ImageMagick (magick.exe) is required to build the branded installer artwork." }
& $magick.Source (Join-Path $assetDir "SifoBooks-logo.svg") -background "#013b2b" -resize "180x180" -gravity center -extent 240x459 (Join-Path $assetDir "SifoBooks-wizard.bmp")
if ($LASTEXITCODE -ne 0) { throw "Failed to render SifoBooks wizard artwork." }
& $magick.Source (Join-Path $assetDir "SifoBooks-logo.svg") -background "#013b2b" -resize "110x110" -gravity center -extent 147x147 (Join-Path $assetDir "SifoBooks-small.bmp")
if ($LASTEXITCODE -ne 0) { throw "Failed to render SifoBooks small installer artwork." }

$display = (Get-Culture).TextInfo.ToTitleCase($Edition)
$displayNameMap = @{ enterprise="SifoBooks"; accounting="SifoBooks-Accounting"; retail="SifoBooks-Retail"; restaurant="SifoBooks-Restaurant"; hotel="SifoBooks-Hotel"; school="SifoBooks-School"; property="SifoBooks-RealEstate"; lending="SifoBooks-Microfinance" }
$product = $displayNameMap[$Edition]
$exe = "$product.exe"
$guidMap = @{
  enterprise="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE001"
  accounting="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE002"
  retail="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE003"
  restaurant="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE004"
  hotel="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE005"
  school="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE006"
  property="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE007"
  lending="B1B65D0E-5C58-4D30-A6D2-9C10B7DCE008"
}
$template = Get-Content (Join-Path $PSScriptRoot "SifoBooks.iss.template") -Raw
$template = $template.Replace("__EDITION__",$Edition).Replace("__PRODUCT_NAME__",$product).Replace("__EXE_NAME__",$exe).Replace("__APP_ID__",$guidMap[$Edition]).Replace("__APP_VERSION__","2026.09.22")
$outDir = Join-Path $root "installer-dist"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outIss = Join-Path $PSScriptRoot "SifoBooks-$Edition.iss"
Set-Content -Path $outIss -Value $template -Encoding UTF8

$iscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"
if (!(Test-Path $iscc)) { $iscc = Join-Path ${env:ProgramFiles} "Inno Setup 6\ISCC.exe" }
if (!(Test-Path $iscc)) { throw "Inno Setup 6 ISCC.exe not found." }

& $iscc $outIss
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }

$setup = Join-Path $outDir "SifoBooks-$Edition-Windows-Setup.exe"
if (!(Test-Path $setup)) { throw "Installer output not found: $setup" }
Write-Host "Created $setup"
