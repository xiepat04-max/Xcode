"""
Options strategy payoff calculations.
Supports ASX equity options (monthly expiry, 100-share contracts) and US options.
"""
import numpy as np
from scipy.stats import norm
from typing import Literal

OptionType = Literal["call", "put"]
StrategyName = Literal[
    "long_call", "long_put", "covered_call", "protective_put",
    "bull_call_spread", "bear_put_spread", "long_straddle", "iron_condor",
]


def black_scholes(S: float, K: float, T: float, r: float, sigma: float, option_type: OptionType) -> dict:
    """Black-Scholes price + Greeks. T in years."""
    if T <= 0:
        intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
        return {"price": intrinsic, "delta": 0, "gamma": 0, "theta": 0, "vega": 0}

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == "call":
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        delta = norm.cdf(d1)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        delta = norm.cdf(d1) - 1

    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    theta = (-(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) - r * K * np.exp(-r * T) * norm.cdf(d2 * (1 if option_type == "call" else -1))) / 365
    vega = S * norm.pdf(d1) * np.sqrt(T) / 100

    return {"price": round(price, 4), "delta": round(delta, 4), "gamma": round(gamma, 6), "theta": round(theta, 4), "vega": round(vega, 4)}


def payoff_at_expiry(strategy: StrategyName, S_range: np.ndarray, spot: float, params: dict) -> list[float]:
    """Returns P&L per share at expiry across S_range."""

    def call_payoff(S, K, prem): return np.maximum(S - K, 0) - prem
    def put_payoff(S, K, prem): return np.maximum(K - S, 0) - prem

    p = params
    if strategy == "long_call":
        return list(call_payoff(S_range, p["strike"], p["premium"]))

    if strategy == "long_put":
        return list(put_payoff(S_range, p["strike"], p["premium"]))

    if strategy == "covered_call":
        # Own 1 share + sell 1 call
        stock_pnl = S_range - spot
        call_sold = -call_payoff(S_range, p["strike"], p["premium"])
        return list(stock_pnl + call_sold + p["premium"])

    if strategy == "protective_put":
        stock_pnl = S_range - spot
        put_bought = put_payoff(S_range, p["strike"], p["premium"])
        return list(stock_pnl + put_bought)

    if strategy == "bull_call_spread":
        long_call  = call_payoff(S_range, p["lower_strike"], p["lower_premium"])
        short_call = -call_payoff(S_range, p["upper_strike"], p["upper_premium"])
        return list(long_call + short_call)

    if strategy == "bear_put_spread":
        long_put  = put_payoff(S_range, p["upper_strike"], p["upper_premium"])
        short_put = -put_payoff(S_range, p["lower_strike"], p["lower_premium"])
        return list(long_put + short_put)

    if strategy == "long_straddle":
        call = call_payoff(S_range, p["strike"], p["call_premium"])
        put  = put_payoff(S_range, p["strike"], p["put_premium"])
        return list(call + put)

    if strategy == "iron_condor":
        sell_put   = -put_payoff(S_range, p["lower_short"], p["lower_short_prem"])
        buy_put    = put_payoff(S_range, p["lower_long"], p["lower_long_prem"])
        sell_call  = -call_payoff(S_range, p["upper_short"], p["upper_short_prem"])
        buy_call   = call_payoff(S_range, p["upper_long"], p["upper_long_prem"])
        return list(sell_put + buy_put + sell_call + buy_call)

    return [0.0] * len(S_range)


def recommend_strategy(outlook: str, risk_tolerance: str, iv_rank: float) -> list[str]:
    """
    Rule-based strategy recommendation for ASX options.
    iv_rank: 0–100, percentile of current IV vs 52-week range.
    """
    outlook = outlook.lower()
    risk = risk_tolerance.lower()
    high_iv = iv_rank > 50

    if "bullish" in outlook:
        if high_iv:
            return ["covered_call", "bull_call_spread"]
        return ["long_call", "bull_call_spread"] if risk == "high" else ["bull_call_spread", "covered_call"]

    if "bearish" in outlook:
        return ["long_put", "bear_put_spread"] if risk == "high" else ["bear_put_spread", "protective_put"]

    if "neutral" in outlook:
        if high_iv:
            return ["iron_condor", "covered_call"]
        return ["long_straddle"]

    return ["long_call", "long_put"]
