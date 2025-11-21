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
    
    # Simple forecast: continue trend with some random variation
    last_rate = historical.iloc[-1]
    today = datetime.now()
    
    forecasts = []
    for i in range(days):
        # Linear trend + small random variation
        predicted_rate = last_rate + (trend * (i + 1)) + np.random.normal(0, volatility * 0.1)
        
        forecasts.append({
            "date": (today + timedelta(days=i)).strftime('%Y-%m-%d'),
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
        base_currency: Home currency (e.g., "USD")
        target_currency: Destination currency (e.g., "JPY")
        days: Number of days to forecast (default 30)
    
    Returns:
        List of forecasts with date and predicted exchange rate
    """
    try:
        # Create FX pair (base = home, quote = destination)
        pair = FXPair(base=base_currency, quote=target_currency)
        
        # Run forecast in thread pool
        loop = asyncio.get_event_loop()
        daily_forecast = await loop.run_in_executor(
            executor,
            simple_forecast,
            pair,
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