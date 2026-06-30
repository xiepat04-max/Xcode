"""
Portfolio risk calculations for Australian investors.
Benchmark: ASX 200 (^AXJO)
Also supports international stocks (S&P 500, global ETFs available on ASX)
"""
import pandas as pd
import numpy as np
import yfinance as yf
from scipy import stats
from typing import Optional
import math

ASX_BENCHMARK = "^AXJO"   # ASX 200
GLOBAL_BENCHMARK = "^GSPC" # S&P 500
RBA_CASH_RATE = 0.0435    # 4.35% — update as RBA moves

# ASX-listed global ETFs for Australian investors
GLOBAL_ETFS_ON_ASX = {
    "VGS.AX": "Vanguard MSCI Index Intl Shares ETF",
    "IVV.AX": "iShares S&P 500 ETF",
    "NDQ.AX": "BetaShares Nasdaq 100 ETF",
    "VDHG.AX": "Vanguard Diversified High Growth ETF",
    "DHHF.AX": "BetaShares Diversified All Growth ETF",
    "A200.AX": "BetaShares Australia 200 ETF",
    "VAS.AX": "Vanguard Australian Shares Index ETF",
}


def yahoo_ticker(t: str) -> str:
    t = t.strip().upper()
    intl_known = {"AAPL","MSFT","GOOGL","AMZN","TSLA","META","NVDA","SPY","QQQ","GLD"}
    return t if ("." in t or t in intl_known) else f"{t}.AX"


def fetch_prices(tickers: list[str], period: str = "2y") -> pd.DataFrame:
    yt = [yahoo_ticker(t) for t in tickers]
    data = yf.download(yt + [ASX_BENCHMARK, GLOBAL_BENCHMARK], period=period, auto_adjust=True)["Close"]
    data.columns = [c.replace(".AX", "") for c in data.columns]
    return data.dropna(how="all")


def calc_portfolio_metrics(
    tickers: list[str],
    weights: list[float],
    period: str = "2y",
    risk_free_rate: float = RBA_CASH_RATE,
) -> dict:
    prices = fetch_prices(tickers, period)
    yt_tickers = [yahoo_ticker(t).replace(".AX", "") for t in tickers]
    benchmark_col = "^AXJO"

    # Align columns
    available = [t for t in yt_tickers if t in prices.columns]
    if not available:
        raise ValueError("No price data found for any ticker")

    returns = prices[available].pct_change().dropna()
    bench_returns = prices[benchmark_col].pct_change().dropna() if benchmark_col in prices.columns else None

    # Normalise weights
    w = np.array(weights[:len(available)], dtype=float)
    w = w / w.sum()

    port_returns = (returns * w).sum(axis=1)

    # Annual metrics
    ann_return = float(port_returns.mean() * 252)
    ann_vol = float(port_returns.std() * math.sqrt(252))
    sharpe = (ann_return - risk_free_rate) / ann_vol if ann_vol > 0 else 0

    # Drawdown
    cumulative = (1 + port_returns).cumprod()
    rolling_max = cumulative.cummax()
    drawdown = (cumulative - rolling_max) / rolling_max
    max_drawdown = float(drawdown.min())

    # VaR / CVaR (95%)
    var_95 = float(np.percentile(port_returns, 5))
    cvar_95 = float(port_returns[port_returns <= var_95].mean())

    # Beta vs ASX 200
    beta = None
    if bench_returns is not None:
        aligned = port_returns.align(bench_returns, join="inner")
        if len(aligned[0]) > 30:
            slope, _, _, _, _ = stats.linregress(aligned[1], aligned[0])
            beta = float(slope)

    # Per-stock metrics
    stock_metrics = []
    for i, ticker in enumerate(available):
        s_returns = returns[ticker]
        s_ann_return = float(s_returns.mean() * 252)
        s_ann_vol = float(s_returns.std() * math.sqrt(252))
        s_beta = None
        if bench_returns is not None:
            aligned = s_returns.align(bench_returns, join="inner")
            if len(aligned[0]) > 30:
                slope, _, r_val, _, _ = stats.linregress(aligned[1], aligned[0])
                s_beta = float(slope)

        stock_metrics.append({
            "ticker": tickers[i],
            "weight": round(float(w[i]), 4),
            "annual_return_pct": round(s_ann_return * 100, 2),
            "annual_vol_pct": round(s_ann_vol * 100, 2),
            "beta_vs_asx200": round(s_beta, 3) if s_beta else None,
            "is_asx": not ("." in yahoo_ticker(tickers[i]) and not yahoo_ticker(tickers[i]).endswith(".AX")),
        })

    # Sector / geography diversification proxy
    asx_weight = sum(m["weight"] for m in stock_metrics if m["is_asx"])
    intl_weight = 1.0 - asx_weight

    # Rolling 30-day vol series for chart
    rolling_vol = port_returns.rolling(21).std() * math.sqrt(252) * 100
    vol_series = {
        str(d.date()): round(v, 2)
        for d, v in rolling_vol.dropna().items()
        if not math.isnan(v)
    }

    return {
        "portfolio": {
            "annual_return_pct": round(ann_return * 100, 2),
            "annual_volatility_pct": round(ann_vol * 100, 2),
            "sharpe_ratio": round(sharpe, 3),
            "max_drawdown_pct": round(max_drawdown * 100, 2),
            "var_95_daily_pct": round(var_95 * 100, 3),
            "cvar_95_daily_pct": round(cvar_95 * 100, 3),
            "beta_vs_asx200": round(beta, 3) if beta else None,
            "risk_free_rate_used": risk_free_rate,
            "rba_cash_rate": RBA_CASH_RATE,
        },
        "diversification": {
            "asx_weight_pct": round(asx_weight * 100, 1),
            "international_weight_pct": round(intl_weight * 100, 1),
            "stock_count": len(available),
            "note": "Consider ASX-listed global ETFs (VGS, IVV, NDQ) for international exposure",
        },
        "stocks": stock_metrics,
        "rolling_volatility": vol_series,
        "benchmark": "ASX 200 (^AXJO)",
        "currency": "AUD",
    }
