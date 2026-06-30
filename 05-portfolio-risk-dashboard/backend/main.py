from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from portfolio import calc_portfolio_metrics, GLOBAL_ETFS_ON_ASX

app = FastAPI(title="Portfolio Risk Dashboard", description="Australian portfolio risk analysis")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class PortfolioRequest(BaseModel):
    holdings: list[dict] = Field(
        ...,
        description="List of {ticker, weight} or {ticker, value} dicts",
        example=[
            {"ticker": "CBA", "value": 10000},
            {"ticker": "BHP", "value": 8000},
            {"ticker": "CSL", "value": 6000},
            {"ticker": "VGS", "value": 5000},
        ],
    )
    period: str = Field(default="2y", description="Historical period: 1y, 2y, 3y, 5y")


@app.post("/analyse")
def analyse_portfolio(req: PortfolioRequest):
    try:
        holdings = req.holdings
        tickers = [h["ticker"] for h in holdings]

        # Accept either weights or dollar values
        if all("value" in h for h in holdings):
            total = sum(h["value"] for h in holdings)
            weights = [h["value"] / total for h in holdings]
        elif all("weight" in h for h in holdings):
            weights = [h["weight"] for h in holdings]
        else:
            weights = [1 / len(holdings)] * len(holdings)

        result = calc_portfolio_metrics(tickers, weights, req.period)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/global-etfs")
def global_etfs():
    """ASX-listed global ETFs for Australian investors seeking international exposure."""
    return {
        "etfs": [{"ticker": k, "name": v} for k, v in GLOBAL_ETFS_ON_ASX.items()],
        "note": "These ETFs are listed on the ASX and priced in AUD, making it simple for Australian investors to gain global exposure without currency conversion.",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
