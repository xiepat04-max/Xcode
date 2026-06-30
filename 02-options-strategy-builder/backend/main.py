"""
Options Strategy Builder API — Australian market focus.
ASX equity options: monthly expiry, 100 shares/contract, physically settled.
Also supports US options for international exposure.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import yfinance as yf
import numpy as np
from datetime import date, timedelta
import math
from strategies import black_scholes, payoff_at_expiry, recommend_strategy

app = FastAPI(title="Options Strategy Builder", description="ASX & International Options")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

RBA_CASH_RATE = 0.0435  # ~4.35% — update via /config endpoint


class StrategyRequest(BaseModel):
    ticker: str = Field(..., description="ASX ticker (e.g. CBA) or US ticker (e.g. AAPL)")
    outlook: str = Field(..., description="bullish | bearish | neutral")
    risk_tolerance: str = Field(default="medium", description="low | medium | high")
    expiry_days: int = Field(default=30, ge=7, le=365)
    custom_strike: float | None = None


class BSRequest(BaseModel):
    spot: float
    strike: float
    days_to_expiry: int
    volatility: float  # annualised, e.g. 0.25 = 25%
    option_type: str   # "call" or "put"
    is_asx: bool = True


def yahoo_ticker(t: str) -> str:
    t = t.upper().strip()
    intl = {"AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "SPY", "QQQ"}
    return t if (t in intl or "." in t) else f"{t}.AX"


@app.get("/quote/{ticker}")
def get_quote(ticker: str):
    yt = yahoo_ticker(ticker)
    try:
        tk = yf.Ticker(yt)
        info = tk.fast_info
        hist = tk.history(period="1y")
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data for {yt}")

        returns = hist["Close"].pct_change().dropna()
        hv_30  = float(returns.tail(21).std() * math.sqrt(252))
        hv_90  = float(returns.tail(63).std() * math.sqrt(252))
        hv_252 = float(returns.std() * math.sqrt(252))

        # IV rank proxy (HV percentile)
        rolling_vol = returns.rolling(21).std() * math.sqrt(252)
        iv_rank = float(((hv_30 - rolling_vol.min()) / (rolling_vol.max() - rolling_vol.min())) * 100)

        return {
            "ticker": ticker.upper(),
            "yahoo_ticker": yt,
            "is_asx": yt.endswith(".AX"),
            "currency": "AUD" if yt.endswith(".AX") else "USD",
            "spot": round(float(info.last_price), 3),
            "hv_30_day": round(hv_30 * 100, 1),
            "hv_90_day": round(hv_90 * 100, 1),
            "hv_252_day": round(hv_252 * 100, 1),
            "iv_rank_proxy": round(iv_rank, 1),
            "risk_free_rate": RBA_CASH_RATE if yt.endswith(".AX") else 0.053,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend")
def recommend(req: StrategyRequest):
    yt = yahoo_ticker(req.ticker)
    tk = yf.Ticker(yt)
    info = tk.fast_info
    hist = tk.history(period="1y")

    if hist.empty:
        raise HTTPException(status_code=404, detail="No market data")

    spot = float(info.last_price)
    returns = hist["Close"].pct_change().dropna()
    hv_30 = float(returns.tail(21).std() * math.sqrt(252))
    rolling_vol = returns.rolling(21).std() * math.sqrt(252)
    iv_rank = float(((hv_30 - rolling_vol.min()) / (rolling_vol.max() - rolling_vol.min())) * 100)
    rfr = RBA_CASH_RATE if yt.endswith(".AX") else 0.053

    strategies = recommend_strategy(req.outlook, req.risk_tolerance, iv_rank)
    T = req.expiry_days / 365
    strike = req.custom_strike or round(spot * (1.05 if "bullish" in req.outlook else 0.95), 2)

    call_bs = black_scholes(spot, strike, T, rfr, hv_30, "call")
    put_bs  = black_scholes(spot, strike, T, rfr, hv_30, "put")

    # Generate payoff chart data
    S_range = np.linspace(spot * 0.7, spot * 1.3, 100)
    payoffs = {}
    for strat in strategies[:2]:
        params = {
            "strike": strike, "premium": call_bs["price"],
            "lower_strike": round(spot * 0.97, 2), "upper_strike": round(spot * 1.03, 2),
            "lower_premium": black_scholes(spot, spot * 0.97, T, rfr, hv_30, "call")["price"],
            "upper_premium": black_scholes(spot, spot * 1.03, T, rfr, hv_30, "call")["price"],
            "call_premium": call_bs["price"], "put_premium": put_bs["price"],
            "lower_short": round(spot * 0.92, 2), "lower_long": round(spot * 0.88, 2),
            "upper_short": round(spot * 1.08, 2), "upper_long": round(spot * 1.12, 2),
            "lower_short_prem": put_bs["price"] * 0.6, "lower_long_prem": put_bs["price"] * 0.3,
            "upper_short_prem": call_bs["price"] * 0.6, "upper_long_prem": call_bs["price"] * 0.3,
        }
        payoffs[strat] = payoff_at_expiry(strat, S_range, spot, params)

    asx_note = (
        "ASX equity options expire on the Thursday before the last Friday of each month. "
        "Contracts cover 100 shares and are physically settled. "
        "Franking credits are not transferable via options — dividend capture strategies must account for this."
        if yt.endswith(".AX") else ""
    )

    return {
        "ticker": req.ticker.upper(),
        "spot": spot,
        "currency": "AUD" if yt.endswith(".AX") else "USD",
        "hv_30_day_pct": round(hv_30 * 100, 1),
        "iv_rank_proxy": round(iv_rank, 1),
        "expiry_days": req.expiry_days,
        "expiry_date": str(date.today() + timedelta(days=req.expiry_days)),
        "recommended_strategies": strategies,
        "call_price": call_bs["price"],
        "put_price": put_bs["price"],
        "call_greeks": call_bs,
        "put_greeks": put_bs,
        "payoff_x": [round(x, 2) for x in S_range],
        "payoffs": {k: [round(v, 4) for v in vals] for k, vals in payoffs.items()},
        "asx_market_note": asx_note,
    }


@app.post("/black-scholes")
def bs_price(req: BSRequest):
    rfr = RBA_CASH_RATE if req.is_asx else 0.053
    T = req.days_to_expiry / 365
    result = black_scholes(req.spot, req.strike, T, rfr, req.volatility, req.option_type)
    return {"input": req.model_dump(), "output": result, "risk_free_rate_used": rfr}


@app.get("/health")
def health():
    return {"status": "ok", "rba_cash_rate": RBA_CASH_RATE}
