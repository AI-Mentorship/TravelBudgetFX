from fastapi import APIRouter, HTTPException, status
import httpx
from app.core.config import settings
from typing import List, Dict

router = APIRouter()

@router.get("/rates")
async def get_exchange_rates(base_currency: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://open.er-api.com/v6/latest/{base_currency}",
                params={"apikey": settings.OPEN_EXCHANGE_RATES_API_KEY}
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/supported")
async def get_supported_currencies() -> List[Dict[str, str]]:
    #This could be expanded to include more currency information
    return [
        {"code": "USD", "name": "US Dollar"},
        {"code": "EUR", "name": "Euro"},
        {"code": "GBP", "name": "British Pound"},
        {"code": "JPY", "name": "Japanese Yen"},
        {"code": "AUD", "name": "Australian Dollar"},
        {"code": "CAD", "name": "Canadian Dollar"},
        #Add more currencies as needed
    ]