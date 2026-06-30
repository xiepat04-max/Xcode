from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from features import extract_features
from model import predict, train_on_sample_data
import yfinance as yf

app = FastAPI(title="ASX Earnings Move Predictor")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/predict/{ticker}")
def predict_earnings(ticker: str):
    """
    Predict whether an ASX or US company will beat or miss upcoming earnings.
    Australian companies report H1 (Feb) and FY (Aug).
    """
    try:
        feats = extract_features(ticker)
        result = predict(feats)

        # Add next earnings date
        yt = f"{ticker.upper()}.AX" if "." not in ticker.upper() else ticker.upper()
        tk = yf.Ticker(yt)
        cal = tk.calendar
        next_earnings = None
        if cal is not None and not cal.empty:
            earnings_col = [c for c in cal.columns if "Earnings" in c]
            if earnings_col:
                next_earnings = str(cal[earnings_col[0]].iloc[0]) if len(cal[earnings_col[0]]) > 0 else None

        result["ticker"] = ticker.upper()
        result["next_earnings_date"] = next_earnings
        result["features_used"] = feats
        result["asx_reporting_note"] = (
            "ASX companies report half-yearly: H1 results in February, full-year results in August. "
            "Australian earnings season is typically 3–4 weeks in Feb and Aug."
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train")
def retrain():
    """Re-train the model with fresh synthetic data (replace with real data in production)."""
    train_on_sample_data()
    return {"status": "Model retrained", "note": "Replace synthetic training data with real ASX earnings history for production use."}


@app.get("/health")
def health():
    return {"status": "ok"}
