"""
Scikit-learn gradient boosting model for ASX earnings beat prediction.
Train on a basket of ASX stocks with known earnings history.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from sklearn.impute import SimpleImputer
import joblib
import os
from features import extract_features, FEATURE_COLUMNS

MODEL_PATH = "earnings_model.pkl"


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
        )),
    ])


def train_on_sample_data() -> Pipeline:
    """
    Train on synthetic data representative of ASX stock characteristics.
    In production: replace with real historical earnings + feature data.
    """
    np.random.seed(42)
    n = 500

    # Simulate realistic feature distributions for ASX stocks
    data = {
        "mom_1m": np.random.normal(0.01, 0.08, n),
        "mom_3m": np.random.normal(0.03, 0.15, n),
        "mom_6m": np.random.normal(0.06, 0.25, n),
        "hv_30": np.random.uniform(0.1, 0.6, n),
        "vol_ratio": np.random.uniform(0.5, 2.0, n),
        "pe": np.random.uniform(5, 50, n),
        "fwd_pe": np.random.uniform(4, 40, n),
        "pb": np.random.uniform(0.5, 8, n),
        "ps": np.random.uniform(0.2, 10, n),
        "ev_ebitda": np.random.uniform(3, 30, n),
        "roe": np.random.uniform(-0.1, 0.4, n),
        "roa": np.random.uniform(-0.05, 0.2, n),
        "gross_margin": np.random.uniform(0.1, 0.8, n),
        "operating_margin": np.random.uniform(-0.1, 0.4, n),
        "current_ratio": np.random.uniform(0.5, 3.0, n),
        "debt_equity": np.random.uniform(0, 200, n),
        "revenue_growth": np.random.normal(0.05, 0.2, n),
        "earnings_growth": np.random.normal(0.05, 0.3, n),
        "avg_past_surprise": np.random.normal(0.02, 0.1, n),
        "surprise_streak": np.random.randint(0, 5, n).astype(float),
        "is_resources": np.random.binomial(1, 0.3, n).astype(float),
        "is_financial": np.random.binomial(1, 0.25, n).astype(float),
        "is_asx": np.ones(n),
    }
    X = pd.DataFrame(data)[FEATURE_COLUMNS]

    # Beat probability driven by sensible signal combination
    signal = (
        0.3 * data["avg_past_surprise"]
        + 0.2 * data["mom_1m"]
        + 0.15 * data["earnings_growth"]
        + 0.1 * data["revenue_growth"]
        + 0.1 * data["roe"]
        - 0.1 * data["hv_30"]
        + 0.05 * data["surprise_streak"] / 4
    )
    prob_beat = 1 / (1 + np.exp(-signal * 10))
    y = np.random.binomial(1, prob_beat, n)

    pipe = build_pipeline()
    pipe.fit(X, y)

    cv_scores = cross_val_score(pipe, X, y, cv=5, scoring="roc_auc")
    print(f"Cross-val ROC-AUC: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    joblib.dump(pipe, MODEL_PATH)
    return pipe


def load_or_train() -> Pipeline:
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return train_on_sample_data()


def predict(features: dict) -> dict:
    model = load_or_train()
    X = pd.DataFrame([features])[FEATURE_COLUMNS]
    prob = float(model.predict_proba(X)[0][1])
    pred = "BEAT" if prob >= 0.5 else "MISS"
    confidence = prob if pred == "BEAT" else 1 - prob

    # Feature importance
    clf = model.named_steps["clf"]
    importances = dict(zip(FEATURE_COLUMNS, clf.feature_importances_))
    top_features = sorted(importances.items(), key=lambda x: -x[1])[:5]

    return {
        "prediction": pred,
        "beat_probability": round(prob, 4),
        "confidence": round(confidence, 4),
        "top_features": [{"feature": k, "importance": round(v, 4)} for k, v in top_features],
        "model": "GradientBoostingClassifier",
        "note": "Trained on simulated ASX data. For production accuracy, retrain with real historical earnings.",
    }
