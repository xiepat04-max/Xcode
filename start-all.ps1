# start-all.ps1 — Launch all 10 ASX Finance Projects in separate terminal windows
# Run from PowerShell: .\start-all.ps1

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load .env into this session
if (Test-Path "$Root\.env") {
    Get-Content "$Root\.env" | Where-Object { $_ -notmatch "^#" -and $_ -match "=" } | ForEach-Object {
        $parts = $_ -split "=", 2
        [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
}

function Start-Service {
    param($title, $dir, $cmd)
    $argList = "/k `"cd /d `"$dir`" && $cmd`""
    Start-Process "cmd.exe" -ArgumentList $argList -WindowStyle Normal
    Write-Host "  Started: $title" -ForegroundColor Green
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "  Starting 10 ASX Finance Projects..." -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────────" -ForegroundColor DarkGray

# 01 — ASX Research Assistant · PORT 3001
Start-Service "01 ASX Research Assistant" `
    "$Root\01-asx-research-assistant" `
    "set PORT=3001 && npm run dev"

# 02a — Options Builder backend · PORT 8002
Start-Service "02 Options Builder (backend)" `
    "$Root\02-options-strategy-builder\backend" `
    "uvicorn main:app --reload --port 8002"

# 02b — Options Builder frontend · PORT 3002
Start-Service "02 Options Builder (frontend)" `
    "$Root\02-options-strategy-builder\frontend" `
    "set VITE_API_URL=http://localhost:8002 && npm run dev -- --port 3002"

# 03 — ASIC Filing Analyzer · PORT 8503
Start-Service "03 ASIC Filing Analyzer" `
    "$Root\03-asic-filing-analyzer" `
    "streamlit run app.py --server.port 8503"

# 04 — Insider Trading Tracker · PORT 3004
Start-Service "04 ASX Insider Tracker" `
    "$Root\04-asx-insider-tracker" `
    "set PORT=3004 && npm run dev"

# 05a — Portfolio Dashboard backend · PORT 8005
Start-Service "05 Portfolio Dashboard (backend)" `
    "$Root\05-portfolio-risk-dashboard\backend" `
    "uvicorn main:app --reload --port 8005"

# 05b — Portfolio Dashboard frontend · PORT 3005
Start-Service "05 Portfolio Dashboard (frontend)" `
    "$Root\05-portfolio-risk-dashboard\frontend" `
    "set VITE_API_URL=http://localhost:8005 && npm run dev -- --port 3005"

# 06 — Earnings Predictor API · PORT 8006
Start-Service "06 Earnings Predictor" `
    "$Root\06-earnings-predictor" `
    "uvicorn api:app --reload --port 8006"

# 07 — Financial News Summarizer · PORT 3007
Start-Service "07 News Summarizer" `
    "$Root\07-financial-news-summarizer" `
    "set PORT=3007 && npm run dev"

# 08 — DCF Calculator · PORT 3008
Start-Service "08 DCF Calculator" `
    "$Root\08-dcf-calculator" `
    "npm run dev -- --port 3008"

# 09 — ASX Screener · PORT 3009
Start-Service "09 ASX Screener" `
    "$Root\09-asx-screener" `
    "npm run dev -- --port 3009"

# 10 — AI Trading Journal · PORT 3010
Start-Service "10 Trading Journal" `
    "$Root\10-trading-journal" `
    "set PORT=3010 && npm run dev"

Write-Host ""
Write-Host "  All services starting in separate windows." -ForegroundColor Green
Write-Host "  Wait ~30 seconds for first-time compilation, then open:" -ForegroundColor White
Write-Host ""
Write-Host "  01 ASX Research Assistant   ->  http://localhost:3001" -ForegroundColor Cyan
Write-Host "  02 Options Strategy Builder ->  http://localhost:3002" -ForegroundColor Cyan
Write-Host "  03 ASIC Filing Analyzer     ->  http://localhost:8503" -ForegroundColor Cyan
Write-Host "  04 Insider Trading Tracker  ->  http://localhost:3004" -ForegroundColor Cyan
Write-Host "  05 Portfolio Risk Dashboard ->  http://localhost:3005" -ForegroundColor Cyan
Write-Host "  06 Earnings Move Predictor  ->  http://localhost:8006/docs" -ForegroundColor Cyan
Write-Host "  07 Financial News Summarizer->  http://localhost:3007" -ForegroundColor Cyan
Write-Host "  08 DCF Calculator (AUD)     ->  http://localhost:3008" -ForegroundColor Cyan
Write-Host "  09 ASX Hedge Fund Screener  ->  http://localhost:3009" -ForegroundColor Cyan
Write-Host "  10 AI Trading Journal       ->  http://localhost:3010" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To stop everything: close all the terminal windows that opened." -ForegroundColor DarkGray
