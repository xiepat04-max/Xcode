# setup.ps1 — Windows setup for 10 ASX Finance Projects
# Run from PowerShell: .\setup.ps1
# If execution policy blocks it: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step  { param($msg) Write-Host "[setup] $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[!]     $msg" -ForegroundColor Yellow }

# ── Prerequisites ─────────────────────────────────────────────────────────────
Write-Step "Checking prerequisites..."
$missing = @()
if (-not (Get-Command node   -ErrorAction SilentlyContinue)) { $missing += "Node.js  (https://nodejs.org)" }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { $missing += "Python   (https://python.org)" }
if (-not (Get-Command pip    -ErrorAction SilentlyContinue)) { $missing += "pip      (comes with Python)" }
if (-not (Get-Command npm    -ErrorAction SilentlyContinue)) { $missing += "npm      (comes with Node.js)" }

if ($missing.Count -gt 0) {
    Write-Host "`nMissing prerequisites:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    exit 1
}

$nodeVer   = (node --version)
$pythonVer = (python --version)
Write-Ok "Node $nodeVer  |  $pythonVer  |  npm $(npm --version)"

# ── .env files ────────────────────────────────────────────────────────────────
Write-Step "Setting up .env files..."
if (-not (Test-Path "$Root\.env")) {
    Copy-Item "$Root\.env.example" "$Root\.env"
    Write-Warn "Created .env — EDIT IT and add your API keys before starting."
}

$envDirs = @(
    "01-asx-research-assistant",
    "03-asic-filing-analyzer",
    "04-asx-insider-tracker",
    "07-financial-news-summarizer",
    "09-asx-screener",
    "10-trading-journal"
)
foreach ($d in $envDirs) {
    $src = "$Root\$d\.env.example"
    $dst = "$Root\$d\.env"
    if ((Test-Path $src) -and -not (Test-Path $dst)) {
        Copy-Item $src $dst
        # Append root .env keys into each project .env
        Get-Content "$Root\.env" | Where-Object { $_ -notmatch "^#" -and $_ -match "=" } |
            Add-Content $dst -ErrorAction SilentlyContinue
    }
}

# ── Helper: npm install ───────────────────────────────────────────────────────
function Install-Node { param($dir, $name)
    Write-Step "npm install — $name"
    Push-Location $dir
    npm install --legacy-peer-deps --prefer-offline 2>&1 | Out-Null
    Pop-Location
    Write-Ok "$name Node deps installed"
}

# ── Helper: pip install ───────────────────────────────────────────────────────
function Install-Python { param($dir, $name)
    Write-Step "pip install — $name"
    Push-Location $dir
    python -m pip install -q -r requirements.txt
    Pop-Location
    Write-Ok "$name Python deps installed"
}

# ── Install all projects ──────────────────────────────────────────────────────
Install-Node   "$Root\01-asx-research-assistant"             "01 ASX Research Assistant"
Install-Python "$Root\02-options-strategy-builder\backend"   "02 Options Builder (backend)"
Install-Node   "$Root\02-options-strategy-builder\frontend"  "02 Options Builder (frontend)"
Install-Python "$Root\03-asic-filing-analyzer"               "03 ASIC Filing Analyzer"
Install-Node   "$Root\04-asx-insider-tracker"                "04 Insider Tracker"
Install-Python "$Root\05-portfolio-risk-dashboard\backend"   "05 Portfolio Dashboard (backend)"
Install-Node   "$Root\05-portfolio-risk-dashboard\frontend"  "05 Portfolio Dashboard (frontend)"
Install-Python "$Root\06-earnings-predictor"                 "06 Earnings Predictor"
Install-Node   "$Root\07-financial-news-summarizer"          "07 News Summarizer"
Install-Node   "$Root\08-dcf-calculator"                     "08 DCF Calculator"
Install-Node   "$Root\09-asx-screener"                       "09 ASX Screener"
Install-Node   "$Root\10-trading-journal"                    "10 Trading Journal"

# ── Prisma client generation ──────────────────────────────────────────────────
Write-Step "Generating Prisma clients..."
Push-Location "$Root\04-asx-insider-tracker"
npx prisma generate 2>&1 | Out-Null
Pop-Location
Push-Location "$Root\10-trading-journal"
npx prisma generate 2>&1 | Out-Null
Pop-Location
Write-Ok "Prisma clients generated"

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "  All 10 projects installed successfully!" -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Edit .env and fill in your API keys (OPENAI_API_KEY minimum)" -ForegroundColor White
Write-Host "  2. Run:  .\start-all.ps1" -ForegroundColor Yellow
Write-Host ""
