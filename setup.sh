#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT="$(cd "$(dirname "$0")" && pwd)"

log()  { echo -e "${CYAN}[setup]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# ── Prerequisites ─────────────────────────────────────────────────────────────
check_prereqs() {
  log "Checking prerequisites..."
  command -v node   >/dev/null 2>&1 || { echo "Node.js is required. Install from nodejs.org"; exit 1; }
  command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required."; exit 1; }
  command -v pip3   >/dev/null 2>&1 || { echo "pip3 is required."; exit 1; }
  command -v npm    >/dev/null 2>&1 || { echo "npm is required."; exit 1; }
  ok "Node $(node -v) | Python $(python3 --version | cut -d' ' -f2) | npm $(npm -v)"
}

# ── .env files ────────────────────────────────────────────────────────────────
setup_env() {
  if [ ! -f "$ROOT/.env" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    warn "Created .env from .env.example — please fill in your API keys before starting."
  fi

  for dir in "$ROOT"/0*/; do
    if [ -f "$dir/.env.example" ] && [ ! -f "$dir/.env" ]; then
      cp "$dir/.env.example" "$dir/.env"
      # Inherit keys from root .env
      grep -v '^#' "$ROOT/.env" | grep '=' >> "$dir/.env" 2>/dev/null || true
    fi
  done
}

# ── Node projects ─────────────────────────────────────────────────────────────
install_node() {
  local dir="$1"
  local name="$2"
  log "Installing Node deps for $name..."
  (cd "$dir" && npm install --legacy-peer-deps --silent)
  ok "$name Node deps installed"
}

# ── Python projects ───────────────────────────────────────────────────────────
install_python() {
  local dir="$1"
  local name="$2"
  log "Installing Python deps for $name..."
  (cd "$dir" && pip3 install -q -r requirements.txt)
  ok "$name Python deps installed"
}

# ── Database ──────────────────────────────────────────────────────────────────
setup_db() {
  if command -v psql >/dev/null 2>&1; then
    log "Setting up PostgreSQL databases..."
    psql -U postgres -c "CREATE DATABASE insider_tracker;"  2>/dev/null || true
    psql -U postgres -c "CREATE DATABASE trading_journal;" 2>/dev/null || true
    ok "Databases ready"
  else
    warn "PostgreSQL not found. Projects 4 & 10 need a running PostgreSQL instance."
    warn "Update DATABASE_URL in .env then run: npx prisma migrate dev"
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo "  ██████╗  █████╗ █████╗ "
  echo "  ██╔══██╗██╔══██╗╚════╝ "
  echo "  ██████╔╝███████║█████╗  10 ASX Finance Projects Setup"
  echo "  ██╔═══╝ ██╔══██║╚════╝  "
  echo "  ██║     ██║  ██║        Australian Market Edition"
  echo "  ╚═╝     ╚═╝  ╚═╝        "
  echo ""

  check_prereqs
  setup_env

  # 1 — ASX Stock Research Assistant (Next.js)
  install_node "$ROOT/01-asx-research-assistant" "01 ASX Research Assistant"

  # 2 — Options Strategy Builder (FastAPI + React)
  install_python "$ROOT/02-options-strategy-builder/backend" "02 Options Builder backend"
  install_node   "$ROOT/02-options-strategy-builder/frontend" "02 Options Builder frontend"

  # 3 — ASIC Filing Analyzer (Streamlit)
  install_python "$ROOT/03-asic-filing-analyzer" "03 ASIC Filing Analyzer"

  # 4 — ASX Insider Trading Tracker (Next.js + Prisma)
  install_node "$ROOT/04-asx-insider-tracker" "04 Insider Tracker"
  log "Running Prisma migrations for project 4..."
  (cd "$ROOT/04-asx-insider-tracker" && npx prisma generate --silent 2>/dev/null || true)

  # 5 — Portfolio Risk Dashboard (FastAPI + React)
  install_python "$ROOT/05-portfolio-risk-dashboard/backend" "05 Portfolio Dashboard backend"
  install_node   "$ROOT/05-portfolio-risk-dashboard/frontend" "05 Portfolio Dashboard frontend"

  # 6 — Earnings Move Predictor (FastAPI + scikit-learn)
  install_python "$ROOT/06-earnings-predictor" "06 Earnings Predictor"

  # 7 — Financial News Summarizer (Next.js)
  install_node "$ROOT/07-financial-news-summarizer" "07 News Summarizer"

  # 8 — DCF Valuation Calculator (React/Vite)
  install_node "$ROOT/08-dcf-calculator" "08 DCF Calculator"

  # 9 — ASX Hedge Fund Screener (React/Vite)
  install_node "$ROOT/09-asx-screener" "09 ASX Screener"

  # 10 — AI Trading Journal (Next.js + Prisma)
  install_node "$ROOT/10-trading-journal" "10 Trading Journal"
  log "Running Prisma migrations for project 10..."
  (cd "$ROOT/10-trading-journal" && npx prisma generate --silent 2>/dev/null || true)

  setup_db

  echo ""
  ok "All projects installed!"
  echo ""
  echo "  Next steps:"
  echo "  1. Edit .env with your API keys (OPENAI_API_KEY is required for most projects)"
  echo "  2. Run: ./start-all.sh"
  echo ""
}

main "$@"
