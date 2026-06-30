#!/usr/bin/env bash
# Starts all 10 projects, each in its own tmux window (falls back to background processes).

ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/.env" 2>/dev/null || true

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${CYAN}[start]${NC} $1"; }
ok()  { echo -e "${GREEN}[✓]${NC} $1"; }

USE_TMUX=false
command -v tmux >/dev/null 2>&1 && USE_TMUX=true

SESSION="fin-projects"

start_service() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  local port="$4"

  if $USE_TMUX; then
    if ! tmux has-session -t "$SESSION" 2>/dev/null; then
      tmux new-session -d -s "$SESSION" -n "$name"
      tmux send-keys -t "$SESSION:$name" "cd '$dir' && $cmd" Enter
    else
      tmux new-window -t "$SESSION" -n "$name"
      tmux send-keys -t "$SESSION:$name" "cd '$dir' && $cmd" Enter
    fi
  else
    log "Starting $name on port $port..."
    (cd "$dir" && eval "$cmd" > "$ROOT/logs/${name}.log" 2>&1) &
    echo $! >> "$ROOT/.pids"
  fi
}

# ── Setup logs dir ────────────────────────────────────────────────────────────
mkdir -p "$ROOT/logs"
rm -f "$ROOT/.pids"

echo ""
echo "  Starting 10 ASX Finance Projects..."
echo "  ──────────────────────────────────────"

# 1 — ASX Stock Research Assistant · PORT 3001
start_service "01-asx-research" \
  "$ROOT/01-asx-research-assistant" \
  "PORT=3001 npm run dev" \
  3001

# 2a — Options Builder backend · PORT 8002
start_service "02-options-backend" \
  "$ROOT/02-options-strategy-builder/backend" \
  "uvicorn main:app --reload --port 8002" \
  8002

# 2b — Options Builder frontend · PORT 3002
start_service "02-options-frontend" \
  "$ROOT/02-options-strategy-builder/frontend" \
  "VITE_API_URL=http://localhost:8002 npm run dev -- --port 3002" \
  3002

# 3 — ASIC Filing Analyzer · PORT 8503
start_service "03-asic-analyzer" \
  "$ROOT/03-asic-filing-analyzer" \
  "streamlit run app.py --server.port 8503" \
  8503

# 4 — Insider Trading Tracker · PORT 3004
start_service "04-insider-tracker" \
  "$ROOT/04-asx-insider-tracker" \
  "PORT=3004 npm run dev" \
  3004

# 5a — Portfolio Dashboard backend · PORT 8005
start_service "05-portfolio-backend" \
  "$ROOT/05-portfolio-risk-dashboard/backend" \
  "uvicorn main:app --reload --port 8005" \
  8005

# 5b — Portfolio Dashboard frontend · PORT 3005
start_service "05-portfolio-frontend" \
  "$ROOT/05-portfolio-risk-dashboard/frontend" \
  "VITE_API_URL=http://localhost:8005 npm run dev -- --port 3005" \
  3005

# 6 — Earnings Predictor API · PORT 8006
start_service "06-earnings-predictor" \
  "$ROOT/06-earnings-predictor" \
  "uvicorn api:app --reload --port 8006" \
  8006

# 7 — Financial News Summarizer · PORT 3007
start_service "07-news-summarizer" \
  "$ROOT/07-financial-news-summarizer" \
  "PORT=3007 npm run dev" \
  3007

# 8 — DCF Calculator · PORT 3008
start_service "08-dcf-calculator" \
  "$ROOT/08-dcf-calculator" \
  "npm run dev -- --port 3008" \
  3008

# 9 — ASX Screener · PORT 3009
start_service "09-asx-screener" \
  "$ROOT/09-asx-screener" \
  "npm run dev -- --port 3009" \
  3009

# 10 — AI Trading Journal · PORT 3010
start_service "10-trading-journal" \
  "$ROOT/10-trading-journal" \
  "PORT=3010 npm run dev" \
  3010

echo ""
if $USE_TMUX; then
  tmux attach -t "$SESSION"
else
  ok "All services started in background."
  echo ""
  echo "  URLs:"
  echo "  ┌─────────────────────────────────────────────────────────────────┐"
  echo "  │  01 ASX Research Assistant   →  http://localhost:3001           │"
  echo "  │  02 Options Strategy Builder →  http://localhost:3002           │"
  echo "  │  03 ASIC Filing Analyzer     →  http://localhost:8503           │"
  echo "  │  04 Insider Trading Tracker  →  http://localhost:3004           │"
  echo "  │  05 Portfolio Risk Dashboard →  http://localhost:3005           │"
  echo "  │  06 Earnings Move Predictor  →  http://localhost:8006/docs      │"
  echo "  │  07 Financial News Summarizer→  http://localhost:3007           │"
  echo "  │  08 DCF Calculator (AUD)     →  http://localhost:3008           │"
  echo "  │  09 ASX Hedge Fund Screener  →  http://localhost:3009           │"
  echo "  │  10 AI Trading Journal       →  http://localhost:3010           │"
  echo "  └─────────────────────────────────────────────────────────────────┘"
  echo ""
  echo "  Logs: $ROOT/logs/"
  echo "  Stop: kill \$(cat $ROOT/.pids)"
fi
