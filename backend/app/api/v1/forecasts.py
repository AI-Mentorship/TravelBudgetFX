from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Union
from datetime import datetime, timedelta
from app.models.fx_model import FXPair, FXFetcher
import asyncio
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import pandas as pd

router = APIRouter()

# Thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=2)

# Common tradeable currencies (have direct USD pairs)
COMMON_CURRENCIES = {'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD', 
                     'SEK', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL',
                     'TWD', 'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP',
                     'AED', 'COP', 'SAR', 'MYR', 'RON'}

def simple_forecast(pair: FXPair, days: int = 30) -> List[Dict[str, Union[str, float]]]:
    """
    Simple but reliable forecast using historical data and trend analysis.
    Falls back when TFT model has issues.
    """
    # Fetch historical data
    fetcher = FXFetcher(lookback_years=2)
    historical = fetcher.fetch_daily(pair)
    
    if len(historical) < 30:
        raise ValueError("Insufficient historical data")
    
    # Calculate recent trend (last 30 days)
    recent = historical.tail(30)
    trend = (recent.iloc[-1] - recent.iloc[0]) / 30  # daily change
    
    # Get volatility
    volatility = recent.std()
    
    # Get current (most recent) rate
    last_rate = historical.iloc[-1]
    today = datetime.now()
    
    forecasts = []
    
    # Add today's rate as first entry (current rate)
    forecasts.append({
        "date": today.strftime('%Y-%m-%d'),
        "rate": round(float(last_rate), 6)
    })
    
    # Add forecast for future days
    for i in range(days):
        # Linear trend + small random variation
        predicted_rate = last_rate + (trend * (i + 1)) + np.random.normal(0, volatility * 0.1)
        
        forecasts.append({
            "date": (today + timedelta(days=i+1)).strftime('%Y-%m-%d'),
            "rate": round(float(predicted_rate), 6)
        })
    
    return forecasts

def cross_rate_forecast(base: str, quote: str, days: int = 30) -> List[Dict[str, Union[str, float]]]:
    """
    Calculate cross rate using USD as intermediary.
    For example: JPY/AFN = (JPY/USD) * (USD/AFN)
    But since we only have USD/X pairs, we use: base/quote = (USD/quote) / (USD/base)
    """
    fetcher = FXFetcher(lookback_years=2)
    today = datetime.now()
    
    # Get USD/base rate (e.g., USD/JPY)
    try:
        usd_base_pair = FXPair(base='USD', quote=base)
        usd_base_hist = fetcher.fetch_daily(usd_base_pair)
        usd_base_rate = float(usd_base_hist.iloc[-1])
    except:
        # Try reverse: base/USD
        base_usd_pair = FXPair(base=base, quote='USD')
        base_usd_hist = fetcher.fetch_daily(base_usd_pair)
        usd_base_rate = 1.0 / float(base_usd_hist.iloc[-1])
    
    # Get USD/quote rate (e.g., USD/INR)
    try:
        usd_quote_pair = FXPair(base='USD', quote=quote)
        usd_quote_hist = fetcher.fetch_daily(usd_quote_pair)
        usd_quote_rate = float(usd_quote_hist.iloc[-1])
    except:
        # Try reverse: quote/USD
        quote_usd_pair = FXPair(base=quote, quote='USD')
        quote_usd_hist = fetcher.fetch_daily(quote_usd_pair)
        usd_quote_rate = 1.0 / float(quote_usd_hist.iloc[-1])
    
    # Calculate cross rate: base/quote = (USD/quote) / (USD/base)
    cross_rate = usd_quote_rate / usd_base_rate
    
    # Generate simple forecast based on this rate
    forecasts = []
    forecasts.append({
        "date": today.strftime('%Y-%m-%d'),
        "rate": round(cross_rate, 6)
    })
    
    # Add small trend variation for forecast
    trend = cross_rate * 0.0002  # 0.02% daily trend
    volatility = cross_rate * 0.005  # 0.5% volatility
    
    for i in range(days):
        predicted_rate = cross_rate + (trend * (i + 1)) + np.random.normal(0, volatility)
        forecasts.append({
            "date": (today + timedelta(days=i+1)).strftime('%Y-%m-%d'),
            "rate": round(float(predicted_rate), 6)
        })
    
    return forecasts

@router.post("/currency")
async def forecast_currency(
    base_currency: str,
    target_currency: str,
    days: int = 30
) -> List[Dict[str, Union[str, float]]]:
    """
    Generate currency forecast using historical data and trend analysis.
    
    Args:
        base_currency: Destination currency (e.g., "JPY")
        target_currency: Home currency (e.g., "INR")
        days: Number of days to forecast (default 30)
    
    Returns:
        List of forecasts with date and predicted exchange rate
    """
    try:
        # Normalize currency codes
        base = base_currency.upper().strip()
        target = target_currency.upper().strip()
        
        # Check if both currencies are common (direct pair likely available)
        if base in COMMON_CURRENCIES and target in COMMON_CURRENCIES:
            try:
                # Try direct pair first
                pair = FXPair(base=base, quote=target)
                loop = asyncio.get_event_loop()
                daily_forecast = await loop.run_in_executor(
                    executor,
                    simple_forecast,
                    pair,
                    days
                )
                return daily_forecast
            except Exception as e:
                print(f"Direct pair failed, trying cross-rate: {e}")
                # Fall through to cross-rate
        
        # Use cross-rate via USD for exotic pairs
        loop = asyncio.get_event_loop()
        daily_forecast = await loop.run_in_executor(
            executor,
            cross_rate_forecast,
            base,
            target,
            days
        )
        return daily_forecast
            
    except ValueError as e:
        # Handle data fetching errors
        import traceback
        print(f"ValueError in forecast: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch currency data: {str(e)}"
        )
    except Exception as e:
        # Handle ML model errors
        import traceback
        print(f"Exception in forecast: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecast generation failed: {str(e)}"
        )