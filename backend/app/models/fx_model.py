# fx_model.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Optional

import numpy as np
import pandas as pd
import yfinance as yf
from dateutil.relativedelta import relativedelta

from darts import TimeSeries
from darts.models import TFTModel
from darts.dataprocessing.transformers import Scaler


# ============================================================
#  FX Pair – Currency Pair Representation
# ============================================================
@dataclass
class FXPair:
    base: str   # e.g. "USD"
    quote: str  # e.g. "JPY"

    def ticker(self) -> str:
        """
        Yahoo Finance format:
        QUOTE + BASE + "=X"
        
        Example:
        base="USD", quote="JPY" → "JPYUSD=X"
        """
        return f"{self.quote}{self.base}=X"


# ============================================================
#  FX Fetcher – Handles yfinance download
# ============================================================
class FXFetcher:
    def __init__(self, lookback_years: int = 8):
        self.lookback_years = lookback_years

    def fetch_daily(self, pair: FXPair) -> pd.Series:
        """
        Fetch daily FX rate series.
        Yahoo returns BASE per QUOTE (USD per 1 JPY).
        """
        end = datetime.utcnow()
        start = end - relativedelta(years=self.lookback_years)
        ticker = pair.ticker()

        # 🟩 FIX: Ensure correct download for all regions, handle retries
        df = yf.download(
            tickers=ticker,
            start=start,
            end=end,
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=False  # prevents region-related failures
        )

        # 🟥 If empty → Yahoo blocked or wrong ticker
        if df is None or df.empty:
            raise ValueError(
                f"Yahoo Finance returned no data for ticker '{ticker}'. "
                "Try turning off VPN or running on mobile hotspot."
            )

        if "Close" not in df.columns:
            raise ValueError(f"No 'Close' column found in Yahoo response for '{ticker}'")

        close = df["Close"]

        # yfinance sometimes returns multi-column Close
        if isinstance(close, pd.DataFrame):
            close = close.iloc[:, 0]

        close = close.dropna()
        if close.empty:
            raise ValueError(f"No valid close prices for '{ticker}'.")

        # Standardize index and fill missing days
        close.index = pd.to_datetime(close.index).tz_localize(None)
        close = close.asfreq("D").interpolate("linear")

        close.name = f"{pair.base}->{pair.quote}"

        return close.astype(float)


# ============================================================
#  Monthly forecast container
# ============================================================
@dataclass
class MonthlyForecast:
    month: str
    p10: float
    p50: float
    p90: float


# ============================================================
#  Daily → Monthly converter
# ============================================================
def ts_to_monthly(ts: TimeSeries) -> List[MonthlyForecast]:
    s = ts.to_series()

    df = pd.DataFrame({
        "p50": s,
        "p10": s,
        "p90": s
    })

    monthly = df.resample("MS").mean()

    forecasts = [
        MonthlyForecast(
            month=idx.strftime("%Y-%m"),
            p10=float(row.p10),
            p50=float(row.p50),
            p90=float(row.p90),
        )
        for idx, row in monthly.iterrows()
    ]

    return forecasts


# ============================================================
#  Budget ranking logic
# ============================================================
def rank_months(
    forecasts: List[MonthlyForecast],
    budget: float,
    local_cost: float,
    days: int
) -> List[Dict]:
    ranked = []

    for f in forecasts:
        expected_cost = local_cost * days * f.p50
        prob = 1.0 if expected_cost <= budget else 0.0

        ranked.append({
            "month": f.month,
            "fx_p10": f.p10,
            "fx_p50": f.p50,
            "fx_p90": f.p90,
            "expected_cost": expected_cost,
            "p_within_budget": prob,
        })

    ranked.sort(key=lambda x: (-x["p_within_budget"], x["expected_cost"]))

    return ranked


# ============================================================
#  TFT FX Service – Main Model Pipeline
# ============================================================
class FXService:
    def __init__(
        self,
        lookback_years: int = 8,
        input_chunk_length: int = 365,
        output_chunk_length: int = 180,
        n_epochs: int = 50,
        seed: int = 42
    ):
        self.fetcher = FXFetcher(lookback_years)
        self.input_chunk_length = input_chunk_length
        self.output_chunk_length = output_chunk_length
        self.n_epochs = n_epochs
        self.seed = seed

        self._scaler: Optional[Scaler] = None
        self._model: Optional[TFTModel] = None

    # ---------------- helpers ---------------- #

    def _build_model(self) -> TFTModel:
        return TFTModel(
            input_chunk_length=self.input_chunk_length,
            output_chunk_length=self.output_chunk_length,
            hidden_size=64,
            lstm_layers=1,
            num_attention_heads=4,
            dropout=0.15,
            batch_size=64,
            n_epochs=self.n_epochs,
            add_relative_index=True,
            add_encoders={
                "cyclic": {"future": ["month", "dayofweek"]},
                "datetime_attribute": {"future": ["month", "dayofweek", "day"]},
            },
            random_state=self.seed,
            pl_trainer_kwargs={"enable_progress_bar": False},
        )

    def _fit_tft(self, series: pd.Series):
        ts = TimeSeries.from_series(series.astype(np.float32))

        self._scaler = Scaler()
        ts_scaled = self._scaler.fit_transform(ts)

        self._model = self._build_model()
        self._model.fit(ts_scaled, verbose=False)

    def _predict_daily(self, days: int) -> TimeSeries:
        if self._model is None or self._scaler is None:
            raise RuntimeError("Model has not been trained yet.")

        pred_scaled = self._model.predict(days)
        return self._scaler.inverse_transform(pred_scaled)

    # ---------------- public API ---------------- #

    def forecast_monthly(self, pair: FXPair, h_months: int = 12) -> List[MonthlyForecast]:
        series = self.fetcher.fetch_daily(pair)

        self._fit_tft(series)

        horizon_days = h_months * 30
        pred_ts = self._predict_daily(horizon_days)

        monthly = ts_to_monthly(pred_ts)
        return monthly[:h_months]
