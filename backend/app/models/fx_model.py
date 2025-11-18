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


# -------------------------------------------------------------------
#  FX Pair
# -------------------------------------------------------------------
@dataclass
class FXPair:
    """
    Represents a currency pair.

    base  = home currency  (e.g., "USD")
    quote = destination/local currency (e.g., "JPY")

    For travel budgeting, we want FX rate as:
        FX = base_per_quote  (e.g., USD per 1 JPY)
    so we can do:
        cost_base = local_cost_quote * FX
    """
    base: str
    quote: str

    def yf_ticker(self) -> str:
        """
        We request QUOTE+BASE in Yahoo (e.g. JPYUSD=X),
        which returns BASE per 1 QUOTE (USD per JPY).
        """
        return f"{self.quote}{self.base}=X"


# -------------------------------------------------------------------
#  FX Fetcher (Yahoo Finance via yfinance)
# -------------------------------------------------------------------
class FXFetcher:
    def __init__(self, lookback_years: int = 8):
        self.lookback_years = lookback_years

    def fetch_daily(self, pair: FXPair) -> pd.Series:
        """
        Returns a clean daily series of BASE per QUOTE
        (e.g., USD per JPY) as a pandas Series.
        """
        end = datetime.utcnow()
        start = end - relativedelta(years=self.lookback_years)
        ticker = pair.yf_ticker()

        df = yf.download(
            ticker,
            start=start,
            end=end,
            interval="1d",
            auto_adjust=True,
            progress=False,
        )

        # Basic sanity checks
        if not isinstance(df, pd.DataFrame) or df.empty:
            raise ValueError(f"No data returned for {ticker}")

        if "Close" not in df.columns:
            raise ValueError(f"No 'Close' column for {ticker}")

        close = df["Close"]

        # If yfinance gives 2D "Close", take the first column
        if isinstance(close, pd.DataFrame):
            close = close.iloc[:, 0]

        close = close.dropna()
        if close.empty:
            raise ValueError(f"No usable Close prices for {ticker}")

        # Yahoo gives BASE per QUOTE here (e.g., USD per JPY for JPYUSD=X),
        # which is exactly what we want for budgeting.
        fx_base_per_quote = close.astype(float)
        fx_base_per_quote.index = pd.to_datetime(fx_base_per_quote.index).tz_localize(None)

        # Force daily frequency and interpolate missing days
        fx_base_per_quote = (
            fx_base_per_quote.asfreq("D").interpolate("linear").dropna()
        )
        fx_base_per_quote.name = f"{pair.base}->{pair.quote}"

        return fx_base_per_quote


# -------------------------------------------------------------------
#  Monthly Forecast dataclass
# -------------------------------------------------------------------
@dataclass
class MonthlyForecast:
    month: str  # "YYYY-MM"
    p10: float
    p50: float
    p90: float


# -------------------------------------------------------------------
#  Helper: convert daily TimeSeries → monthly p10/p50/p90
#  (for now, TFT is deterministic so p10 = p50 = p90)
# -------------------------------------------------------------------
def ts_to_monthly(ts: TimeSeries) -> List[MonthlyForecast]:
    """
    Converts a daily TimeSeries into monthly averages and wraps into
    MonthlyForecast objects. Since we're using a deterministic TFT
    (no quantile likelihood), we set p10 = p50 = p90.
    """
    s = ts.to_series()
    df = s.to_frame("p50")
    df["p10"] = df["p50"]
    df["p90"] = df["p50"]

    # Resample to monthly start (MS)
    monthly = df.resample("MS").mean()

    forecasts: List[MonthlyForecast] = []
    for idx, row in monthly.iterrows():
        forecasts.append(
            MonthlyForecast(
                month=idx.strftime("%Y-%m"),
                p10=float(row["p10"]),
                p50=float(row["p50"]),
                p90=float(row["p90"]),
            )
        )
    return forecasts


# -------------------------------------------------------------------
#  Ranking logic for travel budget
# -------------------------------------------------------------------
def rank_months(
    forecasts: List[MonthlyForecast],
    budget: float,
    local_cost: float,
    days: int,
) -> List[Dict]:
    """
    For each forecast month, compute expected trip cost in BASE currency:

        cost_base = local_cost (QUOTE/day) * days * FX (BASE/QUOTE)

    Since our TFT is deterministic (p10=p90=p50), probability of staying
    within budget is 1.0 if cost <= budget else 0.0.
    """
    ranked: List[Dict] = []

    for f in forecasts:
        expected_cost = local_cost * days * f.p50
        p_within = 1.0 if expected_cost <= budget else 0.0

        ranked.append(
            {
                "month": f.month,
                "fx_p10": f.p10,
                "fx_p50": f.p50,
                "fx_p90": f.p90,
                "expected_cost": expected_cost,
                "p_within_budget": p_within,
            }
        )

    # Sort: highest probability first, then lowest expected cost
    ranked.sort(key=lambda x: (-x["p_within_budget"], x["expected_cost"]))
    return ranked


# -------------------------------------------------------------------
#  TFT Wrapper Service (this is what your FastAPI layer will use)
# -------------------------------------------------------------------
class FXService:
    """
    High-level service that:
      1) fetches FX series from Yahoo,
      2) trains a TFT model,
      3) produces monthly forecasts usable by the API.
    """

    def __init__(
        self,
        lookback_years: int = 8,
        input_chunk_length: int = 365,
        output_chunk_length: int = 180,
        n_epochs: int = 50,
        seed: int = 42,
    ):
        self.fetcher = FXFetcher(lookback_years)
        self.input_chunk_length = input_chunk_length
        self.output_chunk_length = output_chunk_length
        self.n_epochs = n_epochs
        self.seed = seed

        self._scaler: Optional[Scaler] = None
        self._model: Optional[TFTModel] = None

    # ------------------ internal helpers ------------------ #

    def _build_model(self) -> TFTModel:
        """
        Create a TFT model that uses automatic time encoders
        (no manual covariates needed → fewer bugs).
        """
        model = TFTModel(
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
        return model

    def _fit_tft(self, series: pd.Series) -> None:
        """
        Scale the target series and fit TFT.
        """
        # Build TimeSeries and cast to float32 for Torch
        ts = TimeSeries.from_series(series.astype(np.float32))

        # Scale target
        self._scaler = Scaler()
        ts_scaled = self._scaler.fit_transform(ts)

        # Initialize and fit TFT
        self._model = self._build_model()
        # Note: with add_relative_index/add_encoders, we don't need explicit covariates
        self._model.fit(ts_scaled, verbose=False)

    def _predict_daily(self, days_ahead: int) -> TimeSeries:
        """
        Predict `days_ahead` days into the future and inverse transform.
        """
        if self._model is None or self._scaler is None:
            raise RuntimeError("Model has not been trained yet.")

        # Predict on scaled domain
        pred_scaled = self._model.predict(days_ahead)

        # Back to original scale
        pred = self._scaler.inverse_transform(pred_scaled)
        return pred

    # ------------------ public API ------------------ #

    def forecast_monthly(self, pair: FXPair, h_months: int = 12) -> List[MonthlyForecast]:
        """
        Main entrypoint:
          - fetches daily FX series for `pair`,
          - trains TFT,
          - predicts `h_months` into the future,
          - returns list[MonthlyForecast].
        """
        series = self.fetcher.fetch_daily(pair)

        # train TFT on this series
        self._fit_tft(series)

        # approximate horizon in days
        horizon_days = int(h_months * 30)
        pred_ts = self._predict_daily(horizon_days)

        monthly_forecasts = ts_to_monthly(pred_ts)
        return monthly_forecasts[:h_months]
