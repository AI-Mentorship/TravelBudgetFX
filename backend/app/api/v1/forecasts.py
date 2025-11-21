from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Union
from datetime import datetime, timedelta
from app.models.fx_model import FXService, FXPair
import asyncio
from concurrent.futures import ThreadPoolExecutor

router = APIRouter()

# Thread pool for CPU-bound ML operations
executor = ThreadPoolExecutor(max_workers=2)

@router.post("/currency")
async def forecast_currency(
    base_currency: str,
    target_currency: str,
    days: int = 30
) -> List[Dict[str, Union[str, float]]]:
    """
    Generate currency forecast using TFT model with Yahoo Finance data.
    
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
        
        # Initialize service with shorter training for faster response
        # For production, you might want to cache trained models
        service = FXService(
            lookback_years=3,  # Reduced from 8 for faster training
            input_chunk_length=180,  # Reduced from 365
            output_chunk_length=90,  # Reduced from 180
            n_epochs=20,  # Reduced from 50 for faster training
        )
        
        # Run the ML model in thread pool (CPU-bound operation)
        loop = asyncio.get_event_loop()
        
        # Calculate months needed
        months_needed = max(1, (days + 29) // 30)
        
        # Train model and get monthly forecasts
        monthly_forecasts = await loop.run_in_executor(
            executor,
            service.forecast_monthly,
            pair,
            months_needed
        )
        
        # Convert monthly forecasts to daily by interpolating
        daily_forecast = []
        today = datetime.now()
        
        if not monthly_forecasts:
            raise ValueError("No forecast data generated")
        
        # For simplicity, use the p50 (median) forecast and interpolate
        for i in range(days):
            date = today + timedelta(days=i)
            
            # Find which month this date falls into
            month_idx = min(i // 30, len(monthly_forecasts) - 1)
            forecast_month = monthly_forecasts[month_idx]
            
            # Use the p50 value for this month
            rate = forecast_month.p50
            
            daily_forecast.append({
                "date": date.strftime('%Y-%m-%d'),
                "rate": round(rate, 6)
            })
        
        return daily_forecast
            
    except ValueError as e:
        # Handle data fetching errors
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch currency data: {str(e)}"
        )
    except Exception as e:
        # Handle ML model errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecast generation failed: {str(e)}"
        )