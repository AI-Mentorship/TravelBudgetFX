from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
import httpx
from datetime import datetime, timedelta
from app.core.config import settings

router = APIRouter()

@router.post("/currency")
async def forecast_currency(
    base_currency: str,
    target_currency: str,
    days: int = 30
) -> List[Dict[str, float]]:
    try:
        # Fetch current exchange rate
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://open.er-api.com/v6/latest/{base_currency}",
                params={"apikey": settings.OPEN_EXCHANGE_RATES_API_KEY}
            )
            response.raise_for_status()
            data = response.json()
        
        current_rate = data['rates'][target_currency]
        today = datetime.now()
        
        # Generate forecast dates and rates
        # For now, we're returning the current rate with a small random variation
        # This could be enhanced with more sophisticated forecasting if needed
        forecast = []
        for i in range(days):
            date = today + timedelta(days=i)
            forecast.append({
                "date": date.strftime('%Y-%m-%d'),
                "rate": current_rate  # You could add small variations here if desired
            })
        return forecast
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )