"""
Feature engineering for ASX earnings prediction.
Australian companies report half-yearly (H1 = Feb, FY = Aug).
Key differentiator: franking credit yield, AUD/USD sensitivity for exporters.
"""
import yfinance as yf
import pandas as pd
import numpy as np
import math
from datetime import datetime


def yahoo_ticker(t: str) -> str:
    t = t.strip().upper()
    intl = {"AAPL","MSFT","GOOGL","AMZN","TSLA","META","NVDA"}
    return t if ("." in t or t in intl) else f"{t}.AX"


def extract_features(ticker: str) -> dict:
    """
    Extract predictive features for earnings beat/miss prediction.
    Returns a flat dict of numeric features.
    """
    yt = yahoo_ticker(ticker)
    tk = yf.Ticker(yt)

    info = tk.info
    hist = tk.history(period="1y")
    earnings_hist = tk.earnings_history

    if hist.empty:
        raise ValueError(f"No price history for {ticker}")

    # Price momentum
    close = hist["Close"]
    returns = close.pct_change().dropna()
    mom_1m = float((close.iloc[-1] / close.iloc[-21] - 1)) if len(close) >= 21 else 0
    mom_3m = float((close.iloc[-1] / close.iloc[-63] - 1)) if len(close) >= 63 else 0
    mom_6m = float((close.iloc[-1] / close.iloc[-126] - 1)) if len(close) >= 126 else 0

    # Volatility
    hv_30 = float(returns.tail(21).std() * math.sqrt(252))

    # Volume trend
    vol_ratio = float(hist["Volume"].tail(10).mean() / hist["Volume"].tail(60).mean()) if len(hist) >= 60 else 1.0

    # Valuation
    pe = info.get("trailingPE", None)
    fwd_pe = info.get("forwardPE", None)
    pb = info.get("priceToBook", None)
    ps = info.get("priceToSalesTrailing12Months", None)
    ev_ebitda = info.get("enterpriseToEbitda", None)
    roe = info.get("returnOnEquity", None)
    roa = info.get("returnOnAssets", None)
    gross_margin = info.get("grossMargins", None)
    operating_margin = info.get("operatingMargins", None)
    debt_equity = info.get("debtToEquity", None)
    current_ratio = info.get("currentRatio", None)
    revenue_growth = info.get("revenueGrowth", None)
    earnings_growth = info.get("earningsGrowth", None)

    # Earnings surprise history (last 4 quarters)
    surprise_history = []
    if earnings_hist is not None and not earnings_hist.empty:
        for _, row in earnings_hist.head(4).iterrows():
            est = row.get("epsEstimate", None)
            act = row.get("epsActual", None)
            if est is not None and act is not None and est != 0:
                surprise_history.append((act - est) / abs(est))

    avg_past_surprise = float(np.mean(surprise_history)) if surprise_history else 0.0
    surprise_streak = sum(1 for s in surprise_history if s > 0)

    # Australian-specific: sector context
    sector = info.get("sector", "")
    is_resources = sector in ["Basic Materials", "Energy"]
    is_financial = sector in ["Financial Services", "Financials"]
    is_asx = yt.endswith(".AX")

    return {
        # Price & momentum
        "mom_1m": mom_1m,
        "mom_3m": mom_3m,
        "mom_6m": mom_6m,
        "hv_30": hv_30,
        "vol_ratio": vol_ratio,

        # Valuation
        "pe": pe or 0,
        "fwd_pe": fwd_pe or 0,
        "pb": pb or 0,
        "ps": ps or 0,
        "ev_ebitda": ev_ebitda or 0,

        # Quality
        "roe": roe or 0,
        "roa": roa or 0,
        "gross_margin": gross_margin or 0,
        "operating_margin": operating_margin or 0,
        "current_ratio": current_ratio or 0,
        "debt_equity": debt_equity or 0,

        # Growth
        "revenue_growth": revenue_growth or 0,
        "earnings_growth": earnings_growth or 0,

        # Earnings history
        "avg_past_surprise": avg_past_surprise,
        "surprise_streak": surprise_streak,

        # Categorical (encoded)
        "is_resources": int(is_resources),
        "is_financial": int(is_financial),
        "is_asx": int(is_asx),
    }


FEATURE_COLUMNS = [
    "mom_1m", "mom_3m", "mom_6m", "hv_30", "vol_ratio",
    "pe", "fwd_pe", "pb", "ps", "ev_ebitda",
    "roe", "roa", "gross_margin", "operating_margin", "current_ratio", "debt_equity",
    "revenue_growth", "earnings_growth",
    "avg_past_surprise", "surprise_streak",
    "is_resources", "is_financial", "is_asx",
]
