# 10 Australian Finance Projects

> Adapted from the original 10 US finance projects for the **Australian market (ASX, ASIC, AUD, RBA)** with international market exposure.

## Projects

| # | Project | Stack | Port |
|---|---------|-------|------|
| 1 | ASX Stock Research Assistant | Next.js + OpenAI + Supabase | 3001 |
| 2 | Options Strategy Builder | FastAPI + React | 3002 / 8002 |
| 3 | ASIC Filing Analyzer | Python + Streamlit + OpenAI | 8503 |
| 4 | ASX Insider Trading Tracker | Next.js + PostgreSQL | 3004 |
| 5 | Portfolio Risk Dashboard | FastAPI + React + Plotly | 3005 / 8005 |
| 6 | Earnings Move Predictor | Python + Scikit-learn + FastAPI | 8006 |
| 7 | AI Financial News Summarizer | Next.js + OpenAI | 3007 |
| 8 | DCF Valuation Calculator (AUD) | React + TypeScript + Chart.js | 3008 |
| 9 | ASX Hedge Fund Screener | React + Supabase | 3009 |
| 10 | AI Trading Journal | Next.js + OpenAI + PostgreSQL | 3010 |

## Quick Start

```bash
# 1. Copy and fill in your API keys
cp .env.example .env

# 2. Install all dependencies (run once)
./setup.sh

# 3. Launch all projects
./start-all.sh
```

## Environment Variables Needed

| Variable | Used By | Get It At |
|----------|---------|-----------|
| `OPENAI_API_KEY` | Projects 1, 3, 7, 10 | platform.openai.com |
| `NEXT_PUBLIC_SUPABASE_URL` | Projects 1, 9 | supabase.com |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projects 1, 9 | supabase.com |
| `NEWS_API_KEY` | Project 7 | newsapi.org |
| `DATABASE_URL` | Projects 4, 10 | local PostgreSQL |

## Australian Market Notes

- **ASX tickers**: 3-letter codes (CBA, BHP, ANZ, CSL). Data fetched via Yahoo Finance with `.AX` suffix.
- **Financial year**: July 1 – June 30.
- **Reporting seasons**: February (H1) and August (full year).
- **Unique features**: Franking credits, SMSF investing, negative gearing all modelled where applicable.
- **Benchmark**: ASX 200 (^AXJO) used as primary market index.
- **International exposure**: S&P 500, global ETFs (VGS, IVV, NDQ), and USD/AUD rates via RBA included.

## Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ (for projects 4 and 10)
- npm / pip
